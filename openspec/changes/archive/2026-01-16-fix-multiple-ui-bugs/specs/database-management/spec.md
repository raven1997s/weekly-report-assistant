# Capability: Database Management

## MODIFIED Requirements

### Requirement: 数据库管理按列过滤功能

数据库管理页面 MUST 支持按特定列进行搜索，MUST 提供列选择器，系统 SHALL 使用白名单验证列名防止 SQL 注入。

#### Scenario: 按特定列搜索数据

- **GIVEN** 用户在数据库管理页面
- **AND** 用户已选择"records"表
- **WHEN** 用户从列选择器中选择"deleted"列
- **AND** 用户在搜索框输入"1"
- **THEN** 表格 MUST 只显示 deleted 字段包含"1"的记录
- **AND** 搜索结果 MUST 包含所有已删除的记录
- **AND** 其他列的内容 SHALL NOT 影响搜索结果

#### Scenario: 选择全部字段进行模糊搜索

- **GIVEN** 用户在数据库管理页面
- **AND** 用户已选择"records"表
- **WHEN** 用户从列选择器中选择"全部字段"
- **AND** 用户在搜索框输入"WMS"
- **THEN** 表格 MUST 显示所有文本字段中包含"WMS"的记录
- **AND** 搜索范围 MUST 包括 content、project、workType 等文本字段

#### Scenario: 列选择器只显示可搜索的列

- **GIVEN** 用户在数据库管理页面
- **AND** 用户已选择一个表（如"records"）
- **WHEN** 用户查看列选择器的选项
- **THEN** 列选择器 MUST 包含"全部字段"选项
- **AND** 列选择器 MUST 包含该表的文本字段（TEXT、CHAR、VARCHAR 类型）
- **AND** 列选择器 SHALL NOT 包含不适合搜索的字段（如 BLOB、INTEGER 主键）

#### Scenario: 后端验证列名防止 SQL 注入

- **GIVEN** 后端接收到搜索请求
- **AND** 请求参数包含恶意列名（如 `column=deleted; DROP TABLE records--`）
- **WHEN** 后端处理请求
- **THEN** 后端 MUST 验证列名在白名单中
- **AND** 如果列名不在白名单中，MUST 返回 400 错误
- **AND** 错误消息 MUST 为"无效的列名"
- **AND** 系统 SHALL NOT 执行任何 SQL 注入攻击
