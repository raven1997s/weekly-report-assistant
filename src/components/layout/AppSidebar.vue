<template>
  <aside class="app-sidebar" :class="{ open: isOpen }">
    <!-- Logo -->
    <div class="app-sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M18 9l-5 5-4-4-3 3"/>
          </svg>
        </div>
        <span class="logo-text">周报助手</span>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="app-sidebar-nav">
      <ul class="nav-menu">
        <li class="nav-menu-item" v-for="route in navRoutes" :key="route.path">
          <router-link
            :to="route.path"
            class="nav-menu-link"
            :class="{ active: isActive(route.path) }"
            :aria-label="route.meta.title"
            :aria-current="isActive(route.path) ? 'page' : undefined"
            @click="handleNavClick"
          >
            <span class="icon" aria-hidden="true">
              <!-- 工作记录图标 -->
              <svg v-if="route.path === '/'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <!-- 生成周报图标 -->
              <svg v-else-if="route.path === '/report'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M18 9l-5 5-4-4-3 3"/>
              </svg>
              <!-- 历史周报图标 -->
              <svg v-else-if="route.path === '/history'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
              <!-- 设置图标 -->
              <svg v-else-if="route.path === '/settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
                <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24"/>
                <path d="M1 12h6m6 0h6"/>
                <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24"/>
              </svg>
              <!-- 回收站图标 -->
              <svg v-else-if="route.path === '/recycle-bin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <!-- 默认图标 -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"/>
              </svg>
            </span>
            <span class="label">{{ route.meta.title }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- 底部信息 -->
    <div class="app-sidebar-footer">
      <div v-if="weekInfo" class="week-info">
        <div class="week-label">{{ weekLabel }}</div>
        <div class="week-range">{{ weekRange }}</div>
      </div>
      <div v-if="!weekInfo?.hasNoWorkdays" class="stats">
        <span class="stat-item">
          <span class="stat-value">{{ recordCount }}</span>
          <span class="stat-label">条记录</span>
        </span>
      </div>
      <!-- 全节假日周提示 -->
      <div v-else class="no-workdays-hint">
        <span class="hint-text">本周无工作日</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRecordsStore } from '../../stores/records'
import { getWorkMonthWeekLabel, getWorkWeekInfo, formatDate } from '../../utils/date'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const route = useRoute()
const recordsStore = useRecordsStore()

// 导航路由
const navRoutes = [
  { path: '/', meta: { title: '工作记录' } },
  { path: '/report', meta: { title: '生成周报' } },
  { path: '/history', meta: { title: '历史周报' } },
  { path: '/settings', meta: { title: '设置' } },
  { path: '/recycle-bin', meta: { title: '回收站' } }
]

// 当前路由是否激活
const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 工作周信息（使用 ref 响应式数据）
const weekInfo = ref(null)

// 周标签（按工作月显示：2026年3月第4周）
const weekLabel = computed(() => getWorkMonthWeekLabel(new Date()))

// 工作周日期范围
const weekRange = computed(() => {
  if (!weekInfo.value || weekInfo.value.hasNoWorkdays) {
    return '本周无工作日'
  }
  const { start, end } = weekInfo.value
  return `${formatDate(start, 'MM.DD')} - ${formatDate(end, 'MM.DD')}`
})

// 本周记录数（基于工作周）
const recordCount = computed(() => {
  return recordsStore.currentWorkWeekRecords.length
})

// 初始化工作周信息
onMounted(() => {
  weekInfo.value = getWorkWeekInfo(new Date())
})

// 导航点击处理（移动端关闭侧边栏）
const handleNavClick = () => {
  if (window.innerWidth < 1024) {
    emit('close')
  }
}
</script>

<style lang="scss" scoped>
@use '../../assets/styles/variables.scss' as *;

.app-sidebar {
  width: $sidebar-width;
  background: color-mix(in srgb, var(--bg-secondary) 90%, transparent);
  border-right: 1px solid var(--border-color);
  box-shadow: 8px 0 30px rgba(30, 41, 76, 0.035);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: $z-fixed;
  transition: transform $transition-normal;

  &-header {
    padding: $spacing-5 $spacing-5;
    border-bottom: 1px solid var(--border-color);

    .logo {
      display: flex;
      align-items: center;
      gap: $spacing-3;

      &-icon {
        width: 40px;
        height: 40px;
        background: $accent-gradient;
        border-radius: $radius-lg;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
        box-shadow: 0 8px 18px rgba($accent-primary, 0.24);

        svg {
          width: 20px;
          height: 20px;
        }
      }

      &-text {
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
        color: var(--text-primary);
        letter-spacing: -0.025em;
      }
    }
  }

  &-nav {
    flex: 1;
    padding: $spacing-4 $spacing-3;
    overflow-y: auto;
  }

  &-footer {
    padding: $spacing-4 $spacing-3;
    border-top: 1px solid var(--border-color);
  }
}

// 导航菜单
.nav-menu {
  list-style: none;

  &-item {
    margin-bottom: $spacing-1;
  }

  &-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: $spacing-3;
    min-height: 44px;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius-lg;
    color: var(--text-secondary);
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    transition: all $transition-fast;
    text-decoration: none;

    &:hover {
      color: var(--text-primary);
      background: var(--bg-card);
      transform: translateX(2px);
    }

    &.active {
      color: $accent-primary;
      background: $accent-light;
      box-shadow: inset 0 0 0 1px rgba($accent-primary, 0.1), var(--shadow-xs);

      &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 22px;
        background: $accent-primary;
        border-radius: 0 $radius-full $radius-full 0;
      }
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
      height: 20px;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .label {
      flex: 1;
    }
  }
}

// 底部信息区域
.week-info {
  padding: $spacing-4;
  background: var(--bg-card);
  border-radius: $radius-lg;
  margin-bottom: $spacing-3;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-xs);

  .week-label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }

  .week-range {
    font-size: $font-size-xs;
    color: var(--text-muted);
    margin-top: 2px;
  }
}

.stats {
  display: flex;
  gap: $spacing-3;

  .stat-item {
    display: flex;
    align-items: baseline;
    gap: 4px;

    .stat-value {
      font-size: $font-size-xl;
      font-weight: $font-weight-semibold;
      color: $accent-primary;
    }

    .stat-label {
      font-size: $font-size-xs;
      color: var(--text-muted);
    }
  }
}

// 全节假日周提示
.no-workdays-hint {
  padding: $spacing-3;
  background: var(--bg-card);
  border-radius: $radius-md;
  border: 1px solid var(--border-color);
  text-align: center;

  .hint-text {
    font-size: $font-size-xs;
    color: var(--text-muted);
    font-weight: $font-weight-medium;
  }
}

// 响应式
@media (max-width: 1024px) {
  .app-sidebar {
    transform: translateX(-100%);

    &.open {
      transform: translateX(0);
      box-shadow: var(--shadow-xl);
    }
  }
}
</style>
