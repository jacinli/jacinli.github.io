本篇 主要聚焦于单机单 worker 部署的 ws 管理

场景在于 直播弹幕、实时通知等场景。

# ws 单例管理

- WebSocket 管理器是状态性的（如：房间池、用户映射等）
- 如果多个模块、多个请求、多个线程分别创建新的实例，就会导致：
    - 房间数据不一致
    - 用户连接被多份管理
    - 广播丢失、重复、混乱

```jsx
__new__() 是创建实例的方法，__init__() 是初始化实例的方法。
```

- 第一次调用 WebSocketManager() 时：
    - cls._instance 是 None，创建新对象并存入 _instance
- 后续任何调用 WebSocketManager()：
    - 都直接返回已有的 _instance，不会再创建新对象

**🌟 就像给类加了一把“全局锁”，始终只返回“那一个对象”。**

```jsx
class WebSocketManager:
    """多房间WebSocket连接池管理器 - 单例模式"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WebSocketManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            # 房间池：{room_id: RoomManager}
            self.rooms: Dict[str, RoomManager] = {}

            # 用户到房间的映射：{user_id: room_id}
            self.user_room_mapping: Dict[str, str] = {}

            self._initialized = True
            logger.info("多房间WebSocketManager 单例实例已创建")
```

“全局唯一，初始化一次，线程间共享 WebSocket 房间与连接状态”。

# 设计思路

**通过全局 WebSocketManager 单例 → 管理多个 RoomManager → 每个房间支持多用户多连接的结构化管理体系。**

**1.WebSocketManager 单例：**

- ✅ **全局只有一个实例**，维护所有房间的生命周期。
- ✅ 用 self.rooms: Dict[str, RoomManager] 管理房间池。
- ✅ 用 self.user_room_mapping: Dict[str, str] 管理用户房间映射，确保：
    
    > 一个用户只能同时处于一个房间（合理约束）。
    > 

**2.RoomManager 按需初始化：**

- 每个 room_id 创建一个 RoomManager 实例（懒加载模式）。
- 管理该房间下所有用户的连接（user_id → list[WebSocket]）。
- 多连接支持：一用户可在多个终端打开同一直播间（如手机+电脑）。

**3.用户迁移逻辑（add_user_to_room）：**

- 当用户尝试加入新房间：
    - 检查 user_room_mapping
    - 如果旧房间存在，就先踢出用户再加入新房间
    - ✅ 避免同时进多个房间，逻辑清晰

**4. 连接挂载层级结构：**

```jsx
WebSocketManager (单例)
│
├── rooms (room_id → RoomManager)
│     ├── active_connections (user_id → List[WebSocket])
│     └── user_info
│
└── user_room_mapping (user_id → room_id)
```

| **特点** | **说明** |
| --- | --- |
| 单例控制 | 避免多个模块/线程创建多个管理器，保证连接管理集中化 |
| 层次清晰 | RoomManager → User → WebSocket 多层嵌套，便于维护 |
| 多连接支持 | 满足用户多终端同时在线（同一直播间） |
| 用户唯一房间 | 逻辑上规避跨房间状态混乱（避免消息乱发） |
| 异常清理健壮 | 每次发送失败后自动清除失效连接，避免泄露 |

这个设计是**高度解耦、易维护、易扩展**的典范，未来要扩展如下功能也很方便：

- 接入 Redis 做集群广播（分布式场景）
- 加入房间在线人数缓存
- 支持房间过期自动清理
- 用户身份验证 & 权限控制（如主播、管理员）

目前设计的：

**一个用户账号（user_id）在任一时刻，只能存在于一个直播间（room_id），但可通过多个连接（tab、设备）参与该房间。**

1. **业务设计就是“一次只能看一个直播”**
    
    用户打开多个 tab、每个 tab 看不同直播，不是主流需求。
    
2. **弹幕、礼物、点赞等事件都要和一个直播间绑定**
    
    多 room 容易引发业务混乱（发错房间等）。
    
3. **踢人 / 禁言等逻辑简单很多**
    
    只要根据 user_id 查一次房间即可处理。
    
4. **防刷、风控角度**
    
    避免一个用户用脚本混入多个房间发广告/刷屏。
    

| **平台** | **用户能否同时加入多个 room_id（如多个直播间）** | **策略** |
| --- | --- | --- |
| 抖音 | ❌ 不可以（自动踢掉旧 room） | **user_id ➝ room_id 一对一** |
| 微信视频号 | ❌ 不可以 | 同样策略 |
| 飞书（文档） | ✅ 可以多个 tab 分别进入不同 room | 更像 **连接 ➝ room_id** |
| Slack | ✅ 多频道并行 | 每个 socket 跟 room 解耦 |

# 解决无法真正断开ws连接

```jsx

room.remove_connection(user_id)
```

你只是从字典 active_connections[user_id] 中删除了 WebSocket 引用，但**并没有真正关闭浏览器的连接**，因为：

- WebSocket 的连接是异步的，常驻协程中；
- FastAPI 的 websocket.receive_text() 或 websocket.send_text() 正在阻塞等待；
- **即使你删了引用，也无法“中断对方连接”**，除非在协程中显式 await websocket.close()。

**正确做法：通知前端主动断开或协程中感知后主动关闭**

**✅ 方法 1：通过服务端下发“强制退出”消息让客户端断开**

1. 在 remove_user_from_room 中找到该用户的所有 WebSocket：
2. 发送一条特殊消息，例如：

```jsx
{
  "event": "force_disconnect",
  "code": 4001,
  "reason": "您已被移出房间"
}
```

1. 前端监听该消息后主动 ws.close()。

这种方式是最兼容、稳定的实践方式。

**✅ 方法 2：通过房间状态轮询 + 客户端协程判断中断**

```jsx

while True:
    msg = await websocket.receive_text()
    # 业务处理...
```

```jsx

while True:
    if not is_valid_user_room(user_id, room_id):  # 查全局映射
        await websocket.send_json({"event": "force_disconnect", "code": 4002})
        await websocket.close()
        break
    ...
    # sleep 避免 CPU 占用过高
    await asyncio.sleep(1)
```

方案就是通知前端让前端进行duan

| **方案** | **优点** | **缺点** | **推荐度** |
| --- | --- | --- | --- |
| 服务端通知前端断开（事件驱动） | 简单安全 | 客户端需配合 | ✅✅✅ |
| 协程轮询房间状态 | 容错性好 | 有轻微性能成本 | ✅✅ |
| 服务端强制 close websocket | 快速断开 | 协程上下文不一致会失败 | ✅（限单线程同上下文） |

**安全、稳妥的双重断开机制**

| **步骤** | **描述** | **是否必要** |
| --- | --- | --- |
| 1️⃣ 服务端**下发断开消息** | "event": "force_disconnect" | ✅ 必须 |
| 2️⃣ 客户端收到后立即关闭连接 | ws.close() | ✅ 必须 |
| 3️⃣ 服务端显式 await ws.close() | for ws in ws_list: await ws.close() | ✅ 推荐 |
| 4️⃣ 后续业务广播时主动判断：user 是否还在房间 | user_id in user_room_mapping | ✅ 补偿防御 |

| **步骤** | **目的** | **是否正确** |
| --- | --- | --- |
| send_text(error_msg) | 通知前端触发了异常，给出用户可读的信息（如身份验证失败、被踢出等） | ✅ |
| close(code=1008, reason=...) | 主动关闭 WebSocket 连接，1008 表示“**策略性关闭**”，常用于权限/认证问题 | ✅ |
| return | 停止当前 websocket_endpoint 的处理逻辑，防止后续逻辑继续执行 | ✅ |