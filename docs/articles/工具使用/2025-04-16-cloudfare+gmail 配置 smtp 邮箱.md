# 目录

[[toc]]

这里介绍有一个域名后，不需要服务器，就可以实现 cloudfare+ gmail 的 邮箱收发。

为什么还需要 gmail 的 smtp 功能，因为 cloudfare 默认只是对 email 进行转发，就是只能收邮件而不能发送邮件，故使用 gmail 的功能来进行代理 发送。

**标准的“发信 Gmail + 收信 Cloudflare Email Routing”配置**，非常适合个人域名使用【因为可以有 200 个名称】！！！！

- **收信：Cloudflare MX 接收 + 转发**
- **发信：Gmail SMTP 发出（伪装 *.me 发件人）**

为什么需要这样配置，这样可以不被大厂作为黑名单从而不会发不出、收不到邮件。

## 配置cf的域名管理

我优先选择的是： https://ap.www.namecheap.com/ [这个域名是.me](http://这个域名是.me) ，可以通过 github education 计划获得（.tech 同理）

下面是 namespace 配置 ns record 说明

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250504202932231.png)

tech 配置方法

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250504203118119.png)

Cloudflare 要求你在域名注册商（如 Namecheap）处配置的

**本质上就是一对 NS 记录（Name Server Record）**，指明这个域名的 DNS 权威服务器（即谁来负责解析这个域名）。

#### **✅ 那为什么 Cloudflare 要这么做？**

因为 Cloudflare 是一个 **全托管型 DNS 解析服务**，它必须**完全接管你的 DNS 解析权**，才能为你提供以下服务：

| **功能** | **说明** |
| --- | --- |
| **DDoS 防护 / WAF** | 所有流量必须经过 Cloudflare 才能过滤恶意请求 |
| **CDN 加速** | 内容缓存、边缘节点加速必须基于 Cloudflare 控制的入口 |
| **SSL/TLS 终端** | SSL 证书由 Cloudflare 提供，需要在流量进入前拦截 |
| **DNS 配置统一管理** | Cloudflare 会从你切换 NS 的一刻起接管所有子域解析 |

```python
浏览器/用户
   ↓
根DNS ➝ 顶级域DNS ➝ Namecheap 指定的 NS记录 ➝ Cloudflare NS
   ↓
Cloudflare DNS 解析出 A/CNAME 等记录
   ↓
返回最终 IP 或 CDN 节点 IP
```

## 配置 cf 的 email

添加自己的设置【注意这里会有 cf 自动写入 dns 的配置，如果你有 icloud+ 自定义域名的设置 请先删除才可以，因为 email dns不可以重复】

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250504203448860.png)

#### **📬 为什么 Email DNS 不可以重复设置？**

#### **✅ 1.MX 记录是唯一指定收信服务器的入口**

- 一个域名只能设置 **一套有效的 MX 记录**。
- 如果你设置了 iCloud 的 MX 记录，同时又设置了其他邮箱服务（如 Google Workspace），那收件服务器就会冲突，不知道该投递给谁。

| **Type** | **Name** | **Content** | **优先级** |
| --- | --- | --- | --- |
| MX | *.me | route1.mx.cloudflare.net | 66 |
| MX | *.me | route2.mx.cloudflare.net | 48 |
| MX | *.me | route3.mx.cloudflare.net | 5 |
- 意义：邮件系统会**优先联系优先级低的服务器**（5 优先于 48、66），从高到低尝试投递。
- routeX.mx.cloudflare.net 是 Cloudflare 的邮件转发中继（你在开启 **Cloudflare Email Routing** 功能时自动添加的）。
- 如果你不打算使用 Cloudflare 的邮箱转发功能，**需要删除这些 MX 记录**，改为你想用的（比如 iCloud 的 mx01.mail.icloud.com）。

#### **✅ 2.TXT/SPF 记录不能随意叠加**

- 作用：告诉其他邮件服务「哪些服务器可以合法发送你域名的邮件」。
- SPF（TXT）记录用于防止伪造发件人。
- 比如：v=spf1 include:icloud.com -all 和 v=spf1 include:_spf.google.com -all 是互斥的。
- 同时存在会让验证失败，导致发出去的邮件进垃圾箱，甚至被退回。

#### **✅ 3.DKIM、DMARC 是签名机制的基础，也只能设置一次**

- 多个邮件提供商不能共用一套 DKIM（CNAME）签名，因为签名值是不同的。
- DMARC 策略也是域名级别的唯一策略。
- 作用：用于验证邮件是否被篡改，防止邮件伪造。
- DKIM 是通过 DNS 公钥 + 邮件头部的签名共同验证的。
- cf2024-1._domainkey.*.me 是 Cloudflare 生成的 DKIM 公钥记录。

| **字段** | **含义** |
| --- | --- |
| **Type** | DNS 记录的类型，比如 A、MX、CNAME、TXT、NS 等 |
| **Name** | 域名或子域名（如 *.me 或 @ 表示主域名），指 dns 的 who |
| **Content** | 对应记录的值，比如 IP 地址、邮件服务器、SPF 策略等，指这个 dns 去哪里 |
| **TTL** | 缓存生效时间（Auto 表示自动） |
| **Proxy Status** | DNS only 或 Proxied，是否通过 Cloudflare 的加速和防护 |

## 邮件发送流程

### **✅ 场景设定**

- 你的域名是 *.me
- 你在 **Cloudflare 开启了 Email Routing 功能**
- 你设置了：将 @*.me 的邮件转发到 yourname@qq.com

### **✅ 邮件发送流程（以别人往你name@*.me发邮件为例）**

#### **💡 1. 发送者（比如别人用 Outlook、QQ 邮箱发邮件）**

- 发件服务器会通过 DNS 查询你域名的 **MX 记录**：

```python
dig MX *.me
```

• 得到的是：

```python
MX 5  route3.mx.cloudflare.net
MX 48 route2.mx.cloudflare.net
MX 66 route1.mx.cloudflare.net
```

• 所以邮件会优先发给 route3.mx.cloudflare.net

- Cloudflare 的邮件中继服务器接收到邮件后，检查你在 Cloudflare 后台设置的邮箱转发规则
- 发现你设置了：

```python
name@*.me → yourname@gmail.com
```

- Cloudflare 就会**将原始邮件完整转发**到你的 gmail.com（包括正文、附件、原始发件人等）

| **机制** | **解释** |
| --- | --- |
| **MX 记录** | 告诉全世界「这个域名的邮件应该交给谁来处理」 |
| **Cloudflare Email Routing** | 拦截这些邮件后，**帮你转发到其他真实邮箱** |
| **DNS 查的是 MX，不是你的真实邮箱服务商** | 所以只要 MX 是 Cloudflare 的，邮件就不会直接送到 iCloud、QQ、Gmail 等 |

## 配置 Gmail的 smtp 功能

在Google账户设置中创建一个专门用于邮件的应用专用密码：

```
•	访问https://myaccount.google.com/apppasswords
•	选择”邮件”作为应用类型
•	选择您的计算机作为设备
【密码直接复制 他给你的格式，好像是有空格】
```

创建完 就得到了这个应用对应的信息了。

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250504204717504.png)

此时去 gmail 设置：

```
•	打开Gmail，点击设置（齿轮图标）→查看所有设置
•	找到”账号和导入”选项卡
•	在”以其他地址发送邮件”部分，点击”添加其他电子邮件地址”
•	填写您的姓名和Cloudflare转发的邮箱地址
•	取消勾选”作为别名处理”选项
•	点击”下一步”
•	在SMTP服务器设置中填写：【要修改此时的 mx 记录】
•	SMTP服务器：smtp.gmail.com
•	端口：587
•	用户名：您的Gmail地址
•	密码：之前创建的应用专用密码
•	提交后，Gmail会发送一个确认码、链接，在下一个屏幕中输入

```

**通过这个 smtp 配置完成后，gmail 会发送邮件，此时点击就表示验证通过。**

- Gmail 只是「伪装成你」，通过它自己的发信服务器（SMTP）**代表你发出邮件**。

#### **❓为什么 dig MX 看到的仍然是 Cloudflare 的？**

👉 因为 **MX 记录决定的是「收邮件用哪个服务器」**

你现在是让 Cloudflare 来接收 *.me 的邮件，然后转发给你 Gmail，所以 mx 记录还是 cf.

#### **❓Gmail 发信时用的是哪个服务器？**

👉 是 **smtp.gmail.com** —— 这是 Gmail 的发信服务器

你设置的 以 xxx@*.me 的身份发邮件，其实是：

- Gmail 使用自己的服务器来发
- 但 **把发件人显示为**：xxx@*.me

这就是 **发信伪装（SMTP sender alias）**。

#### **❓邮件发送出去时，会走回 Cloudflare 的 MX 吗？**

👉 **不会**！

**发送邮件不走 MX，发送只走 SMTP。**

MX 是“收信入口”，SMTP 是“发信出口”：

| **功能** | **使用的协议** | **你的配置** |
| --- | --- | --- |
| 收邮件 | MX → Cloudflare | ✅ 正确 |
| 发邮件 | SMTP → Gmail | ✅ 正确 |

##
