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

- **前端**：Vue 3 (Composition API + `<script setup>`) + Vite + Pinia + Vue Router
- **后端**：Express.js + SQLite3 + node-cron
- **数据存储**：SQLite 数据库（`data/app.db`）

## 📁 项目结构

```
weekly_report_assistant/
├── src/                    # 前端源代码
│   ├── components/         # Vue 组件
│   ├── stores/            # Pinia 状态管理
│   ├── utils/             # 工具函数
│   └── views/             # 页面视图
├── server/                # 后端源代码
│   ├── api.js            # Express API 路由
│   ├── cron.js           # 定时任务管理
│   └── db.js             # SQLite 数据库
├── data/                  # 数据库文件目录
│   └── app.db            # SQLite 数据库
└── package.json          # 项目配置
```

## ⚙️ 主要功能

- 📝 **工作记录**：碎片化记录日常工作
- 🏷️ **智能分类**：自动识别项目和类型
- 📊 **周报生成**：自动生成 Markdown/纯文本格式周报
- 🔔 **定时推送**：后端定时任务，支持钉钉机器人推送
- 💾 **数据归档**：按周归档历史周报
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
```

## 📝 使用说明

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

查看数据库内容：

```bash
sqlite3 data/app.db
```

常用 SQL：

```sql
-- 查看所有表
.tables

-- 查看工作记录
SELECT * FROM records;

-- 查看周报归档
SELECT * FROM reports;

-- 查看定时任务
SELECT * FROM scheduled_tasks;
```

## 🐛 常见问题

### Q: 页面无法加载数据？
A: 确保后端服务已启动，检查浏览器控制台是否有错误。

### Q: 定时推送不工作？
A: 检查设置页面是否已配置钉钉 Webhook 和 Secret，并启用了定时任务。

### Q: 如何重置数据？
A: 删除 `data/app.db` 文件，重启服务会自动创建新数据库。

## 📄 License

MIT
