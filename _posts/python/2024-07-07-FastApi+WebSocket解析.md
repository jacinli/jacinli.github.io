---
layout: post
title: "FastApi+WebSocket 解析
date: 2024-07-07
description: "FastApi+WebSocket 解析"
tag: python
---   

FastAPI 比较简单，就是加一个路由装饰器就可以运行函数了，一般来说是结合async来进行异步编程，同时结合websocket来使用。

# 特点
FastAPI 是一个现代、快速（高性能）的 Web 框架，用于构建 API，特别适合于构建微服务。它基于标准 Python 类型提示，这使得它的一大特点是**自动数据验证和自动生成 API 文档**（包括 Swagger 和 ReDoc）。FastAPI 支持**异步编程**，允许开发者利用异步和等待关键字来编写非阻塞代码，从而提高性能。它的设计简洁且易于扩展，在开发高性能应用程序时特别有用。FastAPI **没有提供自带的数据库系统或前端组件**，它专注于 API 的快速开发和运行效率。

# 运行
安装：

```bash

安装 
pip install fastapi
安装部署包
pip install uvicorn
```
main.py:

```python
from fastapi import FastAPI

app = FastAPI()
# 用来创建一个 FastAPI 应用的实例。这个实例作为你构建 API 的基础，
#会通过它来定义路由、中间件、事件处理器等。
#每个 FastAPI 应用都需要至少一个这样的实例，以便启动和运行服务。这是设置你的 API 服务器的起点，后续的所有操作（如添加路由、请求处理函数等）都将基于这个实例进行配置。


@app.get("/")
def read_root():
    return {"Hello": "World"}

```
运行命令：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
main: 表示app所在文件名
app：FastAPI实例
reload：debug模式，可以自动重启
```
访问查看API 文档

```python
交互文档
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/redoc
返回接口文档
```
路径装饰器：

```python
@app.get("/")
'''
@app.get("/") 告诉 FastAPI 在它下方的函数负责处理如下访问请求：

请求路径为 /
使用 get 操作
你也可以使用其他的操作：
    @app.post()
    @app.put()
    @app.delete()
    以及更少见的：
    @app.options()
    @app.head()
    @app.patch()
    @app.trace()
这些对应都是请求方式 '''
```

将特定的函数绑定到对根 URL（"/"）的 HTTP GET 请求。这意味着当 FastAPI 应用接收到一个指向根 URL 的 GET 请求时，它会执行这个装饰器下方定义的函数。

```python
@app.get("/print")
def print_demo():
    print('Hello')
    return {"Hello"}
# 此时输入的时候就会在控制台输出Hello
# web页面显示["Hello"]
```
函数执行并达到 return 语句时，函数返回的值会被 FastAPI 自动处理，并转换为 **JSON 格式（**除非指定其他格式），然后作为 HTTP 响应体发送给客户端。返回内容可以是dict，也可以是list， str、int 等都可以。

带参数

```python
@app.get("/{name}")
def root(name):
    return {"name": name}

# 访问 /john，你会得到响应 {"name": "john"}。
# 可以匹配任何字符串，除非有其他更具体的路径匹配先发生。
```

# Websocket
WebSocket是一种通过单个长时间连接**提供全双工通信渠道**的协议。它允许**客户端和服务器之间发送实时消息**，而不需要重新建立连接，这对于实时应用程序如在线游戏、聊天应用或实时数据传输非常有用。WebSocket连接在HTTP端口上初始化，然后通过握手升级到WebSocket协议，允许数据以帧的形式来回传输。这种机制减少了延迟，提高了通信效率，并且可以通过WebSocket API在许多编程语言中实现。
下面的接口测试可使用ApiFox 对ws进行测试

```python
from fastapi import FastAPI, WebSocket
```

```python
@app.websocket("/ws")
#浏览器或其他客户端使用如ws://127.0.0.1:8000/ws这样的WebSocket URL尝试连接服务器时，这个websocket对象就会被初始化，并且通过这个对象，服务器能够接收和发送消息，管理连接的状态等。
async def websocket_endpoint(websocket: WebSocket):
#函数接收一个WebSocket类型的参数websocket，用于处理WebSocket连接。
    await websocket.accept()
    #  服务器接受客户端的WebSocket连接请求。
    while True:
        data = await websocket.receive_text()
        #文本消息。
        if data == "bye":
        	# 发送信息
            await websocket.send_text(f"接受到的消息是: {data}")
            await websocket.send_text("聊天关闭")
            await  websocket.close(100)
        else:
            await websocket.send_text(f"接受到的消息是: {data}")
```
测试的接口地址：

```python
ws://127.0.0.0:8002/ws
```
# 进阶

```python

if config.DEBUG:
    app = FastAPI(lifespan=lifespan, debug=True)
else:
    app = FastAPI(lifespan=lifespan, docs_url=None, openapi_url=None, redoc_url=None)
# 正在关闭自动生成的文档链接。默认情况下，FastAPI 会在 /docs 和 /redoc 路径提供 Swagger 和 ReDoc 的文档界面。通过将这些参数设置为 None，可以禁用这些接口，这通常用于生产环境中，以隐藏 API 文档。
DEBUG = any(i in SERVICE_NAME for i in ["dev", "test"])
# 如果service_name存在dev和test那么默认是debug，并且为true
```
**debug=True** 主要用于API的错误处理和调试信息的输出，而 **--reload** 选项是指让服务器在代码改变时自动重新加载
lifespan 参数用来管理应用的生命周期事件。通过设置 lifespan，可以定义应用在启动和关闭时执行的特定函数。例如，在应用启动时，你可能需要连接数据库，而在应用关闭时，关闭这些连接。

结构化导入api:

```python
from routers import api,, ws
app.include_router(ws.router)
app.include_router(api.router)

```

```python
router = APIRouter(prefix="/ws", tags=["websocket"])
@router.websocket("/chat")
async def chat(ws: WebSocket, auth_result=Depends(websocket_authentication)):
    await ws.accept()

    current_user, error = auth_result
    if error:
        logger.warning(f"Authentication failed: {error}")
        await ws.send_json({"status": AUTHENTICATION_FAILED_40001, "message": f"Authentication failed: {error}"})
        await ws.close()
        return

    async for req in ws.iter_json():
        handler = MsgHandlerFactory.get_handler(
            ws=ws,
            token=ws.query_params.get("token"),
            current_user=current_user,
            request_data=req,
        )
        await handler.run()

```
顶部定义一个 APIRouter 实例，这意味着你正在创建一个特定的路由处理器。这个实例会被用来**注册与 WebSocket 相关的路由。**。在这个过程中，Depends(websocket_authentication) 会确保在处理任何其他逻辑之前执行 websocket_authentication 函数。这意味着每次客户端尝试通过 /chat 建立连接时，都会先进行身份验证。
如果验证成功，auth_result 将包含用户信息；如果失败，则可能包含错误信息。此设计确保只有验证通过的连接才能进一步交互。

ws身份验证：

```python
async def websocket_authentication(ws: WebSocket):
    token = ws.query_params.get("token")
    service = ws.query_params.get("service", "XXXXX")
    set_request_id(str(uuid4()))
    authorizer = {
        "XXXXX": XXXX_core_sdk,
    }.get(service)

    if not authorizer:
        return {}, "unsupported service"
    if not token:
        return {}, "token not found"

    current_user = await authorizer.check_auth(token)
    if not current_user:
        return {}, "invalid token"
    return current_user, None
```

ws url 参数说明：
ws.query_params.get("token") 表示代码正在尝试从 WebSocket 连接的**查询参数**中获取 token。这意味着 token 作为 URL 的一部分传递，类似于 ws://example.com/chat?token=yourtokenhere。

**WebSocket API中，常用的方法包括**：

send_text(data): 发送文本数据到WebSocket服务器。
receive_text(): 接收来自WebSocket服务器的文本数据。
send_bytes(data): 发送二进制数据到WebSocket服务器。
receive_bytes(): 接收来自WebSocket服务器的二进制数据。
**send_json(data): 发送JSON格式的数据到WebSocket服务器。这是一个便捷方法，它自动将Python字典或列表序列化为JSON字符串。**
receive_json(): 接收JSON格式的数据，并将其反序列化为Python对象。
close(code=1000, reason=''): **关闭WebSocket连接，可以指定关闭代码和原因**。
这些方法通常用于在客户端和服务器之间进行双向实时通信。使用时需要注意适当处理连接状态，确保在连接开启后发送和接收数据，以及在结束通信时关闭连接。