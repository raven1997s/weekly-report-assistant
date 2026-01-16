# persistence Specification

## Purpose

确保下周计划和本周总结数据能够持久化到数据库，支持跨设备同步。移除前端 localStorage 缓存机制，确保所有数据通过 API 实时从数据库读取，并添加自动刷新机制以支持多标签页/多设备数据同步。

## Requirements

### Requirement: 下周计划和本周总结必须从数据库加载

系统 SHALL 从数据库加载下周计划（currentPlans）和本周总结（currentReflections），数据通过后端 API 从 settings 表读取。

#### Scenario: 页面初始化时从数据库加载下周计划和本周总结

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **THEN** 系统调用 `GET /api/reports` 获取数据
- **AND** `currentPlans` 从响应的 `data.currentPlans` 字段加载
- **AND** `currentReflections` 从响应的 `data.currentReflections` 字段加载
- **AND** 数据从数据库的 `settings` 表读取

#### Scenario: API 失败时向用户显示错误

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **AND** `GET /api/reports` 请求失败（网络错误或服务器错误）
- **THEN** 系统抛出异常，不再降级到 localStorage
- **AND** 向用户显示错误提示："加载数据失败，请检查网络连接"
- **AND** 提供"重试"按钮，用户可手动重新加载数据
- **AND** 控制台输出错误日志：`[Error] 加载数据失败: <错误信息>`

### Requirement: 一次性迁移 localStorage 旧数据

系统 SHALL 在应用首次启动时检测 localStorage 中的旧数据并自动迁移到数据库。

#### Scenario: 应用启动时迁移 localStorage 旧数据

- **WHEN** 应用首次启动（数据库为空）
- **AND** 检测到 localStorage 存在旧数据
- **THEN** 系统自动将 localStorage 数据迁移到数据库
- **AND** 迁移成功后立即删除 localStorage 中的旧数据
- **AND** 在控制台输出迁移日志：`[Migrate] 已将 localStorage 数据迁移到数据库`
- **AND** 用户无感知地完成迁移

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

#### Scenario: API 失败时向用户显示错误

- **WHEN** `PUT /api/current-state` 请求失败
- **THEN** 系统向用户显示错误提示："保存失败，请检查网络连接"
- **AND** 提供重试机制
- **AND** 控制台输出错误日志

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

### Requirement: 页面可见性监听刷新机制

系统 SHALL 监听页面可见性变化，当用户切换回标签页时自动刷新数据，确保多标签页数据同步。

#### Scenario: 切换标签页时自动刷新

- **WHEN** 用户在标签页 A 中修改数据
- **AND** 用户切换到标签页 B（标签页 B 从隐藏变为可见）
- **THEN** 系统触发 `visibilitychange` 事件
- **AND** 调用所有 Store 的 `init()` 方法刷新数据
- **AND** 使用防抖机制（500ms），避免频繁切换导致过多 API 调用
- **AND** 用户看到标签页 B 的数据已自动更新

#### Scenario: 页面隐藏时暂停轮询

- **WHEN** 用户切换到其他标签页或最小化窗口
- **AND** `document.visibilityState` 变为 `hidden`
- **THEN** 系统暂停定期轮询
- **AND** 不再发送 API 请求
- **AND** 节省网络带宽和服务器资源

#### Scenario: 防抖避免频繁 API 调用

- **WHEN** 用户频繁切换标签页（5秒内切换多次）
- **THEN** 系统使用防抖机制（500ms）
- **AND** 只有最后一次切换后 500ms 才执行刷新
- **AND** 避免短时间内发送过多 API 请求

### Requirement: 定期轮询刷新机制

系统 SHALL 在页面可见时定期刷新数据，确保数据不会过期太久。

#### Scenario: 定期轮询刷新数据

- **WHEN** 页面处于可见状态
- **AND** 距离上次刷新超过 30 秒
- **THEN** 系统自动调用所有 Store 的 `init()` 方法
- **AND** 后台静默刷新，不显示任何提示
- **AND** 如果检测到数据更新，UI 自动反映最新状态

#### Scenario: 页面隐藏时停止轮询

- **WHEN** 用户切换到其他标签页
- **THEN** 系统停止定期轮询
- **AND** 用户切换回来后，轮询自动恢复
- **AND** 恢复时立即执行一次刷新（不等待轮询间隔）
