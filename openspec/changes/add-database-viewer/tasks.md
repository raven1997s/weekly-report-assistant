# Implementation Tasks

## 1. 后端 API 开发

- [ ] 1.1 在 `server/api.js` 中添加 `GET /api/database/tables` 接口
  - 查询所有表名（排除 `sqlite_%` 系统表）
  - 使用 `PRAGMA table_info()` 获取表结构
  - 查询每个表的行数
  - 返回表信息数组（name, columns, rowCount）

- [ ] 1.2 在 `server/api.js` 中添加 `GET /api/database/table/:tableName` 接口
  - 白名单验证表名（只允许 4 个系统表）
  - 支持分页参数（page, pageSize）
  - 支持搜索参数（search）
  - 使用 `LIKE %keyword%` 模糊匹配文本字段
  - 返回表数据、列名、分页信息

- [ ] 1.3 测试后端 API
  - 使用 curl 测试 `/api/database/tables`
  - 使用 curl 测试 `/api/database/table/records`
  - 使用 curl 测试搜索功能
  - 验证 SQL 注入防护（尝试恶意表名）

## 2. 前端页面开发

- [ ] 2.1 创建 `src/views/DatabaseView.vue` 主页面
  - 页面头部（标题 + 说明）
  - 表切换器（Tab 样式，显示表名和行数）
  - 搜索栏（SVG 图标 + 输入框）
  - 集成 DataTable 组件
  - Toast 提示功能
  - 搜索防抖（500ms）

- [ ] 2.2 创建 `src/components/DataTable.vue` 数据表格组件
  - 加载状态（Spinner + 提示文字）
  - 空状态（SVG 图标 + 提示文字）
  - 表格头部（固定表头，sticky）
  - 表格内容（hover 效果）
  - 分页器（上一页/下一页 + 页码信息）
  - 集成 CellContent 组件

- [ ] 2.3 创建 `src/components/CellContent.vue` 单元格内容组件
  - JSON 字段识别和格式化显示
  - JSON 折叠/展开功能
  - 长文本字段截断/展开
  - 日期字段格式化（LocaleString）
  - 布尔字段显示（是/否 + 样式）
  - 普通字段显示

## 3. 路由和导航

- [ ] 3.1 在 `src/router/index.js` 中添加路由
  - 路径: `/database`
  - 组件: `DatabaseView.vue`
  - 元信息: title = '数据库管理'

- [ ] 3.2 在 `src/components/layout/AppSidebar.vue` 中添加菜单
  - 在 `navRoutes` 数组中添加路由对象
  - 添加数据库图标（SVG）
  - 验证菜单显示和点击跳转

## 4. 样式和响应式

- [ ] 4.1 实现统一样式
  - 使用 `.page-header` 样式
  - 使用项目 SCSS 变量（颜色、间距、圆角等）
  - 禁止使用表情符号，全部使用 SVG 图标

- [ ] 4.2 实现响应式设计
  - 添加 `@media (max-width: $breakpoint-md)` 断点
  - 移动端优化：
    - 表切换器横向滚动
    - 表格列宽调整
    - 分页器垂直布局

## 5. 测试和验证

- [ ] 5.1 功能测试
  - [ ] 表切换功能（点击 Tab 切换不同表）
  - [ ] 数据展示（检查表格是否正确显示数据）
  - [ ] 分页功能（测试上一页/下一页）
  - [ ] 搜索功能（输入关键词测试搜索）
  - [ ] JSON 字段（点击展开按钮查看 JSON 内容）
  - [ ] 长文本字段（测试截断和展开）
  - [ ] 日期字段（验证格式化显示）
  - [ ] 布尔字段（验证是/否显示）

- [ ] 5.2 边界情况测试
  - [ ] 空表（没有数据的表）
  - [ ] 搜索无结果
  - [ ] 超长文本字段
  - [ ] 无效的 JSON 字段
  - [ ] 网络错误处理

- [ ] 5.3 响应式测试
  - [ ] 桌面端（1280px+）
  - [ ] 平板端（768px - 1279px）
  - [ ] 移动端（< 768px）

- [ ] 5.4 安全性测试
  - [ ] 尝试访问系统表（如 `sqlite_master`）
  - [ ] 尝试 SQL 注入（如 `records; DROP TABLE records--`）
  - [ ] 验证只读查询（确保无修改数据的接口）

## 6. 文档更新

- [ ] 6.1 更新 `CLAUDE.md`
  - 添加"数据库管理"相关说明
  - 更新"关键文件位置索引"
  - 更新版本号和日期

## 依赖关系

- 任务 1 和任务 2 可以并行开发
- 任务 3 依赖任务 2.1 完成（需要组件文件存在）
- 任务 4 可以与任务 2 并行开发
- 任务 5 依赖任务 1-4 全部完成
- 任务 6 在所有功能实现后进行

## 可并行化任务

- **组 1**: 1.1-1.3（后端 API）
- **组 2**: 2.1-2.3（前端组件）
- **组 3**: 4.1-4.2（样式开发，可与组件开发并行）

## 验收标准

- [ ] 所有功能测试通过
- [ ] 所有边界情况测试通过
- [ ] 响应式测试通过（桌面端、平板端、移动端）
- [ ] 安全性测试通过
- [ ] 遵循项目 UI 规范（无表情符号、统一样式）
- [ ] API 响应格式统一（{ success, data?, error? }）
- [ ] 文档已更新
