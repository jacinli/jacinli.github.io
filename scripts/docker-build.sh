#!/bin/bash

# Docker 构建脚本 for VuePress Blog

set -e

echo "🐳 开始构建 VuePress 博客 Docker 镜像..."

# 检查是否存在必要的文件
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 找不到 package.json 文件"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ 错误: 找不到 Dockerfile 文件"
    exit 1
fi

if [ ! -f "nginx.conf" ]; then
    echo "❌ 错误: 找不到 nginx.conf 文件"
    exit 1
fi

# 创建日志目录
mkdir -p logs/nginx

# 构建 Docker 镜像
echo "📦 构建 Docker 镜像..."
docker build -t jacin-blog:latest .

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ Docker 镜像构建成功！"
    echo "📋 镜像信息："
    docker images jacin-blog:latest
    
    echo ""
    echo "🚀 启动容器："
    echo "docker run -d -p 80:80 --name jacin-blog jacin-blog:latest"
    echo ""
    echo "🔧 或者使用 docker-compose："
    echo "docker-compose up -d"
else
    echo "❌ Docker 镜像构建失败！"
    exit 1
fi