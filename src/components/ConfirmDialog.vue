<template>
  <Teleport to="body">
    <div v-if="show && message" class="confirm-overlay" @click="handleCancel">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <h3>{{ title }}</h3>
        </div>
        <div class="confirm-body">
          <p>{{ message }}</p>
          <div v-if="details" class="confirm-details">{{ details }}</div>
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button class="btn btn-primary" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '确认' },
  message: String,
  details: String,
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

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

.confirm-body p {
  margin: 0 0 $spacing-4 0;
  color: var(--text-secondary);
}

.confirm-details {
  background: var(--bg-secondary);
  padding: $spacing-3;
  border-radius: $radius-md;
  white-space: pre-line;
  max-height: 200px;
  overflow-y: auto;
  font-size: $font-size-sm;
}

.confirm-footer {
  display: flex;
  gap: $spacing-3;
  justify-content: flex-end;
  margin-top: $spacing-4;
}
</style>
