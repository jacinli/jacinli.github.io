# CORS

**🔥 什么是 CORS（跨域资源共享）？**

> 跨域不是后端的问题，是**浏览器出于安全策略主动拦截**
> 

**✅ 关键点：Access-Control-Allow-Origin 是谁给谁的？**

•	**是后端响应头里给前端浏览器的**

•	告诉浏览器：✅ “我允许你这个来源访问我”

•	**如果没有这个头，或者值不对** —— 浏览器直接拦截，前端 JS 连响应内容都拿不到！

**🧠 浏览器执行流程：**

1.	🧾 浏览器发现请求是跨域的（不同域、端口、协议）

2.	🔍 发起一个预检请求（OPTIONS 方法，只有复杂请求才有）

3.	🛂 后端响应时 **必须带上这个 header**：

4.	❌ 如果没有这个头，或者值不匹配：

> ❗ 浏览器直接报
> 
> 
> **CORS 错误，并阻止前端 JS 获取任何返回内容（哪怕状态是 200、404）**
> 

**🧱 所以总结一句话：**

•	✅ **CORS 是浏览器行为**

•	❗ **后端必须主动返回 Access-Control-Allow-Origin 响应头**

•	🧠 **不符合就被浏览器“截胡”** —— 返回内容根本到不了 JS 层！

# OPTIONS 请求

**🌐 什么是 OPTIONS 请求？**

**它是浏览器为了 CORS 跨域安全机制自动发起的 “预检请求”（Preflight Request）**

**💡 为什么需要预检？**

因为有些跨域请求是 **“复杂请求”**，比如：

•	请求方法是：PUT / PATCH / DELETE / POST（但带了复杂的 header 或 content-type）

•	请求头中带了：Authorization / Content-Type: application/json 等非简单头

•	或者自定义 header，例如 x-token、x-request-id 等

**🛫 自动发出一个 OPTIONS 请求：**

```python
OPTIONS /aichat/pub_agent/expend/dict/ HTTP/1.1
Origin: https://your-frontend.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

如果使用OPTIONS 需要有这个origin的信息

```python
curl --location --request OPTIONS 'http://localhost:8000/api/json_config' \
--header 'Origin: http://example.com' \
--header 'User-Agent: Apifox/1.0.0 (https://apifox.com)' \
--header 'Accept: */*' \
--header 'Host: 49.232.244.254:8006' \
--header 'Connection: keep-alive'access-control-allow-origin	*
access-control-allow-credentials	tru
```

**🔹 浏览器发起的是 预检请求（OPTIONS）**

•	当前端请求包含自定义 Header、使用了复杂方法（如 PUT、PATCH、DELETE）或跨域时，浏览器会先发一个 OPTIONS 请求（预检）；

•	浏览器**不会**真正关心 OPTIONS 返回的内容本身，而是看响应头中是否有以下关键字段：

| **Header** | **含义** |
| --- | --- |
| Access-Control-Allow-Origin | 允许哪个域的前端访问 |
| Access-Control-Allow-Credentials | 是否允许携带 cookie 或身份验证 |
| Access-Control-Allow-Methods | 允许哪些请求方法（如 POST、GET） |
| Access-Control-Allow-Headers | 允许携带哪些自定义 header |

# 有**CORSMiddleware还是405？**

FastAPI 的 CORSMiddleware **是中间件**，它确实会拦截跨域的 OPTIONS 请求并**提前响应**，但是这个行为**只在请求包含 Origin 头时才生效**！

**🧠 也就是说：**

•	如果浏览器发起的 OPTIONS 请求没有带 Origin，那 CORSMiddleware **就不会拦截**；

•	请求会继续向后传给你的 API 路由系统；

•	如果你没有为该路由注册 OPTIONS 方法（你只有 POST），那就会返回 405 Method Not Allowed；

•	此时 CORS 头部信息不会再添加，**浏览器也看不到响应内容（被 CORS 拦截了）**。

这个请求虽然模拟了浏览器的 OPTIONS，但默认**并没有加 Origin**，所以：

•	CORSMiddleware 不处理；

•	请求走到路由系统；

•	/api/json_config 路由没有注册 OPTIONS；

•	FastAPI 返回 405；

•	浏览器检测到是跨域，又没看到 Access-Control-Allow-*，直接 CORS 拦截。

**✅ 正确行为模拟（curl）：**

```python
curl -X OPTIONS http://:/api/json_config \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST
```

✅ 如果你写了 CORSMiddleware，这条请求会被中间件拦截，然后返回 200 + CORS 响应头。

| **行为** | **是否中间件生效** |
| --- | --- |
| 请求不带 Origin | ❌ 不会触发 CORS 中间件 |
| 请求带 Origin | ✅ 会触发 CORSMiddleware 自动响应 |
| 没有注册 OPTIONS | ❌ 会 405，浏览器拦截 |

# 浏览器预检流程

**🌐 浏览器中的 CORS 预检流程（Preflight Request）**

前端 JS 想发一个“**可能有安全风险**”的跨域请求，比如：

```python
fetch("https://api.example.com/user", {
  method: "POST", // 非 GET/HEAD
  headers: {
    "Content-Type": "application/json", // 非简单头部
    "Authorization": "Bearer xxx"
  },
  body: JSON.stringify({ name: "张三" })
})
```

**💡 浏览器内部流程：**

1.	**浏览器先不会直接发 POST 请求**；

2.	它会先发一个 OPTIONS 请求 —— 这叫 **预检请求（preflight）**；

3.	这个 OPTIONS 请求包含：

•	Origin: http://你的前端.com

•	Access-Control-Request-Method: POST

•	Access-Control-Request-Headers: content-type, authorization

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定域名
    allow_methods=["*"],
    allow_headers=["*"]
)
后端配置
```

中间件就会识别这个 OPTIONS 预检请求，并直接返回 200，且带上这些头部：

```python
Access-Control-Allow-Origin: http://你的前端.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: content-type, authorization
```

**🎉 接着浏览器才会说：OK，放心了，我现在再发正式的 POST 请求！**

**❌ 如果后端不返回上述响应头？**

那浏览器 **根本不会继续发真实请求**，直接 **CORS 拦截，JS 拿不到任何信息**，甚至连 response 都访问不到。