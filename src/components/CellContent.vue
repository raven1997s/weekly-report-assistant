<template>
  <div class="cell-content">
    <!-- JSON 字段 -->
    <div v-if="isJson" class="json-field">
      <pre v-if="expanded">{{ formattedJson }}</pre>
      <span v-else class="json-preview">{{ jsonString }}</span>
      <button class="expand-btn" @click="expanded = !expanded" :title="expanded ? '收起' : '展开'">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path v-if="expanded" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/>
          <path v-else fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>

    <!-- 长文本字段 -->
    <div v-else-if="isLongText" class="text-field">
      <span v-if="!expanded">{{ truncatedText }}</span>
      <span v-else>{{ value }}</span>
      <button v-if="isLongText" class="expand-btn" @click="expanded = !expanded">
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

const expanded = ref(false)

// 判断是否为 JSON 字段
const isJson = computed(() => {
  if (typeof props.value !== 'string') return false
  const jsonFields = ['records', 'plans', 'reflections', 'value']
  return jsonFields.includes(props.column)
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
  position: relative;
  width: 100%;

  pre {
    margin: 0;
    padding: $spacing-3;
    background: var(--bg-secondary);
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-family: $font-family-mono;
    line-height: $line-height-normal;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
  }

  .json-preview {
    color: var(--text-secondary);
    font-family: $font-family-mono;
    font-size: $font-size-xs;
  }
}

.text-field {
  color: var(--text-secondary);
  word-break: break-word;
}

.date-field {
  color: var(--text-secondary);
  font-size: $font-size-xs;
  font-family: $font-family-mono;
}

.boolean-field {
  padding: 2px 8px;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

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
