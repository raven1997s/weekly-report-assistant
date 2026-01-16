## 1. 前端修复

### 1.1 修复 HistoryView 删除周报问题
- [x] 修改 `HistoryView.vue` 中的删除逻辑
- [x] 将 `batchDelete` 改为调用单个 `deleteReport`
- [x] 添加删除成功后的状态更新
- [x] 测试删除后数据进入回收站

### 1.2 修复回收站数据显示问题
- [x] 检查 `records.js` 中的 `fetchDeletedRecords` 方法
- [x] 确保返回数据正确赋值给 `deletedRecords`
- [x] 检查 `RecycleBinView.vue` 中的数据绑定
- [x] 测试回收站数据正确显示

### 1.3 禁止修改计划转换定时任务
- [x] 在 `SettingsView.vue` 中添加系统任务标识
- [x] 对 `new_workweek_plan_convert` 任务禁用编辑和删除按钮
- [x] 添加视觉提示（如"系统任务"标签）
- [x] 测试无法修改系统任务

### 1.4 明确周报恢复行为
- [x] 修改 `reports.js` 中的 `restoreReport` 方法
- [x] 添加周报归属检查（本周 vs 非本周）
- [x] 本周周报：恢复到编辑状态
- [x] 非本周周报：只添加到历史列表
- [x] 在 `RecycleBinView.vue` 中添加恢复提示
- [x] 测试恢复行为符合预期

## 2. 后端修复

### 2.1 添加系统任务保护
- [x] 在 `cron.js` 中添加 `isSystemTask` 字段到模板
- [x] 修改 `api.js` 中的 PUT /api/scheduled-tasks/:id
- [x] 添加系统任务校验，拒绝修改
- [x] 修改 `api.js` 中的 DELETE /api/scheduled-tasks/:id
- [x] 添加系统任务校验，拒绝删除
- [x] 返回明确的错误提示

### 2.2 完善周报恢复 API
- [x] 检查 `POST /api/reports/:id/restore` 实现
- [x] 确保恢复后前端能正确获取数据
- [x] 添加日志记录恢复操作

## 3. 测试验证

### 3.1 功能测试
- [x] 测试周报删除后进入回收站
- [x] 测试回收站数据正确显示
- [x] 测试系统任务无法修改
- [x] 测试周报恢复行为
- [x] 测试本周/非本周周报恢复区别

### 3.2 回归测试
- [x] 测试普通定时任务仍可正常管理
- [x] 测试其他删除/恢复功能不受影响
- [x] 测试 Docker 环境下的功能
