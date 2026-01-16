# persistence Specification

## Purpose

确保下周计划和本周总结数据能够持久化到数据库，支持跨设备同步，并提供 API 失败时的降级机制。

## Requirements

### Requirement: 下周计划和本周总结必须从数据库加载

系统 SHALL 从数据库加载下周计划（currentPlans）和本周总结（currentReflections），数据通过后端 API 从 settings 表读取，而非仅依赖浏览器 localStorage。

#### Scenario: 页面初始化时从数据库加载下周计划和本周总结

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **THEN** 系统调用 `GET /api/reports` 获取数据
- **AND** `currentPlans` 从响应的 `data.currentPlans` 字段加载
- **AND** `currentReflections` 从响应的 `data.currentReflections` 字段加载
- **AND** 数据从数据库的 `settings` 表读取，而非 localStorage

#### Scenario: 数据库无数据时从 localStorage 迁移

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **AND** 数据库返回空的 `currentPlans` 和 `currentReflections`
- **THEN** 系统尝试从 localStorage 读取旧数据
- **AND** 如果 localStorage 有数据，自动迁移到数据库
- **AND** 迁移后删除 localStorage 中的旧数据
- **AND** 用户无感知地完成数据迁移

#### Scenario: API 失败时降级到 localStorage

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **AND** `GET /api/reports` 请求失败
- **THEN** 系统降级到 localStorage 读取数据
- **AND** 在控制台输出降级警告日志
- **AND** 用户仍可继续使用基本功能

### Requirement: 下周计划和本周总结必须保存到数据库

当用户添加、修改或删除下周计划/本周总结时，数据 SHALL 通过后端 API 保存到数据库的 `settings` 表。

#### Scenario: 添加下周计划时保存到数据库

- **WHEN** 用户点击"添加"按钮触发 `addPlan()`
- **THEN** 系统调用 `PUT /api/current-state` API
- **AND** 请求数据包含更新后的 `currentPlans` 数组
- **AND** 后端将数据写入 `settings` 表的 `currentPlans` 键
- **AND** 响应返回 `{ success: true, message: '当前编辑状态已保存' }`

#### Scenario: 修改本周总结时保存到数据库

- **WHEN** 用户修改触发 `updateReflections()`
- **THEN** 系统调用 `PUT /api/current-state` API
- **AND** 请求数据包含更新后的 `currentReflections` 对象
- **AND** 后端将数据写入 `settings` 表的 `currentReflections` 键
- **AND** 响应返回 `{ success: true, message: '当前编辑状态已保存' }`

#### Scenario: 删除计划项时保存到数据库

- **WHEN** 系统调用 `removePlan(id)`
- **THEN** 从 `currentPlans` 数组中移除对应项
- **AND** 调用 `PUT /api/current-state` API 保存
- **AND** 数据库中的 `currentPlans` 键值被更新

#### Scenario: API 失败时降级到 localStorage

- **WHEN** `PUT /api/current-state` 请求失败
- **THEN** 系统降级到 `saveToStorage()` 保存到 localStorage
- **AND** 在控制台输出降级警告日志
- **AND** 用户数据不会因 API 失败而丢失

### Requirement: 生成周报后编辑状态的处理

周报生成并保存后，下周计划和本周总结的编辑状态 SHALL 被清空，系统允许用户继续填写下周的内容。

#### Scenario: 保存周报后清空编辑状态

- **WHEN** 用户点击"生成周报"并保存
- **THEN** 周报数据保存到 `reports` 表（包含 plans 和 reflections）
- **AND** 前端的 `currentPlans` 被清空为空数组 `[]`
- **AND** 前端的 `currentReflections` 被清空为 `{ gains: '', losses: '' }`
- **AND** 用户可以开始填写下周的计划

#### Scenario: 恢复本周周报时恢复编辑状态

- **WHEN** 系统识别恢复的是本周周报（`weekStart` 与当前周一致）
- **THEN** 从恢复的周报数据中读取 `plans` 和 `reflections`
- **AND** 恢复到 `currentPlans` 和 `currentReflections`
- **AND** 用户可以继续编辑下周计划和本周总结

#### Scenario: 恢复历史周报不影响编辑状态

- **WHEN** 系统识别恢复的不是本周周报
- **THEN** 周报添加到历史列表
- **AND** `currentPlans` 和 `currentReflections` 保持不变
- **AND** 用户当前的编辑状态不受影响

### Requirement: 后端 API 必须提供当前状态的读写接口

后端 SHALL 提供统一的 API 来读取和保存当前的编辑状态（下周计划和本周总结）。

#### Scenario: 读取当前编辑状态

- **WHEN** 前端调用 `GET /api/reports`
- **THEN** 响应包含 `data.reports`（周报归档列表）
- **AND** 响应包含 `data.currentPlans`（下周计划，从 settings 表读取）
- **AND** 响应包含 `data.currentReflections`（本周总结，从 settings 表读取）
- **AND** 所有 JSON 字段正确解析

#### Scenario: 保存当前编辑状态

- **WHEN** 前端调用 `PUT /api/current-state`
- **AND** 请求体包含 `{ currentPlans: [...], currentReflections: {...} }`
- **THEN** 后端将 `currentPlans` 保存到 `settings` 表的 `currentPlans` 键
- **AND** 后端将 `currentReflections` 保存到 `settings` 表的 `currentReflections` 键
- **AND** 使用 `INSERT OR REPLACE` 确保数据更新或插入
- **AND** 响应返回 `{ success: true, message: '当前编辑状态已保存' }`
