# 目录

[[toc]]

## M1 芯片 本地运行 rocketmq

rocketmq Python 开源地址：

https://github.com/apache/rocketmq-client-python

因为需要 linux c/c++ libs包，官方只给出了centos ,debain,macOS 配置信息

终端使用 brew install wget 命令 【注意代理/或开启 tun 模式】

•  **x86_64 架构的 librocketmq.dylib**

```
wget <https://github.com/apache/rocketmq-client-cpp/releases/download/2.0.0/rocketmq-client-cpp-2.0.0-bin-release.darwin.tar.gz>
tar -xzf rocketmq-client-cpp-2.0.0-bin-release.darwin.tar.gz
cd rocketmq-client-cpp
sudo mkdir /usr/local/include/rocketmq
sudo mkdir -p /usr/local/lib
sudo cp include/* /usr/local/include/rocketmq
sudo cp lib/* /usr/local/lib

>>>>>修正动态库 ID（macOS 的 install_name_tool） 
>>>>>这一步是为了确保 Python 在加载 .dylib 时不出错（macOS 默认路径检查严格）

sudo install_name_tool -id "@rpath/librocketmq.dylib" /usr/local/lib/librocketmq.dylib
```

> 上面会把 librocketmq.dylib 安装到 /usr/local/lib/，让动态链接器可以找到它
> 

为了避免后续找不到 .dylib

1. 确保文件放到了 /usr/local/lib/librocketmq.dylib [**✅  添加链接路径到系统环境变量]**

vim ~/.zshrc

```jsx
echo 'export DYLD_LIBRARY_PATH="/usr/local/lib:$DYLD_LIBRARY_PATH"' >> ~/.zshrc
source ~/.zshrc
```

验证：

```jsx
ls /usr/local/lib/librocketmq.dylib
```

由于 mac 都是 m1芯片的，Intel x86 的可以忽略该操作。

否则使用 arm 架构的有这个错误！！！！

```jsx
OSError: ... is an incompatible architecture (have 'x86_64', need 'arm64e' or 'arm64')
```

1. 使用 Rosetta 启动终端（右键 iTerm → “使用 Rosetta 打开”）【显示简介】

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/202505161413677.png)

https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/202505161413677.png

点击显示简介

![](https://cdn.jsdelivr.net/gh/jacinli/image-hosting@main/notes/202505161413347.png)

**x86_64** 的 conda 环境：

```jsx
CONDA_SUBDIR=osx-64 conda create -n rocketmq-x86 python=3.10
conda activate rocketmq-x86

>>>>>>>
python -c "import platform; print(platform.machine())" 
>>>>>
x86_64
```

安装依赖：

```jsx
pip install rocketmq-client-python
```

验证操作：

```jsx
python -c "import platform; print(platform.machine())"

验证成功：
from rocketmq.client import Producer
print("RocketMQ 启动成功 ✅")
```

上面就表示已经成功导入。

如果是本地运行，请使用腾讯云 mq 公网地址

【无法使用 arm 架构的 **librocketmq.dylib 】**

这个前提是：**官方有提供 ARM 架构的 RocketMQ C++ SDK**，但很遗憾：

> 🔥 截止目前（2025），Apache 官方只提供了
> 
> 
> **x86_64 的 Darwin 版本**
> 

> ⚠️ 没有 ARM64 架构的 .dylib，所以你
> 
> 
> **无法直接在 M1 的原生 Python 上运行**
> 

## 腾讯云rocketmq 配置

因为这个和其他的不太一样

| **项目** | **腾讯云 RocketMQ** |
| --- | --- |
| NameServer 地址 | 是腾讯云提供的专属地址，例如 rmq-cn-xxx.rmq.cloud.tencent.com:8080 |
| Topic | 必须先在 **腾讯云控制台创建 Topic** |
| Group、权限等 | 都要在控制台配置或授权 |
| 自动创建 Topic | ❌ 不支持（和 Apache 的 autoCreateTopic=true 不一样） |

在控制台 先创建 topic :**创建名为 dev-test-mq-for-0516 的 Topic**

**然后发送测试消息 【这样保证域名能被解析到】**

```jsx
rocketmq.exceptions.ProducerSendSyncFailed: No route info of this topic: dev-test-mq-for-0516
```

**如果有这个错误 可以看一下 自己的集群 地址，看看本地开发到底是公网还是私网地址，这个很重要！！！！**

可以创建一个 group 来测试。

**在腾讯云操作上必须要创建 topic group 现有这两个，才可以进行消费与生产！！！！！**

❗这是最关键的一步！否则客户端永远查不到路由。

**请这样操作：**

1. 打开控制台 ➝ RocketMQ 实例 ➝ Topic 管理 ➝ 点进 dev-test-mq-for-0516
2. 查看 **队列数量** 是不是 0？（你之前看到是 3，但如果不是绑定在你当前集群的 Broker 上，也等于没用）
3. 点右侧「**编辑**」
4. 重新设置队列数量为 3（或其他），然后点保存提交

这样就会重新绑定路由到 Broker。

回到 Topic 管理 ➝ 点 发送测试消息，填点消息内容，发送一下。

**这个过程就会刷新 NameServer 的路由缓存。**

可以测一测网络信息，以免是网络

```jsx

telnet rmq-xxxx.rocketmq.gz.qcloud.tencenttdmq.com 8080

ping rmq-xxxx.rocketmq.gz.qcloud.tencenttdmq.com 
```

腾讯云的 RocketMQ 默认是 **VPC 专网访问**，如果你本地是公网，要配置公网访问地址，并且：

- 对应账号要开启公网访问权限
- SDK 需要用公网域名
- AK/SK 权限配置正确