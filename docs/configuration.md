# 环境变量配置指南

> 智能周报助手 - 环境变量管理文档

## 概述

使用环境变量管理不同环境的配置，避免硬编码敏感信息。

## 支持的环境变量

| 变量名 | 说明 | 默认值 | 适用环境 |
|--------|------|--------|----------|
| `VITE_API_URL` | 后端 API 基础 URL | `/api` | 前端 |
| `PORT` | 后端服务端口 | `3000` | 后端 |
| `NODE_ENV` | 运行环境 | `development` | 后端 |

## 配置文件

### .env 文件

创建 `.env` 文件（不提交到 Git，已在 `.gitignore` 中）：

```bash
# 开发环境
VITE_API_URL=http://localhost:3000/api
PORT=3000
NODE_ENV=development
```

### .env.development

开发环境配置：

```bash
VITE_API_URL=http://localhost:3000/api
NODE_ENV=development
```

### .env.production

生产环境配置：

```bash
VITE_API_URL=/api
NODE_ENV=production
PORT=3000
```

## 环境变量使用

### 前端使用

```javascript
// src/utils/api.js
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// 调用 API
fetch(`${API_BASE}/records`)
```

### 后端使用

```javascript
// server/index.js
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'

app.listen(PORT, () => {
  console.log(`[${NODE_ENV}] 服务运行在 http://localhost:${PORT}`)
})
```

## 环境变量优先级

1. 命令行指定（最高优先级）
   ```bash
   PORT=4000 npm run dev
   ```

2. `.env.local` 文件
   - 适用于本地覆盖配置
   - 不提交到 Git

3. `.env.[mode]` 文件
   - `.env.development` - 开发环境
   - `.env.production` - 生产环境

4. `.env` 文件
   - 默认配置
   - 所有环境共享

5. 系统环境变量（最低优先级）

## 安全注意事项

### 禁止事项

- ❌ 不要在 `.env` 文件中存储密码、密钥等敏感信息
- ❌ 不要将 `.env.local` 提交到 Git
- ❌ 不要在生产环境使用开发配置

### 推荐做法

- ✅ 使用密钥管理服务（如 AWS Secrets Manager、Vault）
- ✅ `.env` 文件必须在 `.gitignore` 中
- ✅ 提供 `.env.example` 作为配置模板
- ✅ 使用 CI/CD 的 secret 功能管理敏感信息

## .env.example 模板

```bash
# API 配置
VITE_API_URL=http://localhost:3000/api

# 服务配置
PORT=3000

# 环境配置
NODE_ENV=development
```

## Docker 部署

在 docker-compose.yml 中配置环境变量：

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - VITE_API_URL=/api
```

详见 [Docker 部署指南](./deployment.md)

## 常见问题

### 环境变量不生效

1. 确认变量名拼写正确
2. 前端变量必须以 `VITE_` 开头
3. 修改环境变量后需要重启服务

### 敏感信息泄露

1. 检查 `.gitignore` 是否包含 `.env.local`
2. 使用 `git-secrets` 等工具预防意外提交
3. 定期审查 Git 历史记录

### 不同环境配置混乱

1. 使用 `.env.[mode]` 文件区分环境
2. 在 CI/CD 中注入环境特定的配置
3. 使用配置管理工具统一管理

## 相关文档

- [Vite 环境变量](https://vitejs.dev/guide/env-and-mode.html)
- [Docker 部署指南](./deployment.md)
- [CLAUDE.md](../CLAUDE.md) - 规则 #19
