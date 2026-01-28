<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

> 智能周报助手 - Claude Code 开发指南
>
> 本文档提供项目开发的核心规范、已知问题和最佳实践，确保开发过程中避免重复犯错。

---

## 项目概述

**智能周报助手** 是一个基于 Vue 3 + Vite + Express 的全栈 Web 应用，帮助用户通过碎片化输入自动归类、整理并生成结构化的周报内容。

**核心技术栈：**
- 前端：Vue 3 (Composition API + `<script setup>`) + Vite + Pinia + Vue Router
- 后端：Express.js + SQLite3
- 数据存储：项目目录下的 `data/app.db` 文件（支持跨浏览器访问）

---

## 常用开发命令

```bash
# 安装依赖
npm install

# 同时启动前端和后端服务
npm run dev
# 前端: http://localhost:5173
# 后端: http://localhost:3000

# 构建生产版本
npm run build
```

---

## 核心开发规范（必须遵守）

### 1. UI 一致性规范

**UI 设计必须使用 `/ui-ux-pro-max` skill**：
- 所有新建或重构的 UI 组件、页面必须调用 `/ui-ux-pro-max` skill 进行设计
- 技能提供 50 种样式、21 种调色板、50 种字体组合和 20 种图表类型
- 支持 React、Next.js、Vue、Svelte、SwiftUI、React Native、Flutter、Tailwind 等技术栈
- 可生成代码、设计规范、描述和提示词

**调用方式**：
```
使用 /ui-ux-pro-max skill 设计 [组件/页面名称]
风格：glassmorphism/minimalism/brutalism/neumorphism/bento grid/dark mode/responsive/skeuomorphism/flat design
主题：[具体描述]
```

**所有页面视图必须使用统一的页面容器样式：**

```scss
// 在每个 view 的 <style scoped> 中添加
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4;
  max-width: 100%;

  h1 {
    font-family: $font-family-heading;
    letter-spacing: -0.03em;
    line-height: 1.2;
    font-weight: 700;
  }

  .page-header-subtitle {
    letter-spacing: -0.01em;
    line-height: 1.5;
    margin-top: $spacing-2;
  }

  @media (min-width: $breakpoint-xl) {
    gap: $spacing-8;
  }
}
```

**响应式断点必须添加：**
```scss
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-4;
  }
}
```

**禁止使用普通表情符号（Emoji）**：
- ❌ 禁止在 UI 中使用 Unicode 表情符号（如 🏖️、⚠️、📊、📝）
- ✅ 必须使用 SVG 图标代替表情符号
- ✅ 图标应使用 `<svg>` 标签内联，保持风格统一
- ✅ 推荐使用 Heroicons 风格的图标

**为什么禁止表情符号**：
- 跨平台显示不一致（Windows/macOS/Android 显示效果不同）
- 无法自定义颜色和大小
- 可访问性差（屏幕阅读器支持不佳）
- 专业度不足，影响品牌形象

**正确示例**：
```vue
<!-- ❌ 错误：使用表情符号 -->
<span>🏖️ 假期提醒</span>
<span>⚠️ 警告信息</span>

<!-- ✅ 正确：使用 SVG 图标 -->
<span>
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
  </svg>
  假期提醒
</span>
```

**例外情况**：
- Console 日志中可以使用表情符号（不在 UI 上显示）
- 用户生成内容（UGC）中的表情符号应保留显示

### 2. 标签排序规范

**"其他" 标签必须永远显示在最后**，已通过优先级排序实现：

- 优先级 0：项目明确 + 类型明确 → 最前
- 优先级 1：只有项目明确
- 优先级 2：只有类型明确
- 优先级 3：都是"其他" → 最后

**实现位置：** `src/composables/useGenerator.js`
- `getRecordPriority()` - 计算优先级
- `sortByPriority()` - 排序
- `generateTags()` - 生成标签（将[其他]移到最后）

**使用方式：**
```javascript
// 在 generateMarkdown 和 generatePlainText 中
const sortedRecords = sortByPriority(records)
const groupedByProject = groupByProject(sortedRecords)
```

### 3. 周报格式规范

**Markdown 格式（带加粗）：**
```javascript
lines.push('**本周完成工作**')
lines.push('**下周工作计划**')
lines.push('**本周得与失**')
```

**纯文本格式（不带加粗）：**
```javascript
lines.push('本周完成工作')
lines.push('下周工作计划')
lines.push('本周得与失')
```

**"本周得与失"列表必须使用固定编号：**
```javascript
const items = []
if (reflections.gains) {
    items.push(`1. ${reflections.gains}`)
}
if (reflections.losses) {
    items.push(`2. ${reflections.losses}`)
}
```

### 4. 归档数据显示规范

**周报保存后，必须显示归档的数据，而不是内存中的可编辑数据：**

```javascript
// ReportView.vue 中的实现
const archivedReport = computed(() => {
    if (reportsStore.hasCurrentWeekReport) {
        return reportsStore.getCurrentWeekArchivedReport()
    }
    return null
})

const previewReport = computed(() => {
    // 如果已归档，直接返回归档数据（包含保存时的 markdown 和 plainText）
    if (archivedReport.value) {
        return { ...archivedReport.value }
    }
    // 未归档时，动态生成
    return generateReport({ records, plans, reflections })
})
```

**归档后必须清空编辑状态：**
```javascript
// reports.js 的 saveReport 方法
currentPlans.value = []
currentReflections.value = { gains: '', losses: '' }
```

### 5. 周信息显示规范

**周信息组件必须在所有页面保持一致**（HomeView 和 ReportView）：

**关键要点**：
- 使用 `getWorkWeekInfo()` 获取工作周信息
- 显示周范围（MM.DD - MM.DD）、工作日数量、假期提示
- 使用计算属性 `upcomingHolidaysText` 生成即将到来的假期描述
- 格式：`周一(1.20)、周二(1.21) 休息`

**实现位置**：HomeView 和 ReportView 中的周信息组件

### 6. 解析预览规范

**InputBox 和 PlanInputBox 必须同时显示项目和类型识别结果：**

```vue
<div class="parse-preview">
  <div class="parse-item">
    <span class="parse-label">项目</span>
    <span class="parse-value" :class="{ detected: parseResult.project }">
      {{ parseResult.project || '待识别' }}
    </span>
  </div>
  <div class="parse-item">
    <span class="parse-label">类型</span>
    <span class="parse-value" :class="{ detected: parseResult.workType }">
      {{ parseResult.workType || '待识别' }}
    </span>
  </div>
</div>
```

### 7. 工作日判断规范

**工作日定义**：
- 工作日 = 需要上班的日子（不是简单的周一到周五）
- 必须使用 `src/utils/date.js` 中的 `isWorkday()` 函数判断
- 该函数已考虑：
  - 法定节假日（虽是工作日但休息）
  - 调休补班（虽是周末但要上班）

**节假日数据结构**：
- **位置**：`src/utils/date.js` 和 `server/utils/date.js`
- **格式**：`CHINESE_HOLIDAYS` 对象
- **键值**：`'MM-DD': 'holiday'`（法定节假日）或 `'workday'`（调休补班）
- **示例**：
  ```javascript
  '01-01': 'holiday',  // 元旦休息
  '01-04': 'workday',  // 元旦调休（周日补班）
  ```

**定时任务实现**：
- 所有定时任务设置为每天运行（`dayOfWeek: '*'`）
- 在运行时使用 `isWorkday()` 校验是否应该执行
- 周报推送使用 `getWorkWeekInfo()` 获取最后一个工作日

**节假日数据更新**：
- 每年需要更新 `CHINESE_HOLIDAYS` 对象
- 数据来源：国务院办公厅发布的法定节假日安排
- 前后端同步更新：`src/utils/date.js` 和 `server/utils/date.js`

**工作周计算规则**：

工作周的计算由 `getWorkWeekInfo()` 函数实现，遵循以下核心规则：

1. **补班日归属规则**：如果上周日是工作日/补班 → 工作周从上周日开始
2. **正常情况规则**：否则 → 工作周从本周第一个工作日开始
3. **结束边界规则**：工作周到本周最后一个工作日结束，不向后扩展
4. **全节假日周规则**：如果自然周全是节假日 → 返回 `hasNoWorkdays: true`

**实现位置**：`src/utils/date.js` 和 `server/utils/date.js`

**核心逻辑**：
- 获取自然周起始（周一）
- 遍历 7 天查找第一个和最后一个工作日
- 检查上周日是否是工作日（补班情况）
- 如果全周无工作日，返回 `hasNoWorkdays: true`
- 返回工作周起止日期、工作日列表、假期信息等

**典型场景示例**：
- **元旦补班周**：上周日是补班 → 工作周从上周日开始
- **春节假期周**：全周节假日 → `hasNoWorkdays: true`
- **春节后补班周**：周一是节假日、周二是补班 → 工作周从周二开始
- **国庆前补班周**：上周日是补班 → 工作周从上周日开始

**为什么这样定义**：
- ✅ 补班日与工作日连在一起，形成完整的工作周
- ✅ 不向后扩展，避免工作周跨度过大
- ✅ 全节假日周有明确标识，便于UI显示特殊状态
- ✅ 前后端逻辑一致，确保计算结果同步

### 8. 数据持久化规范

**核心原则**：
所有数据的增删改查行为全部都必须通过接口获取，禁止使用任何前端缓存（localStorage、sessionStorage）。要确保数据的实时性。

**数据流架构**：
```
数据库 → API → Pinia Store → UI
```

**禁止使用前端缓存**：
- ❌ 禁止使用 localStorage 存储数据
- ❌ 禁止使用 sessionStorage 存储数据
- ✅ 所有数据读取通过 API
- ✅ 所有数据写入通过 API
- ✅ Pinia Store 仅作为内存缓存（不持久化）

**API 失败处理**：
- API 失败时向用户显示明确的错误提示
- 不降级到 localStorage
- 提供重试机制

**实现位置**：
- `src/utils/api.js` - API 封装（无 localStorage 操作）
- `src/stores/records.js` - 直接调用 API（addRecord/updateRecord/deleteRecord）
- `src/stores/reports.js` - 直接调用 API（saveCurrentState）
- `src/stores/settings.js` - 直接调用 API（saveSettings）

**相关 API**：
- `GET /api/records` - 获取工作记录
- `POST /api/records` - 添加工作记录
- `PUT /api/records/:id` - 更新工作记录
- `DELETE /api/records/:id` - 删除工作记录
- `PUT /api/current-state` - 保存当前编辑状态
- `GET /api/reports` - 读取周报和当前编辑状态
- `PUT /api/settings` - 保存设置
- `GET /api/settings` - 获取设置

### 9. 数据刷新机制

**多标签页数据同步**：
系统提供两种自动刷新机制，确保多标签页/多设备数据实时同步。

**页面可见性监听**：
- 当用户切换回标签页时，自动刷新数据
- 使用防抖机制（500ms），避免频繁切换导致过多 API 调用
- 实现位置：`src/App.vue` - `handleVisibilityChange()`

**定期轮询**：
- 页面可见时，每 30 秒自动刷新数据
- 页面隐藏时暂停轮询
- 实现位置：`src/App.vue` - `startPolling()`

**刷新时机**：
1. 应用启动时：立即加载数据
2. 页面可见性变化：切换回标签页时刷新（防抖 500ms）
3. 定期轮询：每 30 秒刷新（页面可见时）

**实现示例**：
```javascript
// src/App.vue
const refreshAllStores = async () => {
  await Promise.all([
    settingsStore.init(),
    recordsStore.init(),
    reportsStore.init()
  ])
}

// 页面可见性监听
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    debounceRefresh()  // 防抖 500ms
  }
})

// 定期轮询
setInterval(() => {
  if (document.visibilityState === 'visible') {
    refreshAllStores()
  }
}, 30000)
```

**为什么需要自动刷新**：
- ✅ 多标签页数据自动同步
- ✅ 多设备数据实时更新
- ✅ 用户无需手动刷新
- ✅ 数据一致性得到保证

### 10. 日期格式规范

**统一使用 ISO 8601 字符串格式**：
所有日期时间必须使用 `toISOString()` 生成字符串格式：

```javascript
// ✅ 正确：ISO 8601 格式
const record = {
  id: '123',
  content: '完成工作',
  createdAt: new Date().toISOString(),  // '2026-01-09T12:34:56.789Z'
  updatedAt: new Date().toISOString()
}

// ❌ 错误：使用 Date 对象
const record = {
  createdAt: new Date()  // 不可序列化
}
```

**为什么必须这样做**：
- SQLite 不支持原生 Date 类型，只能存储字符串
- ISO 格式可精确解析，避免时区问题
- 便于排序和比较操作

**日期解析**：
```javascript
// 从数据库读取后解析
const recordDate = new Date(record.createdAt)

// 日期比较
const isSameDay = (d1, d2) => {
  return new Date(d1).toDateString() === new Date(d2).toDateString()
}
```

### 11. Pinia Store 结构规范

**所有 Store 必须使用 Setup Store 模式**，统一结构包含三个分隔部分：

```javascript
export const useXxxStore = defineStore('xxx', () => {
  // ============ 状态 ============
  const items = ref([])

  // ============ 计算属性 ============
  const filteredItems = computed(() => items.value.filter(...))

  // ============ 方法 ============
  const init = async () => { /* 初始化逻辑 */ }
  const addItem = async (item) => { items.value.push(item) }

  return { items, filteredItems, init, addItem }
})
```

**分隔注释**：`// ============ 状态 ============`、`// ============ 计算属性 ============`、`// ============ 方法 ============`

**参考实现**：`src/stores/records.js`、`src/stores/settings.js`、`src/stores/reports.js`

### 12. API 响应格式规范

**所有 API 必须使用统一的响应格式**：

**成功响应**：
```javascript
// 格式：{ success: true, data?: any, message?: string }
res.json({ success: true, data: records })
res.json({ success: true, count: records.length })
res.json({ success: true, message: '操作成功' })
```

**失败响应**：
```javascript
// 格式：{ success: false, error: string }
res.status(400).json({ success: false, error: '参数错误' })
res.status(500).json({ success: false, error: error.message })
```

**后端实现示例**（`server/api.js`）：
```javascript
// GET /api/records
app.get('/api/records', async (req, res) => {
  try {
    const db = await createDbConnection()
    const records = await queryAll(db, 'SELECT * FROM records')
    db.close()

    res.json({ success: true, data: records })
  } catch (error) {
    console.error('[API] 获取记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

**前端使用示例**：
```javascript
const response = await fetch(url)
const result = await response.json()

if (result.success) {
  // 处理成功
  console.log(result.data)
} else {
  // 处理失败
  console.error(result.error)
}
```

**为什么必须统一格式**：
- ✅ 前端可以统一处理错误
- ✅ 便于日志记录和调试
- ✅ API 行为可预测，降低开发成本

### 13. 禁止使用原生弹窗规范

**禁止使用原生弹窗**：
项目中禁止使用 `alert()`、`confirm()`、`prompt()` 等原生弹窗方法。

**替代方案**：
- 使用自定义组件 `ConfirmDialog`、`PromptDialog`
- 使用 composables `useConfirm()`、`usePrompt()`

**为什么禁止原生弹窗**：
- ❌ 阻塞主线程，影响用户体验
- ❌ 样式无法自定义，与应用风格不统一
- ❌ 移动端体验差
- ✅ 自定义组件支持更丰富的交互
- ✅ 样式与应用主题一致

**使用示例**：
```javascript
// ❌ 错误：使用原生 confirm
if (!confirm('确定删除吗？')) return

// ✅ 正确：使用自定义弹窗
import { useConfirm } from '../composables/useDialog'
const confirmDialog = useConfirm()

const handleDelete = async () => {
  const confirmed = await confirmDialog.confirm({
    message: '确定删除吗？'
  })
  if (!confirmed) return
  // 删除逻辑
}
```

**相关组件**：
- `src/components/ConfirmDialog.vue` - 确认对话框（z-index: 1060）
- `src/components/PromptDialog.vue` - 输入对话框（z-index: 1060）
- `src/stores/dialog.js` - 弹窗状态管理

**注意**：弹窗组件的 z-index 必须设置为 1060，确保显示在普通模态框（z-index: 1040-1050）之上，但在 Toast（z-index: 1070）之下。

### 14. 标签显示规范

**标签显示规则**：
- 项目明确 + 类型明确 → `[项目][类型]`
- 项目明确 + 类型为"其他" → `[项目][其他]`（必须显示[其他]）
- 项目为"其他" + 类型明确 → `[类型]`（不显示[其他]）
- 项目为"其他" + 类型为"其他" → `[其他]`
- 只有项目（没有类型字段） → `[项目][其他]`
- 只有类型（没有项目字段） → `[类型]`

**实现位置**：`src/composables/useGenerator.js` - `generateTags()` 函数

**代码示例**：
```javascript
const generateTags = (project, workType) => {
    const tags = []

    // 情况1: 项目明确，添加项目标签
    if (project && project !== '其他') {
        tags.push(`[${project}]`)
    }

    // 情况2: 类型明确，添加类型标签
    if (workType && workType !== '其他') {
        tags.push(`[${workType}]`)
    }

    // 情况3: 如果有项目但类型为"其他"，添加[其他]标签
    if (project && project !== '其他' && (!workType || workType === '其他')) {
        tags.push('[其他]')
    }

    // 情况4: 如果都没有明确，显示[其他]
    if (tags.length === 0) {
        tags.push('[其他]')
    }

    return tags.join('')
}
```

**显示效果**：
- `[WMS][需求开发]` - 项目和类型都明确
- `[WMS][其他]` - 项目明确，类型为"其他"（必须显示[其他]）
- `[Bug修复]` - 项目为"其他"，类型明确（不显示[其他]）
- `[其他]` - 项目和类型都是"其他"
- `[WMS][其他]` - 只有项目（没有类型字段）
- `[Bug修复]` - 只有类型（没有项目字段）

**适用范围**：
- ✅ 本周完成工作 - 使用 `generateTags()` 生成标签
- ✅ 下周工作计划 - 使用 `generateTags()` 生成标签
- ✅ 历史周报 - 使用 `generateTags()` 生成标签

**优先级排序**：
标签显示前会先按优先级排序（`sortByPriority()`）：
1. 优先级 0：项目明确 + 类型明确 → 最前
2. 优先级 1：只有项目明确
3. 优先级 2：只有类型明确
4. 优先级 3：都是"其他" → 最后

### 15. 软删除规范（强制）

**所有数据删除必须使用软删除，禁止硬删除！**

**软删除定义**：
- 删除操作不真正删除数据，而是标记为"已删除"
- 使用 `deleted` 字段标记（0=未删除，1=已删除）
- 使用 `deletedAt` 字段记录删除时间

**实现要求**：

1. **数据库层面**：
   - 所有表必须包含 `deleted INTEGER DEFAULT 0` 字段
   - 所有表必须包含 `deletedAt TEXT` 字段
   - 为 `deleted` 字段添加索引以提升查询性能

2. **API 层面**：
   - DELETE 接口改为 UPDATE：`UPDATE ... SET deleted = 1, deletedAt = ?`
   - 查询接口过滤已删除：`WHERE deleted = 0`
   - 提供恢复接口：`POST /api/:resource/:id/restore`
   - 提供永久删除接口：`DELETE /api/:resource/:id/permanent`

3. **前端层面**：
   - Store 删除方法改为软删除
   - 提供恢复方法和获取已删除数据方法
   - 删除确认提示："此操作将移入回收站，可在30天内恢复"
   - 回收站页面支持恢复和永久删除操作

**已实现软删除的表**：
- ✅ `records` - 工作记录
- ✅ `reports` - 周报归档
- ✅ `scheduled_tasks` - 定时任务

**例外情况**（可以硬删除）：
- 配置项（projects、workTypes）- 使用全量替换，不涉及删除 API
- 临时数据（session data）

**为什么必须软删除**：
- ❌ 硬删除导致数据永久丢失，无法恢复
- ✅ 软删除提供"后悔药"，减少误操作损失
- ✅ 可用于数据审计和分析
- ✅ 支持回收站功能，用户体验更好

**数据库迁移示例**：
```javascript
// 添加软删除字段
ALTER TABLE records ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE records ADD COLUMN deletedAt TEXT;
CREATE INDEX idx_records_deleted ON records(deleted);
```

**API 实现示例**：
```javascript
// 软删除：UPDATE ... SET deleted = 1, deletedAt = ?
// 恢复：UPDATE ... SET deleted = 0, deletedAt = NULL
// 永久删除：DELETE FROM ... WHERE id = ?
// 查询：SELECT ... WHERE deleted = 0/1
```

**前端 Store 实现示例**：
```javascript
// 软删除：调用 DELETE /api/records/:id
// 恢复：调用 POST /api/records/:id/restore
// 获取已删除：GET /api/records?deleted=1
```

### 16. 回收站功能规范

**功能概述**：
回收站提供已删除项目的查看、恢复和永久删除功能，支持 30 天内的数据恢复。

**访问路径**：`/recycle-bin`

**支持的操作**：

1. **查看已删除项目**：
   - 分类显示：已删除的周报、已删除的工作记录
   - 显示信息：周标签、日期范围、删除时间
   - 数量徽章：显示各类已删除项目数量

2. **恢复操作**：
   - 点击"恢复"按钮恢复数据
   - 调用 `POST /api/:resource/:id/restore`
   - 确认提示："确定要恢复这份周报/记录吗？"
   - 恢复后从回收站移除，重新出现在主列表

3. **永久删除**：
   - 点击"永久删除"按钮彻底删除数据
   - 调用 `DELETE /api/:resource/:id/permanent`
   - 二次确认提示："⚠️ 此操作不可恢复！确定要永久删除吗？"
   - 永久删除后无法恢复

**前端实现**：

```javascript
// 获取已删除的数据
const fetchDeletedData = async () => {
  await Promise.all([
    reportsStore.fetchDeletedReports(),
    recordsStore.fetchDeletedRecords()
  ])
}

// 恢复周报
const handleRestoreReport = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '确定要恢复这份周报吗？'
  })
  if (!confirmed) return

  const success = await reportsStore.restoreReport(id)
  if (success) {
    showToast('周报已恢复')
    await fetchDeletedData()
  } else {
    showToast('恢复失败，请重试', true)
  }
}

// 永久删除周报
const handlePermanentDeleteReport = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '⚠️ 此操作不可恢复！确定要永久删除这份周报吗？'
  })
  if (!confirmed) return

  const success = await reportsStore.permanentDeleteReport(id)
  if (success) {
    showToast('周报已永久删除')
    await fetchDeletedData()
  } else {
    showToast('删除失败，请重试', true)
  }
}
```

**关键文件**：
- 回收站页面：`src/views/RecycleBinView.vue`
- Records Store：`src/stores/records.js`
- Reports Store：`src/stores/reports.js`

### 17. 文档更新规范（强制）

**核心原则**：
CLAUDE.md 是项目的"活文档"，必须与代码实现保持同步。任何重要变更都必须及时更新文档。

**必须更新文档的情况**：

1. **新增核心规则时**：
   - 发现新的开发规范或最佳实践
   - 确立新的技术标准（如 z-index 层级规范）
   - 避免重复犯错的关键规则

2. **发现重要问题时**：
   - 容易重复犯错的技术陷阱
   - 需要特别注意的兼容性问题
   - 调试过程中的关键发现

3. **架构变更时**：
   - 新增核心功能模块（如软删除、回收站）
   - 修改数据库结构
   - 重大 API 变更

4. **流程变更时**：
   - 新增开发工作流
   - 修改部署流程
   - 更新迁移步骤

**更新内容要求**：

```markdown
### XX. [规则名称]

**规则定义**：
清晰说明规则的核心要求。

**适用范围**：
明确规则适用于哪些场景。

**实现示例**：
提供代码示例或配置示例。

**例外情况**：
如有例外，明确说明。

**为什么这样做**：
解释规则背后的原因，帮助理解。
```

**版本更新规范**：

每次更新 CLAUDE.md 时，必须同步更新版本号：

```markdown
## 最后更新

- **日期**: YYYY-MM-DD
- **版本**: X.X
- **主要更新**:
  - 新增规则 #XX：[规则名称]
  - 修复问题 #X：[问题描述]
  - 更新章节：[章节名称]
```

**版本号规则**：
- 主版本（X.0）：重大架构变更
- 次版本（X.X）：新增规则或重要更新
- 补丁版本（X.x.X）：文档小修正

**检查清单**：

在提交代码前，检查是否需要更新 CLAUDE.md：
- [ ] 是否新增了开发规范？
- [ ] 是否发现了重要的技术陷阱？
- [ ] 是否修改了核心架构？
- [ ] 是否更新了数据库结构？
- [ ] 版本号和日期是否已更新？

**违反此规则的后果**：
- ❌ 文档与代码脱节，误导后续开发
- ❌ 重复犯错，浪费时间
- ❌ 新人上手困难
- ✅ 及时更新文档 = 提高团队效率

**相关文档**：
- 代码审查清单：必须检查文档是否需要更新
- 已知问题和解决方案：记录常见问题和解决方法

---

### 18. Docker 部署

**Docker 部署概述**：
项目支持使用 Docker 进行容器化部署，确保开发、测试、生产环境的一致性。

**核心命令**：
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**数据持久化**：数据库文件存储在 `./data` 目录，通过 volumes 映射

**详细配置**：参见 [Docker 部署指南](./docs/deployment.md)

---

### 19. 环境变量配置

**环境变量概述**：
使用环境变量管理不同环境的配置，避免硬编码敏感信息。

**主要变量**：
- `VITE_API_URL` - 后端 API 基础 URL（默认：`/api`）
- `PORT` - 后端服务端口（默认：`3000`）
- `NODE_ENV` - 运行环境（默认：`development`）

**使用示例**：
```javascript
// 前端
const API_BASE = import.meta.env.VITE_API_URL || '/api'
// 后端
const PORT = process.env.PORT || 3000
```

**安全注意事项**：
- ❌ 不要在 `.env` 文件中存储密码、密钥
- ✅ `.env` 文件必须在 `.gitignore` 中
- ✅ 提供 `.env.example` 作为配置模板

**详细配置**：参见 [环境变量配置指南](./docs/configuration.md)

---

## 重要代码位置索引

### 数据持久化
- **后端 API**: `server/api.js` - Express 路由定义
- **数据库初始化**: `server/db.js` - SQLite 表创建
- **前端 API 封装**: `src/utils/api.js` - API 调用工具

### 状态管理（Pinia）
- **工作记录**: `src/stores/records.js` - records CRUD
- **周报归档**: `src/stores/reports.js` - reports、plans、reflections
- **应用设置**: `src/stores/settings.js` - 项目、类型、主题、钉钉配置

### 业务逻辑
- **输入解析**: `src/composables/useParser.js` - 项目/类型识别、内容润色
- **周报生成**: `src/composables/useGenerator.js` - Markdown/纯文本生成、标签排序
- **计划转换**: `src/views/ReportView.vue` - 智能转换上周计划为本周工作记录
  - `GET /api/convert/status` - 检查转换状态
  - `POST /api/convert/mark` - 标记转换完成

### 工具函数
- **日期处理**: `src/utils/date.js` - 周边界、工作日计算、节假日判断
- **钉钉集成**: `src/utils/dingtalk.js` - Webhook 签名生成

### 回收站功能
- **回收站页面**: `src/views/RecycleBinView.vue`
- **数据库迁移**: `server/migrations/add_soft_delete.cjs`

### 数据库管理功能
- **数据库管理页面**: `src/views/DatabaseView.vue` - 只读查看所有表数据
- **数据表格组件**: `src/components/DataTable.vue` - 通用数据表格展示（支持列排序）
- **JSON 查看器组件**: `src/components/JsonViewer.vue` - JSON 弹窗查看器（语法高亮、折叠/展开、复制）
- **JSON 节点组件**: `src/components/JsonNode.vue` - 递归 JSON 渲染组件
- **筛选面板组件**: `src/components/FilterPanel.vue` - 高级筛选面板（动态生成筛选器）
- **单元格内容组件**: `src/components/CellContent.vue` - JSON/日期/布尔字段格式化（点击 JSON 打开弹窗）
- **后端 API**: `server/api.js` - 数据库管理接口
  - `GET /api/database/tables` - 获取所有表信息和结构
  - `GET /api/database/table/:tableName` - 获取表数据（支持分页、搜索、筛选、排序）
- **功能特性**:
  - **表切换**: Tab 切换，显示行数徽章
  - **数据搜索**: 模糊匹配文本字段，500ms 防抖，可按指定字段搜索
  - **高级筛选**: 根据字段类型动态生成筛选器（文本框、日期选择器、下拉选择）
  - **列排序**: 点击表头排序（ASC → DESC → 无），默认 id DESC
  - **JSON 查看**: 点击 JSON 字段打开弹窗查看完整内容，支持语法高亮和折叠/展开
  - **分页浏览**: 默认每页 20 条
  - **长文本截断**: 超长文本字段截断显示
  - **日期格式化**: 本地化日期格式显示
  - **布尔字段**: 中文显示（是/否）
  - **白名单验证**: 只允许访问 4 个系统表（records、reports、settings、scheduled_tasks）
  - **SQL 注入防护**: 参数化查询，列名白名单验证

---

## 已知问题和解决方案

### 问题 1：复制纯文本格式错误
**现象**：修复 Markdown 格式后，纯文本复制也带 `**` 加粗。

**原因**：`previewReport` 总是重新生成数据，忽略了归档数据中的 `plainText` 字段。

**解决**：检查是否已归档，如果是则直接返回归档数据。
```javascript
if (archivedReport.value) {
    return { ...archivedReport.value }
}
```

### 问题 2：标签 undefined 错误
**现象**：周信息显示中出现 undefined。

**原因**：`upcomingHolidaysText` 尝试访问不存在的 `holiday.name` 属性。

**解决**：使用 `holiday.weekday` 和 `formatDate(h.date, 'M.DD')` 生成描述。

### 问题 3：[其他] 标签不在最后
**现象**：标签排序混乱，[其他] 出现在中间。

**原因**：没有按优先级排序就分组。

**解决**：先生成 `sortedRecords = sortByPriority(records)`，再分组。

### 问题 4：页面切换时布局跳动
**现象**：HomeView 和其他页面容器宽度不一致。

**原因**：不同页面使用了不同的容器样式。

**解决**：所有页面使用统一的 `.page-header` 和响应式样式。

### 问题 5：保存后可以继续编辑
**现象**：周报归档后，输入框没有禁用。

**原因**：缺少锁定状态检查。

**解决**：添加 `isCurrentWeekSaved` 检查，禁用输入组件：
```vue
<div class="editor-section" :class="{ locked: isCurrentWeekSaved }">
  <textarea :disabled="isCurrentWeekSaved"></textarea>
</div>
```

### 问题 6：定时任务重复执行和重启立即触发
**现象**：
- 转换任务在极短时间内（0.055秒）执行两次，生成重复记录
- 服务重启后定时任务立即触发，而非按设定时间（09:00）执行
- 后端已执行转换，前端仍弹出转换确认弹窗

**原因**：
1. **重复执行**：修改定时任务时触发 `startScheduledTasks()` 重新调用，旧任务未停止完成，新任务已启动，导致竞态条件
2. **立即触发**：`node-schedule` 在创建调度任务时，如果当前时间已过今天的调度时间，会立即触发一次（库的设计行为）
3. **前端数据未刷新**：`onMounted()` 直接检查转换状态，未先刷新数据，读取到旧状态

**解决方案**：
1. **数据库锁**：在 `server/cron.js` 的 `executeTask()` 中添加锁机制
   - 执行转换前检查 `settings` 表中的 `convert_lock_YYYY-MM-DD` 键
   - 如果存在锁则跳过执行
   - 执行前设置锁（包含锁定时间和任务 ID）

2. **跳过首次触发**：在 `server/cron.js` 的 `startTask()` 中添加跳过逻辑
   - 检查当前时间是否已过今天的调度时间
   - 如果已过，标记 `shouldSkipFirstRun = true`
   - 首次触发时检查该标记并跳过

3. **前端数据刷新**：在 `src/views/ReportView.vue` 的 `onMounted()` 中
   - 先调用 `recordsStore.init()` 和 `reportsStore.init()` 刷新数据
   - 等待 300ms 确保异步操作完成
   - 再检查转换状态

**相关文件**：
- `server/cron.js:217-240` - 转换锁逻辑
- `server/cron.js:136-162` - 跳过首次触发逻辑
- `src/views/ReportView.vue:444-478` - 前端数据刷新逻辑

**测试方法**：
```bash
# 测试锁机制：手动触发两次
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test

# 测试重启立即触发：下午重启服务
docker compose restart

# 测试前端弹窗：后端转换后访问页面
# 浏览器访问 http://localhost:3333/report
```

---

## 数据库操作规范

### 查看数据库内容
```bash
# 进入项目目录
cd /Users/raven/Documents/devlop/all_in_ai/weekly_report_assistant

# 使用 SQLite 命令行
sqlite3 data/app.db

# 查看所有表
.tables

# 查看表结构
.schema records
.schema reports
.schema settings

# 查询数据
SELECT * FROM records;
SELECT * FROM reports;
SELECT * FROM settings;
```

### 清空数据
```sql
-- 清空工作记录
DELETE FROM records;

-- 清空周报归档
DELETE FROM reports;

-- 清空设置
DELETE FROM settings;
```

### 删除数据库重新开始
```bash
rm data/app.db
# 重启服务会自动创建新数据库
```

---

## 周报生成流程

1. **收集数据**：
   - `recordsStore.currentWeekRecords` - 本周工作记录
   - `reportsStore.currentPlans` - 下周计划
   - `reportsStore.currentReflections` - 本周得与失

2. **生成周报**：
   - 调用 `generateReport({ records, plans, reflections })`
   - 返回 `{ markdown, plainText, records, plans, reflections, generatedAt }`

3. **保存归档**：
   - 调用 `reportsStore.saveReport(reportData)`
   - 自动清空 `currentPlans` 和 `currentReflections`

4. **显示归档**：
   - `hasCurrentWeekReport` 为 true 时显示归档数据
   - 禁用所有编辑输入框

---

## 钉钉推送配置

- **配置位置**：设置页面 → 钉钉配置
- **必填项**：Webhook URL + Secret
- **定时推送**：每周五下午 3 点（`scheduler.js`）
- **格式支持**：纯文本、Markdown

---

## 调试技巧

### 检查 Pinia 状态
```javascript
// 在浏览器控制台
import { useRecordsStore } from './src/stores/records'
const store = useRecordsStore()
console.log(store.records)
```

### 检查后端 API
```bash
# 查看所有工作记录
curl http://localhost:3000/api/records

# 查看所有周报
curl http://localhost:3000/api/reports
```

### 查看网络请求
- 打开浏览器开发者工具 → Network 标签页
- 筛选 XHR 查看 API 请求
- 检查请求参数和响应数据

---

## 常见错误排查

### "Cannot read property XXX of undefined"
- 检查对象是否存在再访问属性
- 使用可选链：`obj?.prop`
- 使用默认值：`obj.prop || '默认值'`

### "Network Error"
- 检查后端服务是否启动（http://localhost:3000）
- 检查 API 路径是否正确
- 查看后端控制台日志

### "WeekLabel is undefined"
- 检查 `formatDate` 函数是否正确导入
- 检查日期对象是否有效

---

## 代码审查清单

提交代码前检查：

- [ ] **UI 组件/页面使用了 `/ui-ux-pro-max` skill 设计**
- [ ] 所有页面容器样式统一（.page-header）
- [ ] **禁止使用普通表情符号，必须使用 SVG 图标**
- [ ] 标签排序使用了 `sortByPriority`
- [ ] "本周得与失" 使用固定编号（1. 2.）
- [ ] Markdown 格式带 `**`，纯文本不带
- [ ] 归档后显示归档数据，不是内存数据
- [ ] 周信息组件使用 `upcomingHolidaysText` 计算属性
- [ ] 解析预览同时显示项目和类型
- [ ] 响应式样式已添加（@media 断点）
- [ ] 已禁用已归档周报的编辑功能
- [ ] 数据库操作后调用了 `db.close()`
- [ ] API 路由顺序正确（具体路由在前）
- [ ] 删除操作使用软删除，禁止硬删除
- [ ] API 响应格式统一（{ success, data?, error? }）
- [ ] Toast z-index 为 1070（$z-tooltip）
- [ ] Dialogs z-index 为 1060（$z-popover）
- [ ] Modals z-index 为 1040-1050（$z-modal-backdrop/$z-modal）
- [ ] 环境变量配置正确（VITE_API_URL、PORT、NODE_ENV）
- [ ] Docker 构建和部署配置正确
- [ ] 数据库表结构包含软删除字段（deleted、deletedAt）
- [ ] 日期计算逻辑前后端一致（`src/utils/date.js` 和 `server/utils/date.js`）
- [ ] 工作周计算遵循4条核心规则（补班日归属、不向后扩展、全节假日周处理）
- [ ] **当前编辑状态已保存到数据库（plans/reflections 使用 `saveCurrentState` API）**
- [ ] **检查是否需要更新 CLAUDE.md 文档**

---

## 最后更新

- **日期**: 2026-01-28
- **版本**: 5.1
- **主要更新**:
  - **修复问题 #6**：定时任务重复执行、重启立即触发、前端数据未刷新
  - 添加数据库锁机制防止转换任务重复执行
  - 修改任务启动逻辑，防止服务重启后立即触发
  - 前端强制刷新数据后再检查转换状态
  - 之前版本（5.0）：
    - 文档精简：减少约 38% 的 token 占用（13,000 → 8,000）
    - 删除重复内容，创建子文档（deployment.md、configuration.md、troubleshooting.md）

