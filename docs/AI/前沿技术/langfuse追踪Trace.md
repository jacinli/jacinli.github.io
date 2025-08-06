# 目录
[[toc]]

## 介绍

**🧠 Langfuse 是什么？**

**Langfuse** 是一个专门为 **LLM 应用（如 OpenAI / LangChain / 自定义 Agent）** 设计的 **观测与追踪平台（Observability Platform）**。

> 简单说，它就像是你为 AI 应用插上的 “黑匣子”，可以记录每一次调用过程、上下文、耗时、错误等信息，并提供 Web UI 让你可视化分析和优化。
> 

| **功能点** | **说明** |
| --- | --- |
| ✅ **Trace 跟踪** | 记录一次完整的 LLM 调用链，比如一次聊天过程，包括用户 prompt、系统 prompt、返回内容、调用链层级等 |
| ✅ **Span 子操作** | 一个 trace 下可以有多个 span（子调用），如多个 tool / 多轮交互 |
| ✅ **输入输出分析** | 自动记录 Input / Output，你可以看到用户发了什么，模型怎么回复的 |
| ✅ **Latency 分析** | 每一次调用的响应时长都可以量化，方便排查性能瓶颈 |
| ✅ **Token 数 / 成本监控** | 可以监控 token 用量，估算成本（需开启） |
| ✅ **评分与注释** | 给每一次 trace 添加人工评分（比如 “有帮助” / “无帮助”）用于模型评估 |

| **概念** | **说明** |
| --- | --- |
| trace | 一次完整的调用追踪，包含多个 span。如整个 gpt_stream 的过程。 |
| span | trace 下的一个步骤，如一个实际的 OpenAI 调用。 |

| **能力** | **用法** |
| --- | --- |
| 🎯 **评分机制** | 为用户反馈设置评分，用于训练 or 评估 |
| 🧪 **A/B Test** | 同样输入不同策略，对比效果 |
| 📊 **数据导出** | 可导出为数据集，用于模型微调或打分 |
| 🧱 **集成 LangChain** | 一行接入 langfuse_callback_handler |
| ☁️ **自托管** | 提供 Docker 安装，自建私有平台 |

相关界面：

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250323234357046.png)

## 使用

注册langfuse类

本来想使用装饰器的，发现 没什么用，还是用langfuse类 去实现吧

```python
from langfuse import Langfuse
import os
from functools import wraps

class LangfuseService:
    def __init__(self):
        self.langfuse = Langfuse(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            host=os.getenv("LANGFUSE_HOST")
        )

    def trace_langfuse_generator(self, name="default-trace", user_id="anonymous"):
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                trace = self.langfuse.trace(name=name, user_id=user_id)
                span = trace.span(name=func.__name__)
                try:
                    async for chunk in func(*args, **kwargs):
                        yield chunk
                    span.end()
                except Exception as e:
                    span.end(output=f"Error: {str(e)}")
                    raise
            return wrapper
        return decorator
        
    
langfuse_service = LangfuseService()
```

在gpt类里面：

注意默认不支持流式的捕捉，所以需要在+= 捕捉流式的总输出

```python
async def gpt_stream_with_langfuse(self, user_message: str, model: str = None, history: list[dict] = [], system_prompt: str = ""):
        trace = langfuse_service.langfuse.trace(name="gpt_stream", user_id="user-123")
        span = trace.span(name="gpt_stream_call")

        try:
            messages = []
            if history:
                messages.extend(history)

            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            messages.append({"role": "user", "content": user_message})

            # 🔍 添加 input
            span.update(input={"messages": messages})

            response = await self.oai_client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                stream=True
            )

            full_response = ""
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    full_response += chunk.choices[0].delta.content
                    yield chunk.choices[0].delta.content

            # 🔍 添加输出
            span.end(output=full_response)
            trace.update(output=full_response)
        except Exception as e:
            span.end(output={"error": str(e)})
            trace.update(output={"error": str(e)})
            raise
```

创建一个 **Trace 对象**，用于记录一次完整的 LLM 调用。

| **参数** | **说明** |
| --- | --- |
| name | 这条 trace 的名称（可在 Langfuse UI 中看到，例如 gpt_stream） |
| user_id | 用户 ID，用于后续用户行为归因、分析（比如标记为匿名用户 user-123） |

### Trace

Trace 是一个“顶层调用上下文”，可以理解为：

•	用户发起了一次聊天、搜索、问答请求

•	系统执行了一系列动作（调用 OpenAI、函数工具、数据库等）

•	我们希望把这整个过程的输入输出、耗时、状态都记录下来

**✅ 返回值：**

返回的是一个 StatefulTraceClient 对象，后续你可以通过它：

•	添加 **子步骤 span**

•	更新 trace 内容（例如设置最终输出）

•	获取 Langchain 回调器（如果用 Langchain）

返回的是一个 StatefulTraceClient 对象，后续你可以通过它：

•	添加 **子步骤 span**

•	更新 trace 内容（例如设置最终输出）

•	获取 Langchain 回调器（如果用 Langchain）

### Span

创建一个 **Span 子操作**，用于追踪 Trace 内部的一个子任务/子步骤。

| **Trace Name** | **Span Name** | **说明** |
| --- | --- | --- |
| gpt_stream | gpt_stream_call | 执行大模型聊天请求的调用 |
| gpt_stream | get_weather_tool | 触发了工具函数 get_weather |
| gpt_stream | vector_search | 进行了向量检索 |

**📘 Span 是什么？**

•	是 Trace 中的一个步骤

•	有自己的 start / end 生命周期

•	可以添加 input / output / 错误等信息

```python
trace = langfuse_service.langfuse.trace(name="gpt_stream", user_id="user-123")
span = trace.span(name="gpt_stream_call", input={"question": "北京的时间是多少？"})

try:
    # 你的业务逻辑
    result = await openai_call()  # 比如调用 openai 的 chat 接口
    span.end(output=result)       # 结束 span，并记录结果
    trace.update(output=result)   # 更新整个 trace 的 output
except Exception as e:
    span.end(output=f"Error: {str(e)}")
    raise
```

| **概念** | **类比** | **作用** |
| --- | --- | --- |
| Trace | 顶层调用流程 | 跟踪一次完整的用户请求（入口 -> 响应） |
| Span | 调用链中的子步骤 | 可以是一次调用、函数、搜索、判断等操作 |