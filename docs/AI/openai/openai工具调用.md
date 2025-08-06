# 工作流程

**第 1 步：调用模型，传入工具列表**

使用工具链

```python
response = await client.chat.completions.create(
    model="gpt-4-turbo",
    messages=[
        {"role": "user", "content": "北京的天气怎么样？"}
    ],
    tools=[ ...工具列表... ],
    tool_choice="auto",  # 让模型自己决定是否调用
)
```

OpenAI：

•	会分析你的 user 提问；

•	判断是否需要调用某个工具；

•	如果需要，就会返回一个 **tool_calls 字段**，说明它“决定调用哪个函数 + 参数”。

| **步骤** | **角色** | **内容** |
| --- | --- | --- |
| 第1步 | 你 ➜ GPT | 发送 messages + tools |
| 第2步 | GPT ➜ 你 | 返回要调用的函数名 + 参数（tool_calls） |
| 第3步 | 你 ➜ GPT | 把工具调用结果补充进 messages，再发回去 |
| 第4步 | GPT ➜ 你 | GPT 根据函数结果生成自然语言响应 |

# 使用

定义一个function的数组list ，格式如下，name就是对应的函数名称

```python

def get_all_functions():
        r = [
            {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "获取城市天气信息",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "城市名，如北京"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
        ]
        return r

def get_weather(location: str) -> str:
    return f"当前 {location} 晴天，温度 25°C"

```

openai流式接口实现services:

```python
class AsyncOpenAIOut:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL")
        self.oai_client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        self.model = os.getenv("OPENAI_MODEL")
    

    async def gpt_stream_with_tools(self, user_message: str, model: str = None, history: list[dict] = [], system_prompt: str = ""):
        functions = get_all_functions()
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # 第一次调用，检查是否触发函数调用
        response = await self.oai_client.chat.completions.create(
            model=model or self.model,
            messages=messages,
            tools=functions,
            tool_choice="auto"
        )

        choice = response.choices[0]

        # 如果有 tool 调用
        if choice.message.tool_calls:
            for tool_call in choice.message.tool_calls:
                name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                print(f"函数调用: {name} 参数: {args}")

                # 执行本地函数（你定义的 get_weather）
                if name == "get_weather":
                    result = get_weather(**args)

                    # 添加 assistant 的 tool_calls 回复
                    messages.append({
                        "role": "assistant",
                        "tool_calls": [{
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": json.dumps(args)
                            }
                        }]
                    })

                    # 添加 tool 执行结果
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result
                    })

                    # 重新调用一次 OpenAI，得到最终结果
                    second_response = await self.oai_client.chat.completions.create(
                        model=model or self.model,
                        messages=messages,
                        stream=True
                    )

                    async for chunk in second_response:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
        else:
            # 没有触发函数调用，正常输出
            if choice.message.content:
                yield choice.message.content
```

# 基类封装

```python
import inspect
import json
from typing import Dict, Callable, List, Any

class BaseTool:
    registry: Dict[str, Callable] = {}

    @classmethod
    def get_tools(cls) -> List[Dict[str, Any]]:
        tools = []
        for name, fn in cls.registry.items():
            sig = inspect.signature(fn)
            parameters = {
                "type": "object",
                "properties": {},
                "required": [],
            }
            for param in sig.parameters.values():
                parameters["properties"][param.name] = {
                    "type": "string",  # 可根据需要支持其他类型
                    "description": f"{param.name} 参数"
                }
                parameters["required"].append(param.name)

            tools.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": fn.__doc__ or "无描述",
                    "parameters": parameters
                }
            })
        return tools

    @classmethod
    def call(cls, name: str, args: Dict[str, Any]) -> str:
        if name not in cls.registry:
            raise ValueError(f"工具 {name} 未注册")
        return cls.registry[name](**args)

    @classmethod
    def register(cls, fn: Callable):
        cls.registry[fn.__name__] = fn
        return fn
    
    @classmethod
    async def acall(cls, name: str, args: Dict[str, Any]) -> str:
        result = cls.call(name, args)
        # 如果需要支持真正的异步函数，可以检测是否是协程函数
        if inspect.iscoroutine(result):
            return await result
        return result

class MyTools(BaseTool):
    
    @BaseTool.register
    def get_weather(location: str) -> str:
        """获取天气"""
        return f"{location} 今天晴，25°C。"

    @BaseTool.register
    def get_time(city: str) -> str:
        """获取时间"""
        return f"{city} 当前时间是 12:00"
```

openai 方法：

```python
async def gpt_stream_with_tools_for_base_tool(self, user_message: str, model: str = None, history: list[dict] = [], system_prompt: str = ""):

        tools = MyTools.get_tools()  # 获取所有 tools 结构
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # 第一次调用，检查是否触发函数调用
        response = await self.oai_client.chat.completions.create(
            model=model or self.model,
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        choice = response.choices[0]

        # 如果触发 tool 调用
        if choice.message.tool_calls:
            for tool_call in choice.message.tool_calls:
                name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                print(f"函数调用: {name} 参数: {args}")

                # 自动调度工具
                result = await BaseTool.acall(name, args)  # 异步支持

                # 添加 assistant 工具调用记录
                messages.append({
                    "role": "assistant",
                    "tool_calls": [{
                        "id": tool_call.id,
                        "type": "function",
                        "function": {
                            "name": name,
                            "arguments": json.dumps(args)
                        }
                    }]
                })

                # 添加 tool 执行结果
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                })

            # 再次请求模型以获得最终回复
            second_response = await self.oai_client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                stream=True
            )

            async for chunk in second_response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            if choice.message.content:
                yield choice.message.content
```

@classmethod 是 Python 的一个装饰器，用来定义**类方法**（class method）。它和普通方法（实例方法）最大的区别在于：

```python
class MyClass:
    @classmethod
    def say_hello(cls):
        print(f"我是类方法，我属于 {cls.__name__}")

MyClass.say_hello()  # ✅ 不用创建实例就能调用
```

**✅ 常见用途**

1.	**工厂方法**：根据不同参数创建类的不同实例。

2.	**工具注册器**（就像你现在的 BaseTool.register）。

3.	**修改类变量**。

| **装饰器** | **第一个参数** | **是否能访问类** | **是否能访问实例** |
| --- | --- | --- | --- |
| @staticmethod | 无 | ❌ | ❌ |
| @classmethod | cls | ✅ | ❌ |
| 普通方法 | self | ✅（通过 self.__class__） | ✅ |