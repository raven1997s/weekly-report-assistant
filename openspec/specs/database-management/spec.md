# database-management Specification

## Purpose

数据库管理页面提供只读方式查看所有系统表数据，支持 JSON 弹窗查看、高级筛选、列排序等功能，方便用户快速查找和分析数据。
## Requirements
### Requirement: 表列表查询

系统 SHALL 提供获取数据库所有表信息的接口，返回表名、字段结构和行数。

#### Scenario: 成功获取表列表

- **WHEN** 用户请求 `/api/database/tables`
- **THEN** 系统返回所有表的信息，包括：
  - `name`: 表名
  - `columns`: 字段数组（name, type, notNull, primaryKey）
  - `rowCount`: 行数

#### Scenario: 排除系统表

- **WHEN** 系统查询表列表
- **THEN** 自动排除 `sqlite_%` 开头的系统表

### Requirement: 表数据查询

系统 SHALL 提供获取指定表数据的接口，支持分页和搜索功能。

#### Scenario: 成功获取表数据

- **WHEN** 用户请求 `/api/database/table/:tableName?page=1&pageSize=20`
- **THEN** 系统返回：
  - `tableName`: 表名
  - `columns`: 列名数组
  - `rows`: 数据行数组
  - `pagination`: 分页信息（page, pageSize, total, totalPages）

#### Scenario: 搜索功能

- **WHEN** 用户请求带有 `search=关键词` 参数
- **THEN** 系统在所有文本字段中模糊匹配关键词

#### Scenario: 无效表名

- **WHEN** 用户请求不存在的表名或系统表
- **THEN** 系统返回 400 错误，提示"无效的表名"

### Requirement: 白名单验证

系统 SHALL 使用白名单验证表名，只允许访问 4 个核心系统表。

#### Scenario: 允许访问系统表

- **WHEN** 用户请求以下表名：
  - `records`（工作记录）
  - `reports`（周报归档）
  - `settings`（应用设置）
  - `scheduled_tasks`（定时任务）
- **THEN** 系统允许查询

#### Scenario: 拒绝访问其他表

- **WHEN** 用户请求其他表名（如 `sqlite_master`）
- **THEN** 系统返回 400 错误

### Requirement: 表切换功能

系统 SHALL 提供表切换界面，允许用户在不同表之间切换。

#### Scenario: 切换表

- **WHEN** 用户点击表切换器中的某个表
- **THEN** 系统加载该表的数据，重置分页和搜索状态

#### Scenario: 显示表信息

- **WHEN** 表切换器渲染
- **THEN** 显示表的中文名称和行数徽章

### Requirement: 数据展示

系统 SHALL 以表格形式展示数据，支持不同字段类型的格式化显示。

#### Scenario: JSON 字段显示

- **WHEN** 字段值为 JSON 字符串（如 `records`, `plans`, `reflections`, `value`）
- **THEN** 系统显示 JSON 预览（截断）
- **AND** 用户点击 JSON 字段打开弹窗查看完整内容
- **AND** 弹窗支持 JSON 语法高亮、折叠/展开、复制功能

#### Scenario: JSON 弹窗查看

- **WHEN** 用户点击表格中的 JSON 字段
- **THEN** 系统打开模态弹窗显示完整 JSON 内容
- **AND** 弹窗标题显示字段名称
- **AND** JSON 进行语法高亮（字符串绿色、数字蓝色、布尔橙色、null 灰色、键名深色加粗）
- **AND** 支持折叠/展开嵌套结构
- **AND** 提供"复制 JSON"按钮

#### Scenario: 长文本字段显示

- **WHEN** 字段值超过 50 个字符
- **THEN** 系统截断显示前 50 个字符，支持展开查看全文

#### Scenario: 日期字段显示

- **WHEN** 字段为日期类型（如 `createdAt`, `updatedAt`）
- **THEN** 系统格式化为本地日期时间字符串

#### Scenario: 布尔字段显示

- **WHEN** 字段值为 0 或 1（如 `deleted`, `enabled`）
- **THEN** 系统显示"是"/"否"，并应用对应的样式

### Requirement: 分页功能

系统 SHALL 支持分页浏览数据，默认每页显示 20 条。

#### Scenario: 翻页功能

- **WHEN** 用户点击"上一页"或"下一页"按钮
- **THEN** 系统加载对应页的数据

#### Scenario: 分页信息显示

- **WHEN** 分页器渲染
- **THEN** 显示当前页码、总页数和总记录数

#### Scenario: 边界处理

- **WHEN** 用户在第一页点击"上一页"
- **THEN** 按钮禁用
- **WHEN** 用户在最后一页点击"下一页"
- **THEN** 按钮禁用

### Requirement: 搜索功能

系统 SHALL 提供搜索功能，支持在表数据中搜索关键词。

#### Scenario: 搜索输入

- **WHEN** 用户在搜索框输入关键词
- **THEN** 系统在 500ms 防抖后执行搜索

#### Scenario: 搜索结果

- **WHEN** 搜索完成
- **THEN** 系统显示匹配的记录，重置到第一页

#### Scenario: 清空搜索

- **WHEN** 用户清空搜索框
- **THEN** 系统显示所有记录

### Requirement: 加载和空状态

系统 SHALL 提供加载状态和空状态的友好提示。

#### Scenario: 加载状态

- **WHEN** 数据正在加载
- **THEN** 系统显示加载动画和"加载数据中..."提示

#### Scenario: 空状态

- **WHEN** 表中没有数据或搜索无结果
- **THEN** 系统显示空状态图标和"暂无数据"提示

### Requirement: 响应式设计

系统 SHALL 支持桌面端、平板端和移动端访问。

#### Scenario: 桌面端布局

- **WHEN** 屏幕宽度 >= 1280px
- **THEN** 表格水平滚动，每页显示 20 条数据

#### Scenario: 平板端布局

- **WHEN** 屏幕宽度在 768px - 1279px 之间
- **THEN** 表格自适应宽度，单元格最大宽度 300px

#### Scenario: 移动端布局

- **WHEN** 屏幕宽度 < 768px
- **THEN** 表格单元格最大宽度 150px，分页器垂直布局

### Requirement: 侧边栏导航

系统 SHALL 在侧边栏添加"数据库管理"菜单入口。

#### Scenario: 菜单显示

- **WHEN** 侧边栏渲染
- **THEN** 显示"数据库管理"菜单项和数据库图标

#### Scenario: 页面跳转

- **WHEN** 用户点击"数据库管理"菜单
- **THEN** 导航到 `/database` 页面

### Requirement: 安全性

系统 SHALL 确保数据库管理功能的安全性，防止未授权访问和数据泄露。

#### Scenario: 只读查询

- **WHEN** 用户访问数据库管理功能
- **THEN** 系统只提供只读查询接口，不提供任何修改数据的接口

#### Scenario: SQL 注入防护

- **WHEN** 用户输入恶意表名或搜索关键词
- **THEN** 系统使用白名单验证和参数化查询，防止 SQL 注入

#### Scenario: 无权限控制

- **WHEN** 任何用户访问 `/database` 页面
- **THEN** 系统允许访问，无需身份验证

### Requirement: 高级筛选面板

系统 SHALL 提供高级筛选面板，支持按字段类型进行多条件组合筛选。

#### Scenario: 打开筛选面板

- **WHEN** 用户点击"筛选"按钮
- **THEN** 系统展开筛选面板（位于搜索栏下方）
- **AND** 按钮状态变为激活状态

#### Scenario: 动态生成筛选器

- **WHEN** 筛选面板渲染
- **THEN** 系统根据表格列的类型动态生成筛选器：
  - **文本字段**（TEXT、VARCHAR）：输入框，支持模糊匹配
  - **日期字段**：日期选择器
  - **布尔字段**（INTEGER 0/1）：下拉选择（全部/是/否）

#### Scenario: 应用筛选

- **WHEN** 用户在筛选器中输入内容
- **THEN** 系统使用 500ms 防抖
- **AND** 防抖结束后自动触发筛选
- **AND** 重置分页到第一页
- **AND** 表格显示筛选后的数据

#### Scenario: 重置筛选

- **WHEN** 用户点击"重置"按钮
- **THEN** 系统清空所有筛选条件
- **AND** 表格显示所有数据
- **AND** 关闭筛选面板

#### Scenario: 筛选状态指示

- **WHEN** 有激活的筛选条件且筛选面板关闭
- **THEN** "筛选"按钮显示徽章数字（如"3"）
- **AND** 徽章背景使用主题色

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

### Requirement: 表数据查询（增强）

系统 SHALL 支持筛选和排序参数，返回符合条件的数据。

#### Scenario: 带筛选参数的查询

- **WHEN** 用户请求带有 `filters[column]=value` 参数
- **THEN** 系统在 WHERE 子句中添加筛选条件
- **AND** 文本字段使用 LIKE 模糊匹配
- **AND** 日期字段使用范围筛选
- **AND** 布尔字段使用精确匹配

#### Scenario: 带排序参数的查询

- **WHEN** 用户请求带有 `sortColumn` 和 `sortOrder` 参数
- **THEN** 系统在 ORDER BY 子句中添加排序规则
- **AND** 验证列名在白名单中

#### Scenario: 筛选和排序组合查询

- **WHEN** 用户同时提供筛选和排序参数
- **THEN** 系统先应用筛选条件
- **AND** 再对筛选结果进行排序

#### Scenario: SQL 注入防护

- **WHEN** 用户提供筛选或排序参数
- **THEN** 系统使用参数化查询
- **AND** 验证列名在白名单中
- **AND** 转义用户输入的值

