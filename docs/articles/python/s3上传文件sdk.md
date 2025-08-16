# 目录

[[toc]]

https://aws.amazon.com/sdk-for-python/

![](https://public.jacin.me/blog/img/2025/08/4ad7175178552b0b3331ac15ba6d19dc-1755361864.png)

# s3 基类代码

```go

import os
import aiofiles
import asyncio
import aiobotocore.session
from typing import Optional, List
from datetime import datetime

CHUNK_SIZE = 8 * 1024 * 1024  # 8 MiB per part
MAX_CONCURRENCY = 4           # 最多同时并发上传 4 个 part

class S3Client:
    def __init__(
        self,
        bucket_name: str,
        access_key: str,
        secret_key: str,
        region_name: str = "auto",
        endpoint_url: Optional[str] = None,
    ):
        """
        异步 S3 客户端，兼容标准 S3 API

        :param bucket_name: 桶名称
        :param access_key: 访问密钥
        :param secret_key: 私密密钥
        :param region_name: 区域名称
        :param endpoint_url: 自定义 endpoint，如 MinIO
        """
        self.bucket_name = bucket_name
        self.session = aiobotocore.session.get_session()
        self.client_kwargs = {
            "service_name": "s3",
            "region_name": region_name,
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }
        if endpoint_url:
            self.client_kwargs["endpoint_url"] = endpoint_url

    async def upload_file(
        self,
        file_path: str,
        key: str,
        content_type: Optional[str] = None,
    ) -> None:
        """
        把本地文件异步上传到 S3

        :param file_path: 本地文件路径
        :param key: 上传到桶中的对象键
        :param content_type: 可选，指定对象的 Content-Type
        """
        # 检查文件
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # 异步打开文件
        async with aiofiles.open(file_path, "rb") as f:
            data = await f.read()

        # 创建 S3 客户端并上传
        async with self.session.create_client(**self.client_kwargs) as s3:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            # upload_fileobj 支持文件流，避免内存峰值
            await s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                **extra_args,
            )
    
    async def upload_file_streaming(
        self,
        file_path: str,
        key: str,
        content_type: Optional[str] = None,
    ):
        if not os.path.isfile(file_path):
            raise FileNotFoundError(file_path)

        # 1) 打开文件 + 创建 S3 客户端
        async with aiofiles.open(file_path, "rb") as afp, \
                   self.session.create_client(**self.client_kwargs) as s3:

            # 2) 初始化 multipart 上传
            mp = await s3.create_multipart_upload(
                Bucket=self.bucket_name,
                Key=key,
                ContentType=content_type or "application/octet-stream"
            )
            upload_id = mp["UploadId"]

            parts: List[dict] = []
            part_number = 1

            # 3) 限制并发的信号量
            sem = asyncio.Semaphore(MAX_CONCURRENCY)
            upload_tasks = []

            async def _upload_part(part_no: int, data: bytes):
                async with sem:
                    resp = await s3.upload_part(
                        Bucket=self.bucket_name,
                        Key=key,
                        PartNumber=part_no,
                        UploadId=upload_id,
                        Body=data
                    )
                    parts.append({"ETag": resp["ETag"], "PartNumber": part_no})

            # 4) 逐块读并发起上传
            while True:
                chunk = await afp.read(CHUNK_SIZE)
                if not chunk:
                    break
                task = asyncio.create_task(_upload_part(part_number, chunk))
                upload_tasks.append(task)
                part_number += 1

            # 等待所有 part 都上传完
            await asyncio.gather(*upload_tasks)

            # 5) 完成 multipart
            await s3.complete_multipart_upload(
                Bucket=self.bucket_name,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={"Parts": sorted(parts, key=lambda x: x["PartNumber"])}
            )
    
    def get_timestamp(self) -> str:
        """
        获取当前时间戳
        """
        return datetime.now().strftime("%Y%m%d%H%M%S")
    
    def get_unique_key(self, file_name: str, cos_file_path: str) -> str:
        """
        生成唯一的对象键,cos_file_path example :  tmp  (无/ * /)
        """
        return f"{cos_file_path}/{self.get_timestamp()}-{file_name}"
    
    
    def get_cdn_url(self,cdn_url: str, key: str,bucket_name: str) -> str:
        """
        获取 CDN 访问 URL
        """
        if bucket_name:
            return f"{cdn_url}/{bucket_name}/{key}"
        else:
            return f"{cdn_url}/{key}"
        
    
```

## minio 调用

```go
import asyncio

from config import global_config
from cos.s3_client import S3Client

minio_client = S3Client(
    bucket_name=global_config.minio_bucket_name,
    access_key=global_config.minio_access_key,
    secret_key=global_config.minio_secret_key,
    region_name="auto",
    endpoint_url=global_config.minio_endpoint_url
)

async def minio_upload_file(file_path: str, file_name: str, cos_file_path: str, content_type: str):
    key = minio_client.get_unique_key(file_name, cos_file_path)
    await minio_client.upload_file(file_path, key, content_type)
    return minio_client.get_cdn_url(global_config.minio_cdn_url, key, global_config.minio_bucket_name)

async def minio_upload_file_streaming(file_path: str, file_name: str, cos_file_path: str, content_type: str):
    key = minio_client.get_unique_key(file_name, cos_file_path)
    await minio_client.upload_file_streaming(file_path, key, content_type)
    return minio_client.get_cdn_url(global_config.minio_cdn_url, key, global_config.minio_bucket_name)

if __name__ == "__main__":
    cos_file_path = "tmp"
    content_type = "image/png"
    async def test_minio_upload_file():
        url = await minio_upload_file("/Users/jacinlee/Downloads/11.png", "11.png", cos_file_path, content_type)
        print(url)
    async def test_minio_upload_file_streaming():
        url = await minio_upload_file_streaming("/Users/jacinlee/Downloads/11.png", "11.png", cos_file_path, content_type)
        print(url)
    asyncio.run(test_minio_upload_file_streaming())
    import time
    time.sleep(1)
    asyncio.run(test_minio_upload_file())
```

## 分块上传的说明

用 S3 的 **Multipart Upload**（分块上传）来高效地将大文件切块并行上传，从而：

- **降低内存占用**：流式读取文件块，而不是一次性读完整个文件；
- **提升吞吐**：并发上传多个块；
- **保证可靠性**：如果上传某个分片失败，只需重试该分片即可，不必重传整个文件。

1. **打开本地文件 & 创建 S3 客户端**

```go
async with aiofiles.open(file_path, "rb") as afp, \
           self.session.create_client(**self.client_kwargs) as s3:
```

- aiofiles 异步读文件，aiobotocore 异步 S3 客户端。
- 保证整个上传在同一个 async with 作用域里，读写、网络调用都采用异步协程，不阻塞事件循环。

2. **初始化 Multipart Upload**

```go
mp = await s3.create_multipart_upload(
    Bucket=self.bucket_name,
    Key=key,
    ContentType=content_type or "application/octet-stream"
)
upload_id = mp["UploadId"]
```

    ◦ 向 S3 桶申请一次分块上传会话，拿到一个 UploadId，后续上传每个分片都要带上它。

3. **并发上传分片函数**

- 用一个信号量限制最大并发数（MAX_CONCURRENCY），避免一下子开太多协程拖垮网络或内存。
- 每上传成功一个分片，就把返回的 ETag 和 PartNumber 存到 parts 列表，以便最后组装。

4. **循环读取文件并发起上传任务**

- **分块 & 并发**：大文件一次性上传容易超时；分块后可以并行、并且单个分片出错只需重试那个分片。
- **异步不阻塞**：asyncio + aiobotocore + aiofiles，在高并发场景下效率更好，CPU/IO 利用率更高。