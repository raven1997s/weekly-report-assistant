# 提案：修复多个 UI 和功能 Bug

## 概述

本提案旨在修复智能周报助手项目中存在的 7 个 Bug，涉及周报预览排序、文件名生成、按钮图标、不可编辑状态、弹窗位置、搜索功能和回收站数据显示等问题。

## Why

这些 Bug 影响了用户体验和数据完整性：

1. **周报排序问题**导致用户生成的周报格式不符合规范，影响专业性
2. **文件名问题**导致用户无法快速识别下载的周报文件
3. **按钮图标错误**影响用户对功能的理解和操作
4. **不可编辑状态不清晰**导致用户尝试编辑系统任务，产生困惑
5. **弹窗位置问题**导致用户无法确认操作，功能无法使用
6. **搜索功能受限**影响用户在数据库中查找特定数据的能力
7. **回收站数据显示问题**可能导致数据永久丢失，影响用户信任

修复这些 Bug 是提升产品质量和用户满意度的必要步骤。

## 问题陈述

### Bug 1：周报预览页面排序规则未生效

**位置**：`src/composables/useGenerator.js`

**问题描述**：
- 下周计划在生成周报时没有按照优先级排序
- "其他"标签可能出现在中间位置，而不是最后

**根本原因**：
- `generateMarkdown()` 和 `generatePlainText()` 函数中，下周计划部分确实调用了 `sortByPriority()`
- 但 `generateReport()` 返回的 `plans` 字段直接使用了输入的 `plans`，没有先排序

**影响**：
- 用户查看周报预览时，下周计划的顺序不符合规范
- 导出和复制的周报中，下周计划顺序混乱

### Bug 2：周报下载文件名显示"未知"

**位置**：`src/components/ReportPreview.vue`

**问题描述**：
- 点击"下载文件"按钮时，文件名显示为 `周报_未知.md`
- 原因是 `weekLabel` 字段可能不存在

**根本原因**：
- `download()` 函数使用 `props.report.weekLabel || '未知'`
- 但 `report` 对象是动态生成的，可能没有 `weekLabel` 字段

**影响**：
- 下载的文件名不直观，无法快速识别周报

### Bug 3：设置页面删除按钮图标错误

**位置**：`src/views/SettingsView.vue`

**问题描述**：
- 项目管理和工作类型的删除按钮显示的是"+"号图标
- 应该显示垃圾桶/删除图标

**根本原因**：
- 第 46-50 行和第 80-84 行使用了错误的 SVG 路径
- `path.fill-rule="evenodd" d="M8.5 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5a.5.5 0 01.5-.5z"` 是加号路径

**影响**：
- UI 语义混乱，用户体验差

### Bug 4：定时任务配置不可编辑状态不正确

**位置**：`src/views/SettingsView.vue`

**问题描述**：
- 系统任务应该在整个卡片上显示不可编辑状态（鼠标悬停时显示 `not-allowed` 光标）
- 当前只有删除按钮悬停时才显示不可编辑状态

**根本原因**：
- `task-info` div 的 `:class="{ 'no-pointer': task.isSystemTask }"` 添加了 `no-pointer` 类
- 但 CSS 中 `.no-pointer` 只设置 `cursor: default`，悬停效果在 `&:hover:not(.no-pointer)` 中
- 系统任务需要在整个卡片区域显示 `cursor: not-allowed`

**影响**：
- 用户不清楚系统任务不可编辑
- 可能尝试点击编辑，导致混淆

### Bug 5：工作记录移到下周计划弹窗位置错误

**位置**：`src/views/ReportView.vue` 和 `src/components/RecordList.vue`

**问题描述**：
- 从工作记录页面点击"移到下周计划"，弹窗却出现在生成周报页面
- 用户可能不在周报页面，看不到弹窗

**根本原因**：
- `ConfirmDialog` 是全局组件（通过 `dialogStore` 管理）
- 无论在哪个页面触发，弹窗都会显示在当前激活的页面
- 用户在 HomeView（工作记录页面）操作，但弹窗显示在当前路由页面

**影响**：
- 用户看不到确认弹窗，操作失败
- 可能误认为功能不工作

### Bug 6：数据库管理页面无法条件过滤

**位置**：`src/views/DatabaseView.vue`

**问题描述**：
- 搜索功能只支持模糊搜索（对所有文本字段进行 LIKE 匹配）
- 无法按特定列/字段进行条件过滤（如只搜索 deleted=1 的记录）

**根本原因**：
- 前端只传递一个 `search` 参数
- 后端 `GET /api/database/table/:tableName` 对所有字段进行 LIKE 查询
- 没有按列过滤的功能

**影响**：
- 无法精确查询数据（如查看所有已删除的记录）
- 搜索结果可能包含大量不相关的数据

### Bug 7：回收站已删除数据显示不完整

**位置**：`src/views/RecycleBinView.vue`

**问题描述**：
- 已删除的工作记录列表可能不会显示所有已删除的记录
- 已删除的周报列表也可能有同样问题

**根本原因**：
- `fetchDeletedData()` 调用 `recordsStore.fetchDeletedRecords()`
- `deletedRecords` 通过 `storeToRefs` 绑定，理论上应该自动更新
- 但可能是 API 返回的数据不完整，或前端过滤导致部分记录未显示

**影响**：
- 用户无法在回收站看到所有已删除的数据
- 可能导致数据永久丢失（用户以为已删除）

## 提案目标

### 主要目标

1. **修复周报预览排序问题**：确保下周计划按优先级排序，[其他] 标签始终在最后
2. **修复下载文件名问题**：确保文件名正确显示周标签
3. **修复删除按钮图标**：将"+"号替换为垃圾桶图标
4. **修复定时任务不可编辑状态**：系统任务在整个卡片区域显示 `not-allowed` 光标
5. **修复弹窗位置问题**：确保弹窗显示在触发操作的页面
6. **增强数据库管理搜索**：支持按列过滤和条件查询
7. **修复回收站数据显示**：确保所有已删除记录都正确显示

### 次要目标

- 确保所有修复符合项目的 UI 规范（禁止表情符号、统一页面容器样式等）
- 更新 CLAUDE.md 文档，记录这些 bug 的解决方案
- 添加相关的代码注释，避免重复犯错

## 实现方案

### Bug 1 修复方案

**文件**：`src/composables/useGenerator.js`

**修改**：
```javascript
// 在 generateReport() 中，对 plans 先排序再返回
const generateReport = ({ records = [], plans = [], reflections = {} }) => {
    return {
        markdown: generateMarkdown({ records, plans, reflections }),
        plainText: generatePlainText({ records, plans, reflections }),
        records: [...records],
        plans: sortByPriority([...plans]),  // 添加排序
        reflections: { ...reflections },
        generatedAt: new Date().toISOString()
    }
}
```

### Bug 2 修复方案

**文件**：`src/components/ReportPreview.vue`

**修改**：
```javascript
// 生成 weekLabel，确保始终有值
const previewTitle = computed(() => {
  // 如果 report 有 weekLabel，使用它；否则根据当前日期生成
  const label = props.report.weekLabel || formatDate(new Date(), 'YYYY年第W周')
  return `周报 - ${label}`
})

// 下载时使用 previewTitle
const download = () => {
  const content = props.report.markdown || '# 周报\n\n暂无内容'
  // 从 previewTitle 提取 weekLabel 部分
  const label = props.report.weekLabel || formatDate(new Date(), 'YYYY年第W周')
  const filename = `周报_${label}.md`
  downloadReport(content, filename)
  showToast('已开始下载')
}
```

### Bug 3 修复方案

**文件**：`src/views/SettingsView.vue`

**修改**：替换第 46-50 行和第 80-84 行的 SVG 路径

```html
<!-- 删除按钮（垃圾桶图标） -->
<button class="btn-icon delete" @click="deleteProject(project.id)">
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M8.25 7.638a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v-1.5zm3.75 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" clip-rule="evenodd"/>
    <path d="M5.5 4h9a.5.5 0 01.5.5v1h-10v-1a.5.5 0 01.5-.5zm-2 2h13v8.5a2.5 2.5 0 01-2.5 2.5h-6a2.5 2.5 0 01-2.5-2.5v-8.5zM7 7a1 1 0 012 0v6a1 1 0 11-2 0v-6zm4 0a1 1 0 012 0v6a1 1 0 11-2 0v-6z"/>
  </svg>
</button>
```

### Bug 4 修复方案

**文件**：`src/views/SettingsView.vue`

**修改**：
1. 修改模板中的 `task-item` class 绑定
2. 修改 CSS 样式

```vue
<!-- 模板修改 -->
<div
  v-for="task in scheduledTasks"
  :key="task.id"
  class="task-item"
  :class="{
    'system-task': task.isSystemTask,
    'not-allowed': task.isSystemTask
  }"
>
```

```scss
// CSS 修改
.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  transition: all $transition-fast;

  // 新增：系统任务显示 not-allowed 光标
  &.not-allowed {
    cursor: not-allowed !important;

    .task-info {
      cursor: not-allowed !important;
    }
  }

  &.system-task {
    background: rgba($accent-primary, 0.03);
    border-color: rgba($accent-primary, 0.2);
  }

  // 其他样式保持不变...
}
```

### Bug 5 修复方案

**文件**：`src/views/ReportView.vue` 和 `src/stores/dialog.js`

**问题描述分析**：
- `ConfirmDialog` 使用 Teleport 或 fixed 定位，始终显示在最上层
- 问题不在弹窗位置，而在用户可能在 HomeView 页面操作，但看不到弹窗

**解决方案**：
1. 在 HomeView 中也添加 ConfirmDialog 组件（确保弹窗可见）
2. 或者在操作成功后添加 Toast 提示，让用户知道操作已完成

**推荐方案**：
在 `src/views/HomeView.vue` 中添加 ConfirmDialog 组件：

```vue
<template>
  <div class="home-view page-container">
    <!-- 现有内容... -->

    <!-- 添加确认弹窗 -->
    <ConfirmDialog
      v-model:show="dialogStore.confirmShow"
      :title="dialogStore.confirmTitle || '确认'"
      :message="dialogStore.confirmMessage"
      :details="dialogStore.confirmDetails"
      @confirm="dialogStore.confirmHandle(true)"
      @cancel="dialogStore.confirmHandle(false)"
    />
  </div>
</template>

<script setup>
// 现有 imports...
import { useDialogStore } from '../stores/dialog'
import ConfirmDialog from '../components/ConfirmDialog.vue'

// 添加 dialogStore
const dialogStore = useDialogStore()
</script>
```

### Bug 6 修复方案

**文件**：`src/views/DatabaseView.vue` 和 `server/api.js`

**前端修改**：
添加过滤条件选择器：

```vue
<template>
  <div class="database-view page-container">
    <!-- 现有内容... -->

    <!-- 搜索栏（增强版） -->
    <div class="search-bar">
      <svg class="search-icon" ...>...</svg>
      <select v-model="filterColumn" class="filter-select">
        <option value="">全部字段</option>
        <option v-for="col in searchableColumns" :key="col.name" :value="col.name">
          {{ col.label || col.name }}
        </option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索数据..."
        class="search-input"
      />
    </div>

    <!-- 数据表格... -->
  </div>
</template>

<script setup>
const filterColumn = ref('')

const searchableColumns = computed(() => {
  return columns.value.filter(col =>
    col.type === 'TEXT' || col.type === 'text'
  )
})

// 修改 API 调用
const fetchTableData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchQuery.value,
      column: filterColumn.value  // 添加列过滤
    })

    const response = await fetch(`/api/database/table/${currentTable.value}?${params}`)
    // ...
  }
}
</script>

<style lang="scss" scoped>
.search-bar {
  position: relative;
  margin-bottom: $spacing-6;
  display: flex;
  gap: $spacing-3;

  .filter-select {
    padding: $spacing-3 $spacing-4;
    font-size: $font-size-sm;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    color: var(--text-primary);
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }

  .search-input {
    flex: 1;
    // 其他样式...
  }
}
</style>
```

**后端修改**：
在 `server/api.js` 中添加列过滤支持：

```javascript
// GET /api/database/table/:tableName
app.get('/api/database/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params
    const { page = 1, pageSize = 20, search = '', column = '' } = req.query

    // 白名单验证...
    const db = await createDbConnection()

    // 获取表结构和数据
    let sql = `SELECT * FROM ${tableName}`
    const params = []

    // 构建搜索条件
    if (search) {
      if (column) {
        // 按指定列搜索
        sql += ` WHERE ${column} LIKE ?`
        params.push(`%${search}%`)
      } else {
        // 全部字段搜索（原有逻辑）
        const tableInfo = await db.all(`PRAGMA table_info(${tableName})`)
        const textColumns = tableInfo
          .filter(col => col.type.toUpperCase().includes('TEXT') || col.type.toUpperCase().includes('CHAR'))
          .map(col => col.name)

        if (textColumns.length > 0) {
          const conditions = textColumns.map(() => `${tableName}.${columnName} LIKE ?`).join(' OR ')
          sql += ` WHERE ${conditions}`
          textColumns.forEach(() => params.push(`%${search}%`))
        }
      }
    }

    sql += ` ORDER BY rowid DESC LIMIT ? OFFSET ?`
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))

    const rows = await db.all(sql, params)
    // ...
  } catch (error) {
    // ...
  }
})
```

### Bug 7 修复方案

**文件**：`src/views/RecycleBinView.vue` 和 `src/stores/records.js`

**问题分析**：
- `deletedRecords` 通过 `storeToRefs` 绑定
- `fetchDeletedRecords()` 返回数据并赋值给 `deletedRecords.value`
- 可能是 API 返回数据不完整

**解决方案**：
1. 检查 API 是否正确返回所有已删除记录
2. 检查前端是否有额外的过滤逻辑

**前端检查**：
确认 `fetchDeletedData()` 正确处理返回数据：

```javascript
// 获取已删除的数据
const fetchDeletedData = async () => {
  await Promise.all([
    reportsStore.fetchDeletedReports().then(data => {
      deletedReports.value = data || []
      console.log('[回收站] 已删除周报:', deletedReports.value.length)
    }),
    recordsStore.fetchDeletedRecords().then(data => {
      // deletedRecords 已通过 storeToRefs 绑定，但确保赋值
      console.log('[回收站] 已删除记录:', recordsStore.deletedRecords.length)
    })
  ])
}
```

**后端检查**：
确认 `GET /api/records?deleted=1` 和 `GET /api/reports?deleted=1` 正确返回数据：

```javascript
// server/api.js
app.get('/api/records', async (req, res) => {
  try {
    const { deleted = '0' } = req.query
    const db = await createDbConnection()

    const records = await queryAll(
      db,
      `SELECT * FROM records WHERE deleted = ? ORDER BY deletedAt DESC`,
      [deleted === '1' ? 1 : 0]
    )

    db.close()
    res.json({ success: true, data: records })
  } catch (error) {
    console.error('[API] 获取记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

## 影响分析

### 兼容性影响

- **无破坏性变更**：所有修改都是修复现有功能，不影响现有接口
- **数据兼容**：不需要数据库迁移或数据转换
- **API 兼容**：新增的列过滤参数是可选的，不影响现有调用

### 性能影响

- **周报排序**：增加一次 `sortByPriority()` 调用，影响可忽略
- **数据库搜索**：列过滤可能减少搜索范围，提高性能
- **回收站查询**：无性能影响

### 安全影响

- **SQL 注入防护**：列过滤需要使用参数化查询或白名单验证
- **白名单验证**：确保 `column` 参数只允许有效的列名

## 依赖关系

### 内部依赖

- Bug 5 修复依赖于 `dialogStore` 和 `ConfirmDialog` 组件
- Bug 6 修复需要后端 API 支持列过滤
- Bug 7 修复需要确认后端 API 正确返回数据

### 外部依赖

- 无外部依赖变化

## 回滚计划

每个 bug 修复都是独立的，可以单独回滚：

1. **Bug 1**：移除 `sortByPriority()` 调用
2. **Bug 2**：恢复原来的 `weekLabel || '未知'` 逻辑
3. **Bug 3**：恢复原来的"+"号 SVG 路径
4. **Bug 4**：移除 `not-allowed` class 和相关样式
5. **Bug 5**：从 HomeView 移除 ConfirmDialog 组件
6. **Bug 6**：移除列过滤选择器和后端参数处理
7. **Bug 7**：恢复原来的数据处理逻辑

## 验收标准

### Bug 1：周报预览排序
- [ ] 下周计划按优先级排序（项目明确+类型明确 → 只有项目明确 → 只有类型明确 → 都是其他）
- [ ] [其他] 标签始终显示在最后
- [ ] 复制和下载的周报也符合排序规则

### Bug 2：下载文件名
- [ ] 下载的文件名正确显示周标签（如 `周报_2026年第03周.md`）
- [ ] 如果是历史周报，使用归档时的 weekLabel
- [ ] 如果是当前周报，使用当前日期的周标签

### Bug 3：删除按钮图标
- [ ] 项目管理的删除按钮显示垃圾桶图标
- [ ] 工作类型的删除按钮显示垃圾桶图标
- [ ] 图标颜色正确（悬停时变红色）

### Bug 4：定时任务不可编辑状态
- [ ] 系统任务在整个卡片区域显示 `not-allowed` 光标
- [ ] 非系统任务保持可点击状态
- [ ] 系统任务的背景色和边框样式正确

### Bug 5：弹窗位置
- [ ] 从工作记录页面点击"移到下周计划"，弹窗可见
- [ ] 确认后操作成功执行
- [ ] 操作完成后显示 Toast 提示

### Bug 6：数据库搜索增强
- [ ] 可以选择特定列进行搜索
- [ ] 可以选择"全部字段"进行模糊搜索
- [ ] 搜索结果正确显示
- [ ] 后端正确处理列参数（SQL 注入防护）

### Bug 7：回收站数据显示
- [ ] 回收站显示所有已删除的工作记录
- [ ] 回收站显示所有已删除的周报
- [ ] 数量徽章正确显示
- [ ] 恢复和永久删除功能正常工作

## 时间估算

| Bug | 估算工作量 | 优先级 |
|-----|-----------|--------|
| Bug 1：排序问题 | 30 分钟 | 高 |
| Bug 2：文件名问题 | 30 分钟 | 中 |
| Bug 3：按钮图标 | 15 分钟 | 低 |
| Bug 4：不可编辑状态 | 30 分钟 | 中 |
| Bug 5：弹窗位置 | 45 分钟 | 高 |
| Bug 6：搜索增强 | 90 分钟 | 中 |
| Bug 7：回收站数据 | 60 分钟 | 高 |

**总计**：约 5 小时

## 风险评估

### 低风险

- Bug 2、Bug 3：纯 UI 修复，风险极低
- Bug 4：CSS 样式修改，风险低

### 中风险

- Bug 1：数据排序逻辑，需要测试验证
- Bug 5：跨组件弹窗，需要确保不影响其他页面
- Bug 6：后端 API 修改，需要 SQL 注入防护

### 高风险

- Bug 7：数据完整性问题，需要仔细测试

### 风险缓解措施

1. 所有修改在开发环境充分测试
2. Bug 6 的列过滤功能使用白名单验证
3. Bug 7 修复后检查数据库中的已删除数据
4. 修复后进行回归测试，确保不影响其他功能

## 后续工作

### 短期（本次修复）

1. 修复所有 7 个 Bug
2. 更新 CLAUDE.md 文档
3. 添加相关代码注释

### 中期（后续优化）

1. 为数据库管理页面添加更多过滤选项（日期范围、数值范围等）
2. 优化回收站的数据加载性能
3. 添加单元测试覆盖这些修复

### 长期（架构改进）

1. 考虑将弹窗组件改为更灵活的定位方式
2. 统一所有列表页面的搜索和过滤 UI
3. 添加更多的错误处理和用户提示
