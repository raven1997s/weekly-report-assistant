<template>
  <div class="record-card" :class="{ editing: isEditing, draggable: draggable }">
    <div class="record-header">
      <div class="record-tags">
        <span v-if="record.project" class="tag project">{{ record.project }}</span>
        <span v-if="record.workType" class="tag type">{{ record.workType }}</span>
        <span class="tag status" :class="statusClass">{{ recordStatus }}</span>
      </div>
      <div class="record-actions">
        <button
          v-if="draggable"
          class="action-btn drag-handle"
          type="button"
          aria-label="拖拽排序"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 7a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2v2a.5.5 0 01-.5.5zm7 0a.5.5 0 01-.5-.5v-2h-2a.5.5 0 010-1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5zm-7 5a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2v2a.5.5 0 01-.5.5zm7 0a.5.5 0 01-.5-.5v-2h-2a.5.5 0 010-1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5z"/>
          </svg>
        </button>
        <button
          class="action-btn"
          type="button"
          aria-label="编辑"
          @click="startEdit"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.854 2.854a.5.5 0 00-.707 0L11 3.999 12.001 5l1.146-1.147a.5.5 0 000-.707l-.293-.293zM10 4.999l-6.5 6.5V13h1.5l6.5-6.5-1.5-1.501z"/>
          </svg>
        </button>
        <button
          class="action-btn"
          type="button"
          aria-label="移到下周计划"
          @click="handleMoveToNextWeek"
          title="移到下周计划"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 3a5 5 0 100 10A5 5 0 008 3zm3.25 5.5a.75.75 0 01-.75.75H6.5v1.69a.75.75 0 01-1.28.53l-2.5-2.5a.75.75 0 010-1.06l2.5-2.5a.75.75 0 011.28.53V7.5h4a.75.75 0 01.75.75z" clip-rule="evenodd"/>
          </svg>
        </button>
        <button
          class="action-btn delete"
          type="button"
          aria-label="删除记录"
          @click="handleDelete"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="record-content">
      <template v-if="!isEditing">
        {{ record.content }}
      </template>
      <template v-else>
        <input
          ref="editInputRef"
          v-model="editContent"
          type="text"
          class="form-control"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
        />
        <label class="edit-status-field">
          <span>工作状态</span>
          <select v-model="editStatus" class="form-control edit-status-select">
            <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <div class="edit-actions">
          <button class="btn btn-primary btn-sm" @click="saveEdit">保存</button>
          <button class="btn btn-ghost btn-sm" @click="cancelEdit">取消</button>
        </div>
      </template>
    </div>

    <div class="record-footer">
      <span class="record-time">{{ relativeTime }}</span>
    </div>

    <!-- 删除确认弹窗 -->
    <Transition name="scale">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
        <div class="modal-content confirm-modal" @click.stop>
          <div class="modal-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
              删除记录确认
            </h3>
            <button class="close-btn" @click="showDeleteConfirm = false">×</button>
          </div>
          <div class="modal-body">
            <div class="confirm-content">
              <svg class="confirm-icon error" width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
              <p class="confirm-message">确定要删除这条记录吗？</p>
              <p class="confirm-hint">删除后将无法恢复</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-primary danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRecordsStore } from '../stores/records'
import { useSettingsStore } from '../stores/settings'
import { getRelativeTime } from '../utils/date'
import { mergeRecordStatusNames, resolveRecordStatus } from '../../shared/record-status'

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  draggable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['deleted', 'updated', 'moveToNextWeek'])

const recordsStore = useRecordsStore()
const settingsStore = useSettingsStore()

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const editStatus = ref('')
const editInputRef = ref(null)
const showDeleteConfirm = ref(false)

// 相对时间
const relativeTime = computed(() => getRelativeTime(props.record.createdAt))
const recordStatus = computed(() => resolveRecordStatus(props.record.status))
const statusClass = computed(() => ({
  '待开始': 'status-not-started',
  '进行中': 'status-in-progress',
  '待验证': 'status-review',
  '已完成': 'status-completed',
  '已阻塞': 'status-blocked',
  '已暂停': 'status-paused'
}[recordStatus.value] || 'status-default'))
const statusOptions = computed(() => mergeRecordStatusNames(settingsStore.recordStatuses, [props.record]))

// 开始编辑
const startEdit = async () => {
  editContent.value = props.record.content
  editStatus.value = recordStatus.value
  isEditing.value = true
  await nextTick()
  editInputRef.value?.focus()
}

// 保存编辑
const saveEdit = () => {
  if (editContent.value.trim()) {
    recordsStore.updateRecord(props.record.id, {
      content: editContent.value.trim(),
      project: props.record.project ?? null,
      workType: props.record.workType ?? null,
      status: editStatus.value
    })
    emit('updated', props.record)
  }
  isEditing.value = false
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

// 删除记录
const handleDelete = () => {
  showDeleteConfirm.value = true
}

// 确认删除
const confirmDelete = () => {
  recordsStore.deleteRecord(props.record.id)
  showDeleteConfirm.value = false
  emit('deleted', props.record)
}

// 移到下周计划
const handleMoveToNextWeek = () => {
  emit('moveToNextWeek', props.record)
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.record-card {
  position: relative;
  padding: $spacing-5;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  transition: all $transition-normal;
  cursor: default;
  box-shadow: var(--shadow-xs);

  &.draggable {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &:hover {
    border-color: var(--border-color-hover);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);

    .record-actions {
      opacity: 1;
    }
  }

  &.editing {
    border-color: $accent-primary;
    box-shadow: 0 0 0 3px $accent-light;
    transform: none;
  }

  // 移动端优化
  @media (max-width: $breakpoint-md) {
    padding: $spacing-4;
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-3;
}

.record-tags {
  display: flex;
  gap: $spacing-2;
  flex-wrap: wrap;

  .tag {
    display: inline-flex;
    align-items: center;
    padding: $spacing-1 $spacing-2;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    border-radius: $radius-sm;
    border: 1px solid transparent;

    &.project {
      background: rgba($accent-primary, 0.1);
      color: $accent-primary;
      border-color: rgba($accent-primary, 0.2);
    }

    &.type {
      background: rgba($accent-secondary, 0.1);
      color: $accent-secondary;
      border-color: rgba($accent-secondary, 0.2);
    }

    &.status {
      &.status-not-started,
      &.status-default {
        background: var(--bg-secondary);
        color: var(--text-secondary);
        border-color: var(--border-color);
      }

      &.status-in-progress {
        background: rgba($accent-primary, 0.1);
        color: $accent-primary;
        border-color: rgba($accent-primary, 0.22);
      }

      &.status-review {
        background: rgba($warning, 0.12);
        color: #a15c00;
        border-color: rgba($warning, 0.24);
      }

      &.status-completed {
        background: rgba($success, 0.11);
        color: #047857;
        border-color: rgba($success, 0.22);
      }

      &.status-blocked {
        background: rgba($error, 0.1);
        color: #c42b36;
        border-color: rgba($error, 0.2);
      }

      &.status-paused {
        background: rgba($text-muted, 0.12);
        color: var(--text-secondary);
        border-color: rgba($text-muted, 0.24);
      }
    }
  }
}

:global(.dark-theme) .record-tags .tag.status {
  &.status-review {
    color: #fbbf24;
  }

  &.status-completed {
    color: #34d399;
  }

  &.status-blocked {
    color: #fb7185;
  }
}

.record-actions {
  display: flex;
  gap: $spacing-1;
  opacity: 0.78;
  transition: opacity $transition-fast;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-sm;
  border-radius: $radius-md;
  transition: all $transition-fast;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-secondary);
    transform: translateY(-1px);
  }

  &.drag-handle {
    cursor: grab;
    color: var(--text-muted);

    &:active {
      cursor: grabbing;
    }
  }

  &.delete:hover {
    color: $error;
    background: rgba($error, 0.1);
  }
}

.record-content {
  font-size: $font-size-base;
  color: var(--text-primary);
  line-height: $line-height-relaxed; // 增加行高让文字更易读
  margin-bottom: $spacing-2;
  text-wrap: pretty;
}

.edit-actions {
  display: flex;
  gap: $spacing-2;
  margin-top: $spacing-2;
}

.edit-status-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  margin-top: $spacing-3;
  max-width: 180px;

  span {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
  }
}

.edit-status-select {
  min-height: 40px;

  @media (max-width: $breakpoint-md) {
    min-height: 44px;
  }
}

.record-footer {
  margin-top: $spacing-3;
  padding-top: $spacing-3;
  border-top: 1px solid var(--divider-color);

  .record-time {
    font-size: $font-size-xs;
    color: var(--text-muted);
  }
}

@media (max-width: $breakpoint-md), (hover: none) {
  .record-actions {
    opacity: 1;
  }

  .action-btn {
    width: 44px;
    height: 44px;
  }
}

// 弹窗样式
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
  padding: $spacing-xl;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);

  &.confirm-modal {
    text-align: center;
  }

  .modal-header {
    padding: $spacing-lg;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: $font-size-lg;
      color: var(--text-primary);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      font-size: $font-size-xl;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;

      &:hover {
        color: var(--text-primary);
      }
    }
  }

  .modal-body {
    padding: $spacing-lg;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    gap: $spacing-3;
    justify-content: center;
    padding: $spacing-lg;
    border-top: 1px solid var(--border-color);
  }
}

.confirm-content {
  padding: $spacing-6 $spacing-4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-4;

  .confirm-icon {
    color: $accent-primary;

    &.error {
      color: $error;
    }
  }

  .confirm-message {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;
  }

  .confirm-hint {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: 0;
  }
}

.btn.danger {
  background: $error;
  color: white;

  &:hover {
    filter: brightness(0.9);
  }
}

.scale-enter-active,
.scale-leave-active {
  transition: all $transition-normal;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
