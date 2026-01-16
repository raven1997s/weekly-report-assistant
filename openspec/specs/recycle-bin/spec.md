# recycle-bin Specification

## Purpose

提供软删除机制和回收站功能，支持数据恢复和永久删除，确保数据安全。

## Requirements

### Requirement: 周报软删除

系统 SHALL 在删除周报时使用软删除机制，将 deleted 字段设置为 1，并记录 deletedAt 时间戳。

#### Scenario: 用户从历史页面删除周报

- **WHEN** 用户在历史周报页面点击删除按钮
- **THEN** 系统调用 DELETE /api/reports/:id API
- **AND** 数据库中该记录的 deleted 字段被设置为 1
- **AND** deletedAt 字段记录当前时间
- **AND** 周报从历史列表中移除
- **AND** 周报出现在回收站中

#### Scenario: 用户从回收站恢复周报

- **WHEN** 用户在回收站点击恢复按钮
- **THEN** 系统调用 POST /api/reports/:id/restore API
- **AND** 数据库中该记录的 deleted 字段被设置为 0
- **AND** deletedAt 字段被设置为 NULL
- **AND** 周报从回收站移除
- **AND** 如果是本周周报，恢复到编辑状态
- **AND** 如果是非本周周报，只添加到历史列表

### Requirement: 系统定时任务保护

系统 SHALL 保护核心系统定时任务，禁止用户通过页面进行修改、删除或禁用操作。

#### Scenario: 用户尝试修改计划转换定时任务

- **WHEN** 用户尝试修改 `new_workweek_plan_convert` 定时任务
- **THEN** 系统禁用编辑按钮
- **AND** 显示"系统任务"标签
- **AND** 前端禁止发送更新请求

#### Scenario: 用户尝试删除计划转换定时任务

- **WHEN** 用户尝试删除 `new_workweek_plan_convert` 定时任务
- **THEN** 系统禁用删除按钮
- **AND** 前端不发送删除请求

#### Scenario: 后端接收到系统任务修改请求

- **WHEN** 后端接收到对系统任务的修改或删除请求
- **THEN** 系统返回错误响应
- **AND** 错误消息包含"系统任务无法修改"提示

### Requirement: 回收站数据同步

系统 SHALL 确保回收站页面正确显示所有已删除的数据。

#### Scenario: 用户打开回收站页面

- **WHEN** 用户导航到回收站页面
- **THEN** 系统调用 GET /api/reports?deleted=1
- **AND** 调用 GET /api/records?deleted=1
- **AND** 正确解析返回的数据
- **AND** 更新响应式状态 `deletedReports` 和 `deletedRecords`
- **AND** 页面显示所有已删除项目

#### Scenario: 已删除记录数量变化

- **WHEN** 用户删除或恢复项目
- **THEN** 系统重新获取回收站数据
- **AND** 更新数量徽章显示

### Requirement: 永久删除

系统 SHALL 支持永久删除已删除的项目，该操作不可恢复。

#### Scenario: 永久删除周报

- **WHEN** 用户在回收站点击"永久删除"按钮
- **THEN** 系统调用 DELETE /api/reports/:id/permanent API
- **AND** 数据库中该记录被彻底删除
- **AND** 周报从回收站移除
- **AND** 该操作不可恢复

#### Scenario: 永久删除记录

- **WHEN** 用户在回收站点击"永久删除"按钮
- **THEN** 系统调用 DELETE /api/records/:id/permanent API
- **AND** 数据库中该记录被彻底删除
- **AND** 记录从回收站移除
- **AND** 该操作不可恢复
