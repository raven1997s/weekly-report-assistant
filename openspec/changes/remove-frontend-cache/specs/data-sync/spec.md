# data-sync Specification

## Purpose

确保所有数据的增删改查行为全部都必须通过接口获取，禁止使用任何前端缓存，并提供自动刷新机制以支持多标签页/多设备数据实时同步。

## ADDED Requirements

### Requirement: 禁止使用前端缓存

系统 SHALL 不使用 localStorage、sessionStorage、IndexedDB 等任何前端存储技术作为数据缓存，所有数据必须通过 API 从数据库实时读取。

#### Scenario: 读取数据不使用缓存

- **WHEN** 应用启动或用户触发数据加载
- **THEN** 系统直接调用后端 API 获取数据
- **AND** 不检查 localStorage 是否有缓存数据
- **AND** 不将 API 响应保存到 localStorage
- **AND** 仅在内存中保留当前需要的数据（Pinia Store）

#### Scenario: 写入数据不使用缓存

- **WHEN** 用户执行写入操作（添加、修改、删除）
- **THEN** 系统直接调用后端 API 写入数据
- **AND** 不将数据先保存到 localStorage 稍后同步
- **AND** API 失败时不降级到 localStorage
- **AND** 向用户显示明确的错误提示

#### Scenario: 前端仅使用内存缓存

- **WHEN** 系统从 API 获取数据
- **THEN** 数据仅存储在 Pinia Store 中（内存）
- **AND** 页面刷新后重新从 API 加载
- **AND** 关闭浏览器后数据自动清除（不持久化）

### Requirement: 多标签页数据自动同步

系统 SHALL 提供多标签页数据自动同步功能，确保一个标签页的修改能实时反映到其他标签页。

#### Scenario: 页面可见性监听

- **WHEN** 用户在标签页 A 中添加了一条工作记录
- **AND** 用户切换到标签页 B（标签页 B 从隐藏变为可见）
- **THEN** 系统触发 `visibilitychange` 事件
- **AND** 自动调用所有 Store 的 `init()` 方法刷新数据
- **AND** 标签页 B 显示最新的工作记录

#### Scenario: 防抖避免频繁刷新

- **WHEN** 用户在 5 秒内频繁切换标签页 10 次
- **THEN** 系统使用防抖机制（500ms）
- **AND** 只有最后一次切换后 500ms 才执行刷新
- **AND** 避免短时间内发送过多 API 请求

#### Scenario: 页面隐藏时暂停轮询

- **WHEN** 用户切换到其他标签页或最小化窗口
- **THEN** 系统暂停定期轮询
- **AND** 用户切换回来后，轮询自动恢复
- **AND** 恢复时立即执行一次刷新（不等待轮询间隔）

### Requirement: 定期轮询刷新数据

系统 SHALL 在页面可见时定期刷新数据，确保数据不会过期太久。

#### Scenario: 定期轮询默认间隔

- **WHEN** 页面处于可见状态
- **AND** 距离上次刷新超过 30 秒
- **THEN** 系统自动调用所有 Store 的 `init()` 方法
- **AND** 后台静默刷新，不显示任何提示
- **AND** 如果检测到数据更新，UI 自动反映最新状态

#### Scenario: 轮询间隔可配置

- **WHEN** 用户在设置中修改 `轮询间隔` 配置项
- **THEN** 系统使用新的轮询间隔
- **AND** 默认间隔为 30000ms（30秒）
- **AND** 可配置范围：10000ms（10秒）到 300000ms（5分钟）
- **AND** 修改后立即生效，无需重启应用

#### Scenario: 轮询与可见性监听配合

- **WHEN** 用户长时间停留在某个标签页（超过轮询间隔）
- **THEN** 定期轮询自动刷新数据
- **AND** 如果用户切换到其他标签页，轮询暂停
- **AND** 用户切换回来后，立即执行一次刷新

### Requirement: API 失败错误处理

系统 SHALL 在 API 调用失败时向用户显示明确的错误提示，禁止静默降级到前端缓存。

#### Scenario: 网络错误处理

- **WHEN** 用户执行操作时网络断开
- **THEN** 系统捕获网络错误
- **AND** 显示 Toast 提示："网络连接失败，请检查网络设置"
- **AND** 提供"重试"按钮，用户可手动重新执行操作
- **AND** 不降级到 localStorage

#### Scenario: 服务器错误处理

- **WHEN** 后端 API 返回 500 或其他错误
- **THEN** 系统解析错误响应
- **AND** 显示 Toast 提示："服务器错误，请稍后重试"
- **AND** 在控制台输出详细错误日志
- **AND** 不降级到 localStorage

#### Scenario: 超时错误处理

- **WHEN** API 请求超过 10 秒未响应
- **THEN** 系统中断请求并抛出超时错误
- **AND** 显示 Toast 提示："请求超时，请检查网络连接"
- **AND** 提供"重试"按钮

### Requirement: 数据同步状态指示

系统 SHALL 在刷新数据时提供视觉反馈，让用户了解数据同步状态。

#### Scenario: 显示"正在同步"提示

- **WHEN** 用户点击"刷新"按钮手动触发刷新
- **THEN** 在页面顶部显示"正在同步..."提示
- **AND** 使用 Toast 组件显示（z-index: 1070）
- **AND** 刷新完成后自动消失（2秒后）
- **AND** 如果刷新失败，显示错误提示

#### Scenario: 后台刷新不显示提示

- **WHEN** 系统通过定期轮询或页面可见性监听刷新数据
- **THEN** 不显示任何提示（静默刷新）
- **AND** 如果检测到数据更新，UI 自动反映最新状态
- **AND** 用户无感知地完成数据同步

#### Scenario: 显示"最后更新时间"

- **WHEN** 数据加载完成
- **THEN** 在页面底部显示"最后更新: XX:XX:XX"
- **AND** 格式为 HH:MM:SS（24小时制）
- **AND** 用户 hover 时显示完整时间（YYYY-MM-DD HH:MM:SS）
- **AND** 每次刷新后自动更新

### Requirement: 数据冲突检测

系统 SHALL 检测数据冲突，当检测到服务器数据比本地数据新时，提示用户刷新页面。

#### Scenario: 检测到数据更新

- **WHEN** 系统定期轮询刷新数据
- **AND** 检测到服务器数据比本地数据新（比较 `updatedAt` 字段）
- **THEN** 显示 Toast 提示："检测到新数据，页面已自动刷新"
- **AND** 自动重新加载数据
- **AND** UI 反映最新状态

#### Scenario: 多用户编辑冲突

- **WHEN** 用户 A 正在编辑某条记录
- **AND** 用户 B 同时修改了同一条记录
- **THEN** 用户 A 保存时检测到冲突
- **AND** 显示提示："该记录已被其他用户修改，请刷新后重新编辑"
- **AND** 提供"刷新"按钮，用户可重新加载最新数据

#### Scenario: 乐观更新回滚

- **WHEN** 用户执行操作后，系统立即更新 UI（乐观更新）
- **AND** API 请求失败
- **THEN** 系统回滚 UI 到操作前的状态
- **AND** 显示错误提示："操作失败，请重试"
- **AND** 保持数据一致性

## Cross-Reference

相关规格：
- **persistence**: 数据持久化需求（已修改，移除 localStorage 降级）
- **database-management**: 数据库管理相关需求

## Implementation Notes

### 页面可见性监听实现

```javascript
// src/App.vue

import { ref, onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    const refreshTimer = ref(null)
    const debounceTimer = ref(null)

    const refreshAllStores = async () => {
      // 清除防抖定时器
      if (debounceTimer.value) {
        clearTimeout(debounceTimer.value)
      }

      // 防抖：500ms 后执行刷新
      debounceTimer.value = setTimeout(async () => {
        await Promise.all([
          settingsStore.init(),
          recordsStore.init(),
          reportsStore.init()
        ])
      }, 500)
    }

    const startPolling = () => {
      // 立即执行一次刷新
      refreshAllStores()

      // 启动定期轮询
      refreshTimer.value = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshAllStores()
        }
      }, settingsStore.pollingInterval || 30000)
    }

    const stopPolling = () => {
      if (refreshTimer.value) {
        clearInterval(refreshTimer.value)
        refreshTimer.value = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllStores()
      }
    }

    onMounted(() => {
      // 添加可见性监听
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // 启动定期轮询
      startPolling()
    })

    onUnmounted(() => {
      // 移除可见性监听
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // 停止定期轮询
      stopPolling()
    })
  }
}
```

### API 错误处理实现

```javascript
// src/utils/api.js

async function request(endpoint, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const url = `${API_BASE}${endpoint}`
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options
    })

    clearTimeout(timeoutId)

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '请求失败')
    }

    return result.data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接')
    }

    throw error
  }
}
```

### Store 统一结构

```javascript
// src/stores/records.js

export const useRecordsStore = defineStore('records', () => {
  const records = ref([])
  const syncing = ref(false)
  const lastUpdated = ref(null)

  const init = async () => {
    syncing.value = true
    try {
      const data = await getRecords()
      records.value = data
      lastUpdated.value = new Date()
    } catch (error) {
      showToast(error.message, true)
      throw error
    } finally {
      syncing.value = false
    }
  }

  return {
    records,
    syncing,
    lastUpdated,
    init
  }
})
```

## Migration Guide

### 从旧版本迁移

1. **移除 localStorage 操作**:
   - 删除 `saveToStorage()` 中的 localStorage 代码
   - 删除 `loadFromStorage()` 中的 localStorage 代码
   - 删除所有 localStorage 迁移和降级逻辑

2. **添加自动刷新机制**:
   - 在 `App.vue` 中添加页面可见性监听
   - 在 `App.vue` 中添加定期轮询
   - 在 Store 中添加 `syncing` 状态

3. **更新错误处理**:
   - API 失败时显示错误提示
   - 移除 localStorage 降级逻辑

4. **测试**:
   - 测试多标签页同步
   - 测试定期轮询
   - 测试错误处理
