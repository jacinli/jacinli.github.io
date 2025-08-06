# 目录

[[toc]]

## 边缘证书(**Edge Certificate)**

**边缘证书**是部署在 CDN 边缘节点上的 TLS/SSL 证书，用来加密客户端（用户浏览器）和 CDN 之间的通信。因为 CDN 把流量“缓存/加速”放在离用户最近的节点，这些节点就是所谓的“边缘”（Edge），所以证书也在这些边缘节点上终端 TLS 握手，故名 **Edge Certificate**。

“边缘”指的是网络拓扑中离最终用户最近的那一层：

- 传统模式是用户直接访问源服务器（origin），
- CDN 把内容分发到全球多个节点（边缘节点），用户优先跟就近的边缘节点打交道。
    
    这层就是“边缘”，用户→边缘→源（必要时向源回源）。
    

用户访问 [https://jacin.me](https://jacin.me/) 的请求：

```go
用户浏览器  ←TLS→  Cloudflare 边缘节点（用的是边缘证书） ←加密/配置→ 源服务器（用的是源/Origin 证书或自签/Let’s Encrypt 等）
```

**边缘证书 vs 源证书（Origin Certificate）**

| **方面** | **边缘证书** | **源证书（Origin Certificate）** |
| --- | --- | --- |
| 终止位置 | CDN 边缘节点（用户侧） | 源服务器（Cloudflare 与源服务器之间） |
| 作用对象 | 保护用户到 CDN 的连接 | 保护 CDN 到你自己服务器的连接 |
| 签发方 | 通常由 CDN（如 Cloudflare）自动管理 | Cloudflare 可以给你签发专用的 Origin 证书（只被 Cloudflare 信任） |
| 公共信任 | 被大多数浏览器、公网上直接信任 | 不是公开 CA 签发的，仅 Cloudflare 内部信任（不用于用户直接访问） |

好处：

1. **加速**：TLS 握手在就近的边缘节点完成，降低延迟（用户不必直连源站做握手）。
2. **弹性/可用性**：边缘节点分布广，源站短暂不可达时还能做缓存返回。
3. **安全性**：用户到 CDN 是 HTTPS，防止中间人；可以启用 HTTPS 强制、自动重定向、HSTS、TLS 最佳配置。
4. **简化管理**：Cloudflare 自动为你在边缘配置和续期证书（通常免费、透明）。

在 CDN 架构里，“边缘”是处理用户请求的第一线：

- 缓存静态资源（HTML、图片、JS 等）
- 终止 TLS（用边缘证书解密）
- 做 WAF/速率限制/重写/重定向等智能规则
- 只有命中率不高或需要动态内容时才回源到你真正的服务器

所以边缘 = CDN 节点 = “离用户最近的服务层”。

边缘证书就是这层对外的 HTTPS 入口的证书。

**补充：常见配置选项（Cloudflare）**

- **Flexible**：用户到 Cloudflare 是 HTTPS，但 Cloudflare 到源是 HTTP（不推荐生产）。
- **Full**：Cloudflare 到源是 HTTPS，但不验证证书有效性（可以用自签）。
- **Full (strict)**：Cloudflare 到源是 HTTPS 且验证证书（推荐，配合 Origin Certificate）。

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250804201630102.png)

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/20250804212227991.png)

## 源站证书

- **位置：** 安装在你自己的源服务器上（你在 Cloudflare 仪表盘生成的那个 “Cloudflare Origin Certificate”）。
- **作用：** Cloudflare 与你的源站之间建立 HTTPS（即 Cloudflare 访问你的服务器时用 HTTPS），只要你在 Cloudflare 上设置了 SSL 为 “Full (strict)” 就会验证这个证书。
- **特点：** 不是通用 CA 签发的，浏览器之外的用户不能直接信任它，但 Cloudflare 信任它。有效期可长（你那个是到 2040 的 origin cert）。

```go

访客浏览器
   ↓ HTTPS (Edge Certificate)
Cloudflare 边缘
   ↓ HTTPS (验证) → Origin Server（用 Origin Certificate 提供）
```

## **客户端证书(Client Certificate / mTLS)**

**A.Authenticated Origin Pulls**

**（Cloudflare 作为客户端出证书给你源站）**

- **方向：** Cloudflare → 你的源站
- **作用：** 源站校验请求是不是来自 Cloudflare（防止别人绕过 Cloudflare 直接打你源站）。
- **谁出证书：** Cloudflare 生成一个“origin pull”证书，源站验证它。
- **配置：** 在 Cloudflare 开启 Authenticated Origin Pulls，然后在源站 nginx 加入如下校验：

```go
ssl_client_certificate /path/to/origin-pull-ca.pem;
ssl_verify_client on;

if ($ssl_client_verify != SUCCESS) {
  return 444;
}
```

**访问者侧 mTLS / 访客必须出客户端证书**

**（Cloudflare 仪表盘里你看到的 “客户端证书” 这个）**

- **方向：** 访问者（API 客户端 / 受限用户） → Cloudflare 边缘
- **作用：** 要求访问你某些路径的客户端必须提供有效的客户端证书（双向 TLS），未经授权的请求被拒。
- **用例：** 管理后台、内部 API、限定访问的接口，比 token 更安全。

## 联系

| **方向/用途** | **证书是谁出** | **谁验证** | **作用** |
| --- | --- | --- | --- |
| 浏览器到 Cloudflare | Edge Cert（Cloudflare） | 浏览器信任 | 访客 HTTPS 加密 |
| Cloudflare 到源站 | Origin Cert（Cloudflare 签） | Cloudflare 验证源站（反向是 Full strict） | Cloudflare 与源站加密 |
| Cloudflare 被源站验证（防绕过） | Cloudflare 出“Authenticated Origin Pulls”证书 | 源站验证 | 只接受来自 Cloudflare 的流量 |
| 访客必须出证书访问 | 你/Cloudflare 发客户端证书 | Cloudflare 验证 | 访问控制（mTLS） |