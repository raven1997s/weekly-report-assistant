# Change: 移除数据库管理功能

## Why

数据库管理页面暴露底层表结构和通用查询能力，但不属于周报助手的核心工作流，增加了维护成本和数据暴露面。

## What Changes

- **BREAKING** 移除侧边栏“数据库管理”入口和 `/database` 前端路由。
- **BREAKING** 移除 `/api/database/tables` 与 `/api/database/table/:tableName` 接口。
- 删除仅供数据库管理页面使用的视图和表格、筛选、JSON 查看组件。
- 保留 SQLite 数据库、业务表和所有正常业务 API，不迁移或删除用户数据。

## Impact

- Affected specs: `database-management`
- Affected code: `src/router/index.js`、`src/components/layout/AppSidebar.vue`、`src/views/DatabaseView.vue`、数据库管理专用组件、`server/api.js`

