---
layout: post
title: "从 Alpha 到 Final：Python 各阶段版本到底该怎么用？"
date: 2025-06-12
description: "从 Alpha 到 Final：Python 各阶段版本到底该怎么用？"
tag: python
---

**主流的 Python 是由Python Software Foundation（PSF，Python 软件基金会）主导的：**

- PSF 是一个 **非营利组织**
- 负责维护 **Python 官方语言规范、标准库、社区基础设施**
- 它主导的实现版本是我们日常使用的：

> CPython
> 

**Python 的版本阶段（版本周期）**。这些阶段是官方正式定义的，适用于每一个 Python 主版本（比如 3.12、3.13、3.14…）

## **🧠 Python 版本的四大阶段**

Python 每个主版本都会经历以下 **四个阶段**：

| **阶段** | **英文名** | **状态说明** | **推荐用途** |
| --- | --- | --- | --- |
| 🧪 1. Alpha | Alpha Release | 功能开发中，接口可能频繁变动 | ⚠️ 不推荐日常使用，只适合生态开发者参与测试 |
| 🔬 2. Beta | Beta Release | 功能冻结，只修 bug，不再新增特性 | ✅ 推荐框架作者/库作者进行兼容性测试 |
| 🔁 3. RC（候选） | Release Candidate | 准正式版本，仅修复关键 bug | ✅ 可用于生产灰度测试，但仍谨慎上线 |
| 🎉 4. 正式版 | Final / GA（General Availability） | 稳定版，面向所有开发者 | ✅ 强烈推荐：项目正式切换时机 |

**🕒 举个时间线例子（以 Python 3.14 为例）：**

| **阶段** | **时间点** | **示例版本** |
| --- | --- | --- |
| Alpha | 2024-10 至 2025-05 | 3.14.0a1 → 3.14.0a7 |
| Beta | 2025-05 至 2025-07 | 3.14.0b1 → 3.14.0b4 |
| RC | 2025-07 至 2025-09 | 3.14.0rc1, rc2 |
| Final | 2025-10 发布 | 3.14.0 正式上线 |

Python 的版本发布遵循严格流程，分为 Alpha → Beta → RC → Final 四阶段，**每个阶段都服务于不同人群和用途**，对开发者来说，掌握这些区别有助于正确选版本、规避升级风险。

## **🛡️ 关于 GIL 的大变化**

- **Python 3.12**：实现子解释器独立 GIL（PEP 684），C‑API 支持，暂未开放全局线程并行
- **Python 3.13**：实验证明可构建“无 GIL”版本（PEP 703），但仍需自行构建开启
- **Python 3.14**：无 GIL 支持继续推进，“Free‑threaded”模式将进一步完善()
- **从 3.12 开始试水子解释器 GIL**
- **3.13 实验性开启无 GIL 构建**
- **3.14 正式推进无 GIL + 多解释器支持**

# Cpython

CPython 的 C 源码（例如 ceval.c, listobject.c, dictobject.c）**并不会出现在 .venv/ 中**，因为：

- 它们早在你安装 Python 时（比如通过 Homebrew、pyenv、系统包管理器）就已经 **编译成了底层 .so/.dll 动态库**，并作为 python 可执行解释器的一部分。
- 所以你只能在 **Python 安装目录** 或 **CPython 源码仓库**中找到 .c 文件。

**.venv 是虚拟环境，只包含已经“编译好的” Python 可执行文件 + 第三方库的安装副本，不会包含 CPython 源码的 .c 文件。**

| **路径** | **说明** |
| --- | --- |
| bin/ | 可执行文件，如 python、pip |
| lib/ | 安装的 Python 库，比如 site-packages/ |
| pyvenv.cfg | 虚拟环境配置文件，记录 Python 路径等 |
| .gitignore, CACHEDIR.TAG | 缓存或工具生成的标记文件 |
| （无 .c） | 因为这只是“已构建产物”，不是解释器源码仓库 |

**📌.dylib动态链接库（如libpython3.12.dylib）**

- .dylib 是 macOS 平台的 **动态链接库**，等价于 Linux 的 .so，Windows 的 .dll
- libpython3.12.dylib 就是整个 CPython 解释器的核心二进制
- 它被：
    - python 解释器调用
    - 你写的 Python 脚本在运行时加载
    - 第三方应用程序“嵌入式”调用（如嵌入 Python 到游戏引擎、GUI 应用中）