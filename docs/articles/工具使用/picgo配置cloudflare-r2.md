# 目录

[[toc]]

## 配置 picgo

去插件市场下载 这个版本的 s3。

https://github.com/wayjam/picgo-plugin-s3

![](https://public.jacin.me/blog/img/2025/08/b8b5c043f983390a1a50e38d60c95f0a-1755009145.png)

然后在 s3 的概念里面有这几个概念： 

上传路径可以这样写：

因为后面要用的 cf 的缓存策略，所以这里保证基本唯一。

```go
blog/img/{year}/{month}/{md5}-{timestamp}.{extName}
```

![](https://public.jacin.me/blog/img/2025/08/c4449d382fc8b8ab9fc1c2e9d99af971-1755009290.png)

设置输出的 url 设置：

![](https://public.jacin.me/blog/img/2025/08/694b4edf7e996005459814dbfaf37e06-1755009405.png)

至此 picgo 部分就可以设置完成。

## 设置 cloudflare 缓存 TTL

来到自己的 cf 后台，因为有的时候文件太多了，每次加载时间都很长，所以需要设置 cache 缓存时间 ttl

![](https://public.jacin.me/blog/img/2025/08/c3b5d05f3d9e2ad3489e7c64f0e32052-1755009532.png)

设置规则如下：(自定义规则）

WHEN :

```go
http.host eq "public.jacin.me"
```

THEN

![](https://public.jacin.me/blog/img/2025/08/5ec95a536120f4bcc693a234516e99b1-1755009677.png)

这样第一次访问会慢点，后面访问速度都是非常快的了。