# 目录

[[toc]]

## 编译与执行

> ✅「静态编译语言 + 生成原生二进制文件 + 操作系统直接执行」
> 

**Go 语言之所以在工程部署场景中大受欢迎的核心优势：它直接编译成原生二进制可执行文件（binary executable）**。

#### **🔧 Go 是“静态编译语言”（编译型 + 静态链接）**

```jsx
go build -o myapp main.go
```

Go 会做三件事：

1. **编译**你的 .go 代码为机器码（CPU 可执行指令）
2. **静态链接**所有标准库、依赖库（打包进一个文件里）
3. **生成一个二进制文件**，比如 myapp（Linux/macOS）或 myapp.exe（Windows）

> 📦 所以你得到了一个真正的“自包含”程序，不依赖 Go 环境，不依赖 Python/Java/Node 运行时。
> 

Go 编译出来的这个二进制文件本质上是：

- **CPU 能直接运行的 ELF（Linux） 或 Mach-O（macOS） 或 PE（Windows）格式的可执行文件**
- **包含了你代码 + 标准库 + 三方库 + TLS 支持等依赖**

> 所以你只要上传 myapp 这个二进制文件到目标服务器/容器，**直接运行即可**
> 

```jsx
./myapp

不需要：
	•	Go 环境
	•	包管理器
	•	解释器
	•	虚拟机
	•	容器也不需要装 runtime！
```

### **🧠 那 Go 编译出来的“二进制文件”底层到底是什么？**

它就是我们操作系统认的那种：

- Linux：ELF 格式
- Windows：.exe 的 PE 格式
- macOS：Mach-O

```jsx
file myapp

>>>>>myapp: Mach-O 64-bit executable x86_64 
```

**Go 是直接编译成操作系统能执行的原生二进制文件的语言**，部署时只需上传这个文件，直接运行，不需要 Go 环境、不需要解释器、不需要虚拟机，是工程部署最轻的一种形式。

| **特性** | **Go** | **C/C++** |
| --- | --- | --- |
| 编译方式 | 静态编译（go build） | 静态/动态编译（gcc, clang） |
| 编译结果 | 单个二进制文件 | 可是二进制，也可能依赖动态库 |
| 是否默认静态链接 | ✅ 是（不启用 CGO 默认静态） | ❌ 否（默认很多依赖 libc.so 等动态库） |
| 标准库/网络支持 | ✅ 标准库很全（http, json, etc.） | ❌ 需引入第三方库（如 Boost、libcurl） |
| 交叉编译支持 | ✅ 简单（GOOS/GOARCH） | ❌ 较复杂（需 toolchain、配置多） |
| 内存安全性 | ✅ 有垃圾回收、内存管理更安全 | ❌ 容易出现野指针、内存泄漏 |
| 并发支持 | ✅ 原生 goroutine，极简 | ❌ pthread 很重，难用 |
| 编译速度 | ⚡ 快 | ⏳ 慢 |

## docker 部署

Dockerfile

就是 build 形成一个二进制文件，然后使用 alpine 去运行这个二进制文件

```jsx
# Dockerfile
# 构建阶段，	使用官方 Go 的 Alpine 版本（极小体积）作为构建镜像
FROM golang:alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o gin-api-template .

# 运行阶段，	•	使用 alpine 最小基础镜像作为运行环境（无 Go 环境）

FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/gin-api-template .
COPY .env .

EXPOSE 8080

CMD ["./gin-api-template"]
```

核心的命令：

- 执行构建命令，生成二进制文件 gin-api-template
- o 指定输出文件名为 gin-api-template

```jsx
RUN go build -o gin-api-template .
```

| **阶段** | **操作** | **说明** |
| --- | --- | --- |
| 构建 | FROM golang:alpine AS builder | 使用小巧的 Go 构建镜像 |
| 构建 | go build -o | 编译 Go 项目为独立二进制文件 |
| 运行 | FROM alpine:latest | 运行环境无 Go，仅运行编译好的二进制， |
| 运行 | COPY .env | 支持读取配置 |
| 启动 | CMD ["./gin-api-template"] | 容器启动后运行主程序 |

**✅ 什么是 Alpine？**

Alpine Linux 是一个体积极小、安全、资源占用极低的 Linux 发行版：

- 📦 镜像大小只有 **5MB 左右**
- 🛡️ 默认关闭大多数服务，**攻击面小，安全性高**
- 🚀 启动快、非常适合云原生和容器部署
- 🧊 使用 musl libc 和 busybox 替代 glibc 和 coreutils，减少依赖

docker-compose.yml

```jsx
version: '3.8'

services:
  gin-api:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .env:/app/.env  # 确保文件名一致
    env_file:
      - .env
    restart: unless-stopped
```