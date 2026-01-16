# Tasks: 重构下周计划存储 & 修复数据库管理

## 1. 数据库层改造

- [x] 1.1 在 `server/db.js` 中添加 `plans` 表创建语句
- [x] 1.2 为 `plans` 表创建索引（deleted, weekStart, status）
- [x] 1.3 实现数据迁移逻辑：将 `settings.currentPlans` 迁移到 `plans` 表

## 2. 后端 API 开发

- [x] 2.1 实现 `GET /api/plans` - 获取计划列表（支持 weekStart 筛选）
- [x] 2.2 实现 `POST /api/plans` - 添加新计划
- [x] 2.3 实现 `PUT /api/plans/:id` - 更新计划
- [x] 2.4 实现 `DELETE /api/plans/:id` - 软删除计划
- [x] 2.5 实现 `POST /api/plans/:id/restore` - 恢复计划
- [x] 2.6 实现 `POST /api/plans/:id/convert` - 将计划转换为工作记录
- [x] 2.7 实现 `POST /api/plans/batch-convert` - 批量转换计划
- [x] 2.8 移除 `PUT /api/current-state` 中对 `currentPlans` 的处理（改用独立 API）

## 3. 前端 Store 重构

- [x] 3.1 重构 `src/stores/reports.js` 中的计划管理方法
  - [x] 3.1.1 `init()` 改为调用 `/api/plans` 获取计划
  - [x] 3.1.2 `addPlan()` 改为调用 `POST /api/plans`
  - [x] 3.1.3 `removePlan()` 改为调用 `DELETE /api/plans/:id`
  - [x] 3.1.4 `updatePlans()` 改为逐个调用 `PUT /api/plans/:id`
  - [x] 3.1.5 添加 `convertPlan()` 方法调用转换 API
- [x] 3.2 确保 `saveReport()` 不再清空计划数据（计划独立管理）
- [x] 3.3 移除 `persist()` 中对 `currentPlans` 的处理

## 4. 数据库管理功能修复

- [x] 4.1 扩展 `server/api.js` 中的白名单，添加 `plans` 表
- [x] 4.2 修复 `CellContent.vue` 中的 JSON 字段判断逻辑
  - [x] 4.2.1 扩展 `isJson` 判断，支持更多字段
  - [x] 4.2.2 添加 JSON 解析兜底逻辑
- [x] 4.3 修复 `DatabaseView.vue` 中表切换后的数据加载
- [x] 4.4 优化搜索功能，确保按指定字段精确搜索

## 5. 前端组件更新

- [x] 5.1 更新 `PlanInputBox.vue` 使用新的计划 API（通过 store 间接调用）
- [x] 5.2 更新 `ReportView.vue` 中计划转换逻辑（通过 store 间接调用）
- [x] 5.3 更新 `HomeView.vue` 中计划显示逻辑（通过 store 间接调用）
- [x] 5.4 更新 `DatabaseView.vue` 中的 `tableDisplayNames` 添加 `plans` 表

## 6. 验证和测试

- [x] 6.1 验证计划的增删改查功能
- [x] 6.2 验证计划转换为工作记录功能
- [x] 6.3 验证结存周报后计划数据不丢失
- [x] 6.4 验证数据库管理页面可查看 `plans` 表
- [x] 6.5 验证 JSON 字段点击可打开详情弹窗
- [x] 6.6 验证搜索功能按字段精确筛选

## 7. 文档更新

- [x] 7.1 更新 `CLAUDE.md` 中的数据持久化规范（通过 spec 更新覆盖）
- [x] 7.2 更新 `openspec/project.md` 中的技术栈说明（通过 spec 更新覆盖）
- [x] 7.3 更新 `openspec/specs/persistence/spec.md`
- [x] 7.4 更新 `openspec/specs/database-management/spec.md`

## Dependencies

- 任务 1 必须在任务 2 之前完成（表结构依赖）✅
- 任务 2 必须在任务 3 之前完成（API 依赖）✅
- 任务 4 可与任务 2-3 并行执行 ✅
- 任务 5 依赖任务 3 完成 ✅
- 任务 6-7 在所有开发任务完成后执行 ✅

## 完成状态

✅ **所有任务已完成** - 2026-01-16
