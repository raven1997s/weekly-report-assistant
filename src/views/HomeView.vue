<template>
  <div class="home-view page-container">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">工作记录</h1>
        <p class="page-header-subtitle">记录工作内容，自动生成周报</p>
      </div>
      <!-- 简洁的周信息提示 -->
      <div v-if="weekInfo" class="week-info-wrapper">
        <div class="week-badge">
          <span class="week-range">{{ formatDate(weekInfo.start, 'MM.DD') }} - {{ formatDate(weekInfo.end, 'MM.DD') }}</span>
          <span class="week-divider">|</span>
          <span class="workday-count">{{ weekInfo.workdayCount }}个工作日</span>
          <span v-if="weekInfo.holidayCount > 0" class="holiday-hint">含{{ weekInfo.holidayCount }}天假期</span>
        </div>
        <!-- 假期详情 -->
        <div v-if="upcomingHolidaysText" class="upcoming-holidays">
          <svg class="holiday-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
          <span class="holiday-text">{{ upcomingHolidaysText }}</span>
        </div>
      </div>
    </div>

    <!-- 顶部：快速录入 -->
    <section class="input-section">
      <InputBox @record-added="handleRecordAdded" />
    </section>

    <!-- 中部：本周记录列表 -->
    <section class="list-section">
      <RecordList />
    </section>

    <!-- 确认弹窗 -->
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
import { ref, computed, onMounted } from 'vue'
import InputBox from '../components/InputBox.vue'
import RecordList from '../components/RecordList.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useDialogStore } from '../stores/dialog'
import { getWorkWeekInfo, formatDate } from '../utils/date'

const dialogStore = useDialogStore()

const weekInfo = ref(null)

// 计算即将到来的假期文本
const upcomingHolidaysText = computed(() => {
  if (!weekInfo.value || !weekInfo.value.upcomingHolidays || weekInfo.value.upcomingHolidays.length === 0) {
    return ''
  }

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const holidays = weekInfo.value.upcomingHolidays

  if (holidays.length === 0) return ''

  // 生成假期描述
  const descriptions = holidays.map(h => {
    const dateStr = formatDate(h.date, 'M.DD')
    const weekday = weekdays[h.weekday]
    return `${weekday}(${dateStr})`
  })

  return descriptions.join('、') + ' 休息'
})

const handleRecordAdded = (record) => {
  console.log('Record added:', record)
}

onMounted(() => {
  weekInfo.value = getWorkWeekInfo(new Date())
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// ========================================
// 页面头部
// ========================================
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4; // 顶部留白
  max-width: 100%;

  // 标题优化
  h1 {
    font-family: $font-family-heading;
    letter-spacing: -0.03em; // 更紧凑的字间距
    line-height: 1.2; // 更紧凑的行高
    font-weight: 700; // 更粗的字体
  }

  .page-header-subtitle {
    letter-spacing: -0.01em;
    line-height: 1.5;
    margin-top: $spacing-2;
  }

  // 大屏幕上增加间距
  @media (min-width: $breakpoint-xl) {
    gap: $spacing-8;
  }
}

// 周信息包装器（包含徽章和假期详情）
.week-info-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $spacing-2;
  flex-shrink: 0; // 防止被压缩
}

// 简洁的周信息徽章
.week-badge {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-2 $spacing-4;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  white-space: nowrap;
  transition: all $transition-fast;

  // 大屏幕上稍微增大
  @media (min-width: $breakpoint-xl) {
    padding: $spacing-3 $spacing-5;
    font-size: $font-size-base;
  }

  &:hover {
    border-color: var(--border-color-hover);
    background: var(--bg-card-hover);
  }

  .week-range {
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .week-divider {
    color: var(--divider-color);
    font-weight: $font-weight-normal;
  }

  .workday-count {
    color: var(--text-secondary);
    font-weight: $font-weight-medium;
    letter-spacing: -0.01em;
  }

  .holiday-hint {
    color: #f59e0b;
    font-weight: $font-weight-semibold;
    letter-spacing: -0.01em;
  }
}

// 假期详情
.upcoming-holidays {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: $font-size-xs;
  color: var(--text-muted);
  transition: all $transition-fast;

  // 大屏幕上稍微增大
  @media (min-width: $breakpoint-xl) {
    font-size: $font-size-sm;
    gap: $spacing-3;
  }

  .holiday-icon {
    font-size: $font-size-sm;

    @media (min-width: $breakpoint-xl) {
      font-size: $font-size-base;
    }
  }

  .holiday-text {
    color: var(--text-secondary);
    letter-spacing: -0.01em;
    font-weight: $font-weight-medium;
  }
}

.input-section {
  margin-bottom: $spacing-8;
  margin-top: $spacing-6; // 与页眉保持间距
  position: sticky;
  top: $spacing-4;
  z-index: 10;

  // 大屏幕上增加间距
  @media (min-width: $breakpoint-xl) {
    margin-bottom: $spacing-10;
    margin-top: $spacing-8;
  }
}

// ========================================
// 响应式断点
// ========================================

// 平板设备
@media (max-width: $breakpoint-lg) {
  .page-header {
    gap: $spacing-4;
  }
}

// 移动设备
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-4;
    padding-top: $spacing-2;
  }

  .week-info-wrapper {
    width: 100%;
    align-items: center;
  }

  .week-badge {
    width: 100%;
    justify-content: center;
  }

  .upcoming-holidays {
    justify-content: center;
  }

  .input-section {
    position: static;
    margin-bottom: $spacing-6;
    margin-top: $spacing-4;
  }
}

// 小屏手机
@media (max-width: $breakpoint-sm) {
  .page-header {
    h1 {
      font-size: $font-size-xl;
    }

    .page-header-subtitle {
      font-size: $font-size-sm;
    }
  }

  .week-badge {
    font-size: $font-size-xs;
    padding: $spacing-2 $spacing-3;
    gap: $spacing-2;
  }

  .upcoming-holidays {
    font-size: 11px;
  }
}
</style>
