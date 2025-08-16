# 目录

[[toc]]

可以使用 one-api 进行 统一管理 API 服务。这样参数 base_url 和 api_key 就是无所谓的了，那么只有 model 就可以了。

![](https://public.jacin.me/blog/img/2025/08/f78dcce3e18fdffbe9a001bedfa954cc-1755326070.png)

## 基本对话函数使用

```go
import asyncio
import json
from typing import AsyncGenerator,Optional,List,Dict
from openai import AsyncOpenAI
from loguru import logger
from config import global_config

class ChatAiService:
    def __init__(self):
        self.oai_client = AsyncOpenAI(
            base_url=global_config.openai_api_base,
            api_key=global_config.openai_api_key
        )
        
    async def gpt_stream(self, user_message: str,model:str = "gpt-4o-mini",history:Optional[List[Dict]] = None,system_prompt:Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        AI流式输出迭代器，异步流式获取 OpenAI API 生成的回复
        :param user_message: 用户输入的消息
        :return: 逐块返回 AI 生成的文本内容
        """
        messages = []
        if history:
            messages.extend(history)
            # 格式如下： [{"role":"user","content":"北京的天气"},{"role":"assistant","content":"北京天气可以的"}]
        if system_prompt:
            # logger.info(f"系统提示：{system_prompt}")
            messages.extend([{"role": "system", "content": system_prompt}])

        messages.extend([{"role": "user", "content": user_message}])
        # logger.info(f"大模型请求内容：{messages}")

        # 发送流式请求
        response = await self.oai_client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,

        )

        async for chunk in response:
            chunk_content = chunk.choices[0].delta.content or ""
            # print(chunk_content)
            yield chunk_content  # 逐步返回数据
    
    async def gpt_chat_no_stream(self, user_message: str,output_format="json_object",model="gpt-4o-mini",system_prompt: str = "",history: Optional[List[Dict]] = None):
        """
        获取大模型回复内容，不进行流式输出
        """

        messages = []

        if system_prompt or output_format == "json_object":
            prefix = ""
            if output_format == "json_object":
                prefix = (
                    "You are a helpful assistant. Respond strictly with a valid JSON object only. "
                    "Do not include any extra text.\n\n"
                )
            messages.append({"role": "system", "content": prefix + system_prompt})
        
        if history:
            messages.extend(history)
            
        messages.extend([{"role": "user", "content": user_message}])
        
        # logger.info(f"大模型请求内容：{messages}")
        
        completion = await self.oai_client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object" if output_format in ["json_object"] else "text"}
        )

        return completion.choices[0].message.content if output_format != "json_object"  else json.loads(
            completion.choices[0].message.content)
    

    
chat_ai_service = ChatAiService()

if __name__ == "__main__":
    async def test_chat():
        system_prompt = "请你使用 json 回答，样式回复： {{result: 你好，我是小明，很高兴认识你}}"
        response = await chat_ai_service.gpt_chat_no_stream(user_message="你好", output_format="json_object", model="moonshot-v1-8k",system_prompt=system_prompt)
        print(response)
    async def test_chat_stream():
        system_prompt = "你是一个AI助手，请根据用户的问题，给出详细的回答。"
        # 下面这行不需要 await，直接拿到异步生成器
        stream = chat_ai_service.gpt_stream(
            user_message="你好，给我一百字的文字",
            model="moonshot-v1-8k",
            system_prompt=system_prompt
        )
        print("=============")
        # 使用 async for 而不是 for
        async for chunk in stream:
            print(chunk, end="", flush=True)

    asyncio.run(test_chat_stream())

```

## 细节注意与相关说明

如果是 out_put 是 json 格式的，注意 一定要在系统词加这个说明：

```go
You are a helpful assistant. Please respond with a JSON format.
```

OpenAI 的 Chat 接口接收一个 **messages 列表**，每个元素是：

```go
{"role": "system" | "user" | "assistant" , "content": str}
```

- system：设定全局行为/风格/约束（**应当放最前**，且通常只放一次）。
- user：用户输入。
- assistant：模型过往回复（作为“对话上下文”的一部分）。

**要点**：消息的**顺序**非常重要。通常建议顺序为：

1. system（可选，通常 0~1 条）
2. 历史对话（按时间顺序轮流出现 user/assistant）
3. 当前这轮的 user

```go
history = [
  {"role": "user", "content": "北京的天气"},
  {"role": "assistant", "content": "北京天气可以的"}
]
```

把它 **append 到当前对话前面**，模型就能“记住”上下文。

注意：

- history 里不要包含重复的 system 条（除非你真想覆盖之前的系统指令）。
- 历史越长，token 成本越高；应做**裁剪**或**摘要**。