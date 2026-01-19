<template>
  <div class="cell-content">
    <!-- JSON 字段 -->
    <div v-if="isJson" class="json-field" @click="handleJsonClick" title="点击查看完整 JSON">
      <span class="json-preview">{{ jsonString }}</span>
      <svg class="json-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd" />
      </svg>
    </div>

    <!-- 长文本字段 -->
    <div v-else-if="isLongText" class="long-text-field">
      <span v-if="!expanded" class="truncated-text">{{ truncatedText }}</span>
      <div v-else class="expanded-text">{{ value }}</div>
      <button class="expand-btn" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </button>
    </div>

    <!-- 日期字段 -->
    <span v-else-if="isDate" class="date-field">{{ formattedDate }}</span>

    <!-- 布尔字段 -->
    <span v-else-if="isBoolean" class="boolean-field" :class="{ true: value }">
      {{ value ? '是' : '否' }}
    </span>

    <!-- 普通字段 -->
    <span v-else class="text-field">{{ displayValue }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  value: [String, Number, Boolean, Object],
  column: String
})

const emit = defineEmits(['showJson'])

const expanded = ref(false)

// 处理 JSON 字段点击
const handleJsonClick = () => {
  try {
    const parsed = JSON.parse(props.value)
    emit('showJson', parsed)
  } catch {
    // JSON 解析失败，不打开弹窗
  }
}

// 判断是否为 JSON 字段
const isJson = computed(() => {
  if (typeof props.value !== 'string') return false

  // 扩展 JSON 字段列表
  const jsonFields = ['records', 'plans', 'reflections', 'value', 'keywords', 'content']
  if (jsonFields.includes(props.column)) {
    // 检查是否以 { 或 [ 开头，确认是 JSON 格式
    const trimmed = props.value.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(props.value)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  // 对于其他字段，尝试自动检测 JSON 格式
  const trimmed = props.value.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(props.value)
      return typeof parsed === 'object' && parsed !== null
    } catch {
      return false
    }
  }

  return false
})

// 判断是否为长文本
const isLongText = computed(() => {
  return typeof props.value === 'string' && props.value.length > 50
})

// 判断是否为日期字段
const isDate = computed(() => {
  const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'weekStart', 'weekEnd', 'created_at', 'updated_at']
  return dateFields.includes(props.column)
})

// 判断是否为布尔字段
const isBoolean = computed(() => {
  return typeof props.value === 'number' && (props.value === 0 || props.value === 1)
})

// JSON 解析和格式化
const jsonString = computed(() => {
  try {
    return props.value
  } catch {
    return props.value
  }
})

const formattedJson = computed(() => {
  try {
    const parsed = JSON.parse(props.value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return props.value
  }
})

// 文本截断
const truncatedText = computed(() => {
  if (!props.value) return ''
  return props.value.substring(0, 50) + '...'
})

// 日期格式化
const formattedDate = computed(() => {
  if (!props.value) return '-'
  const date = new Date(props.value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// 普通值显示
const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) return '-'
  return props.value
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.cell-content {
  display: flex;
  align-items: flex-start;
  gap: $spacing-2;
  max-width: 100%; // 不超过父容器
  overflow: hidden; // 隐藏溢出

  .expand-btn {
    flex-shrink: 0;
    padding: 2px 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--bg-card);
      border-color: var(--border-color-hover);
    }
  }
}

.json-field {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  cursor: pointer;
  padding: $spacing-1;
  border-radius: $radius-sm;
  transition: background $transition-fast;

  &:hover {
    background: var(--bg-secondary);
  }

  .json-preview {
    color: var(--text-secondary);
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .json-icon {
    flex-shrink: 0;
    color: var(--text-muted);
    width: 14px;
    height: 14px;
  }
}

.text-field {
  color: var(--text-secondary);
  max-width: 250px; // 限制最大宽度
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 长文本字段容器
.long-text-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  max-width: 280px;

  .truncated-text {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expanded-text {
    max-height: 150px;
    max-width: 280px;
    overflow-y: auto;
    padding: $spacing-2;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: $radius-sm;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    font-size: $font-size-xs;
    line-height: 1.5;
  }

  .expand-btn {
    align-self: flex-start;
  }
}

.date-field {
  color: var(--text-secondary);
  font-size: $font-size-xs;
  font-family: $font-family-mono;
  white-space: nowrap;
}

.boolean-field {
  padding: 2px 8px;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  white-space: nowrap;

  &:not(.true) {
    background: rgba($error, 0.1);
    color: $error;
  }

  &.true {
    background: $accent-light;
    color: $accent-primary;
  }
}
</style>
