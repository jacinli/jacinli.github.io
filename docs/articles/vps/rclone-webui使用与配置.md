# 目录

[[toc]]

## docker-compose安装

端口 5572

```python
version: "3.8"
services:
  rclone:
    image: rclone/rclone:latest
    container_name: rclone-webui
    ports:
      - "5572:5572"
    volumes:
      - ./rclone-config:/config/rclone
      - /root/minio/data/public/:/data/minio-public   ## docker挂载路径
      - ./data:/data             # 如果你要在 WebUI 里访问本地 data 目录
    command:
      - rcd
      - --rc-web-gui
      - --rc-web-gui-no-open-browser
      - --rc-addr=:5572
      - --config=/config/rclone/rclone.conf
      # 如果需要登录：
      - --rc-user=11111
      - --rc-pass=11111
    restart: unless-stopped
```

## 配置 s3

![](https://public.jacin.me/blog/img/2025/08/906096af24370975ea8dbc2689c1e219-1755442826.png)

只需要填写  id,secret 以及 **Endpoint 即可。**

![](https://public.jacin.me/blog/img/2025/08/77752a2d3cb284d861943554ed5c62b7-1755445429.png)

填上自己的站点信息

![](https://public.jacin.me/blog/img/2025/08/ac43ec9815f2486e544501f5bf3b7812-1755445459.png)

这样说明就可以了

![](https://public.jacin.me/blog/img/2025/08/cbc8079b4e29e642d2d2f19763de8f5c-1755443024.png)

## 配置 dropbox

https://www.dropbox.com/developers/apps/create

建立一个新的，根据需要选择自己的 dropbox 信息。

![](https://public.jacin.me/blog/img/2025/08/17546238a1de5ac5fb71cee1abbb2ad0-1755445679.png)

配置 oauth 信息

![](https://public.jacin.me/blog/img/2025/08/a28ee5eb64a75d0d82d2f7ec9ac897cb-1755445873.png)

为方便起见，使用命令行操作，

rclone 配置 dropbox 有点复杂，关键就是在于回调地址与 accesstoken 与刷新操作的。

这里借助 mac 下载 rclone 并粘贴对应的 json 配置

```python
brew install rclone
```

**【注意】**

注意一开始的时候就得先选择好所有 文件夹的权限以及 Individual Scopes

否则后面的 token 生成的时候就是没有 list 权限，只能重来的。【深有体会，我一直以为是 bug，后来才发现是 token 的问题】

```python
rclone authorize dropbox  你的id   你的secret
```

注意在 dropbox 配置 http://localhost:53682/ ,注意斜杠。

点击链接进行验证即可。

我是折腾了半天，然后直接去 docker 挂载的文件  进行操作了

[dbx]就是我们名称。

![](https://public.jacin.me/blog/img/2025/08/36f11e556795e94d86283ae1ad160ec5-1755449423.png)

## 配置 minio s3

添加 list buckets 操作

```python
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListAllMyBuckets",
                "s3:ListBucket",
                "s3:PutObject",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::*",
                "arn:aws:s3:::public",
                "arn:aws:s3:::public/*"
            ]
        }
    ]
}
```

然后在 rclone-config/rclone.conf    配置

```python
[minio-home]
type = s3
bucket = public
access_key_id = 8
endpoint = http://主机:9000 (因为 docker 安装没有 127 这个概念）
secret_access_key = d
```

这样就有了

![](https://public.jacin.me/blog/img/2025/08/8402c6675dcfb70361b63d43c3bcf4d3-1755451893.png)

## 将minio桶同步到 dropbox

因为在前面已经有了      

- /root/minio/data/public/:/data/minio-public   ## docker挂载路径
所以可以把 minio public 这个桶的信息直接挂载 docker 了

Docker 里做的卷挂载（bind mount）只是把宿主机上的目录“映射”进容器，不会把文件拷贝一份到容器里.

- **物理上只有一份数据**：真实文件依然存放在宿主机的 /root/minio/data/public（或 ./data）目录下。
- **容器里只是一个“指针”**：容器进程看到 /data/minio-public，但底层仍然操作那块宿主机磁盘，不会额外占用空间，也不会复制一份出来。
- **内存中也只有按需的 chunk**：Rclone 从宿主机目录读文件，同样是按需读入小块内存（chunk），用完就释放，不会把整个目录或文件都一次性加载到容器内存。

建议一个定时任务

```python
docker exec rclone-webui rclone sync --config=/config/rclone/rclone.conf loc1:/minio-public dbx:cloudcone-minio
```

```python
crontab -e

5 * * * * docker exec rclone-webui rclone sync --config=/config/rclone/rclone.conf loc1:/ dbx:cloudcone-minio
```

在这个提示行，将光标定位到 File Name to Write: /tmp/crontab.xxx/crontab 后，直接按 **Enter** 就能保存。然后你会回到编辑界面，再按 **Ctrl-X** 退出。

之后用 crontab -l 就能看到新加的同步任务生效了。