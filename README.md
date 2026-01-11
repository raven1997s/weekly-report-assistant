# 智能周报助手

一个基于 Vue 3 + Express 的全栈 Web 应用，帮助用户通过碎片化输入自动归类、整理并生成结构化的周报内容。

## 🚀 快速启动

### 一键启动（推荐）

```bash
npm start
```

这个命令会**同时启动前端和后端服务**，输出会带有颜色标记：

- 🔵 **BACKEND** - 后端 API 服务（http://localhost:3000）
- 🟢 **FRONTEND** - 前端开发服务器（http://localhost:5173）

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 其他启动方式

```bash
# 开发模式（等同于 npm start）
npm run dev

# 仅启动后端
npm run server

# 仅启动前端
npm run vite
```

## 📦 安装依赖

如果首次运行，请先安装依赖：

```bash
npm install
```

## 🛠️ 技术栈

**前端**：
- Vue 3 (Composition API + `<script setup>`)
- Vite
- Pinia（状态管理）
- Vue Router
- Marked（Markdown 渲染）

**后端**：
- Express.js
- SQLite3
- node-cron（定时任务）

**开发工具**：
- Vitest（单元测试）
- ESLint（代码规范）

## 📁 项目结构

```
weekly_report_assistant/
├── src/                    # 前端源代码
│   ├── assets/            # 静态资源（样式、图片）
│   ├── components/        # Vue 组件
│   ├── composables/       # 组合式函数
│   ├── router/            # 路由配置
│   ├── stores/            # Pinia 状态管理
│   ├── utils/             # 工具函数
│   └── views/             # 页面视图
├── server/                # 后端源代码
│   ├── migrations/        # 数据库迁移脚本
│   ├── utils/             # 后端工具函数
│   ├── api.js             # Express API 路由
│   ├── cron.js            # 定时任务管理
│   ├── index.js           # 服务入口
│   └── db.js              # SQLite 数据库
├── public/                # 公共静态资源
├── data/                  # 数据库文件目录
│   └── app.db            # SQLite 数据库
├── Dockerfile             # Docker 镜像构建
├── docker-compose.yml     # Docker 容器编排
└── package.json           # 项目配置
```

## ⚙️ 主要功能

- 📝 **工作记录**：碎片化记录日常工作，自动识别项目和类型
- 🏷️ **智能分类**：基于关键词匹配自动归类工作内容
- 📊 **周报生成**：自动生成 Markdown/纯文本格式周报
- 📅 **周报归档**：按周归档历史周报，支持查看和管理
- 🗑️ **回收站**：软删除机制，支持恢复已删除的数据
- 🔔 **定时推送**：后端定时任务，支持钉钉机器人推送
- 📤 **数据导出**：导出所有数据为 JSON 文件
- 📥 **数据导入**：从 JSON 文件导入数据
- ⚙️ **灵活配置**：自定义项目、类型和钉钉配置

## 🔧 开发命令

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm test

# 运行测试 UI
npm run test:ui

# 生成测试覆盖率
npm run test:coverage

# 代码检查
npm run lint
```

## 📝 使用说明

### 页面导航

1. **首页** - 记录日常工作，查看本周工作记录
2. **生成周报** - 查看预览、复制和下载周报，推送钉钉
3. **历史周报** - 查看和管理历史周报归档
4. **回收站** - 查看和恢复已删除的数据
5. **设置** - 配置项目、类型、主题和钉钉机器人

### 基本流程

1. **启动应用**：运行 `npm start`
2. **打开浏览器**：访问 http://localhost:5173
3. **记录工作**：在首页输入工作内容，系统自动识别项目和类型
4. **生成周报**：切换到"生成周报"页面查看和复制周报
5. **配置钉钉**：在设置页面配置钉钉机器人，启用定时推送

## 🤖 钉钉定时推送

后端定时推送支持以下预设模板：

- 📅 **工作周最后一天下午3点** - 自动推送本周周报
- 📅 **每个工作日下班前** - 自动推送当日工作提醒

**工作日定义**：
- 工作日 ≠ 周一到周五
- 工作日 = 需要上班的日子（考虑法定节假日和调休补班）
- 节假日数据维护在 `src/utils/date.js` 的 `CHINESE_HOLIDAYS` 对象中

**注意**：定时任务由后端执行，无需保持浏览器页面打开。

## 📄 数据库管理

### 数据库表结构

**records（工作记录表）**：
- id, content, project, workType
- createdAt, updatedAt
- deleted, deletedAt（软删除字段）

**reports（周报归档表）**：
- id, weekStart, weekEnd, weekLabel
- markdown, plainText, content
- records, plans, reflections
- createdAt, updatedAt
- deleted, deletedAt（软删除字段）

**scheduled_tasks（定时任务表）**：
- id, name, hour, minute, day_of_week, type, enabled
- created_at, updated_at
- deleted, deletedAt（软删除字段）

**settings（应用设置表）**：
- key, value

### 查看数据库

```bash
sqlite3 data/app.db
```

### 常用 SQL

```sql
-- 查看所有表
.tables

-- 查看表结构
.schema records

-- 查看工作记录（未删除）
SELECT * FROM records WHERE deleted = 0;

-- 查看已删除的记录
SELECT * FROM records WHERE deleted = 1;

-- 查看周报归档
SELECT * FROM reports WHERE deleted = 0;

-- 查看定时任务
SELECT * FROM scheduled_tasks;
```

### 数据迁移

如果您的数据库是在软删除功能添加之前创建的，需要手动添加字段：

```bash
node server/migrations/add_soft_delete.cjs
```

## 🐳 Docker 部署

项目支持 Docker 容器化部署，确保开发、测试、生产环境的一致性。

### 环境变量配置

创建 `.env` 文件：

```bash
VITE_API_URL=http://localhost:3000/api
PORT=3000
NODE_ENV=development
```

### 部署命令

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

# 清理数据和镜像
docker-compose down -v && docker system prune -f
```

### 数据持久化

数据库文件存储在 `./data` 目录，通过 volumes 映射到容器内，容器重启后数据不丢失。

## 🐛 常见问题

### Q: 页面无法加载数据？
**A**: 确保后端服务已启动（http://localhost:3000），检查浏览器控制台是否有错误。

### Q: 定时推送不工作？
**A**:
1. 检查设置页面是否已配置钉钉 Webhook 和 Secret
2. 确认已启用定时任务开关
3. 查看后端日志是否有错误信息

### Q: 如何重置数据？
**A**: 删除 `data/app.db` 文件，重启服务会自动创建新数据库。

### Q: 删除的数据能恢复吗？
**A**: 可以。所有删除操作都是软删除，在"回收站"页面可以恢复数据。

### Q: Docker 部署后数据丢失？
**A**: 确保 `./data` 目录已正确映射为 volume，检查 docker-compose.yml 中的 volumes 配置。

### Q: 节假日日期不准确？
**A**: 需要更新 `src/utils/date.js` 和 `server/utils/date.js` 中的 `CHINESE_HOLIDAYS` 对象。

## 📄 License

MIT
