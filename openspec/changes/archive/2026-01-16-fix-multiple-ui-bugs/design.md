# 设计文档：修复多个 UI 和功能 Bug

## 架构概述

本设计文档描述了 7 个 Bug 的修复方案，这些 Bug 涉及前端组件、状态管理、API 调用和 UI 样式。所有修复都是独立的，可以单独实施和测试。

## 组件架构

### 涉及的组件

```
src/
├── components/
│   ├── ReportPreview.vue          # Bug 2：下载文件名
│   ├── ConfirmDialog.vue          # Bug 5：弹窗位置
│   └── RecordList.vue             # Bug 5：移到下周计划入口
├── composables/
│   └── useGenerator.js            # Bug 1：周报排序
├── stores/
│   ├── records.js                 # Bug 7：回收站数据
│   ├── reports.js                 # Bug 7：回收站数据
│   └── dialog.js                  # Bug 5：弹窗状态管理
├── views/
│   ├── HomeView.vue               # Bug 5：添加弹窗组件
│   ├── ReportView.vue             # Bug 5：移到下周计划逻辑
│   ├── SettingsView.vue           # Bug 3：删除图标, Bug 4：不可编辑状态
│   ├── DatabaseView.vue           # Bug 6：搜索增强
│   └── RecycleBinView.vue         # Bug 7：回收站显示
└── utils/
    └── date.js                    # Bug 2：周标签生成

server/
└── api.js                         # Bug 6：列过滤 API, Bug 7：已删除数据查询
```

## 详细设计

### Bug 1：周报预览排序问题

#### 问题分析

```
当前流程：
useGenerator.generateReport() → 返回 { plans: [...plans] }
                              ↓
ReportPreview.previewReport → 使用未排序的 plans

问题：generateReport() 返回的 plans 没有排序
```

#### 设计方案

```
修复后流程：
useGenerator.generateReport() → 返回 { plans: sortByPriority([...plans]) }
                              ↓
ReportPreview.previewReport → 使用已排序的 plans

关键修改点：
1. generateReport() 中对 plans 调用 sortByPriority()
2. 确保排序不影响原始输入（使用 [...plans] 创建副本）
```

#### 数据流

```
用户输入 plans
    ↓
generateMarkdown({ plans }) ← 内部调用 sortByPriority(plans)
    ↓
generateReport({ plans }) ← 返回时也需要排序
    ↓
previewReport.plans ← 已排序的 plans
    ↓
周报预览显示 ← 正确顺序
```

### Bug 2：下载文件名问题

#### 问题分析

```
当前逻辑：
download() → props.report.weekLabel || '未知'
           ↓
           问题：report 是动态生成的，可能没有 weekLabel 字段
```

#### 设计方案

```
修复后逻辑：
download() → 生成 weekLabel → 使用 formatDate(new Date(), 'YYYY年第W周')
           ↓
           或使用 props.report.weekLabel（如果有）
```

#### 周标签生成规则

```javascript
// 当前周报：使用当前日期生成
formatDate(new Date(), 'YYYY年第W周')  // "2026年第03周"

// 历史周报：使用归档时保存的 weekLabel
report.weekLabel  // 已保存的值

// 边界情况：归档数据没有 weekLabel（旧数据）
→ 使用 weekStart 计算周标签
formatDate(new Date(report.weekStart), 'YYYY年第W周')
```

### Bug 3：删除按钮图标问题

#### 问题分析

```
当前 SVG 路径：M8.5 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5...
                     ↑
                     这是加号（+）的路径
```

#### 设计方案

```
替换为垃圾桶图标 SVG 路径：
<path fill-rule="evenodd" d="M8.25 7.638a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v-1.5zm3.75 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" clip-rule="evenodd"/>
<path d="M5.5 4h9a.5.5 0 01.5.5v1h-10v-1a.5.5 0 01.5-.5zm-2 2h13v8.5a2.5 2.5 0 01-2.5 2.5h-6a2.5 2.5 0 01-2.5-2.5v-8.5zM7 7a1 1 0 012 0v6a1 1 0 11-2 0v-6zm4 0a1 1 0 012 0v6a1 1 0 11-2 0v-6z"/>
```

#### 修改位置

```vue
<!-- src/views/SettingsView.vue -->
<!-- 第 46-50 行：项目管理删除按钮 -->
<!-- 第 80-84 行：工作类型删除按钮 -->
```

### Bug 4：定时任务不可编辑状态问题

#### 问题分析

```
当前 CSS：
.task-info {
  cursor: pointer;
  &.no-pointer {
    cursor: default;  // 只设置 default
  }
  &:hover:not(.no-pointer) {
    background: var(--bg-secondary);
  }
}

问题：系统任务应该显示 not-allowed 光标，而不是 default
```

#### 设计方案

```
修复后 CSS：
.task-item {
  &.not-allowed {
    cursor: not-allowed !important;  // 强制 not-allowed

    .task-info {
      cursor: not-allowed !important;
      &:hover {
        background: transparent !important;  // 禁用悬停效果
      }
    }
  }
}
```

#### 交互状态

```
系统任务：
├── 鼠标悬停（卡片任意位置）→ 显示 not-allowed 光标
├── 点击卡片 → 不触发编辑弹窗
└── 点击开关/删除按钮 → 禁用（disabled）

非系统任务：
├── 鼠标悬停（卡片区域）→ 显示 pointer 光标 + 背景变化
├── 点击卡片 → 触发编辑弹窗
└── 点击开关/删除按钮 → 正常工作
```

### Bug 5：弹窗位置问题

#### 问题分析

```
当前架构：
┌─────────────────────────────────┐
│ ConfirmDialog（全局组件）        │
│ - 使用 dialogStore 管理状态     │
│ - fixed 定位，z-index: 1060      │
│ - 在 ReportView 中注册          │
└─────────────────────────────────┘

问题：
用户在 HomeView 点击"移到下周计划"
    ↓
RecordList 触发 dialogStore.confirm()
    ↓
ConfirmDialog 显示（但用户可能在 HomeView，看不到弹窗）
```

#### 设计方案

```
方案 A：在所有可能触发弹窗的页面都添加 ConfirmDialog
├── HomeView.vue ← 添加
├── ReportView.vue ← 已有
├── SettingsView.vue ← 已有
└── RecycleBinView.vue ← 已有

方案 B：使用 Teleport 确保弹窗始终可见
（当前已使用 fixed 定位，理论上应该可见）

推荐方案 A：确保每个页面都有 ConfirmDialog 组件
```

#### 修改清单

```vue
<!-- src/views/HomeView.vue -->
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
import { useDialogStore } from '../stores/dialog'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const dialogStore = useDialogStore()
</script>
```

### Bug 6：数据库管理搜索增强

#### 问题分析

```
当前功能：
searchQuery → GET /api/database/table/:tableName?search=xxx
           ↓
           后端对所有文本字段进行 LIKE 查询
           ↓
           返回匹配结果

限制：无法按特定列过滤（如只搜索 deleted=1）
```

#### 设计方案

```
增强功能：
filterColumn + searchQuery → GET /api/database/table/:tableName?search=xxx&column=deleted
                         ↓
                         后端按指定列进行精确或模糊查询
                         ↓
                         返回匹配结果
```

#### 前端 UI 设计

```vue
<div class="search-bar">
  <!-- 图标 -->
  <svg class="search-icon">...</svg>

  <!-- 列选择器 -->
  <select v-model="filterColumn" class="filter-select">
    <option value="">全部字段</option>
    <option v-for="col in searchableColumns" :key="col.name" :value="col.name">
      {{ col.label || col.name }}
    </option>
  </select>

  <!-- 搜索输入框 -->
  <input
    v-model="searchQuery"
    type="text"
    :placeholder="filterColumn ? `在 ${getColumnLabel(filterColumn)} 中搜索...` : '搜索数据...'"
    class="search-input"
  />
</div>
```

#### 后端 API 设计

```javascript
// GET /api/database/table/:tableName
// 参数：
// - page: 页码
// - pageSize: 每页数量
// - search: 搜索关键词
// - column: 过滤列名（可选，为空表示全部字段）

// 白名单验证
const TABLE_COLUMNS = {
  records: ['id', 'content', 'project', 'workType', 'createdAt', 'updatedAt', 'deleted', 'deletedAt'],
  reports: ['id', 'weekLabel', 'weekStart', 'weekEnd', 'markdown', 'plainText', 'createdAt', 'updatedAt', 'deleted', 'deletedAt'],
  settings: ['id', 'key', 'value', 'createdAt', 'updatedAt'],
  scheduled_tasks: ['id', 'name', 'type', 'hour', 'minute', 'dayOfWeek', 'enabled', 'isSystemTask', 'createdAt', 'updatedAt']
}

// SQL 构建
if (column) {
  // 验证列名在白名单中
  const allowedColumns = TABLE_COLUMNS[tableName]
  if (!allowedColumns.includes(column)) {
    return res.status(400).json({ success: false, error: '无效的列名' })
  }

  // 按指定列搜索
  sql = `SELECT * FROM ${tableName} WHERE ${column} LIKE ? ORDER BY rowid DESC LIMIT ? OFFSET ?`
  params = [`%${search}%`, pageSize, offset]
} else {
  // 全部字段搜索（原有逻辑）
  const textColumns = TEXT_COLUMNS[tableName]  // 预定义的文本列
  const conditions = textColumns.map(col => `${col} LIKE ?`).join(' OR ')
  sql = `SELECT * FROM ${tableName} WHERE ${conditions} ORDER BY rowid DESC LIMIT ? OFFSET ?`
  params = textColumns.map(() => `%${search}%`).concat([pageSize, offset])
}
```

#### 安全考虑

```
1. SQL 注入防护
   - 使用参数化查询（? 占位符）
   - 列名白名单验证

2. 权限控制
   - 只允许查看白名单中的表
   - 不允许执行任意 SQL

3. 性能优化
   - 为常用搜索列添加索引
   - 限制返回结果数量
```

### Bug 7：回收站数据显示问题

#### 问题分析

```
当前流程：
RecycleBinView.mounted
    ↓
fetchDeletedData()
    ↓
recordsStore.fetchDeletedRecords() → GET /api/records?deleted=1
    ↓
deletedRecords.value = result.data
    ↓
模板循环 v-for="record in deletedRecords"

可能的问题：
1. API 返回数据不完整
2. deletedRecords 绑定问题
3. 模板渲染逻辑问题
```

#### 设计方案

```
排查步骤：
1. 检查 API 返回数据
   - curl http://localhost:3000/api/records?deleted=1
   - 确认返回所有已删除记录

2. 检查 store 逻辑
   - fetchDeletedRecords() 是否正确赋值
   - deletedRecords 是否响应式

3. 检查模板渲染
   - v-for 是否正确绑定
   - 是否有额外的过滤逻辑
```

#### 后端检查

```javascript
// server/api.js
app.get('/api/records', async (req, res) => {
  try {
    const { deleted = '0' } = req.query
    const db = await createDbConnection()

    // 确保查询条件正确
    const deletedFlag = deleted === '1' ? 1 : 0
    const records = await db.all(
      `SELECT * FROM records WHERE deleted = ? ORDER BY deletedAt DESC`,
      [deletedFlag]
    )

    console.log(`[API] 查询 deleted=${deletedFlag} 的记录，找到 ${records.length} 条`)

    db.close()
    res.json({ success: true, data: records })
  } catch (error) {
    console.error('[API] 获取记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

#### 前端检查

```javascript
// src/views/RecycleBinView.vue
const fetchDeletedData = async () => {
  console.log('[回收站] 开始获取已删除数据')

  await Promise.all([
    reportsStore.fetchDeletedReports().then(data => {
      deletedReports.value = data || []
      console.log('[回收站] 已删除周报:', deletedReports.value.length, deletedReports.value)
    }),
    recordsStore.fetchDeletedRecords().then(data => {
      // deletedRecords 已通过 storeToRefs 绑定
      console.log('[回收站] 已删除记录:', recordsStore.deletedRecords.length, recordsStore.deletedRecords)
    })
  ])

  console.log('[回收站] 数据获取完成')
}
```

#### 数据完整性保证

```
1. 软删除标记
   - DELETE /api/records/:id → UPDATE records SET deleted = 1 WHERE id = ?
   - 确保所有删除操作都更新 deleted 字段

2. 查询过滤
   - GET /api/records?deleted=0 → WHERE deleted = 0（正常记录）
   - GET /api/records?deleted=1 → WHERE deleted = 1（已删除记录）

3. 前端同步
   - 删除成功后从列表中移除
   - 恢复成功后重新加载数据
```

## 数据流图

### Bug 1 修复后的数据流

```
用户输入下周计划
    ↓
currentPlans = [
  { project: 'WMS', workType: '需求开发', content: '...' },
  { project: '其他', workType: '其他', content: '...' },
  { project: 'ERP', workType: 'Bug修复', content: '...' }
]
    ↓
generateReport({ records, plans, reflections })
    ↓
sortByPriority(plans)
    ↓
[
  { project: 'WMS', workType: '需求开发', ... },  // 优先级 0
  { project: 'ERP', workType: 'Bug修复', ... },  // 优先级 0
  { project: '其他', workType: '其他', ... }     // 优先级 3
]
    ↓
previewReport.plans（已排序）
    ↓
周报预览显示（正确顺序）
```

### Bug 6 修复后的数据流

```
用户选择列和输入关键词
    ↓
filterColumn = 'deleted'
searchQuery = '1'
    ↓
GET /api/database/table/records?search=1&column=deleted
    ↓
后端验证列名（白名单）
    ↓
构建 SQL：SELECT * FROM records WHERE deleted LIKE '%1%' ORDER BY rowid DESC
    ↓
参数化查询（防止 SQL 注入）
    ↓
返回匹配结果
    ↓
前端显示过滤后的数据
```

## 交互设计

### Bug 4：定时任务不可编辑状态

```
系统任务交互：
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ 🔴 [系统任务] 每周五 15:00 推送 │ │ ← cursor: not-allowed
│ └─────────────────────────────────┘ │
│         [●──]  [🗑️] (禁用)          │
└─────────────────────────────────────┘

非系统任务交互：
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ 📊 我的提醒 每天 09:00          │ │ ← cursor: pointer (hover: 背景变化)
│ └─────────────────────────────────┘ │
│         [●──]  [🗑️]                 │
└─────────────────────────────────────┘
```

### Bug 6：数据库搜索增强

```
搜索栏 UI：
┌──────────────────────────────────────────────────┐
│ 🔍 [全部字段 ▼] [搜索数据...]                  │
└──────────────────────────────────────────────────┘

选择"全部字段"：
→ 对所有文本字段进行 LIKE 查询

选择"deleted"列：
→ 对 deleted 字段进行精确/模糊查询
→ 例如：搜索 "1" → 查找所有已删除记录

选择"project"列：
→ 对 project 字段进行 LIKE 查询
→ 例如：搜索 "WMS" → 查找所有项目为 WMS 的记录
```

## 测试策略

### 单元测试

```javascript
// Bug 1：测试排序逻辑
describe('useGenerator.generateReport', () => {
  it('should sort plans by priority', () => {
    const plans = [
      { project: '其他', workType: '其他', content: 'C' },
      { project: 'WMS', workType: '需求开发', content: 'A' },
      { project: 'ERP', workType: 'Bug修复', content: 'B' }
    ]
    const result = generateReport({ plans })
    expect(result.plans[0].content).toBe('A')
    expect(result.plans[1].content).toBe('B')
    expect(result.plans[2].content).toBe('C')
  })
})

// Bug 4：测试光标样式
describe('SettingsView.task-item', () => {
  it('should show not-allowed cursor for system tasks', () => {
    const task = { isSystemTask: true }
    const wrapper = mount(TaskItem, { props: { task } })
    expect(wrapper.find('.task-item').classes()).toContain('not-allowed')
  })
})
```

### 集成测试

```javascript
// Bug 6：测试列过滤 API
describe('GET /api/database/table/:tableName', () => {
  it('should filter by column when column parameter is provided', async () => {
    const response = await fetch('/api/database/table/records?search=1&column=deleted')
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.data.rows.every(row => row.deleted === 1 || row.deleted === '1')).toBe(true)
  })
})

// Bug 7：测试回收站数据
describe('RecycleBinView', () => {
  it('should display all deleted records', async () => {
    await recordsStore.addRecord({ content: 'Test' })
    await recordsStore.deleteRecord(recordId)

    await recordsStore.fetchDeletedRecords()
    expect(recordsStore.deletedRecords.length).toBeGreaterThan(0)
  })
})
```

### 手动测试

| Bug | 测试步骤 | 预期结果 |
|-----|---------|---------|
| Bug 1 | 1. 添加多个下周计划<br>2. 生成周报预览 | 下周计划按优先级排序 |
| Bug 2 | 1. 下载本周周报<br>2. 检查文件名 | 文件名包含周标签 |
| Bug 3 | 1. 打开设置页面<br>2. 查看删除按钮 | 显示垃圾桶图标 |
| Bug 4 | 1. 查看系统任务<br>2. 鼠标悬停 | 显示 not-allowed 光标 |
| Bug 5 | 1. 在工作记录页面<br>2. 点击"移到下周计划" | 弹窗可见 |
| Bug 6 | 1. 选择"deleted"列<br>2. 搜索"1" | 只显示已删除记录 |
| Bug 7 | 1. 删除一条记录<br>2. 打开回收站 | 记录显示在回收站 |

## 性能考虑

### Bug 1：排序性能

```
影响：每次生成周报时调用 sortByPriority()
复杂度：O(n log n)，n 为计划数量
评估：计划数量通常 < 20，影响可忽略
```

### Bug 6：搜索性能

```
影响：增加了列白名单验证
复杂度：O(1) 白名单查找
评估：影响可忽略

优化建议：
- 为常用搜索列添加索引（deleted, project, workType）
- 限制搜索关键词长度（如最多 100 字符）
- 添加防抖（已实现：500ms）
```

### Bug 7：回收站查询性能

```
影响：需要查询所有已删除数据
复杂度：O(n)，n 为已删除记录数量
评估：已删除数据通常较少，性能可接受

优化建议：
- 添加 deletedAt 索引
- 考虑分页加载（如果数量很大）
```

## 安全考虑

### Bug 6：SQL 注入防护

```
威胁：用户可能传入恶意列名（如 "id; DROP TABLE records--"）

防护措施：
1. 白名单验证
   const TABLE_COLUMNS = { records: ['id', 'content', ...] }
   if (!TABLE_COLUMNS[tableName].includes(column)) {
     return res.status(400).json({ error: '无效的列名' })
   }

2. 参数化查询
   sql = `SELECT * FROM ${tableName} WHERE ${column} LIKE ?`
   params = [`%${search}%`]

3. 转义特殊字符
   search = search.replace(/[\\%_]/g, '\\$&')  // 转义 LIKE 通配符
```

### Bug 7：数据访问控制

```
威胁：用户可能尝试访问其他人的已删除数据

防护措施：
1. 当前无用户系统，所有数据属于当前用户
2. 未来添加用户系统后，需要添加权限检查
   WHERE deleted = 1 AND userId = ?
```

## 依赖关系

### 内部依赖

```
Bug 1 修复：
- 依赖 useGenerator.js 中的 sortByPriority 函数
- 不影响其他功能

Bug 2 修复：
- 依赖 utils/date.js 中的 formatDate 函数
- 不影响其他功能

Bug 3 修复：
- 纯 UI 修改，无依赖

Bug 4 修复：
- 依赖 SettingsView.vue 的 CSS
- 不影响其他功能

Bug 5 修复：
- 依赖 dialogStore 和 ConfirmDialog 组件
- 需要在 HomeView 中添加组件

Bug 6 修复：
- 依赖后端 API 修改
- 前后端需要同步部署

Bug 7 修复：
- 依赖后端 API 和前端 store
- 需要验证数据完整性
```

### 外部依赖

```
无外部依赖变化
```

## 回滚计划

```
每个 Bug 修复都可以独立回滚：

Bug 1：
git revert <commit-for-bug-1>

Bug 2-7：
类似操作

批量回滚：
git revert <commit-range>
```

## 部署计划

```
1. 开发环境测试
   - 运行所有单元测试
   - 手动测试每个 Bug 修复

2. 预发布环境验证
   - 部署到测试服务器
   - 完整回归测试

3. 生产环境部署
   - 先部署后端（Bug 6, 7）
   - 再部署前端（所有 Bug）
   - 监控错误日志

4. 部署后验证
   - 检查回收站数据完整性
   - 验证搜索功能正常
   - 确认弹窗显示正确
```

## 监控指标

```
错误率监控：
- 前端 console.error
- 后端 API 错误率
- 数据库查询错误

性能监控：
- API 响应时间
- 搜索查询耗时
- 页面加载时间

用户行为监控：
- 下载功能使用率
- 搜索功能使用率
- 回收站访问频率
```
