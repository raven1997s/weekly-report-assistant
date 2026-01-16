<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <AppSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <!-- 移动端侧边栏遮罩 -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen"
        class="sidebar-overlay"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <!-- 浮动操作按钮组 -->
    <div class="fab-group">
      <!-- 主题切换按钮 -->
      <button
        class="fab-btn"
        :class="{ 'fab-btn-primary': true }"
        @click="settingsStore.toggleTheme"
        :title="settingsStore.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        :aria-label="settingsStore.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
      >
        <svg v-if="settingsStore.theme === 'dark'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
        </svg>
      </button>

      <!-- 快捷键帮助按钮 -->
      <button
        class="fab-btn"
        @click="showHelp = true"
        title="快捷键帮助 (Ctrl+/)"
        aria-label="快捷键帮助"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 7a1 1 0 100 2h3a1 1 0 100-2h-3zm0 4a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>

    <!-- 快捷键帮助弹窗 -->
    <Transition name="scale">
      <div v-if="showHelp" class="modal-overlay" @click="showHelp = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>快捷键</h3>
            <button class="close-btn" @click="showHelp = false" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div v-for="item in SHORTCUTS" :key="item.key" class="shortcut-item">
              <kbd>{{ formatShortcut(item.key) }}</kbd>
              <span>{{ item.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast 提示组件 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordsStore } from './stores/records'
import { useReportsStore } from './stores/reports'
import { useSettingsStore } from './stores/settings'
import { useKeyboard, SHORTCUTS } from './composables/useKeyboard'
import AppSidebar from './components/layout/AppSidebar.vue'
import Toast from './components/Toast.vue'

const router = useRouter()
const recordsStore = useRecordsStore()
const reportsStore = useReportsStore()
const settingsStore = useSettingsStore()

const isSidebarOpen = ref(false)
const showHelp = ref(false)

// ============ 数据刷新机制 ============

// 轮询定时器
let pollingTimer = null
// 防抖定时器
let debounceTimer = null

// 默认轮询间隔（30秒）
const DEFAULT_POLLING_INTERVAL = 30000

// 刷新所有 Store
const refreshAllStores = async () => {
  console.log('[App] 🔄 刷新所有数据...')
  try {
    await Promise.all([
      settingsStore.init(),
      recordsStore.init(),
      reportsStore.init()
    ])
    console.log('[App] ✅ 数据刷新完成')
  } catch (error) {
    console.error('[App] ❌ 数据刷新失败:', error)
  }
}

// 启动定期轮询
const startPolling = () => {
  // 立即执行一次刷新（仅在页面可见时）
  if (document.visibilityState === 'visible') {
    refreshAllStores()
  }

  // 启动定时器
  pollingTimer = setInterval(() => {
    // 仅在页面可见时轮询
    if (document.visibilityState === 'visible') {
      refreshAllStores()
    }
  }, DEFAULT_POLLING_INTERVAL)

  console.log(`[App] ⏰ 启动定期轮询，间隔: ${DEFAULT_POLLING_INTERVAL}ms`)
}

// 停止定期轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
    console.log('[App] ⏹️ 停止定期轮询')
  }
}

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('[App] 👁️ 页面变为可见，触发刷新')

    // 清除防抖定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // 防抖：500ms 后执行刷新
    debounceTimer = setTimeout(() => {
      refreshAllStores()
    }, 500)
  }
}

// 初始化快捷键
const { registerShortcut } = useKeyboard()

// 格式化快捷键显示
const formatShortcut = (key) => {
  return key.replace('Cmd', '⌘').replace('Ctrl', 'Ctrl').replace('Shift', '⇧')
}

onMounted(async () => {
  console.log('[App] 🚀 应用启动，初始化数据...')

  // 初始化所有 stores（等待数据加载完成）
  await settingsStore.init()
  await recordsStore.init()
  await reportsStore.init()

  console.log('[App] ✅ 数据加载完成')

  // 添加页面可见性监听
  document.addEventListener('visibilitychange', handleVisibilityChange)
  console.log('[App] 👁️ 已添加页面可见性监听')

  // 启动定期轮询
  startPolling()

  // 注册全局快捷键
  registerShortcut('Ctrl+N', () => {
    router.push('/')
    // 聚焦到输入框
    setTimeout(() => {
      const input = document.querySelector('.input-field')
      input?.focus()
    }, 100)
  }, '新建记录')

  registerShortcut('Ctrl+G', () => {
    router.push('/report')
  }, '生成周报')

  registerShortcut('Ctrl+H', () => {
    router.push('/history')
  }, '历史周报')

  registerShortcut('Ctrl+,', () => {
    router.push('/settings')
  }, '设置')

  registerShortcut('Escape', () => {
    showHelp.value = false
    isSidebarOpen.value = false
  }, '关闭弹窗')

  registerShortcut('Ctrl+/', () => {
    showHelp.value = !showHelp.value
  }, '快捷键帮助')
})

onUnmounted(() => {
  // 移除页面可见性监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // 停止定期轮询
  stopPolling()

  // 清除防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  console.log('[App] 🧹 清理完成')
})
</script>

<style lang="scss">
@use './assets/styles/variables.scss' as *;
@use './assets/styles/main.scss' as *;
@use 'sass:color';

// ========================================
// 浮动按钮组
// ========================================

.fab-group {
  position: fixed;
  bottom: $spacing-6;
  right: $spacing-6;
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  z-index: $z-fixed;
}

.fab-btn {
  width: 48px;
  height: 48px;
  border-radius: $radius-full;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-xl;
  transition: all $transition-fast;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-color-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  &:active {
    transform: translateY(0);
  }

  &-primary {
    background: $accent-primary;
    border-color: $accent-primary;
    color: white;

    &:hover {
      filter: brightness(0.95);
    }
  }
}

// ========================================
// 模态框
// ========================================

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal-backdrop;
  padding: $spacing-4;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-xl;
  max-width: 480px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  overflow: hidden;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-5 $spacing-6;
    border-bottom: 1px solid var(--border-color);

    h3 {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      border-radius: $radius-md;
      transition: all $transition-fast;

      &:hover {
        color: var(--text-primary);
        background: var(--bg-secondary);
      }
    }
  }

  .modal-body {
    padding: $spacing-5 $spacing-6;
    max-height: 60vh;
    overflow-y: auto;
  }
}

// ========================================
// 快捷键列表
// ========================================

.shortcut-item {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-3 0;
  border-bottom: 1px solid var(--divider-color);

  &:last-child {
    border-bottom: none;
  }

  kbd {
    min-width: 100px;
    padding: $spacing-2 $spacing-3;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    font-family: $font-family-mono;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-primary);
    text-align: center;
  }

  span {
    color: var(--text-secondary);
    font-size: $font-size-sm;
  }
}

// ========================================
// 响应式
// ========================================

@media (max-width: $breakpoint-md) {
  .fab-group {
    bottom: $spacing-4;
    right: $spacing-4;
  }

  .fab-btn {
    width: 44px;
    height: 44px;
    font-size: $font-size-lg;
  }

  .modal-content {
    max-width: calc(100vw - #{$spacing-8});
    margin: $spacing-4;
  }

  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-2;

    kbd {
      min-width: auto;
      align-self: flex-start;
    }
  }
}
</style>
