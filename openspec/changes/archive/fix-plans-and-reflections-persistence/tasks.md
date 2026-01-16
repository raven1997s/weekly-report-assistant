## 1. 后端实现

### 1.1 添加保存当前状态 API
- [x] 在 `server/api.js` 中添加 `PUT /api/current-state` 端点
- [x] 接收 `currentPlans` 和 `currentReflections` 参数
- [x] 使用 `INSERT OR REPLACE` 写入 settings 表
- [x] 返回统一格式的成功/失败响应
- [x] 添加错误处理和日志

### 1.2 验证现有读取 API
- [x] 确认 `GET /api/reports` 已正确从 settings 读取
- [x] 确认返回格式包含 `currentPlans` 和 `currentReflections`
- [x] 测试 API 返回正确的 JSON 解析数据

## 2. 前端 API 层

### 2.1 添加保存当前状态方法
- [x] 在 `src/utils/api.js` 中添加 `saveCurrentState()` 函数
- [x] 调用 `PUT /api/current-state` 接口
- [x] 处理成功和失败情况
- [x] 遵循现有的错误处理模式

## 3. 前端 Store 层

### 3.1 修改初始化逻辑
- [x] 修改 `reports.js` 的 `init()` 方法
- [x] 优先从 `result.data` 读取 plans 和 reflections
- [x] 添加 localStorage 降级逻辑
- [x] 添加数据迁移逻辑（localStorage → database）

### 3.2 修改持久化逻辑
- [x] 修改 `reports.js` 的 `persist()` 方法
- [x] 调用新的 `saveCurrentState()` API
- [x] 添加 API 失败时的降级处理
- [x] 移除或标记旧的 `saveToStorage` 调用

### 3.3 更新相关方法
- [x] 确认 `updatePlans()` 调用 `persist()`
- [x] 确认 `updateReflections()` 调用 `persist()`
- [x] 确认 `addPlan()` 调用 `persist()`
- [x] 确认 `removePlan()` 调用 `persist()`
- [x] 确认 `appendPlans()` 调用 `persist()`

## 4. 测试验证

### 4.1 功能测试
- [x] 测试添加下周计划后刷新页面数据不丢失
- [x] 测试修改本周总结后刷新页面数据不丢失
- [x] 测试删除计划项后正确保存
- [x] 测试跨设备数据同步（通过数据库）

### 4.2 降级测试
- [x] 测试 API 失败时降级到 localStorage
- [x] 测试首次访问时从 localStorage 迁移数据
- [x] 测试数据库无数据时的默认值处理

### 4.3 集成测试
- [x] 测试生成周报后 plans 和 reflections 正确保存
- [x] 测试保存周报后编辑状态正确清空
- [x] 测试恢复本周周报时正确恢复编辑状态

### 4.4 回归测试
- [x] 测试工作记录功能不受影响
- [x] 测试周报归档功能不受影响
- [x] 测试其他设置功能不受影响

## 5. 文档更新

### 5.1 更新 CLAUDE.md
- [x] 更新最后更新日期和版本号
- [x] 添加此变更的说明
- [x] 更新数据库结构说明（如有变化）

### 5.2 更新代码审查清单
- [x] 添加新的检查项：数据是否从数据库获取
- [x] 添加新的检查项：是否正确处理 API 失败
