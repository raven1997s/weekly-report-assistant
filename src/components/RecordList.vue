<template>
  <div class="record-list">
    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="successMessage" class="toast-message" :class="{ error: isError }">
        <svg v-if="!isError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>
    <div class="record-filters" aria-label="工作记录筛选">
      <label class="filter-field">
        <span>项目</span>
        <select v-model="selectedProject" class="filter-select project-filter">
          <option value="">全部项目</option>
          <option v-for="project in projectOptions" :key="project" :value="project">{{ project }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>类型</span>
        <select v-model="selectedWorkType" class="filter-select type-filter">
          <option value="">全部类型</option>
          <option v-for="type in workTypeOptions" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>状态</span>
        <select v-model="selectedStatus" class="filter-select status-filter">
          <option value="">全部状态</option>
          <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
      <button v-if="hasActiveFilters" class="btn btn-ghost btn-sm" type="button" @click="resetFilters">清除筛选</button>
    </div>
    <!-- 空状态 -->
    <div v-if="groupedRecords && Object.keys(groupedRecords).length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </div>
      <div class="empty-state-title">暂无工作记录</div>
      <div class="empty-state-desc">{{ hasActiveFilters ? '没有符合筛选条件的记录' : '在上方输入框记录你的工作内容' }}</div>
    </div>

    <!-- 按项目分组展示 -->
    <div v-else class="record-groups">
      <div
        v-for="(records, project) in groupedRecords"
        :key="project"
        class="record-group"
      >
        <div class="group-header">
          <h3 class="group-title">{{ project }}</h3>
          <span class="group-count">{{ records.length }}</span>
        </div>
        <div class="group-content">
          <draggable
            :list="records"
            item-key="id"
            handle=".drag-handle"
            @end="onDragEnd(records)"
            ghost-class="ghost-card"
            drag-class="dragging-card"
          >
            <template #item="{ element: record }">
              <Transition name="list-item" appear>
                <RecordCard
                  :record="record"
                  :draggable="true"
                  @deleted="handleDeleted"
                  @updated="handleUpdated"
                  @moveToNextWeek="handleMoveToNextWeek"
                />
              </Transition>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import RecordCard from './RecordCard.vue'
import { useRecordsStore } from '../stores/records'
import { useReportsStore } from '../stores/reports'
import { useDialogStore } from '../stores/dialog'
import { useSettingsStore } from '../stores/settings'
import { mergeRecordStatusNames, resolveRecordStatus } from '../../shared/record-status'

const recordsStore = useRecordsStore()
const reportsStore = useReportsStore()
const dialogStore = useDialogStore()
const settingsStore = useSettingsStore()

// Toast 状态
const successMessage = ref('')
const isError = ref(false)
const toastTimer = ref(null)

// 显示 Toast 提示
const showToast = (message, isErrorMessage = false) => {
  successMessage.value = message
  isError.value = isErrorMessage

  if (toastTimer.value) clearTimeout(toastTimer.value)

  toastTimer.value = setTimeout(() => {
    successMessage.value = ''
    isError.value = false
  }, 3000)
}

const selectedProject = ref('')
const selectedWorkType = ref('')
const selectedStatus = ref('')

const currentRecords = computed(() => recordsStore.currentWorkWeekRecords)
const projectOptions = computed(() => [...new Set([
  ...settingsStore.projectNames,
  ...currentRecords.value.map(record => record.project).filter(Boolean)
])])
const workTypeOptions = computed(() => [...new Set([
  ...settingsStore.workTypeNames,
  ...currentRecords.value.map(record => record.workType).filter(Boolean)
])])
const statusOptions = computed(() => mergeRecordStatusNames(settingsStore.recordStatuses, currentRecords.value))
const hasActiveFilters = computed(() => Boolean(selectedProject.value || selectedWorkType.value || selectedStatus.value))

const filteredRecords = computed(() => currentRecords.value.filter(record => (
  (!selectedProject.value || record.project === selectedProject.value)
  && (!selectedWorkType.value || record.workType === selectedWorkType.value)
  && (!selectedStatus.value || resolveRecordStatus(record.status) === selectedStatus.value)
)))

// 按项目分组的记录
const groupedRecords = computed(() => filteredRecords.value.reduce((groups, record) => {
  const project = record.project || '其他'
  if (!groups[project]) groups[project] = []
  groups[project].push(record)
  return groups
}, {}))

const resetFilters = () => {
  selectedProject.value = ''
  selectedWorkType.value = ''
  selectedStatus.value = ''
}

// 处理删除事件
const handleDeleted = (record) => {
  console.log('Record deleted:', record)
}

// 处理更新事件
const handleUpdated = (record) => {
  console.log('Record updated:', record)
}

// 处理移到下周计划
const handleMoveToNextWeek = async (record) => {
  const confirmed = await dialogStore.confirm({
    title: '移到下周计划',
    message: `确定要将"${record.content}"移到下周计划吗？`
  })

  if (!confirmed) return

  try {
    const response = await fetch('/api/records/move-to-next-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordIds: [record.id] })
    })

    const result = await response.json()

    if (result.success) {
      // 统一从后端刷新，避免本地重复写一份计划数据
      await Promise.all([
        recordsStore.init(),
        reportsStore.init()
      ])

      showToast(result.message || '已移到下周计划')
    } else {
      showToast(result.error || '操作失败，请重试', true)
    }
  } catch (error) {
    console.error('移到下周计划失败:', error)
    showToast('操作失败，请重试', true)
  }
}

// 拖拽结束
const onDragEnd = (recordsList) => {
  // 更新所有记录的顺序
  const recordIds = recordsList.map(r => r.id)
  recordsStore.reorderRecords(recordIds)
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.record-list {
  margin-top: $spacing-6;
}

.record-filters {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  flex-wrap: wrap;
  margin-bottom: $spacing-6;
}

.filter-field {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  span {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
  }
}

.filter-select {
  min-width: 140px;
  padding: $spacing-2 $spacing-3;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  font-size: $font-size-sm;

  &:focus {
    outline: none;
    border-color: $accent-primary;
    box-shadow: 0 0 0 3px $accent-light;
  }
}

.record-groups {
  display: flex;
  flex-direction: column;
  gap: $spacing-10; // 增加项目分组之间的间距

  // 大屏幕上增加间距
  @media (min-width: $breakpoint-xl) {
    gap: $spacing-12;
  }
}

.record-group {
  // 超大屏幕上使用网格布局展示记录卡片
  @media (min-width: 1400px) {
    .group-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-6; // 增加网格卡片之间的间距
    }
  }

  // 极宽屏幕上进一步增加间距
  @media (min-width: 1600px) {
    .group-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-8; // 更大的间距
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-3;
    border-bottom: 1px solid var(--divider-color);

    // 大屏幕上增大尺寸
    @media (min-width: $breakpoint-xl) {
      margin-bottom: $spacing-5;
      padding-bottom: $spacing-4;
      gap: $spacing-4;
    }

    .group-title {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.3;

      @media (min-width: $breakpoint-xl) {
        font-size: $font-size-xl;
      }
    }

    .group-count {
      font-size: $font-size-xs;
      font-weight: $font-weight-medium;
      color: var(--text-muted);
      padding: $spacing-1 $spacing-2;
      background: var(--bg-secondary);
      border-radius: $radius-full;

      @media (min-width: $breakpoint-xl) {
        font-size: $font-size-sm;
        padding: $spacing-2 $spacing-3;
      }
    }
  }

  .group-content {
    display: flex;
    flex-direction: column;
    gap: $spacing-6; // 进一步增加同一项目下卡片之间的间距
    min-height: 50px;

    // 大屏幕上增加间距
    @media (min-width: $breakpoint-xl) {
      gap: $spacing-8;
    }

    // 超大屏幕上进一步增加
    @media (min-width: 1600px) {
      gap: $spacing-10;
    }
  }
}

// 拖拽样式
:deep(.ghost-card) {
  opacity: 0.5;
  background: var(--bg-card);
  border: 2px dashed $accent-primary;
}

:deep(.dragging-card) {
  opacity: 0.9;
  transform: rotate(2deg);
  box-shadow: var(--shadow-lg);
}

// 列表项平滑进入动画
.list-item-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-item-enter-to {
  opacity: 1;
  transform: translateY(0);
}

// ========================================
// 响应式断点
// ========================================

// 平板设备
@media (max-width: $breakpoint-lg) {
  .record-groups {
    gap: $spacing-6;
  }
}

// 移动设备
@media (max-width: $breakpoint-md) {
  .record-list {
    margin-top: $spacing-4;
  }

  .record-filters {
    align-items: stretch;
  }

  .filter-field {
    flex: 1 1 180px;
    align-items: stretch;
    flex-direction: column;
  }

  .filter-select {
    min-height: 44px;
  }

  .record-groups {
    gap: $spacing-8; // 移动端也保持较大的间距
  }

  .record-group {
    .group-header {
      margin-bottom: $spacing-3;
      padding-bottom: $spacing-2;

      .group-title {
        font-size: $font-size-base;
      }
    }

    .group-content {
      gap: $spacing-5; // 移动端也增加卡片间距
    }
  }
}

// 小屏手机
@media (max-width: $breakpoint-sm) {
  .record-groups {
    gap: $spacing-6; // 小屏也保持足够的间距
  }

  .record-group {
    .group-header {
      gap: $spacing-2;
    }

    .group-content {
      gap: $spacing-4; // 小屏也增加卡片间距
    }
  }
}

// Toast 提示
.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: $accent-primary;
  color: white;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba($accent-primary, 0.3);
  z-index: $z-tooltip;

  &.error {
    background: $error;
    box-shadow: 0 4px 12px rgba($error, 0.3);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-fast;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
