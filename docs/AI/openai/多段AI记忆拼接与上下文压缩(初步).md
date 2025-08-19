# 目录

[[toc]]

![](https://public.jacin.me/blog/img/2025/08/2afe87840c8ec21ddf81829d7f662180-1755620504.png)

## 方案设计

```python
┌──────────┐
│ 用户输入 │
└─────┬────┘
      │
      ▼
┌──────────────┐
│ MemoryRetriever ──► 从历史或外部存储中按相关度拉取“记忆片段”
└─────┬─────────┘
      │
      ▼
┌──────────────┐
│ ContextManager ──► 执行滑动窗口裁剪；若超限则调用 Summarizer 生成摘要
└─────┬─────────┘
      │
      ▼
┌──────────────┐
│ PromptBuilder  ──► 拼接 System、Memory、Window、User 四部分为最终 messages
└─────┬─────────┘
      │
      ▼
┌──────────────┐
│  GPTClient     ──►  `gpt_chat_no_stream` 异步调用
└─────┬─────────┘
      │
      ▼
┌──────────────┐
│ MemoryUpdater ──► 将回复与新摘要合并，写回多段记忆存储
└──────────────┘
```

对上面每一个管理器都是非常值得深入研究的。
**MemoryStore（多段记忆存储）**

• 持久化存储各段摘要（可以用 Redis／数据库／文件），并支持检索和插入

```python
class MemoryStore:
    async def retrieve(self, query: str, top_k: int) -> List[MemorySegment]: ...
    async def append(self, segment: MemorySegment) -> None: ...
    async def prune(self, max_segments: int) -> None: ...
```

**Summarizer（摘要生成）**

• 将超长对话块压缩成简短摘要，保持语义(专门的 LLM 或本地模型）

```python
async def summarize(text: str) -> str:
    prompt = f"请帮我对以下对话生成不超过100字的摘要：\n\n{text}"
    return await gpt_chat_no_stream(prompt, model="gpt-4o-mini", output_format="text")
```

**ContextManager（窗口裁剪 + 多段拼接）**

- 保证拼接到模型的上下文长度 ≤ token 限制
- 裁剪最新对话（滑动窗口），将过长部分送给 Summarizer
- 拉取 MemoryStore.retrieve(...) 的相关记忆段

```python
class ContextManager:
    def __init__(self, store: MemoryStore, summarizer: Summarizer, max_tokens: int):
        self.store = store
        self.summarizer = summarizer
        self.max_tokens = max_tokens

    async def build(self, history: List[Dict], user_input: str) -> List[Dict]:
        # 1. 检索相关记忆
        mem_segs = await self.store.retrieve(user_input, top_k=3)

        # 2. 滑动窗口裁剪
        window, overflow = clip_by_token(history + [{"role":"user","content":user_input}], self.max_tokens)
        
        # 3. 对 overflow 部分做摘要
        if overflow:
            summary = await self.summarizer.summarize("\n".join(m["content"] for m in overflow))
            await self.store.append(MemorySegment(text=summary))
        
        # 4. 拼接 system + reminiscence + window + current
        return make_messages(mem_segs, window, user_input)
```

## 文本超限LRU压缩

在库的字段里面可以存放一个 len 或者 tiktoken 字段

每次取最近 10 条消息，长度超限就做 LRU 压缩

- **规模极小**：10 条消息，即便每条几千字，总字符数也不过万级。Python 在 C 层实现的字符串操作（长度计算、切片、拼接）对这么小的数据一次性完成，耗时通常在毫秒级以下，对整个请求来说“可忽略不计”。
- **LLM 调用才是瓶颈**：一次网络+模型推理要几十到上百毫秒，字符串遍历的时间相较之下基本可以忽略。

虽然遍历本身开销小，但还可以进一步优化：

1. **预存每条消息的字符数或 token 数**
    - 在消息入库或首次加载时，就计算并存储一个 length 字段（字符数或 token 数）。
    - 下次需要判断超限，只做数值比较，无需再次 len(text) 或重新 tiktoken 分词。

2. **滑动窗口时按序累加长度**

```python
total_len = 0
window = []
# 从最新往前遍历
for msg in reversed(last_10_msgs):
    if total_len + msg.length > MAX_LEN:
        overflow.append(msg)
    else:
        window.append(msg)
        total_len += msg.length
window.reverse()
```

组装 history

```python
# 伪代码示例
user_msgs = await db.fetch_last_n(user_id, role='user',   n=5)
ai_msgs   = await db.fetch_last_n(user_id, role='assistant', n=5)

# 合并并排序
convo = sorted(user_msgs + ai_msgs, key=lambda m: m.timestamp)

# 在这里做长度裁剪
window = []
total_len = 0
for msg in convo:
    if total_len + msg.length > MAX_LEN:
        break
    window.append(msg)
    total_len += msg.length

# 转成 OpenAI 格式的 messages
history = [
    {'role': m.role, 'content': m.content}
    for m in window
]
```

- **确保最近交互**：5 条用户＋5 条 AI，能完整涵盖最近 5 轮来回。
- **顺序正确**：合并后按时间排序，模型才能正确理解上下文流。
- **性能可控**：最多只操作 10 条记录，遍历和拼接成本极低。
- **长度保障**：再做一次滑窗裁剪，就不会因为某条超长消息把整个上下文撑爆。

## 摘要生成

**按回合做摘要的思路**

- 一次回合 = 一条用户消息 + 紧接着的一条 AI 回复。
- 每完成一次回合（AI 回复结束后），就把这两条消息拼在一起，生成一条简短摘要，存到 memory_segment。
- **细粒度**：摘要能准确对应每一轮对话，便于后续检索和回放。
- **实时性**：每回合结束后立即做摘要，长期记忆库始终保持最新状态。
- **简单易控**：不用关心“哪些旧消息被挤出”，也能保证记忆库中都是“摘要片段”而非长文本。

在同一次对话调用里，让模型同时输出回答和本轮「回合摘要」确实是简洁的方案。

```python
{
  "answer": "<AI 的完整回复文本>",
  "summary": "<对 user→AI 回合的简短总结>"
}
```

- **工程简洁度**：合并回答与摘要，减少服务调用。
- **成本-性能平衡**：用少量额外 token 换取一次完整调用，无需独立摘要服务。
- **可扩展性**：未来还可在 JSON 里加上更多元数据字段（如 related_memory_ids、sentiment 等）。
- **容错设计**：如果模型偶尔输出格式不符，可以在客户端包一层简单校验和降级，如默认 summary = answer[:100]。

**异步摘要＋廉价模型＋固定长度淘汰，既能保证流式体验，也能控制成本和存储规模**

```python
┌─────────────┐
│ 用户请求    │
└───────┬─────┘
        │
        ▼
┌─────────────┐   ┌───────────────────┐
│ 主对话流程  │──►│ 前端流式看到回答  │
└───────┬─────┘   └───────────────────┘
        │
        ▼
┌────────────────────┐
│ 记录本轮原文到队列 │
└───────┬────────────┘
        │
        ▼
┌────────────────────┐   ┌──────────────────────────┐
│ 后台摘要 Worker    │──►│ 廉价模型摘要             │
│ （并发/定时消费）  │   │ （gpt-3.5-turbo / open-source）│
└───────┬────────────┘   └─────────┬────────────────┘
        │                            │
        ▼                            ▼
┌────────────────────────┐     ┌──────────────────┐
│ 写入 memory_segment    │     │ 检查 & 删除超限  │
│ (user_id, summary,…)   │◄────┤ (>100 条)       │
└────────────────────────┘     └──────────────────┘
```