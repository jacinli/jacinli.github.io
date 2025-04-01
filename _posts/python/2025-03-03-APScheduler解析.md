---
layout: post
title: "APScheduler解析"
date: 2025-03-03
description: "APScheduler解析,APScheduler异步,APScheduler异步写法"
tag: python
---


# 异步IO 定时(协程）

```python
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScheduleService:
    def __init__(self):
        self.fixed_times = ["08:00", "12:00", "18:00"]  # 固定调度时间列表
        self.scheduler = AsyncIOScheduler()

    async def fixed_task(self):
        logger.info("[定时任务] ✅ 执行固定时间任务逻辑")
        # TODO: 这里是你的异步业务逻辑
        await asyncio.sleep(1)  # 模拟异步操作
        logger.info("[定时任务] ✅ 执行完成")

    def add_jobs(self):
        for time_str in self.fixed_times:
            hour, minute = map(int, time_str.split(":"))
            self.scheduler.add_job(self._wrap_async(self.fixed_task), CronTrigger(hour=hour, minute=minute))
            logger.info(f"[调度器] 已添加定时任务: 每天 {hour:02d}:{minute:02d}")

    def _wrap_async(self, coro_func):
        """封装异步函数为 APScheduler 可调度的同步函数"""
        def wrapper():
            asyncio.create_task(coro_func())
        return wrapper

    def start(self):
        self.add_jobs()
        self.scheduler.start()

if __name__ == "__main__":
    service = ScheduleService()
    service.start()
    logger.info("[服务启动] Scheduler 已启动")
    asyncio.get_event_loop().run_forever()

```

**🔍 背后原因：apscheduler 的 job 函数是同步调用的**

虽然我们使用的是 AsyncIOScheduler（支持 asyncio 的调度器），但是它 **内部的 add_job() 方法要求传入的是一个** *普通函数（sync function）*，而不是 async def 的协程函数。

这个 wrapper() 是普通函数，apscheduler 就可以调度它，而它内部通过 asyncio.create_task() 启动了异步任务。

| **你的调度器** | **Job函数要求** | **你传的是** |
| --- | --- | --- |
| AsyncIOScheduler | 仍然是同步函数 | 所以要把 async def 包成 def |

**🔧 APScheduler 本质机制：**

> “先注册任务 ➜ 后续内部通过调度器的机制定时触发这些任务。”
> 

**🔁 它内部怎么工作的？**

1.	**注册任务：**

•	scheduler.add_job(...) 会把任务注册到调度器的任务队列中。

**•	你提供的时间、频率（如 interval、cron、date）会被转成内部的调度计划。**

2.	**内部调度机制：**

•	AsyncIOScheduler / BlockingScheduler 等调度器都有自己的 **后台线程 / 协程循环**。

•	它会不断 **检查当前时间是否满足某个任务的触发条件**（也就是你设的 cron, interval 等触发器）。

3.	**一旦时间匹配：**

•	就 **执行注册的函数**（或通过 asyncio.create_task() 启动异步任务）；

•	支持并发调度多个任务。

**🔁 它内部怎么工作的？**

1.	**注册任务：**

•	scheduler.add_job(...) 会把任务注册到调度器的任务队列中。

•	你提供的时间、频率（如 interval、cron、date）会被转成内部的调度计划。

2.	**内部调度机制：**

•	AsyncIOScheduler / BlockingScheduler 等调度器都有自己的 **后台线程 / 协程循环**。

•	它会不断 **检查当前时间是否满足某个任务的触发条件**（也就是你设的 cron, interval 等触发器）。

3.	**一旦时间匹配：**

•	就 **执行注册的函数**（或通过 asyncio.create_task() 启动异步任务）；

•	支持并发调度多个任务。

**🧠 类比你可以理解为：**

> 就像一个高级版的 while True + sleep(1) 的守护线程，维护着一堆计划任务，每秒看一下：
> 

> “诶？有任务要执行了吗？有的话，马上执行它。”
> 

**🚦 为什么你看不到它的轮询代码？**

```
•	因为 APScheduler 的调度循环封装在它自己的调度器类里了，比如：
•	AsyncIOScheduler 会将轮询 loop 挂到你自己的 asyncio 事件循环上；
•	BlockingScheduler 会单独跑个线程自己轮询

```

| **阶段** | **描述** |
| --- | --- |
| 任务注册 | 通过 .add_job() 把任务及触发条件存入调度器 |
| 内部机制 | 调度器内部 loop 每秒轮询判断：是否到时间 |
| 到点执行 | 匹配到执行时间后立即触发对应任务（同步或异步） |

# 常用的ASP 异步写法

**✅ 1. 每天 10:30 执行任务**

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio

async def job():
    print("每天 10:30 执行任务")

scheduler = AsyncIOScheduler()
scheduler.add_job(lambda: asyncio.create_task(job()), CronTrigger(hour=10, minute=30))
scheduler.start()
```

**✅ 2. 每周一 9:00 执行任务**

```python
async def weekly_job():
    print("每周一上午 9:00 执行任务")

scheduler.add_job(lambda: asyncio.create_task(weekly_job()), CronTrigger(day_of_week='mon', hour=9, minute=0))
```

**✅ 3. 每小时的第 5 分钟执行**

```python
async def hourly_job():
    print("每小时的第 5 分钟执行")

scheduler.add_job(lambda: asyncio.create_task(hourly_job()), CronTrigger(minute=5))
```

**✅ 4. 每隔 5 分钟执行一次（interval 模式）**

```python
from apscheduler.triggers.interval import IntervalTrigger

async def interval_job():
    print("每 5 分钟执行一次")

scheduler.add_job(lambda: asyncio.create_task(interval_job()), IntervalTrigger(minutes=5))
```

（使用 **lambda 表达式包装了一个同步函数）**

•	asyncio.create_task(...) 是一个 **同步函数**，用来在当前事件循环中安排一个 **协程异步运行**。

•	lambda 是快速生成这个同步函数的方式。

**✅ 补充：APScheduler 的 CronTrigger 类似 crontab 语法**

| **参数** | **说明** | **示例** |
| --- | --- | --- |
| second | 秒 | 0-59 |
| minute | 分钟 | 0-59 |
| hour | 小时 | 0-23 |
| day | 日 | 1-31 |
| month | 月 | 1-12 |
| day_of_week | 星期几（0-6 或 mon-sun） | 'mon', 0 |
| year | 年 | 2025 |