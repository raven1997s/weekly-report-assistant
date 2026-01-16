# 项目上下文

## 项目概述

**智能周报助手** 是一个基于 Vue 3 + Express 的全栈 Web 应用，帮助用户通过碎片化输入自动归类、整理并生成结构化的周报内容。

## 目的

- **核心目标**：简化周报编写流程，通过碎片化输入自动生成结构化周报
- **主要价值**：
  - 自动识别项目和类型，减少手动分类工作
  - 支持智能计划转换，将上周计划转为本周工作记录
  - 提供多种导出格式（Markdown/纯文本），方便复制分享
  - 集成钉钉定时推送，自动发送周报提醒
  - 软删除机制支持数据恢复，避免误操作损失

## 技术栈

### 前端技术
- **Vue 3** - 使用 Composition API 和 `<script setup>` 语法
- **Vite** - 快速的开发构建工具
- **Pinia** - Vue 3 官方推荐的状态管理库
- **Vue Router** - 路由管理
- **Marked** - Markdown 渲染
- **Vuedraggable** - 拖拽排序功能

### 后端技术
- **Express.js** - Node.js Web 框架
- **SQLite3** - 轻量级关系型数据库
- **node-cron** - 定时任务调度
- **body-parser** - 请求体解析
- **cors** - 跨域资源共享

### 开发工具
- **Vitest** - 单元测试框架
- **@vitest/ui** - 测试 UI 界面
- **@vitest/coverage-v8** - 测试覆盖率
- **@vue/test-utils** - Vue 组件测试工具
- **happy-dom/jsdom** - DOM 环境模拟
- **Sass** - CSS 预处理器

### 部署工具
- **Docker** - 容器化部署
- **docker-compose** - 容器编排
- **concurrently** - 同时运行前后端服务

## 项目约定

### 代码风格

**语言规范**：
- **主要语言**：所有注释、文档和用户交流使用简体中文
- **例外情况**：变量名、函数名、标准库函数使用英文

**Vue 组件规范**：
- 使用 `<script setup>` 语法
- 使用 Composition API
- 组件名使用 PascalCase（如 `InputBox.vue`）
- 自定义事件使用 kebab-case（如 `@update-record`）

**命名约定**：
- **文件名**：kebab-case（如 `use-generator.js`）
- **变量名**：camelCase（如 `weekInfo`）
- **常量名**：UPPER_SNAKE_CASE（如 `CHINESE_HOLIDAYS`）
- **组件名**：PascalCase（如 `RecordCard`）
- **CSS 类名**：kebab-case（如 `page-header`）

**注释规范**：
- 复杂逻辑必须添加中文注释
- 公共函数必须添加 JSDoc 注释
- 避免无意义的注释

### 架构模式

**前端架构**：
- **分层结构**：Views → Components → Composables → Stores → Utils
- **状态管理**：使用 Pinia Setup Store 模式
- **路由设计**：基于文件的路由（`src/router/index.js`）
- **组件设计**：
  - 展示组件（Presentational）- 无状态，接收 props
  - 容器组件（Container）- 有状态，管理数据流

**后端架构**：
- **分层结构**：Routes → Controllers → Models（简化版直接在路由中处理）
- **数据库设计**：
  - 所有表使用软删除（deleted、deletedAt 字段）
  - 使用 ISO 8601 字符串格式存储日期
  - 为常用查询字段添加索引

**API 设计**：
- 统一响应格式：`{ success: true/false, data?: any, error?: string }`
- RESTful 风格：GET/POST/PUT/DELETE
- 路由顺序：具体路由在前，参数路由在后

### 测试策略

**测试类型**：
- **单元测试**：测试独立函数和工具方法
- **组件测试**：测试 Vue 组件渲染和交互
- **集成测试**：测试 API 接口和数据流

**测试原则**：
- 核心业务逻辑必须有测试覆盖
- 工具函数（date.js、dingtalk.js）优先测试
- 边界情况和错误处理必须测试

**运行测试**：
```bash
# 运行所有测试
npm test

# 测试 UI 模式
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

### Git 工作流

**分支策略**：
- `main` - 主分支，保持稳定可发布状态
- `feature/*` - 功能分支（如 `feature/soft-delete`）
- `fix/*` - 修复分支（如 `fix/date-calculation`）

**提交约定**：
- 使用语义化提交：`feat:`、`fix:`、`docs:`、`refactor:`、`test:`
- 提交信息使用中文
- 示例：`feat: 添加软删除和回收站功能`

**代码审查**：
- 提交前检查 [代码审查清单](../../CLAUDE.md#代码审查清单)
- 更新相关文档（CLAUDE.md、README.md）

## 领域知识

### 工作日和节假日

**工作日定义**：
- 工作日 = 需要上班的日子（不是简单的周一到周五）
- 必须考虑法定节假日和调休补班

**节假日数据**：
- 维护位置：`src/utils/date.js` 和 `server/utils/date.js`
- 数据结构：`CHINESE_HOLIDAYS` 对象
- 格式：`'MM-DD': 'holiday'`（节假日）或 `'workday'`（补班）

**工作周计算**：
系统使用智能算法计算工作周，确保补班日正确归属：
1. 如果上周日是工作日/补班 → 工作周从上周日开始
2. 否则 → 工作周从本周第一个工作日开始
3. 工作周到本周最后一个工作日结束，不向后扩展
4. 如果自然周全是节假日 → 返回 `hasNoWorkdays: true`

### 周报格式

**Markdown 格式**：
```markdown
**本周完成工作**

[WMS][需求开发] 完成用户登录功能
[WMS][Bug修复] 修复订单计算错误

**下周工作计划**

[ERP][需求开发] 开发报表导出功能
[WMS][代码优化] 重构用户模块

**本周得与失**

1. 收获：掌握了 Vue 3 Composition API
2. 不足：测试覆盖率有待提高
```

**纯文本格式**：去除 `**` 加粗标记，保持相同结构

### 智能解析

**项目/类型识别**：
- 基于关键词匹配（配置在设置中）
- 支持多种输入格式
- 实时预览识别结果

**计划转换**：
- 将上周计划转为本周工作记录
- 智能提取项目和类型
- 支持批量转换

## 重要约束

### UI 约束

**禁止使用原生弹窗**：
- ❌ 禁止使用 `alert()`、`confirm()`、`prompt()`
- ✅ 必须使用自定义组件 `ConfirmDialog`、`PromptDialog`

**禁止使用表情符号**：
- ❌ 禁止在 UI 中使用 Unicode 表情符号（如 🏖️、⚠️）
- ✅ 必须使用 SVG 图标代替

**页面容器样式**：
- 所有页面使用统一的 `.page-header` 样式
- 必须添加响应式断点（@media）

### 数据约束

**软删除强制要求**：
- 所有数据删除必须使用软删除
- 禁止硬删除（配置项除外）
- 提供恢复和永久删除接口

**日期格式**：
- 所有日期必须使用 ISO 8601 字符串格式
- 使用 `toISOString()` 生成
- 数据库存储为 TEXT 类型

**响应式数据清理**：
- 保存到 localStorage 或数据库前必须去除 Vue 响应式包装
- 使用 `JSON.parse(JSON.stringify(data))` 创建纯净副本

### API 约束

**统一响应格式**：
- 成功：`{ success: true, data?: any, message?: string }`
- 失败：`{ success: false, error: string }`

**路由顺序**：
- 具体路由在前（如 `/api/records/batch`）
- 参数路由在后（如 `/api/records/:id`）

### 文档约束

**CLAUDE.md 同步更新**：
- 任何重要变更必须及时更新文档
- 发现新规范或技术陷阱时必须记录
- 版本号和日期必须同步更新

## 外部依赖

### 钉钉机器人

**Webhook 配置**：
- 必填项：Webhook URL + Secret
- 可选：加密签名的 Secret
- 配置位置：设置页面

**推送格式**：
- 支持纯文本和 Markdown 格式
- 定时任务自动推送
- 手动推送测试

### Node.js 生态

**版本要求**：
- Node.js >= 20.0.0
- npm >= 9.0.0

**关键依赖**：
- `sqlite3` - 需要 Python 构建工具
- `vite` - 使用 ES 模块
- `vue` - 3.x 版本

### 系统资源

**端口占用**：
- 前端：http://localhost:5173（Vite 默认）
- 后端：http://localhost:3000（Express）

**数据持久化**：
- 数据库文件：`data/app.db`
- 必须在 `.gitignore` 中忽略
- Docker 部署时使用 volume 挂载

## 开发环境设置

### 必需工具
- Node.js 20+
- npm 9+
- Git

### 可选工具
- Docker（用于容器化部署）
- SQLite Browser（用于查看数据库）

### 环境变量

创建 `.env` 文件：
```bash
VITE_API_URL=http://localhost:3000/api
PORT=3000
NODE_ENV=development
```

## 关键文件位置

### 核心业务逻辑
- 输入解析：`src/composables/useParser.js`
- 周报生成：`src/composables/useGenerator.js`
- 日期处理：`src/utils/date.js`
- 钉钉集成：`src/utils/dingtalk.js`

### 状态管理
- 工作记录：`src/stores/records.js`
- 周报归档：`src/stores/reports.js`
- 应用设置：`src/stores/settings.js`
- 弹窗管理：`src/stores/dialog.js`
- Toast 通知：`src/stores/toast.js`

### 后端核心
- API 路由：`server/api.js`
- 数据库：`server/db.js`
- 定时任务：`server/cron.js`
- 日期工具：`server/utils/date.js`

### 文档
- 项目规范：`CLAUDE.md`
- 使用说明：`README.md`
- OpenSpec 规范：`openspec/AGENTS.md`
