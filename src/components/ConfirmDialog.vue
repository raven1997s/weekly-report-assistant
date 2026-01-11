<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && message"
        ref="modalRef"
        class="modal-overlay"
        @click="handleCancel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="dialogTitleId"
        :aria-describedby="dialogDescId"
      >
        <div class="modal-content modal-content-sm" @click.stop>
          <div class="modal-header">
            <h3 :id="dialogTitleId">{{ title }}</h3>
          </div>

          <div class="modal-body">
            <p :id="dialogDescId">{{ message }}</p>
            <div v-if="details" class="confirm-details">{{ details }}</div>
          </div>

          <div class="modal-footer">
            <button
              class="btn btn-ghost"
              @click="handleCancel"
              :aria-label="cancelText"
            >
              {{ cancelText }}
            </button>
            <button
              class="btn btn-primary"
              @click="handleConfirm"
              :aria-label="confirmText"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useModalFocusTrap } from '../composables/useFocusTrap'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '确认' },
  message: String,
  details: String,
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

// 模态框 ref
const modalRef = ref(null)

// 生成唯一的 ARIA ID
const dialogTitleId = computed(() =>
  `dialog-title-${Math.random().toString(36).substring(2, 11)}`
)
const dialogDescId = computed(() =>
  `dialog-desc-${Math.random().toString(36).substring(2, 11)}`
)

// 使用焦点陷阱
useModalFocusTrap(modalRef, () => props.show)

const handleConfirm = () => {
  emit('confirm')
  emit('update:show', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// 使用统一的 modal 样式，这里只添加 confirm-details 特殊样式
.confirm-details {
  background: var(--bg-secondary);
  padding: $spacing-3;
  border-radius: $radius-md;
  white-space: pre-line;
  max-height: 200px;
  overflow-y: auto;
  font-size: $font-size-sm;
  margin-top: $spacing-3;
}

// Modal 过渡动画
.modal-enter-active,
.modal-leave-active {
  transition: opacity $transition-normal;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform $transition-normal;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
