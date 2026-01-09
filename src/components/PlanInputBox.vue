<template>
  <div class="plan-input-box">
    <div class="input-wrapper">
      <input
        v-model="inputText"
        type="text"
        class="input-field"
        placeholder="添加下周计划，如：WMS 完成库存优化..."
        @keyup.enter="handleSubmit"
        @input="handleInput"
      />
      <button class="btn btn-primary btn-sm" @click="handleSubmit">添加</button>
    </div>

    <!-- 简化的解析预览 -->
    <Transition name="fade">
      <div v-if="parseResult && inputText.trim()" class="parse-preview">
        <div class="parse-item">
          <span class="parse-label">项目</span>
          <span class="parse-value" :class="{ detected: parseResult.project }">
            {{ parseResult.project || '待识别' }}
          </span>
        </div>
        <div class="parse-item">
          <span class="parse-label">类型</span>
          <span class="parse-value" :class="{ detected: parseResult.workType }">
            {{ parseResult.workType || '待识别' }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useParser } from '../composables/useParser'

const emit = defineEmits(['plan-added'])

const { parseInput } = useParser()
const inputText = ref('')
const parseResult = ref(null)

const handleInput = () => {
  if (inputText.value.trim()) {
    parseResult.value = parseInput(inputText.value)
  } else {
    parseResult.value = null
  }
}

const handleSubmit = () => {
  if (!inputText.value.trim()) return

  emit('plan-added', {
    content: inputText.value.trim(),
    project: parseResult.value?.project || null,
    workType: parseResult.value?.workType || null
  })

  inputText.value = ''
  parseResult.value = null
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.plan-input-box {
  margin-bottom: $spacing-4;
}

.input-wrapper {
  display: flex;
  gap: $spacing-2;

  input {
    flex: 1;
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-sm;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: $accent-primary;
      box-shadow: 0 0 0 3px $accent-light;
    }
  }
}

.parse-preview {
  margin-top: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: var(--bg-secondary);
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  color: var(--text-secondary);
  display: flex;
  gap: $spacing-4;

  // 固定高度，防止内容变化导致跳动
  min-height: 32px;
  max-height: 32px;
  overflow: hidden;

  .parse-item {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  .parse-label {
    font-weight: $font-weight-medium;
    color: var(--text-muted);
  }

  .parse-value {
    color: var(--text-secondary);

    &.detected {
      color: $accent-primary;
      font-weight: $font-weight-semibold;
    }
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
