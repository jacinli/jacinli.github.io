# 介绍

SSE（Server-Sent Events）是一种 **服务器主动向客户端“推送”数据的技术**，特别适合用来实现像 GPT 这种「流式输出」的效果。

**SSE 是一种基于 HTTP 的单向通信协议**：

•	客户端（浏览器）发起请求后

•	服务器可以不断「推送消息」给客户端

•	使用 MIME 类型：text/event-stream

•	天然支持断线重连（Last-Event-ID）

用途

```
•	🌊 流式响应（比如 GPT、AI 对话）
•	📢 实时通知 / 消息广播
•	📈 实时数据更新（股票、仪表盘）
•	🧠 AI 推理过程展示
```

服务端：

```python
用两个换行分割
data: 这是第一条消息

data: 这是第二条消息

data: {"event": "update", "msg": "更新成功"}
```

# 实现

使用fastapi 非常容易实现

定义一个接口，在这个接口定义一个async 异步方法，这个方法使用yield 生产对应的信息。

使用StreamingResponse 来对这个方法进行生产捕获

```python
from fastapi import FastAPI,Request
from fastapi.responses import StreamingResponse
from services.async_openai_out import async_openai_out
import asyncio
app = FastAPI()

@app.post('/sse/v1')
async def root(request: Request):
    async def event_stream():
        for i in range(10):
            yield f"data: {i}\n\n"
            await asyncio.sleep(0.1)
    # 用了 Python 的参数顺序机制，你看到的 content 参数确实就是你传入的 event_stream()。
    r = StreamingResponse(event_stream(), media_type="text/event-stream")
    return r
```

这个StreamingResponse 是一个异步响应类，支持将内容「一块一块」地异步地发送给客户端，而不是像普通 Response 一次性构造整个响应体。

```
•	发送响应时，Starlette 会通过 __call__ 调用 stream_response 方法，将响应体通过 await send() 一块块地推送给客户端。
•	你传入的 AsyncGenerator 会成为 body_iterator。

```

```python

ContentStream = typing.Union[AsyncContentStream, SyncContentStream]
class StreamingResponse(Response):
    body_iterator: AsyncContentStream

    def __init__(
        self,
        content: ContentStream,
        status_code: int = 200,
        headers: typing.Mapping[str, str] | None = None,
        media_type: str | None = None,
        background: BackgroundTask | None = None,
    ) -> None:
 
 	•	AsyncContentStream: 异步生成器、异步迭代器（如 async def event_stream(): yield ...）
	•	SyncContentStream: 同步的可迭代对象（如 def gen(): yield ...）
```

这个SSE的curl 和普通的post一样：

```python
curl --location --request POST 'http://localhost:8000/sse/v1' \
--header 'User-Agent: Apifox/1.0.0 (https://apifox.com)' \
--header 'Accept: */*' \
--header 'Host: localhost:8000' \
--header 'Connection: keep-alive'
```

不过返回的响应头里面：

```python
date	Sat, 22 Mar 2025 07:29:57 GMT
server	uvicorn
content-type	text/event-stream; charset=utf-8
Transfer-Encoding	chunked
```

FastAPI 会根据 **返回值的类型自动推断并构造响应对象**，这是因为 FastAPI 的底层用了 Pydantic + Starlette 自动序列化机制。

普通的post 响应请求：

```python
@app.post('/sse/no_sse')
async def root(request: Request):
    r = {"message": "Hello World"} # 也可以直接返回return r
    return Response(content=json.dumps(r), media_type="application/json")
    
 
from fastapi.responses import JSONResponse

@app.post("/sse/no_sse")
async def root():
    return JSONResponse(content={"message": "Hello World"})
```

封装为openai使用的sse:

注意这个 yield f'data: {chunk}\n\n'  少不了

```python
@app.post("/sse/async_openai_out")
async def root(request: Request):
    user_message = "你好"
    async def gpt_stream():
        async for chunk in async_openai_out.gpt_stream(user_message=user_message,system_prompt="You are a helpful assistant."):
            print(chunk)
            yield f'data: {chunk}\n\n'
    r = StreamingResponse(gpt_stream(), media_type="text/event-stream")
    return r
```

# 一些思考

- “**StreamingResponse 内部是如何 send() 的？**”
    
    FastAPI 的 StreamingResponse 继承自 Starlette 的 Response，其关键机制是异步迭代器（AsyncIterable）。核心在 **call**() 中调用了：
    

```python
async def stream_response(self, send):
    async for chunk in self.body_iterator:
        await send({
            "type": "http.response.body",
            "body": chunk,
            "more_body": True
        })
```

- **为什么 text/event-stream 是长连接 + 推送？**
    
    **HTTP 长连接：**
    
    •	SSE 使用的是 HTTP/1.1 长连接，不会在发送完一条消息后断开。
    
    •	响应头 Content-Type: text/event-stream 告诉浏览器或客户端：“我会不断推送数据”。
    
    2.	**服务端推送格式：**
    
    •	每条消息格式是：data: xxxx\n\n