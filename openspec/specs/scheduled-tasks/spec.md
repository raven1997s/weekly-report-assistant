# scheduled-tasks Specification

## Purpose

提供定时任务管理功能，支持周报推送、填写提醒、计划转换等自动化任务。

## Requirements

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

### Requirement: 定时任务管理

系统 SHALL 支持用户创建和管理自定义定时任务。

#### Scenario: 创建定时任务

- **WHEN** 用户在设置页面点击"添加任务"按钮
- **THEN** 系统显示任务创建对话框
- **AND** 用户可以设置任务名称、执行时间、类型等参数
- **AND** 系统调用 POST /api/scheduled-tasks API
- **AND** 定时任务被保存到数据库
- **AND** cron 调度器自动启动新任务

#### Scenario: 编辑定时任务

- **WHEN** 用户点击"编辑"按钮修改任务
- **THEN** 系统调用 PUT /api/scheduled-tasks/:id API
- **AND** 任务信息被更新
- **AND** cron 调度器重新加载任务配置

#### Scenario: 启用/禁用定时任务

- **WHEN** 用户切换任务的启用状态
- **THEN** 系统调用 PUT /api/scheduled-tasks/:id API
- **AND** 任务的 enabled 字段被更新
- **AND** cron 调度器根据状态启动或停止任务

#### Scenario: 删除定时任务

- **WHEN** 用户点击"删除"按钮
- **THEN** 系统调用 DELETE /api/scheduled-tasks/:id API
- **AND** 任务被软删除（deleted = 1）
- **AND** 任务从列表中移除
- **AND** cron 调度器停止该任务

### Requirement: 手动测试定时任务

系统 SHALL 支持用户手动触发定时任务，用于测试配置。

#### Scenario: 手动触发周报推送

- **WHEN** 用户点击"测试推送"按钮
- **THEN** 系统调用 POST /api/scheduled-tasks/:id/test API
- **AND** 立即执行任务逻辑
- **AND** 返回执行结果（成功/失败）

### Requirement: 定时任务类型

系统 SHALL 支持多种定时任务类型。

#### Scenario: 周报推送任务

- **WHEN** 系统执行类型为 `report` 的定时任务
- **THEN** 系统读取本周的周报数据
- **AND** 调用钉钉 Webhook 发送消息
- **AND** 返回发送结果

#### Scenario: 填写提醒任务

- **WHEN** 系统执行类型为 `reminder` 的定时任务
- **THEN** 系统检查本周是否有未填写的周报
- **AND** 如果未填写，调用钉钉 Webhook 发送提醒
- **AND** 返回提醒结果

#### Scenario: 计划转换任务（系统任务）

- **WHEN** 系统执行类型为 `convert` 的定时任务
- **THEN** 系统检查上周是否有未转换的计划
- **AND** 自动将上周计划转换为本周工作记录
- **AND** 标记转换已完成
- **AND** 返回转换结果

### Requirement: 定时任务调度

系统 SHALL 使用 cron 表达式定时执行任务。

#### Scenario: 任务时间到了

- **WHEN** 当前时间匹配任务的 cron 表达式
- **THEN** 系统自动执行任务逻辑
- **AND** 记录执行日志
- **AND** 处理执行错误

#### Scenario: 任务执行失败

- **WHEN** 任务执行过程中发生错误
- **THEN** 系统记录错误日志
- **AND** 不影响其他任务的执行
- **AND** 可以通过日志查看失败原因
