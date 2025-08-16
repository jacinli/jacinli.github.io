# 目录

[[toc]]

https://docs.min.io/enterprise/aistor-object-store/

![](https://public.jacin.me/blog/img/2025/08/ee5594a07c5b9bba15df8f8e0224957e-1755361353.png)

## 配置 API

创建用户，这里的 user_name 就是 s3 的  *MINIO_ACCESS_KEY*

password 就是 s3 的 *MINIO_SECRET_KEY*

*MINIO_ENDPOINT_URL 就是你反代的 cos 地址，比如 https://cos.jacin.me (如果是 ip，那么就是:9000)* 

地区一般就是 auto ，没有特殊配置的话。

![](https://public.jacin.me/blog/img/2025/08/9982076451c64c13a5d8708a3ee003ac-1755360529.png)

## minio 一些知识点

1. **Users（用户）**
    - 这里可以创建、编辑和删除 MinIO 本地用户（也就是 Access Key / Secret Key 对应的账户）。
    - 你可以给每个用户分配不同的 IAM policy（如只读、读写等）。
2. **Groups（组）**
    - 组就是一堆用户的集合。你可以把多个用户放进一个组，然后给组统一分配 policy。
    - 这样新增用户时，只要把他拉到对应的组里，就自动继承组的访问权限。
3. **OpenID**
    - OpenID Connect（OIDC）是一套基于 OAuth2.0 的身份认证协议。
    - 在这里可以配置 MinIO 作为 OIDC 客户端，通过像 Keycloak、Auth0、Google Identity Platform 这类提供商来做 SSO 登录。
    - 配置之后，UI 登录就会跳到你的身份提供商页面，而不用再用 MinIO 本地的 Access Key/Secret Key。
4. **LDAP**
    - 如果你公司/组织有自己的 LDAP/Active Directory（比如 OpenLDAP、Microsoft AD），可以在这里集成。
    - 用户登录时，可以用 LDAP 里的账号密码，而且可以把 LDAP 组映射成 MinIO 组。
    - 便于用企业现有的帐号体系来做统一的权限管理。

![](https://public.jacin.me/blog/img/2025/08/3a579a3a8b0d869ff9801d7c9e95c8bb-1755360778.png)

| **Access Policy** (“Custom”) | 当前这个桶使用的是 自定义（Custom）访问策略。也就是说你没有选“Public” 或 “Read-only”“Read-write” 这样的内置策略，而是自定义了一段 JSON policy 来控制对这个桶的权限。 |
| --- | --- |
| **Encryption** (“Disabled”) | 服务器端加密（SSE）在写入时是否启用：– **Disabled**：对象以明文存储。– 如果你开启了 SSE-S3 或 SSE-KMS，MinIO 会在存储时自动加密，并在取回时解密。 |
| **Replication** (“Disabled”) | 跨站点/跨集群复制功能是否开启：– **Disabled**：没有自动把对象复制到其他 MinIO 实例。– 开启后可以在不同数据中心间同步桶里的数据。 |
| **Object Locking** (“Disabled”) | 对象锁定（WORM，写一次读多次）功能：– **Disabled**：未启用锁定。– 如果启用并配置保留策略，上传后可以防止对象被删除/覆盖，适合审计或合规场景。 |
| **Tags** | 给桶打的标签（键值对），方便做管理和查询。例如可以标注“environment=prod” 或者“team=analytics”。 |
| **Quota** (“Disabled”) | 配额限制：– **Disabled**：没有空间或对象数量限制。– 如果你给桶设置了配额，就能限制这个桶可用的总存储空间（或对象数）。 |

一般桶的策略：

- Statement 允许任何人执行
    - s3:GetObject（读取桶里每个对象）
        
        资源是桶下的所有对象 "arn:aws:s3:::public/*"
        

不可以放行：
    **◦ s3:ListBucket（列出桶里的对象列表）**

```go
{
  "Version": "2012-10-17",
  "Statement": [{
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetBucketLocation"],
      "Resource": ["arn:aws:s3:::public"]
    },
    {
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::public/*"]
    }
  ]
}
```