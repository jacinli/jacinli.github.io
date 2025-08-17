# 目录

[[toc]]

https://console.cloud.google.com/

![](https://public.jacin.me/blog/img/2025/08/1bf4bf3235aca1f3a464969128ea148d-1755414790.png)

## 价格

每个月 100 万字符使用免费。

![](https://public.jacin.me/blog/img/2025/08/e338bd9a32a02a272ff01985933e0de2-1755414550.png)

## 配置 API

![](https://public.jacin.me/blog/img/2025/08/23a1db5c7440e96677fcddda3938972b-1755410188.png)

创建凭证

![](https://public.jacin.me/blog/img/2025/08/e75addc54cba47c994e3490dd1adac6e-1755410518.png)

 创建密钥

![](https://public.jacin.me/blog/img/2025/08/788fb12700163e0c801a207d9aa50a65-1755411904.png)

赋予权限

![](https://public.jacin.me/blog/img/2025/08/3dc5e9965f89b7fde19c0218cb4d0352-1755411932.png)

然后 下载密钥的 json 文件即可。

## 一次性生成文件信息

### 配置文件：

```go
import os
from dotenv import load_dotenv

load_dotenv()

class Config:   
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_api_base = os.getenv("OPENAI_API_BASE")
        
        
        ### minio
        self.minio_bucket_name = os.getenv("MINIO_BUCKET_NAME")
        self.minio_access_key = os.getenv("MINIO_ACCESS_KEY")
        self.minio_secret_key = os.getenv("MINIO_SECRET_KEY")
        self.minio_endpoint_url = os.getenv("MINIO_ENDPOINT_URL")
        self.minio_cdn_url = os.getenv("MINIO_CDN_URL")
        
        
        #### google cloud tts
        self.google_project_id = os.getenv("GOOGLE_PROJECT_ID")
        self.google_private_key_id = os.getenv("GOOGLE_PRIVATE_KEY_ID")
        self.google_private_key = os.getenv("GOOGLE_PRIVATE_KEY")
        self.google_client_email = os.getenv("GOOGLE_CLIENT_EMAIL")
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_auth_uri = os.getenv("GOOGLE_AUTH_URI")
        self.google_token_uri = os.getenv("GOOGLE_TOKEN_URI")
        self.google_auth_provider_x509_cert_url = os.getenv("GOOGLE_AUTH_PROVIDER_X509_CERT_URL")
        self.google_client_x509_cert_url = os.getenv("GOOGLE_CLIENT_X509_CERT_URL")
        self.google_universe_domain = os.getenv("GOOGLE_UNIVERSE_DOMAIN")
        
        # 添加一个方法来获取完整的Google服务账号配置
        self.google_service_account_info = {
            "type": "service_account",
            "project_id": self.google_project_id,
            "private_key_id": self.google_private_key_id,
            "private_key": self.google_private_key,
            "client_email": self.google_client_email,
            "client_id": self.google_client_id,
            "auth_uri": self.google_auth_uri,
            "token_uri": self.google_token_uri,
            "auth_provider_x509_cert_url": self.google_auth_provider_x509_cert_url,
            "client_x509_cert_url": self.google_client_x509_cert_url,
            "universe_domain": self.google_universe_domain
        }

global_config = Config()
```

### 谷歌 tts 一次性

[minio 文件上传部分见  ]

https://jacin.me/articles/python/s3%E4%B8%8A%E4%BC%A0%E6%96%87%E4%BB%B6sdk.html

```go
import asyncio
import aiofiles
import json
from google.cloud import texttospeech
from google.oauth2 import service_account
from config import global_config

class GoogleTTS:
    def __init__(self):
        # 使用配置文件中的服务账号信息初始化客户端
        credentials = service_account.Credentials.from_service_account_info(
            global_config.google_service_account_info
        )
        self.client = texttospeech.TextToSpeechClient(credentials=credentials)

        
    async def synthesize(self,
                        text: str,
                        output_path: str,
                        language_code: str = "zh-CN",
                        ssml_gender: str = "NEUTRAL",
                        audio_encoding: str = "MP3") -> None:
        """
        异步合成指定文本到 MP3 文件。

        :param text:           要合成的文本
        :param output_path:    输出文件路径
        :param language_code:  语言代码，如 zh-CN
        :param ssml_gender:    声音性别：MALE/FEMALE/NEUTRAL
        :param audio_encoding: 音频编码：MP3/LINEAR16/OGG_OPUS
        """
        # 枚举映射
        gender = getattr(texttospeech.SsmlVoiceGender, ssml_gender.upper())
        encoding = getattr(texttospeech.AudioEncoding, audio_encoding.upper())

        def _run_tts() -> bytes:
            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                ssml_gender=gender
            )
            audio_config = texttospeech.AudioConfig(audio_encoding=encoding)
            resp = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            return resp.audio_content

        audio_bytes = await asyncio.to_thread(_run_tts)
        # 写入文件
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(audio_bytes)
        print(f"✅ 已合成到 {output_path}")

google_tts = GoogleTTS()

if __name__ == "__main__":
    async def test_synthesize():
        out_path = "output.mp3"
        await google_tts.synthesize(
            text="TTS（语音合成）技术负责将文字转化为富含情感、个性化的“声音”；形象驱动技术让语音与表情、口型、肢体动作精准同步，塑造逼真视觉形象；音视频工程解决实时渲染、低延迟传输与高质量画面输出的技术挑战",
            output_path=out_path
        )
        from cos import minio_client
        url = await minio_client.minio_upload_file_streaming(out_path, "test.mp3", "tmp", "audio/mpeg")
        print(url)

    asyncio.run(test_synthesize())
```

1. **选取参数**
    - **文本** (text)：要合成的文字内容；
    - **语言/方言** (language_code)：例如 "zh-CN"、"en-US"；
    - **音色性别** (ssml_gender)：MALE/FEMALE/NEUTRAL，决定声线；
    - **音频编码** (audio_encoding)：MP3/LINEAR16（PCM）/OGG_OPUS，决定输出格式和音质。
2. **发起合成请求**（synthesize_speech）
    
    Google TTS 在服务器端会：
    
    - 接收上述参数，
    - 把文字序列通过 **前端文本处理**（分词、音素转写、韵律预测）
    - 喂给 **神经网络声码器**（WaveNet、Tacotron2 或更高级模型）
    - 生成原始波形或中间特征后，再经 **编码器**（MP3、Opus、PCM）
    - 一次性返回整个音频文件的二进制数据 audio_content

- **TTS（Text-to-Speech）**：把文字 (“Text”) 转换成可播放的声音 (“Speech”)。
- **流程拆解**：
    1. **文本规范化**：把数字、符号、缩写展开成口语化形式；
    2. **音素/韵律预测**：把文本映射到语言的基本发音单位，并预测重音、音调；
    3. **神经合成**：现代 TTS 多用端到端神经网络（如 Tacotron + WaveNet、FastSpeech）直接生成声码器特征，再合成波形；
    4. **编码封装**：把波形压成 MP3/Opus/PCM 等格式，节省带宽或适配平台。
- **云端优势**：
    - 无需自己训练/部署模型，
    - 自动按需扩容，
    - 提供丰富的选项（多语言、多音色、情感化 SSML）、批量调用和流式接口。