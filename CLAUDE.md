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

```vue
<template>
  <div v-if="weekInfo" class="week-info-wrapper">
    <div class="week-badge">
      <span class="week-range">{{ formatDate(weekInfo.start, 'MM.DD') }} - {{ formatDate(weekInfo.end, 'MM.DD') }}</span>
      <span class="week-divider">|</span>
      <span class="workday-count">{{ weekInfo.workdayCount }}个工作日</span>
      <span v-if="weekInfo.holidayCount > 0" class="holiday-hint">含{{ weekInfo.holidayCount }}天假期</span>
    </div>
    <div v-if="upcomingHolidaysText" class="upcoming-holidays">
      <span class="holiday-icon">🏖️</span>
      <span class="holiday-text">{{ upcomingHolidaysText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getWorkWeekInfo, formatDate } from '../utils/date'

const weekInfo = ref(null)

const upcomingHolidaysText = computed(() => {
  if (!weekInfo.value?.upcomingHolidays?.length) return ''
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const descriptions = weekInfo.value.upcomingHolidays.map(h => {
    const dateStr = formatDate(h.date, 'M.DD')
    const weekday = weekdays[h.weekday]
    return `${weekday}(${dateStr})`
  })
  return descriptions.join('、') + ' 休息'
})

onMounted(() => {
  weekInfo.value = getWorkWeekInfo(new Date())
})
</script>
```

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

### 8. 数据持久化规范

**去除 Vue 响应式包装**：
在保存数据到 localStorage 或数据库前，必须创建纯净副本：

```javascript
// ❌ 错误：直接保存会包含 Vue 的响应式包装对象
await saveToStorage(key, records.value)

// ✅ 正确：创建纯净副本后再保存
const cleanData = JSON.parse(JSON.stringify(records.value))
await saveToStorage(key, cleanData)
```

**为什么必须这样做**：
- Vue 3 的 Proxy 对象包含循环引用，直接序列化会报错
- 去除包装后的数据更轻量，避免存储无用信息
- 确保数据在跨环境传递时的一致性

**实现位置**：
- `src/stores/records.js` - line 82
- `src/stores/settings.js` - line 98-106
- `src/stores/reports.js` - persist 方法

### 9. 日期格式规范

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

### 10. Pinia Store 结构规范

**所有 Store 必须使用 Setup Store 模式**，统一结构包含三个分隔部分：

```javascript
export const useXxxStore = defineStore('xxx', () => {
  // ============ 状态 ============
  const items = ref([])
  const status = ref('idle')

  // ============ 初始化 ============
  const init = async () => {
    // 初始化逻辑
  }

  // ============ 计算属性 ============
  const filteredItems = computed(() => {
    return items.value.filter(...)
  })

  // ============ 方法 ============
  const addItem = async (item) => {
    items.value.push(item)
    await persist()
  }

  const persist = async () => {
    // 持久化逻辑（必须去除响应式包装）
    const cleanData = JSON.parse(JSON.stringify(items.value))
    await saveToStorage(STORAGE_KEY, cleanData)
  }

  return {
    // 状态
    items,
    status,
    // 计算属性
    filteredItems,
    // 方法
    init,
    addItem,
    persist
  }
})
```

**分隔注释必须使用**：
- `// ============ 状态 ============`
- `// ============ 初始化 ============`（可选）
- `// ============ 计算属性 ============`
- `// ============ 方法 ============`

**为什么这样组织**：
- ✅ 代码结构清晰，便于快速定位
- ✅ 所有 Store 保持一致，降低维护成本
- ✅ Setup Store 模式比 Options Store 更简洁

**参考实现**：
- `src/stores/records.js` - 完整示例
- `src/stores/settings.js` - 复杂状态示例
- `src/stores/reports.js` - 报告管理示例

### 11. API 响应格式规范

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

### 12. 禁止使用原生弹窗规范

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

### 13. 标签显示规范

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

### 14. 软删除规范（强制）

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

// 软删除操作
UPDATE records SET deleted = 1, deletedAt = '2026-01-09T12:34:56.789Z' WHERE id = '123';

// 恢复操作
UPDATE records SET deleted = 0, deletedAt = NULL WHERE id = '123';

// 永久删除
DELETE FROM records WHERE id = '123';
```

**API 实现示例**：
```javascript
// 软删除
app.delete('/api/records/:id', async (req, res) => {
  const deletedAt = new Date().toISOString()
  await queryRun(db, 'UPDATE records SET deleted = 1, deletedAt = ? WHERE id = ?', [deletedAt, req.params.id])
  res.json({ success: true, message: '记录已移至回收站' })
})

// 恢复
app.post('/api/records/:id/restore', async (req, res) => {
  await queryRun(db, 'UPDATE records SET deleted = 0, deletedAt = NULL WHERE id = ?', [req.params.id])
  res.json({ success: true, message: '记录已恢复' })
})

// 永久删除
app.delete('/api/records/:id/permanent', async (req, res) => {
  await queryRun(db, 'DELETE FROM records WHERE id = ?', [req.params.id])
  res.json({ success: true, message: '记录已永久删除' })
})

// 查询已删除
app.get('/api/records', async (req, res) => {
  const { deleted } = req.query
  let sql = 'SELECT * FROM records'
  if (deleted === '1') {
    sql += ' WHERE deleted = 1'
  } else {
    sql += ' WHERE deleted = 0'
  }
  sql += ' ORDER BY createdAt DESC'
  // ...
})
```

**前端 Store 实现示例**：
```javascript
// 软删除
const deleteRecord = async (id) => {
  const response = await fetch(`http://localhost:3000/api/records/${id}`, {
    method: 'DELETE'
  })
  const result = await response.json()
  if (result.success) {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
    }
    return true
  }
  return false
}

// 恢复
const restoreRecord = async (id) => {
  const response = await fetch(`http://localhost:3000/api/records/${id}/restore`, {
    method: 'POST'
  })
  if (response.ok) {
    await init() // 重新加载数据
    return true
  }
  return false
}

// 获取已删除的数据
const deletedRecords = ref([])
const fetchDeletedRecords = async () => {
  const response = await fetch('http://localhost:3000/api/records?deleted=1')
  const result = await response.json()
  if (result.success) {
    deletedRecords.value = result.data
  }
}
```

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

### 工具函数
- **日期处理**: `src/utils/date.js` - 周边界、工作日计算、节假日判断
- **钉钉集成**: `src/utils/dingtalk.js` - Webhook 签名生成

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

---

## 路由定义顺序规则

**Express 路由必须按以下顺序定义**（`server/api.js`）：

1. 具体路由在前：`/api/records/batch`
2. 参数路由在后：`/api/records/:id`

**错误示例**（会导致 batch 被当作 :id 匹配）：
```javascript
app.put('/api/records/:id', ...)  // 错误：定义太早
app.put('/api/records/batch', ...)
```

**正确示例**：
```javascript
app.put('/api/records/batch', ...)  // 正确：定义在前
app.put('/api/records/:id', ...)
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

- [ ] 所有页面容器样式统一（.page-header）
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

---

## 最后更新

- **日期**: 2026-01-09
- **版本**: 2.1
- **主要更新**: 添加软删除规范（规则 #14）、完善代码审查清单
