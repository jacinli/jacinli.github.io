# 目录

[[toc]]

## 什么是 EDNS

全称 **EDNS(0)** = *Extension Mechanisms for DNS*，由 [RFC 6891](https://datatracker.ietf.org/doc/html/rfc6891) 定义。

它的作用是 **给传统 DNS 增加扩展能力**，因为早期 DNS 协议有很多限制，比如：

- 原始 UDP DNS 报文最大 512 字节（够早期用，但不够放 IPv6、DNSSEC 数据）
- 没有额外字段传递扩展信息

EDNS 做的事情：

- 通过在 DNS 报文中增加一个 **OPT 伪资源记录（OPT RR）**，来传递额外信息
- 支持更大的 UDP 报文（常见最大 4096 字节）
- 可传递额外标志位（flags）和可选数据（options）

常见用途：

- **DNSSEC**：需要更大包传递签名
- **ECS (EDNS Client Subnet)**：在 DNS 查询中带上部分客户端 IP 前缀，CDN 用它做就近调度
- 其他实验性扩展

## **ECS**

**EDNS Client Subnet (ECS)** 在绝大多数公共 DNS 服务里确实是 /24（IPv4）和 /56（IPv6）为主。

ECS 的核心作用就是 **把用户的大致 IP 网段传给权威 DNS**，这样 CDN 可以：

- 判断用户大致地理位置（精确到城市 / 运营商级别）
- 返回距离用户最近、网络最快的 **CDN 边缘节点 IP**

如果没有 ECS，权威 DNS 只能看到 **递归解析器的 IP**（比如 8.8.8.8 在东京的 IP），它会以为用户在东京，从而返回东京节点 IP——这对实际在上海的你来说就很慢。

绝大多数大规模 CDN（Akamai、Cloudflare、Akamai、Fastly、阿里云、腾讯云等）都会用 ECS 信息来做智能调度：

- 如果 ECS 存在：根据子网位置返回最近节点
- 如果 ECS 不存在：根据递归 DNS 的 IP 位置返回节点（可能不准）

ECS 会在 DNS 查询时，在 EDNS 的 **OPT RR** 里加一个 **Client Subnet** 字段：

```go
+----------------+----------------+---------------+
| FAMILY (IPv4=1)| SOURCE PREFIX  | ADDRESS       |
+----------------+----------------+---------------+
```

| **服务商** | **IPv4 前缀** | **IPv6 前缀** | **说明** |
| --- | --- | --- | --- |
| Google DNS (8.8.8.8) | /24 | /56 | 较宽泛，保护一定隐私 |
| Cloudflare DNS (1.1.1.1) | /24 | /56 | 类似 Google |
| OpenDNS | /32（全 IP） | /128 | 精确到用户 IP，隐私最差 |
| Quad9 (9.9.9.9) | /24 | /56 | 注重隐私，CDN 精度稍差 |
| 部分运营商 DNS | /32 | /128 | 方便做本地化，但泄露隐私 |

**3. 为什么不是直接全 IP？**

- /24 (IPv4) 表示只暴露你所在的 **C 类网段**，CDN 可以定位到城市/区域，但不会精确到家庭或设备
- /32 会暴露完整 IP，CDN 定位精准，但隐私差
- /56 (IPv6) 类似 /24 思路，只暴露大网段

```go
dig +subnet=<IP>/<PREFIX> <域名> @DNS服务器
```

- <IP> → 你想模拟的客户端 IP
- <PREFIX> → ECS 前缀长度
- <域名> → 你想查询的域名
- @DNS服务器 → 使用哪个 DNS 解析（如 8.8.8.8）

这里以 [alibaba.com](http://alibaba.com/) 为例，因为他的 解析结果国内不一样，国外是 47.* 开头的。

这里以日本 vps 进行 dig 测试。

## 构造子网查询

构造 subnet 子网查询

```go
dig +subnet=203.0.113.0/24 alibaba.com @223.5.5.5

; <<>> DiG 9.18.30-0ubuntu0.22.04.2-Ubuntu <<>> +subnet alibaba.com @223.5.5.5
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 4300
;; flags: qr rd ra; QUERY: 1, ANSWER: 4, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; CLIENT-SUBNET: 203.0.113.0/24/24
;; QUESTION SECTION:
;alibaba.com.                   IN      A

;; ANSWER SECTION:
alibaba.com.            120     IN      A       203.119.238.116
alibaba.com.            120     IN      A       203.119.204.250
alibaba.com.            120     IN      A       203.119.238.5
alibaba.com.            120     IN      A       203.119.238.64

;; Query time: 598 msec
;; SERVER: 223.5.5.5#53(223.5.5.5) (UDP)
;; WHEN: Sun Aug 10 13:12:56 UTC 2025
;; MSG SIZE  rcvd: 115
```

使用国外子网

```go
dig +subnet=8.8.8.0/24 alibaba.com @223.5.5.5

; <<>> DiG 9.18.30-0ubuntu0.22.04.2-Ubuntu <<>> +subnet alibaba.com @223.5.5.5
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 3055
;; flags: qr rd ra; QUERY: 1, ANSWER: 4, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; CLIENT-SUBNET: 8.8.8.0/24/24
;; QUESTION SECTION:
;alibaba.com.                   IN      A

;; ANSWER SECTION:
alibaba.com.            120     IN      A       47.246.136.156
alibaba.com.            120     IN      A       47.246.137.105
alibaba.com.            120     IN      A       47.246.136.52
alibaba.com.            120     IN      A       47.246.131.198

;; Query time: 237 msec
;; SERVER: 223.5.5.5#53(223.5.5.5) (UDP)
;; WHEN: Sun Aug 10 13:16:08 UTC 2025
;; MSG SIZE  rcvd: 115
```

可见这两个解析是完全不一样的。

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250810212158624.png)

## dig返回信息

- **+subnet=203.0.113.0/24** → 启用 **EDNS Client Subnet (ECS)**，模拟客户端来自 203.0.113.0/24 网络（这里是一个保留测试网段）。
- **alibaba.com** → 要解析的域名。
- **@223.5.5.5** → 指定 DNS 服务器为阿里公共 DNS（223.5.5.5）。

**(1) HEADER 段**

```go
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 4300
;; flags: qr rd ra; QUERY: 1, ANSWER: 4, AUTHORITY: 0, ADDITIONAL: 1
```

- **opcode: QUERY** → 标准 DNS 查询。
- **status: NOERROR** → 解析成功，没有错误。
- **flags:**
    - **qr** → 这是一个响应（不是请求）。
    - **rd** → 请求启用了递归解析（Recursion Desired）。
    - **ra** → 服务器支持递归解析（Recursion Available）。
- **QUERY: 1** → 请求了 1 个域名记录。
- **ANSWER: 4** → 返回了 4 条解析结果（A 记录）。
- **AUTHORITY: 0** → 没有权威服务器信息。
- **ADDITIONAL: 1** → 额外记录 1 条（这里是 EDNS 信息）。

**(2) OPT PSEUDOSECTION**

- **EDNS: version: 0** → 使用 EDNS0 协议（扩展 DNS 协议）。
- **udp: 1232** → 服务器支持的最大 UDP 响应字节数（1232字节）。
- **CLIENT-SUBNET: 203.0.113.0/24/24**
    - 第一个 /24 → 客户端提交的 ECS 前缀长度。
    - 第二个 /24 → 服务器接受并使用的前缀长度（有些服务器会缩短，比如你给 /32，它可能只用 /24）。

[]()

## 国内外公共 DNS 对 ECS的支持情况

| **DNS 服务商** | **IPv4 地址** | **IPv6 地址** | **ECS 支持** | **默认前缀长度** | **备注** |
| --- | --- | --- | --- | --- | --- |
| **阿里公共 DNS** | 223.5.5.5 / 223.6.6.6 | 2400:3200::1 / 2400:3200:baba::1 | ✅ 支持 | /24(IPv4) /56(IPv6) | ECS 用于阿里云 CDN/加速调度 |
| **腾讯公共 DNS** | 119.29.29.29 / 182.254.116.116 | 2402:4e00:: | ✅ 支持 | /24 /56 | 国内常用，支持 ECS 查询调度 |
| **百度公共 DNS** | 180.76.76.76 | — | ✅ 支持 | /24 | 会做百度系 CDN 调度 |
| **114DNS** | 114.114.114.114 / 114.114.115.115 | — | ⚠️ 部分支持 | /24 | 对部分域名返回 ECS 信息 |
| **CNNIC SDNS** | 1.2.4.8 / 210.2.4.8 | — | ❌ 不支持 | — | 只返回标准 DNS 响应 |

**为什么 Cloudflare 不做 ECS？**

Cloudflare 官方理由：

1. **隐私优先** — ECS 会把用户的网络位置暴露给更多第三方（CDN、权威 DNS）。
2. **架构复杂性** — Cloudflare 递归节点分布全球，且自己也是 CDN，所以它用的是 **自己的智能路由** 来替代 ECS 定位。

| **DNS 服务商** | **IPv4 地址** | **IPv6 地址** | **ECS 支持** | **默认前缀长度** | **备注** |
| --- | --- | --- | --- | --- | --- |
| **Google Public DNS** | 8.8.8.8 / 8.8.4.4 | 2001:4860:4860::8888 / 2001:4860:4860::8844 | ✅ 支持 | /24 /56 | 支持手动指定 +subnet |
| **Quad9** | 9.9.9.9 / 149.112.112.112 | 2620:fe::fe | ✅ 支持 | /24 /56 | 注重隐私，默认会截断到 /24 |
| **OpenDNS** | 208.67.222.222 / 208.67.220.220 | 2620:0:ccc::2 / 2620:0:ccd::2 | ✅ 支持 | /32 /128 | 精确到全 IP，隐私差 |
| **Cloudflare DNS** | 1.1.1.1 / 1.0.0.1 | 2606:4700:4700::1111 / 2606:4700:4700::1001 | ❌ 不支持 | — | 为隐私拒绝 ECS |
| **AdGuard DNS** | 94.140.14.14 / 94.140.15.15 | 2a10:50c0::ad1:ff / 2a10:50c0::ad2:ff | ❌ 不支持 | — | 主打隐私保护 |
| **NextDNS** | 自定义 | 自定义 | ⚙️ 可选支持 | /24 /56 可配置 | 可在面板开启或关闭 ECS |