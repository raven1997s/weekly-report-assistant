# plans-persistence Specification Delta

## ADDED Requirements

### Requirement: 下周计划必须存储在独立的 plans 表中

系统 SHALL 将下周计划存储在独立的 `plans` 表中，而非 `settings` 表的键值对。

#### Scenario: 添加新计划时创建独立记录

- **WHEN** 用户添加一条下周计划
- **THEN** 系统调用 `POST /api/plans` API
- **AND** 后端在 `plans` 表中创建新记录
- **AND** 记录包含 `id`, `content`, `project`, `workType`, `weekStart`, `status`, `createdAt`, `updatedAt` 字段
- **AND** `status` 默认为 `pending`
- **AND** `weekStart` 为当前周的周一日期（ISO 8601 格式）

#### Scenario: 删除计划时使用软删除

- **WHEN** 用户删除一条计划
- **THEN** 系统调用 `DELETE /api/plans/:id` API
- **AND** 后端将 `deleted` 设置为 1，`deletedAt` 设置为当前时间
- **AND** 计划不从数据库中物理删除

### Requirement: 计划必须支持状态流转

系统 SHALL 支持计划的状态流转：pending → converted/completed。

#### Scenario: 计划转换为工作记录

- **WHEN** 用户选择将计划转换为本周工作记录
- **THEN** 系统调用 `POST /api/plans/:id/convert` API
- **AND** 后端在 `records` 表中创建新的工作记录
- **AND** 后端将计划的 `status` 更新为 `converted`
- **AND** 后端将 `convertedRecordId` 设置为新创建的 record.id
- **AND** 响应返回新创建的工作记录数据

#### Scenario: 批量转换计划

- **WHEN** 系统触发新工作周计划转换（定时任务或手动）
- **THEN** 系统调用 `POST /api/plans/batch-convert` API
- **AND** 后端将所有 `status = pending` 的计划转换为工作记录
- **AND** 每条计划的 `status` 更新为 `converted`

### Requirement: 计划列表必须从 API 获取

系统 SHALL 通过 API 获取计划列表，禁止使用任何前端缓存。

#### Scenario: 初始化时从数据库加载计划

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **THEN** 系统调用 `GET /api/plans` 获取当前周的计划
- **AND** `currentPlans` 从响应的 `data` 数组加载
- **AND** 数据从数据库的 `plans` 表读取（过滤 `deleted = 0`）

#### Scenario: 获取指定周的计划

- **WHEN** 系统调用 `GET /api/plans?weekStart=2026-01-13`
- **THEN** 后端返回 `weekStart` 匹配的计划列表
- **AND** 按 `createdAt` 升序排列

### Requirement: 结存周报不影响计划数据

系统 SHALL 在结存周报时保持计划数据独立，不清空计划表。

#### Scenario: 保存周报后计划数据保留

- **WHEN** 用户点击"生成周报"并保存
- **THEN** 周报数据保存到 `reports` 表
- **AND** `plans` 表中的计划数据保持不变
- **AND** 用户仍可查看和管理下周计划

#### Scenario: 周报归档包含计划快照

- **WHEN** 周报保存时
- **THEN** 周报的 `plans` 字段包含当前计划的快照（JSON 序列化）
- **AND** 快照用于历史查看，不影响 `plans` 表中的实时数据

## MODIFIED Requirements

### Requirement: 下周计划和本周总结必须从数据库加载

系统 SHALL 从数据库加载下周计划（从 `plans` 表）和本周总结（从 `settings` 表），确保数据实时性。

#### Scenario: 页面初始化时从数据库加载下周计划和本周总结

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **THEN** 系统调用 `GET /api/plans` 获取当前周的计划
- **AND** 系统调用 `GET /api/reports` 获取本周总结
- **AND** `currentPlans` 从 `/api/plans` 响应加载
- **AND** `currentReflections` 从 `/api/reports` 响应的 `data.currentReflections` 字段加载

#### Scenario: API 失败时向用户显示错误

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **AND** `GET /api/plans` 请求失败（网络错误或服务器错误）
- **THEN** 系统抛出异常，不再降级到 localStorage
- **AND** 向用户显示错误提示：「加载计划失败，请检查网络连接」
- **AND** 提供「重试」按钮，用户可手动重新加载数据

### Requirement: 下周计划和本周总结必须保存到数据库

当用户添加、修改或删除下周计划时，数据 SHALL 通过后端 API 保存到数据库的 `plans` 表。

#### Scenario: 添加下周计划时保存到数据库

- **WHEN** 用户点击「添加」按钮触发 `addPlan()`
- **THEN** 系统调用 `POST /api/plans` API
- **AND** 请求数据包含计划的 `content`, `project`, `workType`
- **AND** 后端在 `plans` 表中创建新记录
- **AND** 响应返回 `{ success: true, data: {...} }`

#### Scenario: 删除计划项时调用删除 API

- **WHEN** 系统调用 `removePlan(id)`
- **THEN** 系统调用 `DELETE /api/plans/:id` API
- **AND** 后端执行软删除操作
- **AND** 前端从 `currentPlans` 数组中移除对应项

#### Scenario: 修改本周总结时保存到数据库

- **WHEN** 用户修改触发 `updateReflections()`
- **THEN** 系统调用 `PUT /api/current-state` API
- **AND** 请求数据只包含 `currentReflections` 对象（不再包含 `currentPlans`）
- **AND** 后端将数据写入 `settings` 表的 `currentReflections` 键
