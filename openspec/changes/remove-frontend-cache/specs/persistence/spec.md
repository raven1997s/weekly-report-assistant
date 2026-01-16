# persistence Specification Changes

## Purpose

移除前端 localStorage 缓存机制，确保所有数据通过 API 实时从数据库读取，并添加自动刷新机制以支持多标签页/多设备数据同步。

## MODIFIED Requirements

### Requirement: 移除 localStorage 降级机制

系统 SHALL 不再使用 localStorage 作为数据存储的降级方案，所有数据必须通过 API 从数据库读取。

**Rationale**: localStorage 降级导致数据不一致，用户无法确定数据的真实来源。移除降级逻辑后，API 失败时直接向用户报错，确保数据来源的唯一性。

#### Scenario: API 失败时向用户显示错误

- **WHEN** 页面初始化执行 `reportsStore.init()`
- **AND** `GET /api/reports` 请求失败（网络错误或服务器错误）
- **THEN** 系统抛出异常，不再降级到 localStorage
- **AND** 向用户显示错误提示："加载数据失败，请检查网络连接"
- **AND** 提供"重试"按钮，用户可手动重新加载数据
- **AND** 控制台输出错误日志：`[Error] 加载数据失败: <错误信息>`

#### Scenario: 移除 localStorage 备份逻辑

- **WHEN** 用户修改数据触发 `reportsStore.persist()`
- **THEN** 系统仅调用 `PUT /api/current-state` API
- **AND** 不再将数据保存到 localStorage 作为备份
- **AND** 如果 API 失败，向用户显示错误提示
- **AND** 控制台输出错误日志，不包含任何 localStorage 相关操作

#### Scenario: 一次性迁移 localStorage 旧数据

- **WHEN** 应用首次启动（数据库为空）
- **AND** 检测到 localStorage 存在旧数据
- **THEN** 系统自动将 localStorage 数据迁移到数据库
- **AND** 迁移成功后立即删除 localStorage 中的旧数据
- **AND** 在控制台输出迁移日志：`[Migrate] 已将 localStorage 数据迁移到数据库`
- **AND** 用户无感知地完成迁移

### Requirement: 添加页面可见性监听刷新机制

系统 SHALL 监听页面可见性变化，当用户切换回标签页时自动刷新数据，确保多标签页数据同步。

#### Scenario: 切换标签页时自动刷新

- **WHEN** 用户在标签页 A 中修改数据
- **AND** 用户切换到标签页 B（标签页 B 从隐藏变为可见）
- **THEN** 系统触发 `document.onvisibilitychange` 事件
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

### Requirement: 添加定期轮询刷新机制

系统 SHALL 在页面可见时定期刷新数据，确保数据不会过期太久。

#### Scenario: 定期轮询刷新数据

- **WHEN** 页面处于可见状态
- **AND** 距离上次刷新超过 30 秒（可配置）
- **THEN** 系统自动调用所有 Store 的 `init()` 方法
- **AND** 后台静默刷新，不显示任何提示
- **AND** 如果检测到数据更新，UI 自动反映最新状态

#### Scenario: 轮询间隔可配置

- **WHEN** 用户修改设置中的 `pollingInterval` 配置项
- **THEN** 系统使用新的轮询间隔
- **AND** 默认间隔为 30000ms（30秒）
- **AND** 可配置范围：10000ms（10秒）到 300000ms（5分钟）

#### Scenario: 页面隐藏时停止轮询

- **WHEN** 用户切换到其他标签页
- **THEN** 系统停止定期轮询
- **AND** 用户切换回来后，轮询自动恢复
- **AND** 恢复时立即执行一次刷新（不等待轮询间隔）

### Requirement: 弃用批量替换接口

系统 SHALL 弃用 `PUT /api/records/batch` 接口，改为使用增量更新（逐条 CRUD）。

**Rationale**: 批量替换接口存在原子性问题（先清空再插入，如果插入失败则所有数据丢失），改为逐条操作更安全。

#### Scenario: 删除批量替换接口

- **WHEN** 系统启动
- **THEN** `server/api.js` 中不再定义 `app.put('/api/records/batch', ...)` 路由
- **AND** 前端代码不再调用此接口
- **AND** 调用此接口返回 404 错误

#### Scenario: 批量操作使用逐条 API

- **WHEN** 用户需要批量添加记录
- **THEN** 系统逐条调用 `POST /api/records` 接口
- **AND** 使用 `Promise.all()` 并行发送请求
- **AND** 如果某条记录失败，不影响其他记录

#### Scenario: 批量删除使用逐条 API

- **WHEN** 用户需要批量删除记录
- **THEN** 系统逐条调用 `DELETE /api/records/:id` 接口
- **AND** 使用 `Promise.all()` 并行发送请求
- **AND** 如果某条记录失败，记录错误日志并继续删除其他记录

## REMOVED Requirements

### Requirement: ~~数据库无数据时从 localStorage 迁移~~ (已移除)

**原需求**: 系统尝试从 localStorage 读取旧数据，自动迁移到数据库。

**移除原因**:
- 迁移逻辑应在应用启动时一次性执行，不需要在每次 `init()` 时检查
- 简化降级逻辑，明确数据来源（仅数据库）
- 迁移逻辑移至"MODIFIED Requirements - 移除 localStorage 降级机制"中的"一次性迁移场景"

### Requirement: ~~API 失败时降级到 localStorage~~ (已移除)

**原需求**: 系统降级到 localStorage 读取数据，在控制台输出降级警告日志。

**移除原因**:
- 与"禁止前端缓存"原则冲突
- 降级导致数据不一致，用户不知道数据来源
- 新需求要求 API 失败时直接向用户报错

## ADDED Requirements

### Requirement: 统一数据流为"数据库 → API → UI"

系统 SHALL 遵循单向数据流原则，所有数据读取和写入都必须通过 API，禁止前端直接访问数据库或使用本地缓存。

#### Scenario: 读取数据遵循单向数据流

- **WHEN** UI 组件需要显示数据
- **THEN** 组件从 Pinia Store 读取数据
- **AND** Pinia Store 从 API 获取数据
- **AND** API 从数据库获取数据
- **AND** 数据流向：数据库 → API → Pinia Store → UI

#### Scenario: 写入数据遵循单向数据流

- **WHEN** 用户执行写入操作（添加、修改、删除）
- **THEN** UI 组件调用 Pinia Store 的方法
- **AND** Pinia Store 调用 API 写入数据
- **AND** API 写入数据库
- **AND** 成功后 Pinia Store 重新加载数据（或乐观更新）
- **AND** 数据流向：UI → Pinia Store → API → 数据库

#### Scenario: 禁止前端直接操作数据库

- **WHEN** 开发者需要添加新功能
- **THEN** 必须通过后端 API 操作数据库
- **AND** 禁止前端直接使用 sqlite3 或其他数据库驱动
- **AND** 禁止前端绕过 API 直接修改 localStorage

### Requirement: 显示数据同步状态

系统 SHALL 在刷新数据时显示同步状态，提升用户体验。

#### Scenario: 显示"正在同步"提示

- **WHEN** 系统正在刷新数据（Store 的 `syncing` 状态为 true）
- **AND** 刷新是由用户主动触发（如点击"刷新"按钮）
- **THEN** 在页面顶部显示"正在同步..."提示
- **AND** 使用 Toast 或 Badge 组件显示
- **AND** 刷新完成后自动消失

#### Scenario: 后台刷新不显示提示

- **WHEN** 系统正在刷新数据
- **AND** 刷新是由定期轮询或页面可见性监听触发
- **THEN** 不显示任何提示（后台静默刷新）
- **AND** 如果检测到数据更新，UI 自动反映最新状态
- **AND** 用户无感知地完成数据同步

## Cross-Reference

相关规格：
- **database-management**: 数据库管理相关需求
- **scheduled-tasks**: 定时任务相关需求（可选：使用定期轮询替代）

## Migration Guide

### 从旧版本迁移

1. **备份数据**: 导出 localStorage 中的旧数据
2. **更新代码**: 按照本规格修改 Store 和 API 层
3. **测试迁移**: 确认旧数据已自动迁移到数据库
4. **验证功能**: 测试多标签页同步和定期轮询
5. **清理缓存**: 清除浏览器 localStorage

### 回滚方案

如果新版本出现问题，可以恢复旧版本：
1. 恢复 `src/utils/api.js` 中的 localStorage 操作
2. 恢复 `src/stores/*.js` 中的降级逻辑
3. 禁用自动刷新机制
4. 恢复 `PUT /api/records/batch` 接口
