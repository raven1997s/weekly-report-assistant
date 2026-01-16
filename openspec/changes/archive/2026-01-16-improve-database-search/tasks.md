# Tasks: 改进数据库管理页面的搜索和查看体验

## Phase 1: JSON 弹窗查看器 ✅

### Task 1.1: 创建 JsonViewer 组件骨架 ✅
- [x] 创建 `src/components/JsonViewer.vue`
- [x] 定义 props（modelValue, data, title）
- [x] 定义 emits（update:modelValue）
- [x] 实现模态弹窗基础样式（z-index: 1050）

### Task 1.2: 实现 JSON 递归渲染 ✅
- [x] 创建递归组件 `JsonNode.vue`（或使用 template 递归）
- [x] 实现对象、数组、字符串、数字、布尔值、null 的渲染
- [x] 实现折叠/展开逻辑（每个节点独立状态）
- [x] 默认折叠所有嵌套层级

### Task 1.3: 实现 JSON 语法高亮 ✅
- [x] 为不同类型添加 CSS 类（json-string, json-number, json-boolean, json-null, json-key）
- [x] 在 SCSS 中定义颜色变量：
  - 字符串：绿色（$success）
  - 数字：蓝色（$info）
  - 布尔值：橙色（$warning）
  - null：灰色（var(--text-muted)）
  - 键名：深色加粗

### Task 1.4: 实现"复制 JSON"功能 ✅
- [x] 添加"复制 JSON"按钮
- [x] 使用 `navigator.clipboard.writeText()` 复制
- [x] 复制成功后显示 Toast 提示
- [x] 处理复制失败情况（降级到 `document.execCommand`）

### Task 1.5: 集成 JsonViewer 到 CellContent ✅
- [x] 修改 `CellContent.vue`，JSON 字段改为点击打开弹窗
- [x] 移除原有的展开/收起按钮
- [x] 添加 `@click` 事件，emit `showJson` 事件
- [x] 在 `DatabaseView.vue` 中监听 `showJson` 事件，打开弹窗

## Phase 2: 高级筛选面板 ✅

### Task 2.1: 创建 FilterPanel 组件骨架 ✅
- [x] 创建 `src/components/FilterPanel.vue`
- [x] 定义 props（columns, modelValue）
- [x] 定义 emits（update:modelValue, reset）
- [x] 实现面板展开/收起动画

### Task 2.2: 实现动态筛选器生成 ✅
- [x] 根据字段类型生成不同筛选器：
  - TEXT/VARCHAR → 输入框
  - 日期字段 → 日期选择器
  - INTEGER(0/1) → 下拉选择
- [x] 实现筛选器的双向绑定

### Task 2.3: 实现多条件添加/删除 ✅
- [x] 自动显示所有可筛选字段
- [x] 每个字段独立筛选器
- [x] 支持"重置"按钮清空所有筛选

### Task 2.4: 实现筛选应用和重置 ✅
- [x] 自动应用筛选（防抖 500ms）
- [x] 添加"重置"按钮，清空所有筛选条件
- [x] 筛选时重置分页到第一页

### Task 2.5: 后端 API 支持筛选参数 ✅
- [x] 修改 `GET /api/database/table/:tableName` 接口
- [x] 解析 `filters[column]` 参数
- [x] 构建 WHERE 子句（使用参数化查询）
- [x] 支持日期范围筛选
- [x] 支持 LIKE 模糊匹配

### Task 2.6: 集成 FilterPanel 到 DatabaseView ✅
- [x] 在 `DatabaseView.vue` 中添加筛选按钮
- [x] 添加筛选状态（filters, showFilterPanel）
- [x] 监听 filters 变化，自动刷新数据
- [x] 显示筛选徽章（筛选条件数量）

## Phase 3: 列排序功能 ✅

### Task 3.1: DataTable 组件支持排序 ✅
- [x] 修改 `DataTable.vue`，添加 sortColumn 和 sortOrder props
- [x] 表头添加点击事件
- [x] 实现排序状态显示（箭头图标）
- [x] emit `sortChange` 事件

### Task 3.2: 后端 API 支持排序参数 ✅
- [x] 修改 `GET /api/database/table/:tableName` 接口
- [x] 解析 `sortColumn` 和 `sortOrder` 参数
- [x] 构建 ORDER BY 子句
- [x] 验证列名在白名单中

### Task 3.3: DatabaseView 处理排序逻辑 ✅
- [x] 添加排序状态（sortColumn, sortOrder）
- [x] 监听排序变化，自动刷新数据
- [x] 实现点击表头排序逻辑（ASC → DESC → 无）

### Task 3.4: 排序状态持久化 ✅
- [x] 切换表时重置排序状态（id DESC）
- [x] 翻页时保持排序状态
- [x] 重置筛选时保持排序状态

## Phase 4: 优化和文档

### Task 4.1: 响应式适配 ✅
- [x] JSON 弹窗移动端适配（宽度 95%，最大高度 80%）
- [x] 筛选面板移动端适配（垂直布局）
- [x] 筛选按钮移动端全宽显示

### Task 4.2: 可访问性 ✅
- [x] JSON 弹窗支持 Escape 关闭
- [x] JSON 弹窗点击遮罩关闭
- [x] 按钮有 hover 状态

### Task 4.3: 文档更新 ⏳
- [ ] 更新 CLAUDE.md，添加新功能说明
- [ ] 更新 database-management 规格的 Purpose
- [ ] 添加组件使用示例

## Dependencies

- Task 1.5 依赖 Task 1.1 - 1.4 ✅
- Task 2.6 依赖 Task 2.1 - 2.5 ✅
- Task 3.3 依赖 Task 3.1 - 3.2 ✅

## Parallelizable Work

- Phase 1（JsonViewer）和 Phase 2（FilterPanel）✅ 并行开发完成
- Task 2.1 - 2.4（前端组件）和 Task 2.5（后端 API）✅ 并行开发完成
- Task 3.1（前端组件）和 Task 3.2（后端 API）✅ 并行开发完成
