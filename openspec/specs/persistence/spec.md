# 数据持久化规范

本规范定义了智能周报助手系统中所有数据的持久化策略。

## 数据持久化原则

系统 MUST 确保所有用户数据通过后端 API 持久化到数据库，MUST NOT 仅依赖浏览器 localStorage。

### 数据源优先级

1. **数据库（SQLite）** - 主要数据源，所有持久化数据 MUST 存储在数据库中
2. **localStorage** - 仅作为降级备份和临时缓存

### 降级策略

当数据库不可用时，系统 SHALL 降级到 localStorage，确保用户数据不丢失。

---

## 当前编辑状态

### Requirement: 下周计划和本周总结必须从数据库加载

系统 MUST 从数据库加载下周计划（currentPlans）和本周总结（currentReflections），数据 MUST 通过后端 API 从 settings 表读取，而 NOT 仅依赖浏览器 localStorage。

#### Scenario: 页面初始化时从数据库加载下周计划和本周总结

**Given** 用户打开"生成周报"页面

**When** 页面初始化执行 `reportsStore.init()`

**Then**
- 系统调用 `GET /api/reports` 获取数据
- `currentPlans` 从响应的 `data.currentPlans` 字段加载
- `currentReflections` 从响应的 `data.currentReflections` 字段加载
- 数据从数据库的 `settings` 表读取，而非 localStorage

#### Scenario: 数据库无数据时从 localStorage 迁移

**Given** 用户首次使用新版本（数据库中无 plans/reflections 数据）

**When** 页面初始化执行 `reportsStore.init()`

**And** 数据库返回空的 `currentPlans` 和 `currentReflections`

**Then**
- 系统尝试从 localStorage 读取旧数据
- 如果 localStorage 有数据，自动迁移到数据库
- 迁移后删除 localStorage 中的旧数据
- 用户无感知地完成数据迁移

#### Scenario: API 失败时降级到 localStorage

**Given** 后端 API 服务不可用或网络错误

**When** 页面初始化执行 `reportsStore.init()`

**And** `GET /api/reports` 请求失败

**Then**
- 系统降级到 localStorage 读取数据
- 在控制台输出降级警告日志
- 用户仍可继续使用基本功能

---

### Requirement: 下周计划和本周总结必须保存到数据库

当用户添加、修改或删除下周计划/本周总结时，数据 MUST 通过后端 API 保存到数据库的 `settings` 表，MUST NOT 仅保存到浏览器 localStorage。

#### Scenario: 添加下周计划时保存到数据库

**Given** 用户在"下周计划"输入框中输入一条计划

**When** 用户点击"添加"按钮触发 `addPlan()`

**Then**
- 系统调用 `PUT /api/current-state` API
- 请求数据包含更新后的 `currentPlans` 数组
- 后端将数据写入 `settings` 表的 `currentPlans` 键
- 响应返回 `{ success: true, message: '当前编辑状态已保存' }`

#### Scenario: 修改本周总结时保存到数据库

**Given** 用户在"本周得与失"输入框中修改内容

**When** 用户修改触发 `updateReflections()`

**Then**
- 系统调用 `PUT /api/current-state` API
- 请求数据包含更新后的 `currentReflections` 对象
- 后端将数据写入 `settings` 表的 `currentReflections` 键
- 响应返回 `{ success: true, message: '当前编辑状态已保存' }`

#### Scenario: 删除计划项时保存到数据库

**Given** 用户点击删除某个计划项

**When** 系统调用 `removePlan(id)`

**Then**
- 从 `currentPlans` 数组中移除对应项
- 调用 `PUT /api/current-state` API 保存
- 数据库中的 `currentPlans` 键值被更新

#### Scenario: API 失败时降级到 localStorage

**Given** 后端 API 保存失败（网络错误或服务器错误）

**When** `PUT /api/current-state` 请求失败

**Then**
- 系统降级到 `saveToStorage()` 保存到 localStorage
- 在控制台输出降级警告日志
- 用户数据不会因 API 失败而丢失

---

### Requirement: 生成周报后编辑状态的处理

周报生成并保存后，下周计划和本周总结的编辑状态 MUST 被清空，系统 SHALL 允许用户继续填写下周的内容。

#### Scenario: 保存周报后清空编辑状态

**Given** 用户填写了本周的工作记录、下周计划和本周总结

**When** 用户点击"生成周报"并保存

**Then**
- 周报数据保存到 `reports` 表（包含 plans 和 reflections）
- 前端的 `currentPlans` 被清空为空数组 `[]`
- 前端的 `currentReflections` 被清空为 `{ gains: '', losses: '' }`
- 用户可以开始填写下周的计划

#### Scenario: 恢复本周周报时恢复编辑状态

**Given** 用户从回收站恢复了一份本周的周报

**When** 系统识别恢复的是本周周报（`weekStart` 与当前周一致）

**Then**
- 从恢复的周报数据中读取 `plans` 和 `reflections`
- 恢复到 `currentPlans` 和 `currentReflections`
- 用户可以继续编辑下周计划和本周总结

#### Scenario: 恢复历史周报不影响编辑状态

**Given** 用户从回收站恢复了一份历史周报（非本周）

**When** 系统识别恢复的不是本周周报

**Then**
- 周报添加到历史列表
- `currentPlans` 和 `currentReflections` 保持不变
- 用户当前的编辑状态不受影响

---

## 后端 API

### Requirement: 后端 API 必须提供当前状态的读写接口

后端 MUST 提供统一的 API 来读取和保存当前的编辑状态（下周计划和本周总结）。系统 SHALL 支持通过 `GET /api/reports` 读取状态，通过 `PUT /api/current-state` 保存状态。

#### Scenario: 读取当前编辑状态

**Given** 前端需要获取当前编辑状态

**When** 前端调用 `GET /api/reports`

**Then**
- 响应包含 `data.reports`（周报归档列表）
- 响应包含 `data.currentPlans`（下周计划，从 settings 表读取）
- 响应包含 `data.currentReflections`（本周总结，从 settings 表读取）
- 所有 JSON 字段正确解析

#### Scenario: 保存当前编辑状态（新增）

**Given** 前端需要保存当前编辑状态

**When** 前端调用 `PUT /api/current-state`

**And** 请求体包含 `{ currentPlans: [...], currentReflections: {...} }`

**Then**
- 后端将 `currentPlans` 保存到 `settings` 表的 `currentPlans` 键
- 后端将 `currentReflections` 保存到 `settings` 表的 `currentReflections` 键
- 使用 `INSERT OR REPLACE` 确保数据更新或插入
- 响应返回 `{ success: true, message: '当前编辑状态已保存' }`
