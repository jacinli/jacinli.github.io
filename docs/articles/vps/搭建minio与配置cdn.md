# 目录

[[toc]]

注意 minio 修改了开源，最新版本的镜像ui 界面已经没有设置桶的信息了。所以请使用下面的指定版本。

![](https://public.jacin.me/blog/img/2025/08/247f495ec3f823651ae28de1538df118-1755344100.png)

## docker 部署

还是使用 docker-compose.yml

注意指定版本了：

```go
services:
  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password
    command: server /data --console-address ":9001"
    volumes:
      - ./data:/data
      - ./config:/root/.minio
```

把上面的账号进行修改就可以。

## 配置Nginx

官方介绍了两种 nginx 配置方式，

![](https://public.jacin.me/blog/img/2025/08/922a8eadab169ca201300b62fc43b13f-1755344261.png)

第一种比较麻烦，本人使用了 subdomain 的方式，配置两个域名 然后进行转发。

nginx.conf

只要修改端口 + server_name 即可

原始桶是 cos 域名

cdn 是我等会去 cf 配置的 cname 操作，这样可以保证最快。

minio 是原始网站的 ui 界面。

```go
# ===== 上游：本地 MinIO API（59000）和 Console（59001） =====
upstream minio_s3 {
    least_conn;
    server 127.0.0.1:9000;
}
upstream minio_console {
    least_conn;
    server 127.0.0.1:9001;
}

# ===== 1) S3 API —— cos.jacin.me =====
server {
    listen       443 ssl http2;
    server_name  cos.jacin.me  cdn.jacin.me;

    ssl_certificate     /root/fast-proxy/ssl/origin.crt;
    ssl_certificate_key /root/fast-proxy/ssl/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size    0;
    proxy_buffering         off;
    proxy_request_buffering off;

    location / {
        proxy_pass         http://minio_s3;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";
        proxy_connect_timeout 300s;
        proxy_read_timeout    300s;
        proxy_send_timeout    300s;
    }
}

# ===== 2) Web 控制台 —— console.jacin.me =====
server {
    listen       443 ssl http2;
    server_name  minio.jacin.me;

    ssl_certificate     /root/fast-proxy/ssl/origin.crt;
    ssl_certificate_key /root/fast-proxy/ssl/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size    0;
    proxy_buffering         off;
    proxy_request_buffering off;

    location / {
        proxy_pass         http://minio_console;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # 支持 WebSocket 升级
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        proxy_connect_timeout 300s;
        proxy_read_timeout    300s;
        proxy_send_timeout    300s;
    }
}
```

## 设置minio 的可见范围

对桶的设置：

![](https://public.jacin.me/blog/img/2025/08/dff76fe47fcc866c65386c084b3c41ac-1755344601.png)

选择自定义

,这样只能访问对象，而不能访问全部 list 桶的文件信息了。

```go
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "*"
                ]
            },
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::public/*"
            ]
        }
    ]
}
```

添加匿名信息

![](https://public.jacin.me/blog/img/2025/08/40c5d84365386e69eeab1654684ba979-1755344670.png)

然后去 cf 创建一个 cdn 缓存信息

![](https://public.jacin.me/blog/img/2025/08/af69aee6600844db973248e01d46b3c5-1755344951.png)

并配置 cdn  —> cname 指向 [cos.jacin.me](http://cos.jacin.me) 开启小黄云即可。