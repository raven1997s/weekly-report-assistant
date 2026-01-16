# Docker 部署指南

> 智能周报助手 - Docker 容器化部署文档

## 概述

项目支持使用 Docker 进行容器化部署，确保开发、测试、生产环境的一致性。

## Dockerfile 配置

项目根目录下的 `Dockerfile` 使用多阶段构建：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "server/index.js"]
```

## docker-compose.yml 配置

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

## 部署命令

### 基础命令

```bash
# 构建镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 清理命令

```bash
# 停止并删除容器、网络
docker-compose down

# 停止并删除容器、网络、数据卷
docker-compose down -v

# 清理未使用的镜像和容器
docker system prune -f

# 完全清理（包括数据）
docker-compose down -v && docker system prune -f
```

### 管理命令

```bash
# 查看运行状态
docker-compose ps

# 查看容器资源使用
docker stats

# 进入容器
docker-compose exec app sh

# 查看容器日志
docker logs -f <container_id>
```

## 数据持久化

- 数据库文件存储在 `./data` 目录
- 通过 volumes 映射到容器内 `/app/data`
- 容器重启后数据不丢失

## 生产环境注意事项

1. **端口配置**：修改 `EXPOSE` 端口为实际使用的端口
2. **反向代理**：配置 Nginx 处理 HTTPS 和静态文件服务
3. **数据备份**：定期备份数据目录 `./data`
4. **自动重启**：使用 `restart: always` 确保服务自动重启
5. **日志管理**：配置日志轮转，避免磁盘占满
6. **监控告警**：配置容器健康检查和监控告警

## 环境变量

在 docker-compose.yml 中配置环境变量：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

详见 [环境变量配置指南](./configuration.md)

## 常见问题

### 容器无法启动

```bash
# 查看容器日志
docker-compose logs app

# 检查端口占用
lsof -i :3000
```

### 数据丢失

确保 `./data` 目录正确映射到容器：

```bash
# 检查 volumes 配置
docker-compose config
```

### 构建失败

```bash
# 清理构建缓存
docker builder prune

# 重新构建
docker-compose build --no-cache
```

## 相关文件

- `Dockerfile` - 镜像构建配置
- `docker-compose.yml` - 容器编排配置
- `.dockerignore` - 排除不需要打包的文件
