# 设计文档：下周计划和本周总结持久化方案

## 问题分析

### 当前架构的问题

```
┌─────────────────────────────────────────────────────────┐
│                    当前数据流（不一致）                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  工作记录 (records)                                       │
│    ├── 添加 → API POST /api/records                       │
│    ├── 查询 → API GET /api/records                        │
│    └── 存储 → database.records 表 ✅                       │
│                                                           │
│  下周计划 (plans)                                         │
│    ├── 添加 → localStorage.setItem()                       │
│    ├── 查询 → localStorage.getItem()                       │
│    └── 存储 → browser localStorage ❌                       │
│                                                           │
│  本周总结 (reflections)                                   │
│    ├── 修改 → localStorage.setItem()                       │
│    ├── 查询 → localStorage.getItem()                       │
│    └── 存储 → browser localStorage ❌                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 为什么选择 settings 表

**现有数据库结构**：
```sql
-- 已有四个表
records        -- 工作记录 ✅
reports        -- 周报归档 ✅
scheduled_tasks -- 定时任务 ✅
settings       -- 应用设置（键值对）✅
```

**settings 表的特点**：
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,    -- 键
  value TEXT NOT NULL       -- 值（JSON 字符串）
)
```

**复用 settings 表的优势**：
1. ✅ 无需新建表，减少数据库迁移复杂度
2. ✅ 键值对结构适合存储 JSON 数据
3. ✅ 已有读取 API，只需添加保存 API
4. ✅ 与其他配置（projects、workTypes、dingtalk）存储方式一致

## 设计方案

### 数据库存储键

```javascript
// settings 表中的键值对
'currentPlans'     -> '[{"id":"1","content":"完成登录功能","project":"WMS","workType":"需求开发"}]'
'currentReflections' -> '{"gains":"掌握了 Vue 3","losses":"测试覆盖不够"}'
```

### API 设计

#### 1. 读取下周计划和本周总结

**已有接口**：`GET /api/reports`

当前返回结构：
```javascript
{
  success: true,
  data: {
    reports: [...],          // 周报归档列表
    currentPlans: [...],     // 下周计划（已实现从 settings 读取）
    currentReflections: {...} // 本周总结（已实现从 settings 读取）
  }
}
```

✅ 这个接口已经实现了从 database 读取 plans 和 reflections，无需修改。

#### 2. 保存下周计划和本周总结

**新增接口**：`PUT /api/current-state`

```javascript
// 请求体
{
  currentPlans: [
    { id: "1", content: "完成登录功能", project: "WMS", workType: "需求开发" }
  ],
  currentReflections: {
    gains: "掌握了 Vue 3",
    losses: "测试覆盖不够"
  }
}

// 响应
{
  success: true,
  message: "当前编辑状态已保存"
}
```

### 前端实现

#### 修改 `reports.js` Store

```javascript
// ============ 初始化 ============
const init = async () => {
    // 从数据库加载历史周报
    try {
        const response = await fetch(`${API_BASE}/reports`)
        const result = await response.json()

        if (result.success) {
            reports.value = result.data.reports || []
            // 从数据库加载下周计划和本周总结 ✅
            currentPlans.value = result.data.currentPlans || []
            currentReflections.value = result.data.currentReflections || { gains: '', losses: '' }
        }
    } catch (error) {
        console.error('[Reports] 从数据库加载失败:', error)
        // 降级：从 localStorage 加载
        const saved = await loadFromStorage(STORAGE_KEY)
        if (saved) {
            reports.value = saved.reports || []
            currentPlans.value = saved.currentPlans || []
            currentReflections.value = saved.currentReflections || { gains: '', losses: '' }
        }
    }
}

// ============ 持久化保存 ============
const persist = async () => {
    // 保存到数据库（新增）✅
    try {
        const response = await fetch(`${API_BASE}/current-state`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPlans: JSON.parse(JSON.stringify(currentPlans.value)),
                currentReflections: JSON.parse(JSON.stringify(currentReflections.value))
            })
        })

        if (response.ok) {
            console.log('[Reports] ✅ 已保存到数据库')
        }
    } catch (error) {
        console.error('[Reports] 保存到数据库失败，降级到 localStorage:', error)
        // 降级：保存到 localStorage
        const cleanData = {
            reports: JSON.parse(JSON.stringify(reports.value)),
            currentPlans: JSON.parse(JSON.stringify(currentPlans.value)),
            currentReflections: JSON.parse(JSON.stringify(currentReflections.value))
        }
        await saveToStorage(STORAGE_KEY, cleanData)
    }
}
```

#### 修改 `api.js` 工具函数

```javascript
/**
 * 保存当前编辑状态（下周计划 + 本周总结）
 * @param {Object} data - { currentPlans, currentReflections }
 * @returns {Promise<void>}
 */
export async function saveCurrentState(data) {
    const response = await fetch(`${API_BASE}/current-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    const result = await response.json()
    if (!result.success) {
        throw new Error(result.error || '保存失败')
    }
    return result
}
```

### 后端实现

#### 新增 API 端点

```javascript
// PUT /api/current-state - 保存当前编辑状态
app.put('/api/current-state', async (req, res) => {
    try {
        const { currentPlans, currentReflections } = req.body

        const db = await createDbConnection()

        // 保存下周计划
        await queryRun(
            db,
            `INSERT OR REPLACE INTO settings (key, value) VALUES ('currentPlans', ?)`,
            [JSON.stringify(currentPlans || [])]
        )

        // 保存本周总结
        await queryRun(
            db,
            `INSERT OR REPLACE INTO settings (key, value) VALUES ('currentReflections', ?)`,
            [JSON.stringify(currentReflections || { gains: '', losses: '' })]
        )

        db.close()

        console.log('[API] 当前编辑状态已保存')
        res.json({ success: true, message: '当前编辑状态已保存' })
    } catch (error) {
        console.error('[API] 保存当前状态失败:', error)
        res.status(500).json({ success: false, error: error.message })
    }
})
```

## 数据迁移策略

### 首次访问时的迁移

```
用户首次访问（或刷新页面）
    │
    ├─→ 尝试从 database 加载 currentPlans
    │   └─→ 如果存在 → 使用 database 数据 ✅
    │   └─→ 如果不存在 → 尝试从 localStorage 读取
    │       └─→ 如果存在 → 写入 database 并删除 localStorage ✅
    │       └─→ 如果不存在 → 使用空数组/空对象 ✅
    │
    └─→ 对 currentReflections 执行同样逻辑
```

### 迁移代码示例

```javascript
const init = async () => {
    // 1. 从数据库加载
    const response = await fetch(`${API_BASE}/reports`)
    const result = await response.json()

    if (result.success) {
        reports.value = result.data.reports || []
        currentPlans.value = result.data.currentPlans || []
        currentReflections.value = result.data.currentReflections || { gains: '', losses: '' }
    }

    // 2. 如果数据库为空，尝试从 localStorage 迁移
    if (currentPlans.value.length === 0) {
        const saved = await loadFromStorage(STORAGE_KEY)
        if (saved?.currentPlans?.length > 0) {
            console.log('[Reports] 从 localStorage 迁移数据到 database')
            currentPlans.value = saved.currentPlans
            currentReflections.value = saved.currentReflections || { gains: '', losses: '' }

            // 写入数据库并清理 localStorage
            await persist()

            // 清理 localStorage（可选，保留作为备份）
            // await removeFromStorage(STORAGE_KEY)
        }
    }
}
```

## 优势总结

| 方面 | 改进前（localStorage） | 改进后（database） |
|------|---------------------|-------------------|
| 数据持久性 | ❌ 清除缓存丢失 | ✅ 永久保存 |
| 跨设备同步 | ❌ 无法同步 | ✅ 可同步 |
| 存储容量 | ⚠️ 有限（5-10MB） | ✅ 无限制 |
| 数据一致性 | ❌ 与 records 不一致 | ✅ 统一存储 |
| 可靠性 | ⚠️ 依赖浏览器 | ✅ 服务端保证 |
| 备份恢复 | ❌ 困难 | ✅ 文件级备份 |
