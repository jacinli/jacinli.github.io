# 目录

[[toc]]

## acme 安装

```go
curl https://get.acme.sh | sh
# 加载环境变量
source ~/.bashrc
```

## 获取 DNS API 凭证

因为是 DNS-01 验证，你需要在 **DNS 托管商**（Cloudflare / 阿里云 / 腾讯云 等）申请 API Key。

以 Cloudflare 为例：

- 登录 Cloudflare → 右上角头像 → My Profile → API Tokens
- 新建一个 **Edit zone DNS** 权限的 Token

![](https://public.jacin.me/blog/img/2025/08/e018626e4fd0bf53f76de549f2419b9b-1755268042.png)

添加

![](https://public.jacin.me/blog/img/2025/08/62706d7134cf4e493d433e3782db077e-1755268197.png)

⚠️ 只会显示一次，记得保存。

## 配置 [acme.sh](http://acme.sh) 环境变量

```go
acme.sh --set-default-ca --server letsencrypt
acme.sh --register-account -m your@email.com

# 永久保存 Cloudflare Token
export CF_Token="你的API Token"
export CF_Account_ID="你的Cloudflare账号ID"
acme.sh --issue -d jacin.me -d '*.jacin.me' --dns dns_cf
```

执行完这个脚本就是可以了。

cloudflare id 可以点击自己的域名 ，在 网页上的 url那一长串的就是 id。

![](https://public.jacin.me/blog/img/2025/08/9fb73d7b4ced2ffb48ec56069382dd47-1755268717.png)

执行完成以后 证书 路径信息：

```go
证书文件:      /root/.acme.sh/jacin.me_ecc/jacin.me.cer
私钥文件:      /root/.acme.sh/jacin.me_ecc/jacin.me.key
中间证书:      /root/.acme.sh/jacin.me_ecc/ca.cer
完整链证书:    /root/.acme.sh/jacin.me_ecc/fullchain.cer
```

查看定时任务：

```go
crontab -l | grep acme
34 1 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

编辑：

```go
vim  ~/.acme.sh/account.conf

>>>>>>
CF_Token='你的API Token'
CF_Account_ID='你的Cloudflare账号ID'

cat ~/.acme.sh/account.conf | grep CF_
```

下次 acme.sh 自动续签时就会用这两个值，不需要手动 export。
查看续签时间：

```go
root@test-dc2:~# acme.sh --list
Main_Domain  KeyLength  SAN_Domains  CA               Created               Renew
jacin.me     "ec-256"   *.jacin.me   LetsEncrypt.org  2025-08-15T14:37:28Z  2025-10-13T14:37:28Z
root@test-dc2:~# 
```

1. 当 acme.sh 在“Renew”日或之后跑续签，它会生成一份新的证书和私钥，放到相同的路径（比如 ~/.acme.sh/jacin.me_ecc/fullchain.cer 和 .key）覆盖旧文件。
2. **平滑过渡**
    
    只要你在续签后执行一次 nginx -s reload（或 systemctl reload nginx），Nginx 会无缝加载新的证书用于 **新** 的 TLS 握手，而**老** 的连接依然用旧证书保持不变，直到它们自然关闭。
    
3. **不影响服务**
    - 对终端用户而言，整个过程是透明的，新旧证书之间切换几乎无感知。
    - 只要你保证重载了 Nginx，就一直在使用最新的、绝对不会过期的证书链。

## nginx需要的证书

```go
server {
    listen 443 ssl;
    server_name jacin.me *.jacin.me;

    ssl_certificate /root/.acme.sh/jacin.me_ecc/fullchain.cer;
    ssl_certificate_key /root/.acme.sh/jacin.me_ecc/jacin.me.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
}
```

执行：

```go
sudo nginx -s reload
```