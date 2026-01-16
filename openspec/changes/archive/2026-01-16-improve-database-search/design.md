# Design: 改进数据库管理页面的搜索和查看体验

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DatabaseView                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Table Tabs  │  │ Filter Button│  │        Search          │ │
│  └─────────────┘  └──────┬───────┘  └────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│                  ┌─────────────────┐                             │
│                  │  FilterPanel    │                             │
│                  │  (条件筛选)      │                             │
│                  └─────────────────┘                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   DataTable                               │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │ Header (Click to Sort)                          │     │ │
│  │  ├─────────────────────────────────────────────────┤     │ │
│  │  │ Row 1 │ JSON │ Date │ Boolean │ ...             │     │ │
│  │  │ Row 2 │ JSON │ Date │ Boolean │ ...             │     │ │
│  │  └─────────────────────────────────────────────────┘     │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Pagination                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     JsonViewer (Modal)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  {                                                       │   │
│  │    "content": "完成工作",                                │   │
│  │    "project": "WMS",                                     │   │
│  │    "nested": { ▼                                         │   │
│  │      "key": "value"                                      │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌───────────┐  ┌───────────┐                                 │
│  │   复制    │  │    关闭   │                                 │
│  └───────────┘  └───────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. JsonViewer Component

**职责**: 在模态弹窗中展示 JSON 数据，支持语法高亮、折叠/展开、复制

**Props**:
```typescript
{
  modelValue: boolean,    // 控制弹窗显示/隐藏
  data: any,              // JSON 数据
  title?: string          // 弹窗标题（可选）
}
```

**Events**:
```typescript
{
  'update:modelValue': (value: boolean) => void
}
```

**核心功能**:
- 递归渲染 JSON 结构，支持折叠/展开嵌套对象
- 语法高亮（字符串、数字、布尔值、null 使用不同颜色）
- 一键复制 JSON 到剪贴板
- 搜索高亮（Ctrl+F）

**样式设计**:
- 弹窗 z-index: 1050（低于 Toast 的 1070）
- 使用等宽字体（`$font-family-mono`）
- 折叠/展开图标使用 SVG
- 层级缩进 20px

### 2. FilterPanel Component

**职责**: 根据字段类型动态生成筛选器，支持多条件组合

**Props**:
```typescript
{
  columns: Array<{        // 表格列信息
    name: string,
    type: string,
    label?: string
  }>,
  modelValue: {           // 筛选条件
    [column: string]: any
  }
}
```

**Events**:
```typescript
{
  'update:modelValue': (filters: object) => void,
  'reset': () => void
}
```

**筛选器类型**:
- **文本字段**: 输入框 + 模糊匹配
- **日期字段**: 日期范围选择器（开始日期 ~ 结束日期）
- **布尔字段**: 下拉选择（全部/是/否）

**交互设计**:
- 默认隐藏，点击"筛选"按钮后展开
- 每个字段一行，左侧显示字段名，右侧显示筛选器
- 提供"添加筛选条件"按钮，动态添加新的筛选行
- 提供"重置"按钮，清空所有筛选条件
- 提供"应用"按钮，触发筛选

### 3. DataTable Component 增强

**新增功能**:
- 表头点击排序
- 排序状态显示（升序/降序箭头）
- 排序优先级显示（如"1、2、3"）

**Props 扩展**:
```typescript
{
  sortColumn?: string,     // 当前排序列
  sortOrder?: 'asc' | 'desc',  // 排序方向
  sortPriority?: number[]  // 排序优先级（多列排序）
}
```

**Events 扩展**:
```typescript
{
  'sortChange': (column: string, order: 'asc' | 'desc') => void
}
```

## API Design

### GET /api/database/table/:tableName

**新增查询参数**:

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `filters[column]` | object | 筛选条件，键为列名，值为筛选值 | `filters[project]=WMS&filters[deleted]=0` |
| `filters[column][start]` | string | 日期范围筛选（开始） | `filters[createdAt][start]=2026-01-01` |
| `filters[column][end]` | string | 日期范围筛选（结束） | `filters[createdAt][end]=2026-01-31` |
| `sort` | string | 排序列（支持多列，逗号分隔） | `sort=createdAt,desc` |
| `sort[column]` | string | 排序方向（asc/desc） | `sort[createdAt]=desc&sort[id]=asc` |

**后端实现要点**:
```javascript
// 构建筛选条件
const conditions = []
const params = []

for (const [column, value] of Object.entries(filters)) {
  if (value.start !== undefined) {
    // 日期范围筛选
    conditions.push(`${column} >= ?`)
    params.push(value.start)
    conditions.push(`${column} <= ?`)
    params.push(value.end)
  } else if (value !== '') {
    // 模糊匹配
    conditions.push(`${column} LIKE ?`)
    params.push(`%${value}%`)
  }
}

// 构建排序
const orderBy = []
for (const [column, direction] of Object.entries(sort)) {
  orderBy.push(`${column} ${direction.toUpperCase()}`)
}

const sql = `
  SELECT * FROM ${tableName}
  ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
  ${orderBy.length ? 'ORDER BY ' + orderBy.join(', ') : ''}
  LIMIT ? OFFSET ?
`
```

## Data Flow

### 筛选流程

```
用户输入筛选条件
    │
    ▼
FilterPanel 发出 update:modelValue 事件
    │
    ▼
DatabaseView 更新 filters 状态
    │
    ▼
fetchTableData() 将 filters 序列化为 URL 参数
    │
    ▼
GET /api/database/table/:tableName?filters[...]=...
    │
    ▼
后端解析参数，构建 SQL 查询
    │
    ▼
返回筛选后的数据
    │
    ▼
DataTable 渲染新数据
```

### 排序流程

```
用户点击表头
    │
    ▼
DataTable 发出 sortChange 事件
    │
    ▼
DatabaseView 更新 sortColumn 和 sortOrder
    │
    ▼
fetchTableData() 将排序信息序列化为 URL 参数
    │
    ▼
GET /api/database/table/:tableName?sort[...]=...
    │
    ▼
后端解析参数，构建 ORDER BY 子句
    │
    ▼
返回排序后的数据
    │
    ▼
DataTable 渲染新数据并更新表头图标
```

### JSON 查看流程

```
用户点击 JSON 字段
    │
    ▼
CellContent 发出 showJson 事件
    │
    ▼
DatabaseView 设置 jsonViewerData 和 showJsonViewer
    │
    ▼
JsonViewer 弹窗显示
    │
    ▼
用户操作（折叠/展开/复制）
    │
    ▼
用户点击关闭按钮
    │
    ▼
showJsonViewer = false，弹窗隐藏
```

## State Management

### DatabaseView 新增状态

```javascript
const filters = ref({})           // 筛选条件 { column: value }
const showFilterPanel = ref(false) // 筛选面板显示状态
const sortColumn = ref('')         // 当前排序列
const sortOrder = ref(null)        // 排序方向 (null | 'asc' | 'desc')
const jsonViewerData = ref(null)   // 当前查看的 JSON 数据
const showJsonViewer = ref(false)  // JSON 弹窗显示状态
```

### 状态与 UI 同步

```javascript
// 筛选条件变化时自动刷新
watch(filters, () => {
  pagination.value.page = 1  // 重置到第一页
  fetchTableData()
}, { deep: true })

// 排序变化时自动刷新
watch([sortColumn, sortOrder], () => {
  fetchTableData()
})
```

## Implementation Phases

### Phase 1: JSON 弹窗查看器

1. 创建 `JsonViewer.vue` 组件
2. 实现 JSON 递归渲染和语法高亮
3. 实现折叠/展开功能
4. 实现"复制 JSON"按钮
5. 修改 `CellContent.vue`，点击 JSON 字段打开弹窗

### Phase 2: 高级筛选面板

1. 创建 `FilterPanel.vue` 组件
2. 实现动态筛选器生成（根据字段类型）
3. 实现多条件添加/删除
4. 实现重置和应用功能
5. 修改后端 API，支持筛选参数
6. 修改 `DatabaseView.vue`，集成筛选面板

### Phase 3: 列排序功能

1. 修改 `DataTable.vue`，添加表头点击事件
2. 实现排序状态显示（箭头图标）
3. 修改后端 API，支持排序参数
4. 修改 `DatabaseView.vue`，处理排序逻辑

### Phase 4: 优化和文档

1. 添加加载状态优化
2. 更新 CLAUDE.md 文档
3. 添加响应式样式适配
4. 测试边界情况（空数据、大数据量）

## Trade-offs

### 1. 前端筛选 vs 后端筛选

**选择**: 后端筛选

**原因**:
- 数据量可能很大，前端筛选性能差
- 需要支持分页，筛选必须在分页前进行
- 后端筛选可以优化 SQL 查询（使用索引）

**代价**: 需要修改后端 API，增加参数解析逻辑

### 2. 单列排序 vs 多列排序

**选择**: 单列排序（预留多列排序扩展）

**原因**:
- 单列排序满足 90% 的使用场景
- 多列排序增加交互复杂度
- 预留扩展接口，未来可添加

**代价**: 需要在代码中设计可扩展的排序逻辑

### 3. 内联筛选 vs 独立面板

**选择**: 独立面板（默认隐藏）

**原因**:
- 保持界面简洁
- 不影响表格宽度
- 支持复杂筛选条件

**代价**: 需要额外的展开/收起动画

## Performance Considerations

### JSON 渲染优化

- 大 JSON（>100KB）延迟渲染，使用虚拟滚动
- 默认折叠所有嵌套层级，按需展开
- 限制最大展开深度（如 5 层）

### SQL 查询优化

- 为常用筛选字段添加索引（如 `deleted`, `createdAt`）
- 使用参数化查询防止 SQL 注入
- 限制每页最大记录数（如 100 条）

### 防抖优化

- 筛选输入使用 500ms 防抖
- 排序点击不使用防抖（立即响应）
- 表头节流（防止快速连续点击）

## Accessibility

- 键盘导航支持（Tab 切换筛选器，Enter 应用）
- 筛选条件正确设置 aria-label
- JSON 弹窗支持 Escape 关闭
- 排序状态添加屏幕阅读器提示
