---
layout: post
title: "asyncio 与 uvloop"
date: 2025-06-22
description: "asyncio 与 uvloop"
tag: python
---

# 事件循环

**事件循环 = 协调所有协程执行的中央调度器，它通过非阻塞机制，实现并发执行多个异步任务。**

事件循环是 **异步编程的核心机制**，用一句话概括就是：

> 事件循环不断检查任务队列，一旦某个异步任务完成，它就调用该任务的回调并继续循环执行。
> 

它的目标是：**非阻塞地执行多个任务（如 I/O、网络请求）**，避免因为等待某个任务而卡住整个程序。

| **概念** | **说明** |
| --- | --- |
| 协程（coroutine） | 你写的 async def 函数 |
| 任务（Task） | 协程包装成可调度对象，由事件循环驱动执行 |
| Future | 代表“未来某个时间点”的值；Task 是它的子类 |

```jsx
async def xxx():
   ↓
coroutine obj
   ↓
Task.create
   ↓
注册到 event loop
   ↓
loop.run_until_complete()
   ↓
调度、挂起、恢复...
```

事件循环最大的优势在于：**可以在等待 I/O（如网络、磁盘）时释放 CPU 去执行其他任务**。

- 并发网络请求（aiohttp）
- 异步数据库访问（如 asyncpg）
- Web 框架（FastAPI、Sanic）
- 实时任务调度系统（如定时器、爬虫）

# asyncio

asyncio 是 Python 3.4 引入的标准库，**用于编写协程式的异步代码**。它的核心包括：

- 事件循环（Event Loop）
- 协程（Coroutine）
- Task / Future 管理
- 异步 I/O 支持（网络、文件、子进程等）
- 高级工具（如 asyncio.gather()、Queue、锁等）

**本质：asyncio 提供了一个异步框架，用于非阻塞的 I/O 编程。**

# **uvloop**

uvloop 是一个用 **Cython** 编写的 **高性能事件循环实现**，替代默认的 asyncio 事件循环。它基于 [libuv](https://github.com/libuv/libuv)（Node.js 的底层库），因此性能极佳。

### **特点：**

- 全兼容 asyncio 接口
- 性能提升 2~4 倍（实际测试中）
- 安装简单，几乎无缝切换

# 比较

**uvloop 比默认 asyncio 更快，本质原因在于事件循环的底层实现完全不同：uvloop 用 C/Cython 构建并基于 libuv，而默认 asyncio 用纯 Python 和 selectors 实现，性能存在数量级差异。**

| **特性** | **asyncio（默认事件循环）** | **uvloop（替代实现）** |
| --- | --- | --- |
| 性能 | 中规中矩 | 高性能、近 C 语言速度 |
| 实现语言 | 纯 Python + C | Cython + libuv |
| 使用方式 | 内置、开箱即用 | pip 安装 + 手动设置 |
| 兼容性 | 官方标准 | 完全兼容 asyncio |

| **实现** | **吞吐量（req/s）** | **延迟（ms）** |
| --- | --- | --- |
| asyncio | 5,000 req/s | 20ms |
| uvloop | 15,000 req/s | 7ms |

| **使用场景** | **推荐使用** |
| --- | --- |
| CPU 密集型任务 | ❌ 不适合 asyncio（建议多线程或多进程） |
| I/O 密集型任务（网络、文件等） | ✅ 推荐 asyncio + uvloop |
| 高并发服务（Web、代理、网关等） | ✅ 强烈推荐 uvloop 提升吞吐和稳定性 |

❗**uvloop 是不支持 Windows 的！它是专为 Unix/Linux/macOS 优化的高性能事件循环。**

- uvloop 是基于 **libuv** 实现的，而 libuv 的 **Windows 支持不适合用作 Python 的事件循环替代**。
- Windows 的 asyncio 默认使用的是 ProactorEventLoop（基于 IOCP），和 libuv 的模型完全不同。

使用 uvloop 来实现 高并发 部署：

```jsx
CMD ["uvicorn", "web.main:app", "--host", "0.0.0.0", "--port", "8077", "--loop", "uvloop", "--http", "h11"]
```

| **维度** | asyncio**（默认事件循环）** | uvloop |
| --- | --- | --- |
| 实现语言 | Python + 少量 C | Cython + [libuv](https://github.com/libuv/libuv)（C语言） |
| 底层机制 | 使用 selectors（如 epoll/kqueue）做调度，Python 层调度任务和回调 | 直接使用高性能 libuv，类似 Node.js 的底层模型 |
| 调度逻辑 | Python 层事件循环和回调调度开销较大 | C 层事件循环和回调分发更快，几乎无 Python 层切换开销 |
| 系统调用封装 | Python 层对 socket/select 封装 | C 层封装系统调用，效率极高 |
| GC 压力 | 更多 Python 对象交互 | 减少 Python 调度逻辑，内存压力更小 |

- 在 asyncio 中，事件循环会：
    1. 通过 selectors 监听 socket 是否可读
    2. 如果 socket 可读，则通过 Python 层的回调触发处理
    3. 执行用户协程，继续 await…

这个过程中：

👉 Python 层频繁调用回调函数、切换上下文、管理 Future 状态，**调度开销较大**

---

但 uvloop 做了什么？

- 使用 C 写的 libuv 做事件循环（本来就是 Node.js 的核心）
- 所有事件监听、回调调度、超时处理等都在 C 层完成
- Python 只负责“最终执行协程”，调度工作都交给高性能 C 层完成

> 所以：
> 
> 
> **uvloop 省去了 Python 层大量的中间操作，减少了解释器层面的性能瓶颈。**
> 

uvloop 主要提升在：

- **I/O 调度速度**
- **协程切换效率**
- **回调调用效率**

但对于 **CPU 密集型任务**（如复杂数据处理、机器学习），**uvloop 并不会提升太多**，应考虑多进程或线程池。

**uvloop 比 asyncio 快的本质在于：它把事件循环和 I/O 调度从 Python 层搬到了高效的 C 层（libuv），最大限度减少了解释器负担。**