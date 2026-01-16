# Change: 重构下周计划存储 & 修复数据库管理功能

## Why

当前系统存在以下严重问题：

1. **下周计划存储在 settings 表中**：结存周报时会清空 settings 中的 `currentPlans`，导致数据丢失
2. **前端仍有潜在缓存依赖**：虽然移除了 localStorage，但内存状态与 API 同步存在问题
3. **数据库管理查询功能不完善**：搜索功能无法按指定字段筛选
4. **JSON 数据详情查看功能失效**：点击 JSON 字段无法正确打开详情弹窗
5. **新增表无法在数据库管理中查看**：白名单机制限制了新表的访问

## What Changes

### 1. 新建 `plans` 表（独立存储下周计划）

- **BREAKING**：下周计划从 `settings` 表迁移到独立的 `plans` 表
- 每条计划作为独立记录存储，支持软删除
- 增加 `status` 字段标识计划状态（pending/converted/completed）
- 增加 `weekStart` 字段关联所属周

### 2. 重构下周计划 API

- `GET /api/plans` - 获取下周计划列表
- `POST /api/plans` - 添加计划
- `PUT /api/plans/:id` - 更新计划
- `DELETE /api/plans/:id` - 软删除计划
- `POST /api/plans/:id/convert` - 将计划转换为工作记录
- `POST /api/plans/batch-convert` - 批量转换计划

### 3. 修复数据库管理功能

- 扩展白名单，添加 `plans` 表
- 修复 JSON 字段点击查看详情功能
- 优化搜索/筛选逻辑，确保按字段精确搜索

### 4. 清理前端缓存依赖

- 确保所有 CRUD 操作都先调用 API，成功后再更新内存状态
- 移除任何可能的本地状态不同步问题

## Impact

- **Affected specs**: `persistence`, `database-management`
- **Affected code**:
  - `server/db.js` - 新增 `plans` 表
  - `server/api.js` - 新增 plans 相关 API
  - `src/stores/reports.js` - 重构计划管理逻辑
  - `src/stores/plans.js` - 新增独立 plans store（可选）
  - `src/views/DatabaseView.vue` - 修复表切换和查询
  - `src/components/CellContent.vue` - 修复 JSON 点击事件
  - `src/components/JsonViewer.vue` - 确保正确显示

## Migration

1. 数据库启动时自动创建 `plans` 表
2. 迁移现有 `settings.currentPlans` 数据到 `plans` 表
3. 保持向后兼容：首次启动时自动迁移
