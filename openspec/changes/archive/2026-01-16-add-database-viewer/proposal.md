# Change: 添加数据库管理页面

## Why

当前项目使用 SQLite 数据库存储数据，但数据库是"黑盒"状态。用户无法直接在 Web 界面中查看和管理数据，只能通过命令行或第三方工具（如 SQLite Browser）访问数据库。这降低了开发调试效率，也使得非技术用户无法了解数据存储情况。

## What Changes

- 添加数据库管理页面 `/database`，提供只读数据查看功能
- 新增后端 API 接口：
  - `GET /api/database/tables` - 获取所有表信息和结构
  - `GET /api/database/table/:tableName` - 获取表数据（支持分页和搜索）
- 新增前端组件：
  - `DatabaseView.vue` - 主页面
  - `DataTable.vue` - 数据表格组件
  - `CellContent.vue` - 单元格内容组件（支持 JSON 格式化显示）
- 在侧边栏添加"数据库管理"菜单入口
- 支持功能：
  - 表切换（Tab 切换）
  - 数据搜索（模糊匹配文本字段）
  - 分页浏览（默认每页 20 条）
  - JSON 字段格式化显示（可折叠/展开）
  - 长文本字段截断显示
  - 日期字段格式化
  - 布尔字段显示（是/否）

## Impact

- **Affected specs**: 新增 `database-management` 规格
- **Affected code**:
  - `server/api.js` - 添加 2 个新的 API 端点
  - `src/router/index.js` - 添加路由配置
  - `src/components/layout/AppSidebar.vue` - 添加侧边栏菜单
  - `src/views/DatabaseView.vue` - 新建主页面
  - `src/components/DataTable.vue` - 新建数据表格组件
  - `src/components/CellContent.vue` - 新建单元格内容组件

## Security Considerations

- 只读查询，不提供任何修改数据的接口
- SQL 注入防护：白名单验证表名，只允许访问 4 个系统表
- 参数化查询，防止 SQL 注入
- 数据访问无权限控制（所有人可访问）

## Performance Considerations

- 分页查询避免一次性加载大量数据
- 搜索防抖（500ms）减少请求频率
- 使用数据库索引优化查询性能
