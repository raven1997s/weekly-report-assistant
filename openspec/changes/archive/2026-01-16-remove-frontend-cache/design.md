# Design: Remove Frontend Cache and Ensure Data Real-time Sync

## Architecture Overview

### Current Architecture (混合存储架构)

```
┌─────────────────────────────────────────────────────────────┐
│                      应用启动                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  App.vue onMounted()                                         │
│  ├─ settingsStore.init()                                     │
│  ├─ recordsStore.init()                                      │
│  └─ reportsStore.init()                                      │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ Settings │        │ Records  │        │ Reports  │
    │  Store   │        │  Store   │        │  Store   │
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │   API    │        │   API    │        │   API    │
    │  调用    │        │  调用    │        │  调用    │
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    ┌────────────────────────────────────────────────────────┐
    │              后端 API (Express + SQLite)                │
    └────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   localStorage    │  ← ⚠️ 降级/备份
                    │   (浏览器缓存)    │
                    └──────────────────┘
```

**问题**:
- localStorage 作为降级方案，数据不一致
- 无数据刷新机制，多标签页不同步

### Target Architecture (纯 API 架构)

```
┌─────────────────────────────────────────────────────────────┐
│                      应用启动                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  App.vue                                                     │
│  ├─ onMounted(): 初始化所有 Store                            │
│  ├─ onVisibilityChange: 页面可见时刷新数据                    │
│  └─ setInterval: 定期刷新数据 (30s)                           │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ Settings │        │ Records  │        │ Reports  │
    │  Store   │        │  Store   │        │  Store   │
    │ (内存)   │        │  (内存)  │        │  (内存)   │
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  统一 API 封装    │
                    │  (src/utils/api) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   后端 API       │
                    │ (Express + SQLite)│
                    └──────────────────┘
```

**改进**:
- 移除 localStorage，仅内存缓存
- 添加自动刷新机制（可见性监听 + 定期轮询）
- 单向数据流：数据库 → API → UI

## Data Flow Design

### 读取数据流程

```
┌──────────────┐
│ UI 组件      │
│ (需要数据)   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Pinia Store                                               │
│ 1. 检查内存缓存是否存在                                   │
│ 2. 如果不存在，调用 API                                   │
│ 3. 更新内存缓存                                           │
│ 4. 返回数据给 UI                                          │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ API Layer (src/utils/api.js)                              │
│ 1. 构造请求 URL                                           │
│ 2. 发送 fetch 请求                                        │
│ 3. 解析响应                                               │
│ 4. 错误处理：失败时抛出异常（不降级）                     │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 后端 API (server/api.js)                                  │
│ 1. 验证请求参数                                           │
│ 2. 查询数据库                                             │
│ 3. 返回 JSON 响应                                         │
└──────────────────────────────────────────────────────────┘
```

### 写入数据流程

```
┌──────────────┐
│ UI 组件      │
│ (用户操作)   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Pinia Store                                               │
│ 1. 更新内存缓存（乐观更新，可选）                         │
│ 2. 调用 API 写入                                          │
│ 3. 如果失败，回滚内存缓存并显示错误                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ API Layer (src/utils/api.js)                              │
│ 1. 构造请求 URL 和 Body                                   │
│ 2. 发送 fetch 请求                                        │
│ 3. 解析响应                                               │
│ 4. 错误处理：失败时抛出异常（不降级）                     │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 后端 API (server/api.js)                                  │
│ 1. 验证请求参数                                           │
│ 2. 写入数据库                                             │
│ 3. 返回成功响应                                           │
└──────────────────────────────────────────────────────────┘
```

### 自动刷新流程

```
┌──────────────────────────────────────────────────────────┐
│ App.vue                                                   │
│                                                           │
│ // 1. 页面可见性监听                                       │
│ document.addEventListener('visibilitychange', () => {     │
│   if (document.visibilityState === 'visible') {          │
│     await refreshAllStores()  // 防抖 500ms               │
│   }                                                       │
│ })                                                        │
│                                                           │
│ // 2. 定期轮询                                             │
│ setInterval(async () => {                                 │
│   if (document.visibilityState === 'visible') {          │
│     await refreshAllStores()  // 30秒间隔                 │
│   }                                                       │
│ }, 30000)                                                 │
│                                                           │
│ async function refreshAllStores() {                       │
│   await Promise.all([                                     │
│     settingsStore.init(),                                 │
│     recordsStore.init(),                                  │
│     reportsStore.init()                                   │
│   ])                                                      │
│ }                                                         │
└──────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. 移除 localStorage 的原因

| 决策 | 理由 |
|------|------|
| **禁止降级** | 降级导致数据不一致，用户不知道数据来源 |
| **禁止备份** | 数据库已有数据，localStorage 备份无意义 |
| **仅内存缓存** | 前端 Store 仅作为临时缓存，不持久化 |

### 2. 自动刷新策略

| 策略 | 触发条件 | 频率 | 说明 |
|------|----------|------|------|
| **页面可见性监听** | 标签页从隐藏变为可见 | 按需（防抖 500ms） | 用户切换标签页时立即刷新 |
| **定期轮询** | 页面可见时持续运行 | 每 30 秒 | 确保数据不会过期太久 |

**为什么不使用 WebSocket**:
- 当前应用规模小，轮询足够
- WebSocket 增加复杂度和服务器负载
- 未来可作为可选升级

### 3. 错误处理策略

| 场景 | 当前行为 | 新行为 |
|------|----------|--------|
| API 失败 | 静默降级到 localStorage | 显示错误提示，提供重试 |
| 网络断开 | 无法感知 | 显示"网络连接失败"提示 |
| 数据冲突 | 无检测 | 提示用户刷新页面 |

### 4. 批量操作的处理

| 操作 | 当前实现 | 新实现 |
|------|----------|--------|
| 批量添加记录 | `PUT /api/records/batch` (先清空再插入) | 逐条 `POST /api/records` |
| 批量更新 | 不支持 | 逐条 `PUT /api/records/:id` |
| 批量删除 | 不支持 | 逐条 `DELETE /api/records/:id` |

**原因**: 批量替换接口存在原子性问题（如果插入失败，所有数据丢失）

## Implementation Details

### Store 统一结构

所有 Store 遵循统一的结构：

```javascript
export const useXxxStore = defineStore('xxx', () => {
  // ============ 状态 ============
  const items = ref([])           // 内存缓存
  const syncing = ref(false)      // 同步状态
  const error = ref(null)         // 错误信息

  // ============ 初始化 ============
  const init = async () => {
    syncing.value = true
    try {
      const data = await getXxxFromAPI()
      items.value = data
      error.value = null
    } catch (err) {
      error.value = err.message
      showToast(err.message, true)
    } finally {
      syncing.value = false
    }
  }

  // ============ 计算属性 ============
  const filteredItems = computed(() => {
    return items.value.filter(...)
  })

  // ============ 方法 ============
  const addItem = async (item) => {
    try {
      await addItemToAPI(item)
      await init()  // 刷新数据
    } catch (err) {
      showToast(err.message, true)
    }
  }

  return {
    items,
    syncing,
    error,
    filteredItems,
    init,
    addItem
  }
})
```

### API 封装统一结构

```javascript
// src/utils/api.js

async function getRecords() {
  return await request('/records')
}

async function addRecord(record) {
  return await request('/records', {
    method: 'POST',
    body: JSON.stringify(record)
  })
}

async function updateRecord(id, record) {
  return await request(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(record)
  })
}

async function deleteRecord(id) {
  return await request(`/records/${id}`, {
    method: 'DELETE'
  })
}

// 统一请求封装
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })

  const result = await response.json()

  if (!result.success) {
    // 不再降级到 localStorage
    throw new Error(result.error || '请求失败')
  }

  return result.data
}
```

## Migration Strategy

### 数据迁移（一次性）

1. **应用启动时检测 localStorage 是否有旧数据**
2. **如果有，自动迁移到数据库**
3. **迁移完成后删除 localStorage 数据**

```javascript
// src/stores/reports.js

const init = async () => {
  // 1. 优先从数据库加载
  const response = await fetch(`${API_BASE}/reports`)
  const result = await response.json()

  if (result.success) {
    reports.value = result.data.reports || []
    currentPlans.value = result.data.currentPlans || []
    currentReflections.value = result.data.currentReflections || {}

    // 2. 检查是否需要迁移
    const oldData = localStorage.getItem('weekly_reports')
    if (oldData) {
      const parsed = JSON.parse(oldData)
      // 如果数据库为空但 localStorage 有数据，迁移
      if (currentPlans.value.length === 0 && parsed.currentPlans?.length > 0) {
        await migrateToDatabase(parsed)
        localStorage.removeItem('weekly_reports')
      }
    }
  } else {
    throw new Error(result.error || '加载数据失败')
  }
}

const migrateToDatabase = async (oldData) => {
  console.log('[Migrate] 正在迁移 localStorage 数据到数据库...')
  await saveCurrentState(oldData.currentPlans || [], oldData.currentReflections || {})
  console.log('[Migrate] 迁移完成')
}
```

### API 失败处理

```javascript
const init = async () => {
  syncing.value = true
  try {
    const data = await getXxxFromAPI()
    items.value = data
    error.value = null
  } catch (err) {
    // 不再降级到 localStorage
    error.value = err.message
    showToast(`加载数据失败: ${err.message}`, true)
    // 可选：提供重试按钮
    throw err
  } finally {
    syncing.value = false
  }
}
```

## Performance Considerations

### API 调用优化

| 问题 | 解决方案 |
|------|----------|
| 频繁切换标签页导致过多 API 调用 | 防抖 500ms |
| 定期轮询与可见性监听冲突 | 共享同一个刷新函数 |
| 多个 Store 同时刷新 | 使用 `Promise.all()` 并行 |

### 内存使用

- Store 中的数据仅保留当前需要的数据
- 不再使用 localStorage，节省存储空间
- 历史数据按需从 API 加载（如分页）

## Security Considerations

- 所有 API 调用使用 HTTPS（生产环境）
- 不在 localStorage 存储敏感信息（已移除）
- API 响应统一验证 `{ success, data?, error? }`

## Testing Strategy

### 单元测试

- 测试 API 封装函数（成功/失败场景）
- 测试 Store 的 `init()` 方法
- 测试错误处理逻辑

### 集成测试

- 测试多标签页数据同步
- 测试页面可见性监听
- 测试定期轮询功能

### 手动测试

1. 打开两个标签页，操作一个标签页，验证另一个标签页自动更新
2. 断开网络，操作数据，验证显示错误提示
3. 长时间打开页面，验证定期轮询是否运行

## Rollback Plan

如果新架构导致问题，可以回滚到混合存储架构：

1. 恢复 `src/utils/api.js` 中的 localStorage 操作
2. 恢复 `src/stores/*.js` 中的降级逻辑
3. 禁用自动刷新机制
4. 恢复 `PUT /api/records/batch` 接口

回滚步骤：
```bash
git revert <commit-hash>
npm run dev
```

## Future Enhancements

### 短期（1-2 周）
- [ ] 添加"最后更新时间"显示
- [ ] 添加"手动刷新"按钮
- [ ] 优化错误提示 UI

### 中期（1-2 月）
- [ ] 实现乐观更新（Optimistic UI）
- [ ] 添加离线检测提示
- [ ] 支持自定义轮询间隔

### 长期（3-6 月）
- [ ] WebSocket 实时推送
- [ ] 多用户冲突检测
- [ ] 数据版本控制
