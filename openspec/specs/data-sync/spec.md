# data-sync Specification

## Purpose

确保所有数据的增删改查行为全部都必须通过接口获取，禁止使用任何前端缓存，并提供自动刷新机制以支持多标签页/多设备数据实时同步。

## Requirements

### Requirement: 禁止使用前端缓存

系统 SHALL 不使用 localStorage、sessionStorage、IndexedDB 等任何前端存储技术作为数据缓存，所有数据必须通过 API 从数据库实时读取。

#### Scenario: 读取数据不使用缓存

- **WHEN** 应用启动或用户触发数据加载
- **THEN** 系统直接调用后端 API 获取数据
- **AND** 不检查 localStorage 是否有缓存数据
- **AND** 不将 API 响应保存到 localStorage
- **AND** 仅在内存中保留当前需要的数据（Pinia Store）

#### Scenario: 写入数据不使用缓存

- **WHEN** 用户执行写入操作（添加、修改、删除）
- **THEN** 系统直接调用后端 API 写入数据
- **AND** 不将数据先保存到 localStorage 稍后同步
- **AND** API 失败时不降级到 localStorage
- **AND** 向用户显示明确的错误提示

#### Scenario: 前端仅使用内存缓存

- **WHEN** 系统从 API 获取数据
- **THEN** 数据仅存储在 Pinia Store 中（内存）
- **AND** 页面刷新后重新从 API 加载
- **AND** 关闭浏览器后数据自动清除（不持久化）

### Requirement: 多标签页数据自动同步

系统 SHALL 提供多标签页数据自动同步功能，确保一个标签页的修改能实时反映到其他标签页。

#### Scenario: 页面可见性监听

- **WHEN** 用户在标签页 A 中添加了一条工作记录
- **AND** 用户切换到标签页 B（标签页 B 从隐藏变为可见）
- **THEN** 系统触发 `visibilitychange` 事件
- **AND** 自动调用所有 Store 的 `init()` 方法刷新数据
- **AND** 标签页 B 显示最新的工作记录

#### Scenario: 防抖避免频繁刷新

- **WHEN** 用户在 5 秒内频繁切换标签页 10 次
- **THEN** 系统使用防抖机制（500ms）
- **AND** 只有最后一次切换后 500ms 才执行刷新
- **AND** 避免短时间内发送过多 API 请求

#### Scenario: 页面隐藏时暂停轮询

- **WHEN** 用户切换到其他标签页或最小化窗口
- **THEN** 系统暂停定期轮询
- **AND** 用户切换回来后，轮询自动恢复
- **AND** 恢复时立即执行一次刷新（不等待轮询间隔）

### Requirement: 定期轮询刷新数据

系统 SHALL 在页面可见时定期刷新数据，确保数据不会过期太久。

#### Scenario: 定期轮询默认间隔

- **WHEN** 页面处于可见状态
- **AND** 距离上次刷新超过 30 秒
- **THEN** 系统自动调用所有 Store 的 `init()` 方法
- **AND** 后台静默刷新，不显示任何提示
- **AND** 如果检测到数据更新，UI 自动反映最新状态

#### Scenario: 轮询间隔可配置

- **WHEN** 用户在设置中修改 `轮询间隔` 配置项
- **THEN** 系统使用新的轮询间隔
- **AND** 默认间隔为 30000ms（30秒）
- **AND** 可配置范围：10000ms（10秒）到 300000ms（5分钟）
- **AND** 修改后立即生效，无需重启应用

#### Scenario: 轮询与可见性监听配合

- **WHEN** 用户长时间停留在某个标签页（超过轮询间隔）
- **THEN** 定期轮询自动刷新数据
- **AND** 如果用户切换到其他标签页，轮询暂停
- **AND** 用户切换回来后，立即执行一次刷新

### Requirement: API 失败错误处理

系统 SHALL 在 API 调用失败时向用户显示明确的错误提示，禁止静默降级到前端缓存。

#### Scenario: 网络错误处理

- **WHEN** 用户执行操作时网络断开
- **THEN** 系统捕获网络错误
- **AND** 显示 Toast 提示："网络连接失败，请检查网络设置"
- **AND** 提供"重试"按钮，用户可手动重新执行操作
- **AND** 不降级到 localStorage

#### Scenario: 服务器错误处理

- **WHEN** 后端 API 返回 500 或其他错误
- **THEN** 系统解析错误响应
- **AND** 显示 Toast 提示："服务器错误，请稍后重试"
- **AND** 在控制台输出详细错误日志
- **AND** 不降级到 localStorage

#### Scenario: 超时错误处理

- **WHEN** API 请求超过 10 秒未响应
- **THEN** 系统中断请求并抛出超时错误
- **AND** 显示 Toast 提示："请求超时，请检查网络连接"
- **AND** 提供"重试"按钮

### Requirement: 数据同步状态指示

系统 SHALL 在刷新数据时提供视觉反馈，让用户了解数据同步状态。

#### Scenario: 显示"正在同步"提示

- **WHEN** 用户点击"刷新"按钮手动触发刷新
- **THEN** 在页面顶部显示"正在同步..."提示
- **AND** 使用 Toast 组件显示（z-index: 1070）
- **AND** 刷新完成后自动消失（2秒后）
- **AND** 如果刷新失败，显示错误提示

#### Scenario: 后台刷新不显示提示

- **WHEN** 系统通过定期轮询或页面可见性监听刷新数据
- **THEN** 不显示任何提示（静默刷新）
- **AND** 如果检测到数据更新，UI 自动反映最新状态
- **AND** 用户无感知地完成数据同步

## Cross-Reference

相关规格：
- **persistence**: 数据持久化需求（已修改，移除 localStorage 降级）
- **database-management**: 数据库管理相关需求
