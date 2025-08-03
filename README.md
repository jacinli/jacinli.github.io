# Jacin的博客

基于 VuePress 的静态博客

## 快速开始

```bash
# 安装依赖
yarn install

# 开发模式
export NODE_OPTIONS="--openssl-legacy-provider" && yarn dev

# 构建
export NODE_OPTIONS="--openssl-legacy-provider" && yarn build

# 部署
yarn deploy
```

## HTML 标签支持

VuePress 2.0 支持直接渲染 HTML 标签，无需转义！

### 配置说明
在 `docs/.vuepress/config.js` 中添加了以下配置：
```javascript
markdown: {
  html: true, // 允许 HTML 标签
  linkify: true,
  typographer: true,
  breaks: true
}
```

### 使用方式
现在你可以在 Markdown 中直接使用 HTML 标签：
- `<iframe>` - 嵌入视频
- `<div>` - 布局容器
- `<span>` - 行内元素
- `<script>` - 脚本标签
- 等等...

### 恢复原始内容
如果之前转义了 HTML 标签，可以运行：
```bash
yarn restore-html
```

## 自动侧边栏配置

为了避免手动维护侧边栏配置，提供了以下解决方案：

### 方案1：使用自动侧边栏（推荐）
使用 `docs/.vuepress/config-minimal.js` 配置文件，它使用 `sidebar: 'auto'` 自动生成侧边栏。

### 方案2：自动生成配置文件
运行以下命令自动生成侧边栏配置：
```bash
yarn generate-sidebar
```

这会生成 `docs/.vuepress/config-auto.js` 文件，包含自动扫描目录生成的侧边栏配置。

### 方案3：手动配置
使用原始的 `docs/.vuepress/config.js` 文件，手动维护侧边栏配置。

## 文件结构
- `docs/` - 博客内容目录
- `docs/.vuepress/` - VuePress 配置目录
- `scripts/` - 自动化脚本
- `_posts/` - 原始博客文章（可选）