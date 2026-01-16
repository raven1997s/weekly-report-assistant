<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="json-viewer-backdrop" @click="close">
        <div class="json-viewer-modal" @click.stop>
          <!-- 弹窗头部 -->
          <div class="json-viewer-header">
            <h3>{{ title || 'JSON 数据' }}</h3>
            <button class="close-btn" @click="close" title="关闭 (Esc)">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <!-- JSON 内容 -->
          <div class="json-viewer-body">
            <JsonNode :data="data" :depth="0" />
          </div>

          <!-- 弹窗底部 -->
          <div class="json-viewer-footer">
            <button class="action-btn" @click="copyJson">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
              复制 JSON
            </button>
            <button class="action-btn primary" @click="close">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import JsonNode from './JsonNode.vue'
import { useToastStore } from '../stores/toast'

const props = defineProps({
  modelValue: Boolean,
  data: [Object, Array, String, Number, Boolean, null],
  title: String
})

const emit = defineEmits(['update:modelValue'])

const toast = useToastStore()

// 关闭弹窗
const close = () => {
  emit('update:modelValue', false)
}

// 复制 JSON
const copyJson = async () => {
  try {
    const jsonString = JSON.stringify(props.data, null, 2)
    await navigator.clipboard.writeText(jsonString)
    toast.success('JSON 已复制到剪贴板')
  } catch (error) {
    console.error('[JsonViewer] 复制失败:', error)
    toast.error('复制失败，请重试')
  }
}

// ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 监听 modelValue 变化，控制 body 滚动
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.json-viewer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: $spacing-4;
}

.json-viewer-modal {
  background: var(--bg-card);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.json-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-4 $spacing-6;
  border-bottom: 1px solid var(--border-color);

  h3 {
    margin: 0;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: $radius-md;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }
}

.json-viewer-body {
  flex: 1;
  overflow: auto;
  padding: $spacing-6;
  background: var(--bg-secondary);

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: $radius-full;

    &:hover {
      background: var(--border-color-hover);
    }
  }
}

.json-viewer-footer {
  display: flex;
  gap: $spacing-3;
  padding: $spacing-4 $spacing-6;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  color: var(--text-primary);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--bg-card);
    border-color: var(--border-color-hover);
  }

  &.primary {
    background: $accent-primary;
    border-color: $accent-primary;
    color: white;

    &:hover {
      background: darken($accent-primary, 5%);
    }
  }
}

// 模态框动画
.modal-enter-active,
.modal-leave-active {
  transition: opacity $transition-normal;

  .json-viewer-modal {
    transition: transform $transition-normal;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .json-viewer-modal {
    transform: scale(0.95);
  }
}

// 响应式
@media (max-width: $breakpoint-md) {
  .json-viewer-modal {
    max-width: 95%;
    max-height: 80vh;
  }

  .json-viewer-footer {
    flex-direction: column;

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
