# database-management Specification Delta

## MODIFIED Requirements

### Requirement: 白名单验证

系统 SHALL 使用白名单验证表名，只允许访问 5 个核心系统表。

#### Scenario: 允许访问系统表

- **WHEN** 用户请求以下表名：
  - `records`（工作记录）
  - `reports`（周报归档）
  - `settings`（应用设置）
  - `scheduled_tasks`（定时任务）
  - `plans`（下周计划）
- **THEN** 系统允许查询

#### Scenario: 拒绝访问其他表

- **WHEN** 用户请求其他表名（如 `sqlite_master`）
- **THEN** 系统返回 400 错误

### Requirement: 数据展示

系统 SHALL 以表格形式展示数据，支持不同字段类型的格式化显示，包括自动检测 JSON 格式。

#### Scenario: JSON 字段显示

- **WHEN** 字段值为 JSON 字符串（如 `records`, `plans`, `reflections`, `value`, `keywords`）
- **THEN** 系统显示 JSON 预览（截断）
- **AND** 用户点击 JSON 字段打开弹窗查看完整内容
- **AND** 弹窗支持 JSON 语法高亮、折叠/展开、复制功能

#### Scenario: 自动检测 JSON 格式

- **WHEN** 字段值是以 `{` 或 `[` 开头的字符串
- **AND** 该字符串可以被解析为有效的 JSON
- **THEN** 系统将其识别为 JSON 字段
- **AND** 显示 JSON 预览和点击查看按钮

#### Scenario: JSON 弹窗查看

- **WHEN** 用户点击表格中的 JSON 字段
- **THEN** 系统打开模态弹窗显示完整 JSON 内容
- **AND** 弹窗标题显示字段名称
- **AND** JSON 进行语法高亮（字符串绿色、数字蓝色、布尔橙色、null 灰色、键名深色加粗）
- **AND** 支持折叠/展开嵌套结构
- **AND** 提供「复制 JSON」按钮

#### Scenario: 长文本字段显示

- **WHEN** 字段值超过 50 个字符
- **THEN** 系统截断显示前 50 个字符，支持展开查看全文

#### Scenario: 日期字段显示

- **WHEN** 字段为日期类型（如 `createdAt`, `updatedAt`）
- **THEN** 系统格式化为本地日期时间字符串

#### Scenario: 布尔字段显示

- **WHEN** 字段值为 0 或 1（如 `deleted`, `enabled`）
- **THEN** 系统显示「是」/「否」，并应用对应的样式

### Requirement: 搜索功能

系统 SHALL 提供搜索功能，支持在指定字段或全部字段中搜索关键词。

#### Scenario: 按指定字段搜索

- **WHEN** 用户选择某个字段并输入关键词
- **THEN** 系统只在该字段中进行模糊匹配
- **AND** 使用 `LIKE '%keyword%'` 语法

#### Scenario: 全字段搜索

- **WHEN** 用户选择「全部字段」并输入关键词
- **THEN** 系统在所有文本字段中进行模糊匹配
- **AND** 使用 `OR` 连接多个字段的 `LIKE` 条件

#### Scenario: 搜索输入

- **WHEN** 用户在搜索框输入关键词
- **THEN** 系统在 500ms 防抖后执行搜索

#### Scenario: 搜索结果

- **WHEN** 搜索完成
- **THEN** 系统显示匹配的记录，重置到第一页

#### Scenario: 清空搜索

- **WHEN** 用户清空搜索框
- **THEN** 系统显示所有记录

## ADDED Requirements

### Requirement: plans 表的显示配置

系统 SHALL 为 `plans` 表提供友好的显示名称和列名映射。

#### Scenario: plans 表切换器显示

- **WHEN** 表切换器渲染
- **THEN** `plans` 表显示为「下周计划」
- **AND** 显示该表的行数徽章

#### Scenario: plans 表列名显示

- **WHEN** 显示 `plans` 表的数据
- **THEN** 列名按以下映射显示：
  - `id` → ID
  - `content` → 内容
  - `project` → 项目
  - `workType` → 工作类型
  - `weekStart` → 所属周
  - `status` → 状态
  - `convertedRecordId` → 转换记录ID
  - `createdAt` → 创建时间
  - `updatedAt` → 更新时间
  - `deleted` → 已删除
  - `deletedAt` → 删除时间

#### Scenario: plans 表状态字段显示

- **WHEN** 显示 `plans` 表的 `status` 字段
- **THEN** 按以下映射显示：
  - `pending` → 待处理（默认样式）
  - `converted` → 已转换（绿色）
  - `completed` → 已完成（蓝色）
