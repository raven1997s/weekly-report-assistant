## MODIFIED Requirements

### Requirement: 周报软删除
系统 SHALL 在删除周报时使用软删除机制，将 deleted 字段设置为 1，并记录 deletedAt 时间戳。

#### Scenario: 用户从历史页面删除周报
- **当** 用户在历史周报页面点击删除按钮
- **那么** 系统 SHALL 调用 DELETE /api/reports/:id API
- **并且** 数据库中该记录的 deleted 字段被设置为 1
- **并且** deletedAt 字段记录当前时间
- **并且** 周报从历史列表中移除
- **并且** 周报出现在回收站中

#### Scenario: 用户从回收站恢复周报
- **当** 用户在回收站点击恢复按钮
- **那么** 系统 SHALL 调用 POST /api/reports/:id/restore API
- **并且** 数据库中该记录的 deleted 字段被设置为 0
- **并且** deletedAt 字段被设置为 NULL
- **并且** 周报从回收站移除
- **并且** 如果是本周周报，恢复到编辑状态
- **并且** 如果是非本周周报，只添加到历史列表

## ADDED Requirements

### Requirement: 系统定时任务保护
系统 SHALL 保护核心系统定时任务，禁止用户通过页面进行修改、删除或禁用操作。

#### Scenario: 用户尝试修改计划转换定时任务
- **当** 用户尝试修改 `new_workweek_plan_convert` 定时任务
- **那么** 系统 SHALL 禁用编辑按钮
- **并且** 显示"系统任务"标签
- **并且** 前端禁止发送更新请求

#### Scenario: 用户尝试删除计划转换定时任务
- **当** 用户尝试删除 `new_workweek_plan_convert` 定时任务
- **那么** 系统 SHALL 禁用删除按钮
- **并且** 前端不发送删除请求

#### Scenario: 后端接收到系统任务修改请求
- **当** 后端接收到对系统任务的修改或删除请求
- **那么** 系统 SHALL 返回错误响应
- **并且** 错误消息包含"系统任务无法修改"提示

### Requirement: 回收站数据同步
系统 SHALL 确保回收站页面正确显示所有已删除的数据。

#### Scenario: 用户打开回收站页面
- **当** 用户导航到回收站页面
- **那么** 系统 SHALL 调用 GET /api/reports?deleted=1
- **并且** 调用 GET /api/records?deleted=1
- **并且** 正确解析返回的数据
- **并且** 更新响应式状态 `deletedReports` 和 `deletedRecords`
- **并且** 页面显示所有已删除项目

#### Scenario: 已删除记录数量变化
- **当** 用户删除或恢复项目
- **那么** 系统 SHALL 重新获取回收站数据
- **并且** 更新数量徽章显示
