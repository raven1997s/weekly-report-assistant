# database-management Specification Changes

## Purpose

数据库管理页面提供只读方式查看所有系统表数据，支持 JSON 弹窗查看、高级筛选、列排序等功能，方便用户快速查找和分析数据。

## MODIFIED Requirements

### Requirement: JSON 字段弹窗查看

系统 SHALL 支持在弹窗中查看 JSON 字段的详细内容，提供更好的阅读和复制体验。

#### Scenario: 点击 JSON 字段打开弹窗

- **WHEN** 用户点击表格中的 JSON 字段（如 `records`、`plans`、`reflections`、`value`）
- **THEN** 系统打开模态弹窗显示完整 JSON 内容
- **AND** 弹窗标题显示字段名称
- **AND** 弹窗背景遮罩阻止点击外部内容

#### Scenario: JSON 语法高亮

- **WHEN** JSON 弹窗显示数据
- **THEN** 系统对 JSON 进行语法高亮：
  - 字符串：绿色
  - 数字：蓝色
  - 布尔值：橙色
  - null：灰色
  - 键名：深色加粗
- **AND** 使用等宽字体显示

#### Scenario: JSON 折叠/展开嵌套结构

- **WHEN** JSON 包含嵌套对象或数组
- **THEN** 系统在嵌套层级前显示折叠/展开图标
- **AND** 用户点击图标可以切换该层级的显示状态
- **AND** 默认折叠所有嵌套层级（仅显示第一层）

#### Scenario: 复制 JSON 内容

- **WHEN** 用户点击"复制 JSON"按钮
- **THEN** 系统将完整 JSON 内容复制到剪贴板
- **AND** 显示提示"JSON 已复制到剪贴板"
- **AND** 提示 2 秒后自动消失

#### Scenario: 关闭 JSON 弹窗

- **WHEN** 用户点击"关闭"按钮或弹窗遮罩
- **THEN** 系统关闭弹窗
- **AND** 清空 JSON 数据，释放内存

### Requirement: 高级筛选面板

系统 SHALL 提供高级筛选面板，支持按字段类型进行多条件组合筛选。

#### Scenario: 打开筛选面板

- **WHEN** 用户点击"筛选"按钮
- **THEN** 系统展开筛选面板（位于搜索栏下方）
- **AND** 按钮状态变为"筛选中"

#### Scenario: 动态生成筛选器

- **WHEN** 筛选面板渲染
- **THEN** 系统根据表格列的类型动态生成筛选器：
  - **文本字段**（TEXT、VARCHAR）：输入框，支持模糊匹配
  - **日期字段**（TEXT 日期）：日期范围选择器（开始 ~ 结束）
  - **布尔字段**（INTEGER 0/1）：下拉选择（全部/是/否）

#### Scenario: 添加筛选条件

- **WHEN** 用户点击"添加筛选条件"按钮
- **THEN** 系统显示新的筛选行
- **AND** 用户可以选择要筛选的字段
- **AND** 根据字段类型显示对应的筛选器

#### Scenario: 应用筛选

- **WHEN** 用户点击"应用"按钮
- **THEN** 系统将筛选条件发送到后端 API
- **AND** 重置分页到第一页
- **AND** 表格显示筛选后的数据
- **AND** 关闭筛选面板

#### Scenario: 重置筛选

- **WHEN** 用户点击"重置"按钮
- **THEN** 系统清空所有筛选条件
- **AND** 表格显示所有数据
- **AND** 关闭筛选面板

#### Scenario: 筛选防抖

- **WHEN** 用户在筛选器中输入内容
- **THEN** 系统使用 500ms 防抖
- **AND** 防抖结束后自动触发筛选（无需点击应用）

### Requirement: 列排序功能

系统 SHALL 支持点击表头进行排序，支持升序、降序和取消排序。

#### Scenario: 单列排序

- **WHEN** 用户点击表头
- **THEN** 系统按该列升序排序
- **AND** 表头显示升序箭头图标（↑）
- **AND** 再次点击表头切换为降序排序
- **AND** 表头显示降序箭头图标（↓）
- **AND** 第三次点击表头取消排序

#### Scenario: 排序状态持久化

- **WHEN** 用户切换表或翻页
- **THEN** 系统保持当前排序状态
- **AND** 表头继续显示排序箭头图标

#### Scenario: 默认排序

- **WHEN** 页面首次加载或重置筛选
- **THEN** 系统按 `id` 列降序排序（最新数据在前）

#### Scenario: 多列排序（未来扩展）

- **WHEN** 用户按住 Shift 键点击多个表头
- **THEN** 系统按点击顺序进行多列排序
- **AND** 表头显示排序优先级（1、2、3...）

### Requirement: 表数据查询（增强）

系统 SHALL 支持筛选和排序参数，返回符合条件的数据。

#### Scenario: 带筛选参数的查询

- **WHEN** 用户请求带有 `filters[column]=value` 参数
- **THEN** 系统在 WHERE 子句中添加筛选条件
- **AND** 文本字段使用 LIKE 模糊匹配
- **AND** 日期字段使用范围筛选（>= start AND <= end）
- **AND** 布尔字段使用精确匹配

#### Scenario: 带排序参数的查询

- **WHEN** 用户请求带有 `sort[column]=asc` 参数
- **THEN** 系统在 ORDER BY 子句中添加排序规则
- **AND** 支持多列排序（逗号分隔）

#### Scenario: 筛选和排序组合查询

- **WHEN** 用户同时提供筛选和排序参数
- **THEN** 系统先应用筛选条件
- **AND** 再对筛选结果进行排序

#### Scenario: SQL 注入防护

- **WHEN** 用户提供筛选或排序参数
- **THEN** 系统使用参数化查询
- **AND** 验证列名在白名单中
- **AND** 转义用户输入的值

## ADDED Requirements

### Requirement: 筛选状态指示

系统 SHALL 在筛选面板关闭时，显示当前激活的筛选条件数量。

#### Scenario: 显示筛选徽章

- **WHEN** 有激活的筛选条件且筛选面板关闭
- **THEN** "筛选"按钮显示徽章数字（如"筛选 (3)"）
- **AND** 徽章背景使用主题色

#### Scenario: 清空筛选徽章

- **WHEN** 用户重置所有筛选条件
- **THEN** "筛选"按钮徽章消失

## REMOVED Requirements

### Scenario: ~~JSON 字段表格内展开~~ (已移除)

**原场景**: JSON 字段在表格内使用展开/收起按钮查看详情。

**移除原因**:
- 占用大量表格空间，影响其他行的查看
- 展开后需要手动折叠，操作繁琐
- 改为弹窗模式，提供更好的阅读体验

## Cross-Reference

相关规格：
- **recycle-bin**: 回收站页面也可以使用 JsonViewer 组件
- **scheduled-tasks**: 定时任务编辑页面可以使用 FilterPanel 组件
