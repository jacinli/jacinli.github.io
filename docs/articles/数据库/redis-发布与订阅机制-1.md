# 目录

[[toc]]

https://redis.io/glossary/pub-sub/

![](https://public.jacin.me/blog/img/2025/08/80fd6d17b62c5af6bc854a59ab5e3e09-1755702537.png)

## 什么是Pub/Sub

**Redis Pub/Sub 是「广播」模型，不是「队列」模型**。

Pub/Sub（发布/订阅）是一种消息通信模式，核心思想是 **发布者**（Publisher）将消息 **发布** 到一个或多个 **频道**（Channel），而 **订阅者**（Subscriber）则通过 **订阅** 这些频道来接收消息。发布者和订阅者相互**解耦**，无需直接引用对方。

| **概念** | **说明** |
| --- | --- |
| Channel | 一个字符串标识消息的“主题”，如 live_room:123 |
| PUBLISH | 发布命令，发布者将消息发到指定频道 PUBLISH channel message |
| SUBSCRIBE | 订阅命令，订阅者接收订阅频道的所有消息 SUBSCRIBE channel [channel ...] |
| PSUBSCRIBE | 模式订阅，支持通配符 PSUBSCRIBE pattern [pattern ...]，如 live_room:* |
| UNSUBSCRIBE | 取消订阅指定频道 |
| PUBSUB | 管理和查询当前订阅状态、活跃频道等 |
1. **订阅**
    
    客户端 A 与 Redis 建立长连接，并执行：
    

```python
SUBSCRIBE live_room:123

Redis 会把该频道的所有新消息推送给客户端 A。
```

1. **发布**

在任意客户端或服务端执行：

```python
PUBLISH live_room:123 {"event":"chat","text":"Hello!"}

Redis 会将这条消息发送给所有当前订阅了 live_room:123 的客户端。
```

3、**接收**

客户端 A 的订阅连接会收到一条类似于：

```python
message
live_room:123
{"event":"chat","text":"Hello!"}
```

**4.取消订阅**（可选）

当客户端不再需要接收时，执行：

```python
UNSUBSCRIBE live_room:123
```

**推送机制**：Redis 通过底层 TCP 长连接“主动推送”数据给订阅者，不是轮询，延迟可低至 1–5 ms。

```python
# 订阅精确频道
SUBSCRIBE live_room:123

# 模式订阅（通配所有以 live_room: 开头的频道）
PSUBSCRIBE live_room:*

# 发布消息
PUBLISH live_room:123 "欢迎进入直播间！"

# 查询当前有哪些频道有人在订阅
PUBSUB CHANNELS

# 查询订阅者数
PUBSUB NUMSUB live_room:123

# 取消订阅
UNSUBSCRIBE live_room:123
PUNSUBSCRIBE live_room:*
```

```python
# 订阅精确频道
SUBSCRIBE live_room:123

# 模式订阅（通配所有以 live_room: 开头的频道）
PSUBSCRIBE live_room:*

# 发布消息
PUBLISH live_room:123 "欢迎进入直播间！"

# 查询当前有哪些频道有人在订阅
PUBSUB CHANNELS

# 查询订阅者数
PUBSUB NUMSUB live_room:123

# 取消订阅
UNSUBSCRIBE live_room:123
PUNSUBSCRIBE live_room:*
```

在一个 FastAPI 进程里同时做发布和订阅，用于多节点间的房间广播。

- **subscriber()**：只要有新消息，立即接收并调用你本地的广播函数。
- **publisher(…)**：在任何节点发布一条消息，所有订阅者都会收到并执行本地广播。

```python
import asyncio, json
from aioredis import Redis

redis = await Redis.from_url("redis://localhost")

async def subscriber():
    pubsub = redis.pubsub()
    # 模式订阅所有 room 频道
    await pubsub.psubscribe("live_room:*")
    async for msg in pubsub.listen():
        if msg["type"] == "pmessage":
            channel = msg["channel"].decode()   # e.g. "live_room:123"
            data    = json.loads(msg["data"])   # {"event":..., "text":...}
            live_id = channel.split(":",1)[1]   # "123"
            # 本地广播给该进程内存中的所有 WebSocket 连接
            await local_broadcast(live_id, data)

async def publisher(live_id: str, message: dict):
    channel = f"live_room:{live_id}"
    await redis.publish(channel, json.dumps(message))

# 启动后台订阅协程
asyncio.create_task(subscriber())

# 在业务逻辑中调用 publisher(...)
```

## 工作流程

```python
客户端 A           Redis 服务器           客户端 B
----------         --------------         ----------
SUBSCRIBE room123   <─── TCP 建立 ──── 
                    └─── SUBSCRIBE ────▶
                                      PUBLISH room123 "hi all"
                    ◀─── message ──────┐
 message "hi all"   ◀─── (push) ───────┘
```

1. **订阅**：客户端与 Redis 建立一条长连接（TCP），发送 SUBSCRIBE room123。
2. **发布**：任何客户端（同一连接或新连接）执行 PUBLISH room123 "…"。
3. **推送**：Redis 把消息通过所有订阅了 room123 的长连接，立即推送给它们。

**每个订阅者都是独立的连接**

- 当你在进程 A、B、C 各自执行

```python
SUBSCRIBE live_room:123
```

- 实际上在 Redis 端，建立了**三条独立的 TCP 长连接**，每条连接都注册了对 live_room:123 的订阅。
- 下图示意了 Redis 内部的订阅者列表：

```python
Channel: live_room:123  
Subscribers:
  ├── TCP Conn #1 (进程 A)
  ├── TCP Conn #2 (进程 B)
  └── TCP Conn #3 (进程 C)
```

**Redis 的推送行为：Fan-out（一对多）**

- 当任意进程做

```python
PUBLISH live_room:123 "Hello!"
```

• Redis 会立即遍历上面所有的订阅连接，一条不漏地把消息“推送”给它们——**每条订阅连接都会收到一份完整的消息**。

**不存在「谁监听到谁没监听到」的问题**

只要 TCP 连接保持活跃，并且没有因为阻塞、超时断开，你就**不会**出现“只有部分订阅者收到、部分订阅者没收到”的情况。

如果某个订阅者的连接中途断了或者暂时不可读，那它那条 TCP 链路上的数据就会丢（不可达时 Redis 在发送时就会报错），**但其他所有活跃订阅者仍然会正常收到**。

## mq与redis 选择

• 和 MQ（如 RabbitMQ 的队列）不同，MQ 默认是负载均衡（round-robin）或消费者组模式，《一条消息只给一个消费者》；而 Redis Pub/Sub 则是广播给所有订阅者。

**何时选 Redis Pub/Sub**

- **低成本**：已有 Redis 服务，零额外部署。
- **高实时**：延迟要求极低，对丢失不敏感（如在线聊天、游戏内广播）。
- **简单场景**：不需要消息持久化、确认或重试。
- **频道数量中等**：房间数和订阅数不超过几千。

**何时选专业 MQ**

**可靠传递**：必须保证消息不丢失，支持 ACK、重试、死信队列。

**高并发 & 海量**：数万甚至数十万主题、TB 级消息吞吐。

**复杂路由**：需要交换机、路由键、多消费者组、分区等高级功能。

**审计 & 回溯**：可以保留消息日志，后期补偿或回放。

**如果用 RabbitMQ 的示例思路**

**交换机（Exchange）**：用一个 topic 交换机，名称如 live_rooms。

**路由键（Routing Key）**：以 room.<live_id> 形式路由。

**队列（Queue）**：每个 FastAPI 实例声明一个独占队列，绑定到 live_rooms 上：

```python
channel.exchange_declare("live_rooms", ExchangeType.TOPIC)
queue = channel.queue_declare(exclusive=True)
channel.queue_bind(queue, "live_rooms", routing_key=f"room.{live_id}")
```

**ACK & 重试**：处理成功后手动 ch.basic_ack(delivery_tag=…)，失败可 basic_nack 重入队列。

| **特性** | **Redis Pub/Sub (广播)** | **RabbitMQ/Kafka (队列/Topic)** |
| --- | --- | --- |
| 消息分发 | Fan-out：一条消息推给所有订阅者 | Round-robin 或 消费者组：一条消息只送给一个消费者 |
| 持久化 | ❌ 不持久化，订阅断开即丢失 | ✅ 可持久化，消息保存在队列/日志中 |
| 消息确认 & 重试 | ❌ 无 ACK/重试机制 | ✅ 支持 ACK、重试、死信队列 |
| 延迟 | 极低（1–5 ms） | 低（几毫秒–几十毫秒） |
| 客户端数量 & 频道数 | 建议中小规模（几千订阅以内） | 可水平扩展到成百上千个队列与高吞吐 |
- **多进程订阅同一频道**：每个进程各有一条独立订阅连接，Redis 会「一视同仁」地广播消息到每条连接。
- **不做轮询/负载均衡**：既不是「谁抢到谁」，也不是「轮询分发」，而是“推给所有人”。
- **可靠性**：只要连接健康，就不会漏收；若你需要持久化、ACK 或重试，请考虑专业 MQ。