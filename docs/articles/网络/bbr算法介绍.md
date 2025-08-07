# 目录

[[toc]]

## 默认调度

默认情况下，Linux 内核的 TCP 拥塞控制算法和队列调度分别是：

- **拥塞控制（TCP congestion control）**：
    
    默认算法是 **CUBIC**。
    

```go
sysctl net.ipv4.tcp_congestion_control
# 默认通常会返回：net.ipv4.tcp_congestion_control = cubic
```

- **队列调度（qdisc）**：
    
    默认队列管理器是 **pfifo_fast**（三带宽优先队列）。
    

```go
sysctl net.core.default_qdisc
# 默认通常会返回：net.core.default_qdisc = pfifo_fast
```


## 介绍

BBR（Bottleneck Bandwidth and RTT）是 Google 在 2016 年提出并开源到 Linux 内核中的一种 TCP 拥塞控制算法。

1. **基于模型**
    - 不再“等到丢包才减速”，而是持续测量并构建两条关键曲线：
        - **瓶颈带宽（BtlBw）**：当前链路能承载的最大吞吐。
        - **最小往返时延（RTprop）**：端到端的最低 RTT，用于发现队列积压。
2. **工作阶段**
    
    它在运行时不断在下面四个状态间切换，每个状态维持约一个 RTT：
    
    - **Startup**：指数式增长速率，快速逼近 BtlBw。
    - **Drain**：把多余排队数据“抽干”到 RTprop。
    - **ProbeBW**：周期性微调发送速率（±25%）以重探带宽上限。
    - **ProbeRTT**：定期短暂降速（200 ms），重测最小 RTT。
3. **优势**
    - **高吞吐**：长 RTT、高带宽链路上能更快到满载。
    - **低延迟**：主动控队列，减少 Bufferbloat。
    - **公平性**：对其他算法更友好，减少互相挤塞。

## 对比(bbr vs 普通 TCP)

| **特性** | **普通（CUBIC/Reno）** | **BBR** |
| --- | --- | --- |
| 拥塞判断 | 依赖丢包或延迟上升（丢包才减速／积队列才降速） | 基于实时测量的瓶颈带宽+BtlBw 和最小 RTT |
| 队列里排队 | 常常积累大量数据（Bufferbloat），引起高延迟抖动 | 主动“Drain”队列，尽量保持最低排队，减少抖动 |
| 吞吐收敛速度 | 在长 RTT、高带宽链路上，窗口增长慢、不易跑满带宽 | Startup 阶段指数增速，最快逼近可用带宽 |
| 高负载时延与抖动 | 延迟上升明显、波动大 | 在满载情况下延迟更稳定、抖动更小 |
| 互相博弈公平性 | 多流量时往往按丢包抢带宽，流量挤占严重 | 按模型分配，和其他算法共存友好 |
- **ping 测的只是 ICMP 空包的最低往返时延**，当链路空闲、队列空时，CUBIC 和 BBR 本质上都不会往队列里丢数据，所以你测的 RTT 都是“裸线”时延，几乎一致。
- **差别在“满载”或“波动”时**：
    - 用 iperf3 做大流量测试，你会发现 BBR 更快跑满那条链路的带宽（吞吐更高）；
    - 用连续 ping -f 或 ping 搭配大流量测试，可以看到 CUBIC 下延迟飙升、峰值高；而 BBR 下 RTT 维持在更低、更稳定的水平。

## 使用与安装(ubuntu22)

查看 linux 内核：需要 Linux 内核 ≥ 4.9。

```go
uname -r
```

编辑 sysctl 配置：

```go
sudo tee /etc/sysctl.d/99-bbr.conf <<EOF
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF
```

立即加载配置：

```go
sudo sysctl --system
```

验证 BBR是否生效

```go
# 显示当前拥塞算法
sysctl net.ipv4.tcp_congestion_control
# 应输出：net.ipv4.tcp_congestion_control = bbr

# 显示当前队列调度
sysctl net.core.default_qdisc
# 应输出：net.core.default_qdisc = fq

# 查看内核模块
lsmod | grep bbr
# 应能看到 bbr 模块已加载
```