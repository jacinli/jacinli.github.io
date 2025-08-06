# 介绍

开源地址： https://github.com/tadata-org/fastapi_mcp

FastAPI-MCP 是一个开源项目，旨在简化 FastAPI 应用与现代 AI 代理（如基于大语言模型的系统）之间的集成。它通过自动将 FastAPI 的所有 API 端点暴露为符合 Model Context Protocol（MCP）标准的工具，使得 AI 代理能够直接调用和理解这些接口，整个过程无需额外配置，极大地降低了开发者的集成难度。

## **主要功能**

- **零配置自动化**：无需手动配置，FastAPI-MCP 会自动发现 FastAPI 应用中的所有端点，并将它们转换为 MCP 工具。
- **直接集成**：可以将 MCP 服务器直接挂载到现有的 FastAPI 应用中，或者选择单独部署 MCP 服务器，灵活适应不同架构需求。
- **保持模型和文档完整性**：自动保留请求和响应模型的 JSON Schema，以及原有的 Swagger/OpenAPI 文档，确保 AI 代理能够准确理解接口的调用方式和数据结构。
- **支持 ASGI 传输**：默认通过 FastAPI 的 ASGI 接口高效通信，无需额外的 HTTP 请求，提升性能。
- **灵活的端点筛选**：可以通过操作 ID 或标签来包含或排除特定的 API 端点，方便控制暴露给 MCP 的工具集合。
- **支持动态更新**：在添加新的 FastAPI 端点后，可刷新 MCP 服务器以包含新增接口。

- fastapi-mcp 插件是为了支持 [MCP 大模型上下文协议](https://github.com/ModelContextProtocol/mcp) 的 OpenAPI 扩展。
- 如果你想让多个 LLM 工具（如通义、智谱）可以自动理解你的 API，用这个是很合适的。
- 要让 MCP 生效，关键在于：
    - 所有路由必须要有 operation_id
    - 接口请求/响应最好都带 description、summary

# 运行说明

服务端：

```python
from fastapi import FastAPI
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel
app = FastAPI()

# ✅ 请求体模型
class ItemRequest(BaseModel):
    item_id: int

# ✅ POST 接口 + operation_id + 请求体
@app.post("/mcp/get_item", operation_id="get_item")
async def get_item_mcp(req: ItemRequest):
    return {"item_id": req.item_id, "name": f"Item {req.item_id}"}
# MCP 实例化
mcp = FastApiMCP(app)

mcp.mount(mount_path="/mcp")  # 👈 挂载 MCP endpoint 到 /mcp
# 如果你想暴露 openapi 文档
@app.get("/mcp/openapi.json", include_in_schema=False)
async def get_openapi():
    return app.openapi()
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

> operation_id 是**每个 API 接口的唯一标识符**
> 

代表这个接口在 OpenAPI 文档中是唯一识别为 "get_item" 的操作。

**✅ 为什么 operation_id 很重要？**

因为 **MCP 协议、Coze、通义、百川等大模型对接平台**，都依赖 operation_id 来知道你要调用哪个接口！

客户端：

```python
from fastapi_mcp_client import MCPClient
import asyncio

async def main():
    async with MCPClient("http://localhost:8000/mcp") as client:
        result = await client.call_operation("get_item", {"item_id": 123})
        print(result)

asyncio.run(main())
```

**🔧 MCP 调用时长这样：**

👉 这里 "get_item" 对应的就是你 FastAPI 中的,如果你没写 operation_id，FastAPI 默认会自动生成一个，比如："operationId": "get_mcp_get_item_mcp_get_item_post”,但是大模型不知道怎么调用了。

```python
client.call_operation("get_item", {"item_id": 123})
```

你必须满足 MCP 的接口结构要求：

| **项目** | **要求说明** |
| --- | --- |
| 请求方法 | POST（MCP 默认使用） |
| 请求体（body） | ✅ 使用 Pydantic 模型接收 |
| operation_id | ✅ 必须与 call_operation 保持一致 |

> 🚨 MCP 接口一定要你自己**手动指定 operation_id**
> 

| **项目名** | **意义说明** |
| --- | --- |
| operation_id | 接口唯一代号，供外部调用识别使用 |
| 和路由无关 | 和 @app.post("/path") 的路径、函数名都可无关 |
| 对接必须有 | MCP、Coze、千问等大模型调用你接口时就靠它识别 |

# 拆解MCP

这个 MCPClient 究竟干了什么，以及 MCP 协议到底是个“什么鬼”——为什么它虽然走的还是 HTTP，却变成了大模型通用对接的标准。

## **✅ 本质还是 HTTP，但它封装了调用协议 + 结构化文档 + 标准化调用方式**

> MCP（Model Context Protocol）不是新协议，而是为大模型定制的 OpenAPI 子集标准，让模型能「看得懂、调得对、调得稳」你的接口。
> 

### **✅ 1. HTTP 是传输协议（干活的快递员）**

- 确实所有请求最终走的都是 HTTP，比如：

```python
POST /mcp/get_item
Body: {"item_id": 123}
```

### **✅ 2. OpenAPI 是接口描述文档（接口说明书）**

- 帮助工具了解你这个接口长什么样：
    - 接口路径
    - 请求参数
    - 响应结构
    - operation_id

### **✅ 3. MCP 是大模型「能读懂」的 OpenAPI 子集标准**

- 它是为大模型设计的接口文档格式，比如：
    - 增加了 x-modelcontext 扩展字段
    - 精简了 OpenAPI 的复杂内容
    - 强调每个接口都要 operation_id、description、参数结构清晰

### **✅ MCPClient就是个“模拟大模型”的客户端**

```python
async with MCPClient("http://localhost:8000/mcp") as client:
    result = await client.call_operation("get_item", {"item_id": 123})
```

等价于下面这几步自动化操作：
1. **发请求到：**

```python
GET http://localhost:8000/mcp/openapi.json
```

2. **读取到这个 JSON 文件中的内容，找到 operation_id = get_item 的接口：**

```python
{
  "operationId": "get_item",
  "path": "/mcp/get_item",
  "method": "POST",
  "parameters": ...
}
```

3. **自动生成一个 HTTP 请求并发送：**

```python
POST /mcp/get_item
Content-Type: application/json

{
  "item_id": 123
}
```

1. **返回响应**

本质客户端就是封了一层！！！

这就是 Coze / 通义 / 百川 / 智谱对接你 API 的方式！

使用openai来测试：

```python
import openai
import json
import requests
import os
from dotenv import load_dotenv  
load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL"),
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_item",
            "description": "根据 item_id 获取商品信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "integer",
                        "description": "商品 ID"
                    }
                },
                "required": ["item_id"]
            }
        }
    }
]

# 发起 Tool Call 请求
response = client.chat.completions.create(
    model="moonshot-v1-8k",
    messages=[
        {"role": "user", "content": "请获取 item_id 为 123 的商品信息"}
    ],
    tools=tools,
    tool_choice={"type": "function", "function": {"name": "get_item"}},
)

# 提取函数调用内容
tool_call = response.choices[0].message.tool_calls[0]
func_name = tool_call.function.name
args = json.loads(tool_call.function.arguments)

# 实际调用你本地 MCP 接口
mcp_result = requests.post(f"http://localhost:8000/mcp/{func_name}", json=args)
print("🟢 MCP 响应：", mcp_result.json())
```

### **❓现在有没有一个“完全自动化 MCP 接口调用”的服务？**

**结论：**

> ❌ OpenAI / Moonshot / 通义 等大模型
> 
> 
> **当前都不内建自动调用你接口的能力**
> 
- 它们可以识别你的 openapi.json
- 可以生成 tool_call
- 但 **不会真的“帮你发请求去调接口”**，你必须自己**中转调用**
    
    > ✅ 所以“闭环”仍需你在中间处理 tool_call ➝ 实际 HTTP 请求 ➝ 再补 messages ➝ 再发一轮
    > 

```python
大模型 = 调用建议器（Tool Caller）
你 = Tool Executor（工具执行者）
```

## **✅ 那有没有“自动 MCP 执行”的系统？**

| **系统/平台** | **是否支持自动调用** | **说明** |
| --- | --- | --- |
| 🔵 [LangChain](https://www.langchain.com/) | ✅ ✅ ✅ | 可以集成 OpenAPI Toolkit + tool 调用自动发 HTTP 请求 |
| 🟣 [Flowise](https://github.com/FlowiseAI/Flowise) | ✅（需要配置） | 可加载 openapi 并自动调接口 |
| 🟢 自建 LLM 代理服务 | ✅（推荐） | 自己封装 tool_call → HTTP 调用 → 补回 → 完整闭环 |
| 🔴 OpenAI 官方 | ❌ | 不负责接口调用，tool_call 只是调用计划 |
| 🟡 Moonshot Kimi | ❌ | 行为和 OpenAI 相同 |

可自己封装一个自动执行的：

```python
用户说：请获取 item_id 为 123 的商品

⬇️

大模型返回：
tool_call = {"name": "get_item", "args": {"item_id": 123}}

⬇️

代理服务自动识别 → 请求 http://localhost:8000/mcp/get_item

⬇️

再构造：
messages = [
  {"role": "user", "content": "..."},
  {"role": "assistant", "tool_calls": [...]},
  {"role": "tool", "tool_call_id": "...", "content": "{实际返回值}"},
]

⬇️

再继续调用一次 LLM → 得到最终文本回复
```