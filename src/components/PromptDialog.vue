<template>
  <Teleport to="body">
    <div v-if="show && message" class="confirm-overlay" @click="handleCancel">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <h3>{{ title }}</h3>
        </div>
        <div class="confirm-body">
          <p>{{ message }}</p>
          <input
            ref="inputRef"
            v-model="inputValue"
            type="text"
            class="prompt-input"
            :placeholder="placeholder"
            @keyup.enter="handleConfirm"
          />
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" @click="handleCancel">
            取消
          </button>
          <button class="btn btn-primary" @click="handleConfirm" :disabled="!inputValue">
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '输入' },
  message: String,
  placeholder: { type: String, default: '请输入...' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

const inputValue = ref('')
const inputRef = ref(null)

watch(() => props.show, async (show) => {
  if (show) {
    inputValue.value = ''
    await nextTick()
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

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-popover;
}

.confirm-dialog {
  background: var(--bg-primary);
  border-radius: $radius-lg;
  padding: $spacing-6;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.confirm-header h3 {
  margin: 0 0 $spacing-4 0;
  font-size: $font-size-lg;
  font-weight: 600;
}

.confirm-body {
  margin-bottom: $spacing-4;

  p {
    margin: 0 0 $spacing-4 0;
    color: var(--text-secondary);
  }
}

.confirm-footer {
  display: flex;
  gap: $spacing-3;
  justify-content: flex-end;
}

.prompt-input {
  width: 100%;
  padding: $spacing-3;
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: $font-size-base;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
}
</style>
