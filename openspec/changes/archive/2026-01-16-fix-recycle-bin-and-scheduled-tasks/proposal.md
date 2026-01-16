# 变更：修复回收站和定时任务功能

## Why

用户反馈了多个需要修复的问题：
1. **历史周报删除后未进入回收站**：前端删除周报后没有调用后端 API，导致数据没有正确进入回收站
2. **回收站中的工作记录莫名变少**：数据加载和管理存在同步问题
3. **计划转换定时任务无法通过页面操作**：该定时任务是系统核心功能，应该禁止用户修改或删除
4. **周报恢复后的行为不明确**：恢复非本周周报时，不应覆盖本周内容，需要明确恢复行为

## What Changes

### Bug 1：修复历史周报删除未进入回收站
- **问题**：HistoryView 中的删除操作直接调用 Store 的 `batchDelete` 方法，没有调用后端软删除 API
- **修复**：将删除操作改为调用 `deleteReport` API，确保数据进入回收站
- **受影响文件**：`src/views/HistoryView.vue`

### Bug 2：修复回收站工作记录显示问题
- **问题**：`fetchDeletedRecords` 没有正确更新 `deletedRecords` 状态
- **修复**：确保 API 返回的数据正确赋值给响应式状态
- **受影响文件**：`src/stores/records.js`、`src/views/RecycleBinView.vue`

### Bug 3：禁止修改计划转换定时任务
- **问题**：`new_workweek_plan_convert` 定时任务可以被用户修改、删除或禁用
- **修复**：在前端和后端添加校验，禁止对该系统核心任务进行修改
- **受影响文件**：
  - `src/views/SettingsView.vue`
  - `server/api.js` (PUT /api/scheduled-tasks/:id, DELETE /api/scheduled-tasks/:id)
  - `server/cron.js` (添加系统任务标识)

### Bug 4：明确周报恢复行为
- **问题**：恢复周报后的行为不明确，可能覆盖本周内容
- **修复**：
  - 如果恢复的是本周周报：允许继续编辑，恢复到当前编辑状态
  - 如果恢复的是非本周周报：只添加到历史列表，不影响当前编辑状态
- **受影响文件**：`src/stores/reports.js`、`src/views/RecycleBinView.vue`

## 影响

- 受影响的规范：回收站功能、定时任务管理、周报恢复逻辑
- 受影响的代码：
  - 前端：`HistoryView.vue`、`RecycleBinView.vue`、`SettingsView.vue`
  - Stores：`records.js`、`reports.js`
  - 后端：`api.js`、`cron.js`

## 测试计划

1. 测试周报删除后正确进入回收站
2. 测试回收站数据加载和显示
3. 测试计划转换定时任务无法被修改或删除
4. 测试周报恢复行为符合预期
