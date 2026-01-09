<template>
  <div class="recycle-bin-view page-container">
    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-message" :class="{ error: isToastError }">
        <svg v-if="!isToastError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <div class="page-header">
      <div>
        <h1 class="page-header-title">回收站</h1>
        <p class="page-header-subtitle">已删除的项目，可在30天内恢复</p>
      </div>
    </div>

    <!-- 已删除的周报 -->
    <div class="card section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H6a1 1 0 01-1-1V4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
          已删除的周报
        </h3>
        <span v-if="deletedReportsCount > 0" class="count-badge">{{ deletedReportsCount }}</span>
      </div>

      <div v-if="deletedReports.length === 0" class="empty-hint">
        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style="opacity: 0.3;">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <p>暂无已删除的周报</p>
      </div>

      <div v-else class="deleted-list">
        <div v-for="report in deletedReports" :key="report.id" class="deleted-item">
          <div class="item-info">
            <div class="item-main">
              <span class="item-title">{{ report.weekLabel }}</span>
              <span class="item-meta">{{ formatDate(report.weekStart, 'YYYY.MM.DD') }} - {{ formatDate(report.weekEnd, 'YYYY.MM.DD') }}</span>
            </div>
            <span class="item-date">删除于 {{ formatDate(report.deletedAt, 'MM-DD HH:mm') }}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-secondary" @click="handleRestoreReport(report.id)">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 4px;">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13a1 1 0 01-.293.707z" clip-rule="evenodd"/>
              </svg>
              恢复
            </button>
            <button class="btn btn-sm btn-danger" @click="handlePermanentDeleteReport(report.id)">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 4px;">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              永久删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已删除的工作记录 -->
    <div class="card section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 8a2 2 0 002 2V5a2 2 0 00-2-2zm8.5 5.707l-1.414-1.414a1 1 0 00-1.414 0l-1.414 1.414a1 1 0 001.414 1.414l1.414 1.414a1 1 0 001.414 0l1.414-1.414a1 1 0 00-1.414-1.414z" clip-rule="evenodd"/>
          </svg>
          已删除的工作记录
        </h3>
        <span v-if="deletedRecordsCount > 0" class="count-badge">{{ deletedRecordsCount }}</span>
      </div>

      <div v-if="deletedRecords.length === 0" class="empty-hint">
        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style="opacity: 0.3;">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <p>暂无已删除的工作记录</p>
      </div>

      <div v-else class="deleted-list">
        <div v-for="record in deletedRecords" :key="record.id" class="deleted-item">
          <div class="item-info">
            <div class="item-main">
              <span class="item-title">{{ record.content }}</span>
              <div class="item-tags">
                <span v-if="record.project" class="tag tag-project">{{ record.project }}</span>
                <span v-if="record.workType" class="tag tag-type">{{ record.workType }}</span>
              </div>
            </div>
            <span class="item-date">删除于 {{ formatDate(record.deletedAt, 'MM-DD HH:mm') }}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-secondary" @click="handleRestoreRecord(record.id)">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 4px;">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13a1 1 0 01-.293.707z" clip-rule="evenodd"/>
              </svg>
              恢复
            </button>
            <button class="btn btn-sm btn-danger" @click="handlePermanentDeleteRecord(record.id)">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 4px;">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              永久删除
            </button>
          </div>
        </div>
      </div>
    </div>

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
import { storeToRefs } from 'pinia'
import { useRecordsStore } from '../stores/records'
import { useReportsStore } from '../stores/reports'
import { useDialogStore } from '../stores/dialog'
import { formatDate } from '../utils/date'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const recordsStore = useRecordsStore()
const reportsStore = useReportsStore()
const { deletedRecords } = storeToRefs(recordsStore)
const dialogStore = useDialogStore()

// 已删除的数据
const deletedReports = ref([])

// 计算数量
const deletedReportsCount = computed(() => deletedReports.value.length)
const deletedRecordsCount = computed(() => deletedRecords.value.length)

// Toast 状态
const toastMessage = ref('')
const isToastError = ref(false)
let toastTimer = null

// 显示 Toast
const showToast = (message, isError = false) => {
  toastMessage.value = message
  isToastError.value = isError
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    isToastError.value = false
  }, 3000)
}

// 初始化
onMounted(async () => {
  await fetchDeletedData()
})

// 获取已删除的数据
const fetchDeletedData = async () => {
  await Promise.all([
    reportsStore.fetchDeletedReports().then(data => {
      deletedReports.value = data
    }),
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

// 恢复工作记录
const handleRestoreRecord = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '确定要恢复这条工作记录吗？'
  })
  if (!confirmed) return

  const success = await recordsStore.restoreRecord(id)
  if (success) {
    showToast('工作记录已恢复')
    await fetchDeletedData()
  } else {
    showToast('恢复失败，请重试', true)
  }
}

// 永久删除工作记录
const handlePermanentDeleteRecord = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '⚠️ 此操作不可恢复！确定要永久删除这条工作记录吗？'
  })
  if (!confirmed) return

  const success = await recordsStore.permanentDeleteRecord(id)
  if (success) {
    showToast('工作记录已永久删除')
    await fetchDeletedData()
  } else {
    showToast('删除失败，请重试', true)
  }
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

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
  z-index: 1070;

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

.section {
  padding: $spacing-6;
  margin-bottom: $spacing-6;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-5;

  h3 {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }
}

.count-badge {
  padding: $spacing-1 $spacing-3;
  background: rgba($error, 0.1);
  color: $error;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
}

.empty-hint {
  text-align: center;
  padding: $spacing-8 $spacing-4;
  color: var(--text-muted);

  svg {
    margin-bottom: $spacing-4;
  }

  p {
    margin: 0;
    font-size: $font-size-sm;
  }
}

.deleted-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.deleted-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--border-color-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
}

.item-main {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  flex-wrap: wrap;
}

.item-title {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: var(--text-primary);
}

.item-meta {
  font-size: $font-size-sm;
  color: var(--text-muted);
}

.item-tags {
  display: flex;
  gap: $spacing-2;
  flex-wrap: wrap;
}

.tag {
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  &.tag-project {
    background: rgba($accent-primary, 0.1);
    color: $accent-primary;
  }

  &.tag-type {
    background: rgba($warning, 0.1);
    color: $warning;
  }
}

.item-date {
  font-size: $font-size-xs;
  color: var(--text-muted);
}

.item-actions {
  display: flex;
  gap: $spacing-2;
  flex-shrink: 0;
}

.btn {
  padding: $spacing-2 $spacing-3;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;
  border: none;
  display: inline-flex;
  align-items: center;

  &.btn-sm {
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-xs;
  }

  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);

    &:hover {
      background: var(--bg-secondary-hover);
    }
  }

  &.btn-danger {
    background: rgba($error, 0.1);
    color: $error;

    &:hover {
      background: rgba($error, 0.2);
    }
  }
}

// 响应式
@media (max-width: $breakpoint-md) {
  .deleted-item {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-3;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
