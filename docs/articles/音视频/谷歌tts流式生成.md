# 目录

[[toc]]

https://cloud.google.com/text-to-speech/docs/create-audio-text-streaming?hl=zh-cn#client-libraries-install-python

目前谷歌 tts sdk 原生不支持中文流式，所以第一种是自建的伪流式（本质是先解析整个再流式返回客户端)

## 模拟流式(伪流式）

1. **一步到位**：先用 synthesize_speech 一次性拿到完整的 MP3 数据；
2. **再切分**：把它按固定大小切成多个 chunk；
3. **异步分发**：用 yield + asyncio.sleep 模拟“网络延迟”地把每块逐一发给调用方。

```go
    async def synthesize_streaming_unofficial(
            self,
            text: str,
            output_path: str = None,
            language_code: str = "zh-CN",
            ssml_gender: str = "NEUTRAL",
            audio_encoding: str = "MP3",
        ):
            """
            流式合成文本，将分片写入可选文件或 yield 出。

            :param text:           要合成的文本
            :param output_path:    可选，若提供则顺序拼接分片到该文件
            :param language_code:  语言代码
            :param ssml_gender:    性别
            :param audio_encoding: 编码格式
            """
            gender = getattr(texttospeech.SsmlVoiceGender, ssml_gender.upper())
            encoding = getattr(texttospeech.AudioEncoding, audio_encoding.upper())

            # 配置请求
            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                ssml_gender=gender,
            )
            audio_config = texttospeech.AudioConfig(audio_encoding=encoding)
            
            # 使用标准的synthesize_speech，然后模拟流式处理
            def _run_tts() -> bytes:
                resp = self.client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config
                )
                return resp.audio_content

            # 获取完整音频数据
            audio_bytes = await asyncio.to_thread(_run_tts)
            
            # 模拟流式处理：将音频数据分块
            chunk_size = 1024  # 1KB chunks
            chunks = [audio_bytes[i:i + chunk_size] for i in range(0, len(audio_bytes), chunk_size)]
            
            # 可选文件拼接
            fout = None
            if output_path:
                fout = await aiofiles.open(output_path, "wb")
                logger.info(f"🔊 开始流式合成，写入 {output_path}")

            try:
                for i, chunk in enumerate(chunks):
                    if fout:
                        await fout.write(chunk)
                    # 无论是否写文件，都yield分片
                    yield chunk
                    
                    # 模拟流式延迟
                    await asyncio.sleep(0.01)
                    
            finally:
                if fout:
                    await fout.close()
                    logger.info(f"✅ 流式合成完成，文件已保存到 {output_path}")
                    logger.info(f"📊 总共处理了 {len(chunks)} 个分片，总大小: {len(audio_bytes)} bytes")
```

测试函数

```go
    async def test_synthesize_streaming_unofficial():
        from cos import minio_client
        # 流式合成并写文件
        logger.info("开始流式合成并写入文件...")
        async for chunk in google_tts.synthesize_streaming_unofficial(
            text="这是一段流式合成测试。语音，在人类的发展过程中，起到了巨大的作用。语音是语言的外部形式，是最直接地记录人的思维活动的符号体系，也是人类赖以生存发展和从事各种社会活动最基本、最重要的交流方式之一。",
            output_path="stream_output.mp3",
        ):
            logger.info(f"收到分片 {len(chunk)} bytes")

        # 流式合成并直接处理分片
        logger.info("\n开始流式分片处理（不写入文件）：")
        total_size = 0
        chunk_count = 0
        async for chunk in google_tts.synthesize_streaming_unofficial(
            text="逐片处理示例。",
            output_path=None,
        ):
            chunk_count += 1
            total_size += len(chunk)
            logger.info(f"分片 {chunk_count}: {len(chunk)} bytes")
        
        logger.info(f"总共收到 {chunk_count} 个分片，总大小: {total_size} bytes")
        url = await minio_client.minio_upload_file_streaming("stream_output.mp3", "test.mp3", "tmp", "audio/mpeg")
        logger.info(url)
```

本质上是把一次性合成的完整音频，通过切片、异步写文件和 yield，让调用方感受到像流式一样不断收到数据。

- **按固定大小分片**，常见分片大小从几百字节到几 KB 不等。
- 调用方就可以在拿到第一个片段后立刻开始播放或处理，感知上就像真·流式。

伪流式的方法本质上还是先把整段文本「一次性」合成成一个完整的音频（二进制），然后在客户端把它拆成小片段并 yield 出来。也就是说：

1. **服务端（Google SDK）还是要等到整个文本都合成完，才会把二进制返回给你**。
2. 你模拟的“流式”只是把这个完整的二进制分片发送给调用者，给人“正在不断收到音频”的感觉。

**1. 切分音频数据（Chunking）**

```go
chunk_size = 1024  # 1KB chunks
chunks = [audio_bytes[i:i + chunk_size] for i in range(0, len(audio_bytes), chunk_size)]
```

- **audio_bytes** 是一次性从服务端拿到的完整音频二进制。
- 我们人为把它按 **1 KB** 为单位切成一个个小片，这样后面才能一段段地 “流式” 发给调用者。

**2. 可选的本地文件拼接**

```go
fout = None
if output_path:
    fout = await aiofiles.open(output_path, "wb")
    logger.info(f"🔊 开始流式合成，写入 {output_path}")
```

- 如果用户传了 output_path，就同时打开一个异步文件描述符 fout，在每个分片到来时写入到磁盘，最后拼接成一个完整文件。
- 否则，就只做内存中的分片推送，不在本地落盘。

**3. 分片循环 + yield+ “延迟”**

```go
try:
    for i, chunk in enumerate(chunks):
        if fout:
            await fout.write(chunk)
        # 无论是否写文件，都 yield 分片
        yield chunk

        # 模拟“实时”流式延迟
        await asyncio.sleep(0.01)
```

- **写磁盘**：如果有文件句柄，先把当前小片写入。
- **yield chunk**：把这一小片音频数据推给调用方（协程消费者），它可以立刻播放或上传。
- **await asyncio.sleep(0.01)**：人为「停顿 10 ms」，模拟真实流式接口在服务端还在合成下一批数据时的网络/计算延迟，给调用者「实时下发」的体验。

**整体总结**

1. **核心在「先一次性拿全量音频 → 再切片 yield」**，所以后端依然是 **非流式** 的合成。
2. **客户端模拟「边下发边播放」** 的 UX，兼容所有只提供 batch 接口的 TTS。
3. 通过可选写文件与分片推送解耦，既能落盘也能纯流式消费。
4. 加一个短暂 sleep，让「分片实时到达」的效果更真实。

## 原生流式(目前只支持英文）

原生 streaming API 本质上就是：

1. **一次性发两条请求**（第一条只给 config，第二条给文本）
2. 服务端**马上开始“打包”—**把 TTS 模型跑出的音频分成一段段二进制帧推给你
3. 你在客户端 for chunk in responses: 挨个收，就能做到“边合成边播放/处理”

```go
async def synthesize_streaming_native(
        self,
        text: str,
        output_path: str = None,
        language_code: str = "en-US",
        ssml_gender: str = "NEUTRAL",
        audio_encoding: str = "OGG_OPUS",
    ):
        """
        原生流式合成：使用 Google Cloud TTS 的 streaming_synthesize API。
        注意：目前只有 Chirp 3 HD 系列语音支持流式合成。
        """

        # 1. 选择仅支持的 Chirp 3 HD 语音
        #    中文目前不支持原生流式，这里统一回退到英文 Chirp 3 HD
        voice_name = "en-US-Chirp3-HD-Charon"

        # 2. 枚举映射
        gender = getattr(texttospeech.SsmlVoiceGender, ssml_gender.upper())
        encoding = getattr(texttospeech.AudioEncoding, audio_encoding.upper())

        # 3. 构造流式配置
        streaming_config = texttospeech.StreamingSynthesizeConfig(
            voice=texttospeech.VoiceSelectionParams(
                name=voice_name,
                language_code=language_code,
                ssml_gender=gender,
            ),
            streaming_audio_config=texttospeech.StreamingAudioConfig(
                audio_encoding=encoding,
            ),
        )

        # 4. 构造第一条请求（只包含 config）
        config_request = texttospeech.StreamingSynthesizeRequest(
            streaming_config=streaming_config
        )
        # 5. 构造第二条请求（包含输入文本）
        input_request = texttospeech.StreamingSynthesizeRequest(
            input=texttospeech.StreamingSynthesisInput(text=text)
        )

        # 6. 打开文件（如果需要写入）
        fout = None
        if output_path:
            fout = await aiofiles.open(output_path, "wb")
            logger.info(f"🔊 开始原生流式合成，写入 {output_path}")

        try:
            # 7. 发起流式合成
            #    注意：client.streaming_synthesize 接受一个 generator
            def request_generator():
                yield config_request
                yield input_request

            responses = self.client.streaming_synthesize(request_generator())

            # 8. 遍历分片并输出
            for idx, resp in enumerate(responses, start=1):
                chunk = resp.audio_content
                if fout:
                    await fout.write(chunk)
                yield chunk
                logger.info(f"分片 {idx}: {len(chunk)} bytes")

        finally:
            if fout:
                await fout.close()
                logger.info(f"✅ 原生流式合成完成，文件已保存到 {output_path}")
```

测试函数

```go
async def test_native_stream():
        tts = GoogleTTS()
        out_path = "native_stream.mp3"

        logger.info("▶️ 1. 流式合成并写入文件")
        # 将分片顺序写入本地文件
        async for chunk in tts.synthesize_streaming_native(
            text="Hello, this is a streaming test of Google Cloud TTS.I want to tell you something.",
            output_path=out_path,
        ):
            # 这里可以实时统计或打印每个 chunk 的大小
            logger.info(f"  • received chunk: {len(chunk)} bytes")

        logger.info(f"✅ 原生流式合成完成，文件已保存到 {out_path}")

        logger.info("\n▶️ 2. 流式合成，仅处理不写文件")
        total_bytes = 0
        count = 0
        async for chunk in tts.synthesize_streaming_native(
            text="Streaming without writing to disk, just counting chunks.",
            output_path=None,
        ):
            count += 1
            total_bytes += len(chunk)
            logger.info(f"  • chunk {count}: {len(chunk)} bytes")

        logger.info(f"🏁 共收到 {count} 片，总字节数 {total_bytes}")
        from cos import minio_client
        url = await minio_client.minio_upload_file_streaming("native_stream.mp3", "test.mp3", "tmp", "audio/mpeg")
        logger.info(url)
```

> 原因：中文和其他声线暂未开放。这里统一回退到 en-US-Chirp3-HD-Charon。
> 

**构造流式合成配置**

```python
streaming_config = texttospeech.StreamingSynthesizeConfig(
  voice=texttospeech.VoiceSelectionParams(
    name=voice_name,
    language_code=language_code,
    ssml_gender=gender,
  ),
  streaming_audio_config=texttospeech.StreamingAudioConfig(
    audio_encoding=encoding,
  ),
)
```

- **第一条** 只包含配置（streaming_config），告诉服务端我们要怎样合成
- **第二条** 包含实际要合成的文本（StreamingSynthesisInput）

> 官方要求：**第一条必须发 config，后续才能发文本**
> 

**发起流式合成**

```python
def request_generator():
    yield config_request
    yield input_request

responses = self.client.streaming_synthesize(request_generator())
```

- streaming_synthesize 接受一个 **生成器**，你只要 yield 上面两条请求，它就会开始返回一个可迭代的响应流
- 每个响应块（resp）中都包含一段新的 audio_content。

**遍历响应，边写边 yield**

```python
for idx, resp in enumerate(responses, start=1):
    chunk = resp.audio_content
    if fout:
        await fout.write(chunk)
    yield chunk
    logger.info(f"分片 {idx}: {len(chunk)} bytes")
```

## 编码说明

**1. 接口支持的编码格式不一样**

- **非流式**（synthesize_speech）可以输出 MP3、LINEAR16、OGG_OPUS 等多种格式。
- **流式**（streaming_synthesize）目前 **只支持**
    - AudioEncoding.OGG_OPUS
    - AudioEncoding.LINEAR16
        
        （MP3 并不在允许列表里，直接请求会报 “Unsupported audio encoding.”）
        

**2. OGG_OPUS 更适合低延迟流式**

- **OGG/Opus** 是为实时通信和低延迟优化的音频容器/编解码格式：
    - 帧大小小（20ms~60ms），低时延
    - 解码延迟和带宽占用都比 MP3/LINEAR16 更友好
- **MP3** 虽然广泛支持，但是帧越大、延迟越高，流式播放体验并不理想，也不是所有播放器都能正确“边读边播”无缝拼接。

PCM（Pulse-Code Modulation）和 OGG/Opus 都是数字音频的**编码/封装**方式，但它们在“流式”场景下的特性和应用各有不同

**1. PCM：最原始的“裸”音频流**

- **什么是 PCM？**
    
    PCM 就是以固定采样率（如 16 kHz、48 kHz）和位深（如 16-bit、24-bit）直接对模拟波形做离散化、量化，然后把每个采样点以整数（通常是小端）打包。
    
- **特点**
    - **无压缩**、数据非常“重” —— 48 kHz × 16 bit × 双声道 ≈ 1.5 Mbps
    - **超低延迟** —— 只要把采样点送到下游，就能立即播放
    - **兼容性高** —— 任何音频硬件／软件都能原生解码
- **流式场景**
    - 典型于专业电话系统、VoIP（SIP/RTP）里最常用的 G.711（8 kHz/8-bit PCM）或直接送 Linear‐PCM（如 WAV over RTP）
    - 因为无压缩，网络带宽要求高，但端到端时延最小

**2. Opus（封装于 OGG 或 RTP）**

**什么是 Opus？**

Opus 是一种现代的音频编解码器，专门为低延迟、语音和通用音频设计。

**封装在 OGG**

- Google TTS 的流式 API 输出是 audio_encoding = OGG_OPUS，即把 Opus 帧封装到 OGG 容器里
- 容器（OGG）负责打包帧边界、同步信息，解码器只要逐帧读取即可

**特点**

- **高压缩比**：通常 32 kbps ~ 128 kbps 就能获得清晰语音
- **低时延**：Opus 帧短（20–60 ms），端到端延迟可控
- **灵活**：支持窄带到全频（4 kHz–48 kHz）

**流式场景**

- WebRTC、在线游戏、直播连麦等都广泛用 Opus
- TTS 流式合成时分片处理、播放器无缝拼接也很成熟

| **特性** | **PCM** | **OGG_OPUS** |
| --- | --- | --- |
| 压缩 | 无 | 有（高效语音/音乐压缩） |
| 带宽占用 | 非常高（1.5 Mbps 级别） | 低（几十 kbps 级别） |
| 延迟 | 极低（采样到播放几乎无缓冲） | 低（Opus 帧 + 容器开销几十 ms） |
| 兼容性 | 硬件/软件几乎全兼容 | 需支持 Opus/OGG 解码 |
| 应用场景 | 专业音视频、电话、采集设备 | 网络语音、直播、TTS 流式 |

- **需要最小端到端延迟，且网络带宽充足** → 考虑直接用 PCM （或 G.711）
- **需要在有限带宽下保证低时延、语音质量** → Opus（OGG_OPUS 或 RTP/Opus）
- **Web 浏览器 & 大部分播放器一次性渲染** → PCM（LINEAR16）也可，但文件更大

```python
# PCM 流式
audio_config = StreamingAudioConfig(audio_encoding=AudioEncoding.LINEAR16)

# Opus 流式
audio_config = StreamingAudioConfig(audio_encoding=AudioEncoding.OGG_OPUS)
```