# ============================================
# Stage 1: 构建前端
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码并构建前端
COPY . .
RUN npm run build

# ============================================
# Stage 2: 运行时镜像
# ============================================
FROM node:22-alpine

WORKDIR /app

# 安装 sqlite3 运行时依赖
RUN apk add --no-cache sqlite

# 复制 package.json 并安装生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 从 builder 阶段复制前端构建产物
COPY --from=builder /app/dist ./dist

# 复制服务端代码
COPY server ./server
COPY index.html ./

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动服务
CMD ["node", "server/api.js"]
