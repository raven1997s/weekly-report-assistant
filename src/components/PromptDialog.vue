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
            <input
              ref="inputRef"
              v-model="inputValue"
              type="text"
              class="form-control"
              :placeholder="placeholder"
              :aria-label="placeholder || '请输入内容'"
              @keyup.enter="handleConfirm"
            />
          </div>

          <div class="modal-footer">
            <button
              class="btn btn-ghost"
              @click="handleCancel"
              aria-label="取消"
            >
              取消
            </button>
            <button
              class="btn btn-primary"
              @click="handleConfirm"
              :disabled="!inputValue"
              aria-label="确定"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useModalFocusTrap } from '../composables/useFocusTrap'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '输入' },
  message: String,
  placeholder: { type: String, default: '请输入...' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

// 模态框 ref
const modalRef = ref(null)
const inputValue = ref('')
const inputRef = ref(null)

// 生成唯一的 ARIA ID
const dialogTitleId = computed(() =>
  `dialog-title-${Math.random().toString(36).substring(2, 11)}`
)
const dialogDescId = computed(() =>
  `dialog-desc-${Math.random().toString(36).substring(2, 11)}`
)

// 使用焦点陷阱
useModalFocusTrap(modalRef, () => props.show)

watch(() => props.show, async (show) => {
  if (show) {
    inputValue.value = ''
    await nextTick()
    // 焦点陷阱会自动聚焦到第一个元素，但我们需要聚焦到输入框
    inputRef.value?.focus()
  }
})

const handleConfirm = () => {
  if (inputValue.value) {
    emit('confirm', inputValue.value)
    emit('update:show', false)
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

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
