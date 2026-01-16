# persistence Specification

## Purpose

确保下周计划和本周总结数据能够持久化到数据库，支持跨设备同步。下周计划存储在独立的 `plans` 表中，支持完整的生命周期管理（创建→转换→完成）。本周总结存储在 `settings` 表中。所有数据通过 API 实时从数据库读取，禁止使用前端缓存。

## Requirements

### Requirement: 下周计划必须存储在独立的 plans 表中

系统 SHALL 将下周计划存储在独立的 `plans` 表中，支持状态流转和生命周期管理。

#### Scenario: plans 表结构

- **GIVEN** 数据库初始化
- **THEN** `plans` 表包含以下字段：
  - `id` TEXT PRIMARY KEY
  - `content` TEXT NOT NULL
  - `project` TEXT
  - `workType` TEXT
  - `weekStart` TEXT NOT NULL（所属周的周一日期，ISO 8601）
  - `status` TEXT DEFAULT 'pending'（pending | converted | completed）
  - `convertedRecordId` TEXT（转换后的 records.id）
  - `createdAt` TEXT NOT NULL
  - `updatedAt` TEXT NOT NULL
  - `deleted` INTEGER DEFAULT 0
  - `deletedAt` TEXT
- **AND** 创建 `idx_plans_deleted`、`idx_plans_weekStart`、`idx_plans_status` 索引

### Requirement: 下周计划和本周总结必须从数据库加载

系统 SHALL 从数据库加载下周计划（从 `plans` 表）和本周总结（从 `settings` 表），确保数据实时性。

#### Scenario: 页面初始化时从数据库加载数据

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **THEN** 系统调用 `GET /api/plans` 获取当前周的计划
- **AND** 系统调用 `GET /api/reports` 获取本周总结
- **AND** `currentPlans` 从 `/api/plans` 响应加载
- **AND** `currentReflections` 从 `/api/reports` 响应的 `data.currentReflections` 字段加载

#### Scenario: API 失败时向用户显示错误

- **WHEN** API 请求失败（网络错误或服务器错误）
- **THEN** 系统抛出异常，不降级到 localStorage
- **AND** 向用户显示错误提示：「加载数据失败，请检查网络连接」
- **AND** 提供「重试」按钮，用户可手动重新加载数据

### Requirement: 下周计划必须通过独立 API 管理

系统 SHALL 通过独立的 `/api/plans` 接口管理下周计划的增删改查。

#### Scenario: 添加下周计划

- **WHEN** 用户点击「添加」按钮触发 `addPlan()`
- **THEN** 系统调用 `POST /api/plans` API
- **AND** 请求数据包含 `content`, `project`, `workType`
- **AND** 后端在 `plans` 表中创建新记录，`status` 为 `pending`
- **AND** 响应返回 `{ success: true, data: {...} }`

#### Scenario: 删除计划项

- **WHEN** 系统调用 `removePlan(id)`
- **THEN** 系统调用 `DELETE /api/plans/:id` API
- **AND** 后端执行软删除操作（`deleted = 1`）
- **AND** 前端从 `currentPlans` 数组中移除对应项

#### Scenario: 更新计划项

- **WHEN** 系统调用 `updatePlan(id, updates)`
- **THEN** 系统调用 `PUT /api/plans/:id` API
- **AND** 后端更新 `plans` 表中的记录
- **AND** 响应返回更新后的数据

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

- **WHEN** 系统调用 `POST /api/plans/batch-convert` API
- **THEN** 后端将指定的计划转换为工作记录
- **AND** 每条计划的 `status` 更新为 `converted`
- **AND** 响应返回转换结果列表

### Requirement: 本周总结必须保存到数据库

当用户修改本周总结时，数据 SHALL 通过后端 API 保存到数据库的 `settings` 表。

#### Scenario: 修改本周总结时保存到数据库

- **WHEN** 用户修改触发 `updateReflections()`
- **THEN** 系统调用 `PUT /api/current-state` API
- **AND** 请求数据只包含 `currentReflections` 对象
- **AND** 后端将数据写入 `settings` 表的 `currentReflections` 键
- **AND** 响应返回 `{ success: true, message: '当前编辑状态已保存' }`

### Requirement: 结存周报不影响计划数据

系统 SHALL 在结存周报时保持计划数据独立，不清空 plans 表。

#### Scenario: 保存周报后计划数据保留

- **WHEN** 用户点击「生成周报」并保存
- **THEN** 周报数据保存到 `reports` 表
- **AND** `plans` 表中的计划数据保持不变
- **AND** 用户仍可查看和管理下周计划
- **AND** 本周总结被清空（允许用户填写新内容）

#### Scenario: 周报归档包含计划快照

- **WHEN** 周报保存时
- **THEN** 周报的 `plans` 字段包含当前计划的快照（JSON 序列化）
- **AND** 快照用于历史查看，不影响 `plans` 表中的实时数据

### Requirement: settings 数据迁移

系统 SHALL 在首次启动时将 `settings.currentPlans` 数据迁移到 `plans` 表。

#### Scenario: 自动迁移旧数据

- **WHEN** 应用首次启动
- **AND** `plans` 表为空
- **AND** `settings` 表中存在 `currentPlans` 数据
- **THEN** 系统自动将数据迁移到 `plans` 表
- **AND** 每条计划的 `status` 设置为 `pending`
- **AND** 迁移成功后在控制台输出日志

### Requirement: 页面可见性监听刷新机制

系统 SHALL 监听页面可见性变化，当用户切换回标签页时自动刷新数据。

#### Scenario: 切换标签页时自动刷新

- **WHEN** 用户切换回标签页（从隐藏变为可见）
- **THEN** 系统触发 `visibilitychange` 事件
- **AND** 调用所有 Store 的 `init()` 方法刷新数据
- **AND** 使用防抖机制（500ms），避免频繁切换导致过多 API 调用

### Requirement: 定期轮询刷新机制

系统 SHALL 在页面可见时定期刷新数据，确保数据不会过期太久。

#### Scenario: 定期轮询刷新数据

- **WHEN** 页面处于可见状态
- **AND** 距离上次刷新超过 30 秒
- **THEN** 系统自动调用所有 Store 的 `init()` 方法
- **AND** 后台静默刷新，不显示任何提示
