<template>
  <div class="filter-panel">
    <div class="filter-header">
      <h3>筛选条件</h3>
      <button class="reset-btn" @click="handleReset" :disabled="!hasFilters">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clip-rule="evenodd" />
        </svg>
        重置
      </button>
    </div>

    <div class="filter-list">
      <!-- 加载状态 -->
      <div v-if="loading" class="filter-loading">
        <div class="loading-spinner"></div>
        <p>加载筛选字段中...</p>
      </div>

      <!-- 空状态提示 -->
      <div v-else-if="filterableColumns.length === 0" class="filter-empty">
        <p>暂无可筛选的字段</p>
        <p class="filter-empty-hint">该表可能没有可筛选的列</p>
      </div>

      <div v-for="column in filterableColumns" :key="column.name" class="filter-item">
        <label class="filter-label">{{ column.label || column.name }}</label>

        <!-- 文本字段：输入框 -->
        <input v-if="isTextField(column)" :type="column.name.includes('password') ? 'password' : 'text'"
          v-model="localFilters[column.name]" :placeholder="`搜索 ${column.label || column.name}...`" class="filter-input"
          @keyup.enter="handleApply" />

        <!-- 日期字段：日期范围选择器 -->
        <div v-else-if="isDateField(column)" class="date-range-filter">
          <input v-model="localFilters[column.name]" type="date" class="filter-input" placeholder="选择日期"
            @keyup.enter="handleApply" />
        </div>


        <!-- 布尔字段：下拉选择 -->
        <select v-else-if="isBooleanField(column)" v-model="localFilters[column.name]" class="filter-select">
          <option value="">全部</option>
          <option value="1">是</option>
          <option value="0">否</option>
        </select>
      </div>
    </div>

    <div class="filter-footer">
      <span v-if="hasFilters" class="filter-count">
        已选择 {{ activeFilterCount }} 个筛选条件
      </span>
      <button class="apply-btn" @click="handleApply">
        应用筛选
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  columns: Array,
  modelValue: Object,
  loading: Boolean
})

const emit = defineEmits(['update:modelValue', 'reset'])

// 本地筛选状态（用于防抖）
const localFilters = ref({})

// 初始化本地筛选状态
watch(() => props.modelValue, (value) => {
  localFilters.value = { ...value }
}, { immediate: true })

// 判断是否为文本字段
const isTextField = (column) => {
  const type = (column.type || '').toUpperCase()
  return type.includes('TEXT') || type.includes('CHAR') || type.includes('VARCHAR')
}

// 判断是否为日期字段
const isDateField = (column) => {
  const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'weekStart', 'weekEnd', 'created_at', 'updated_at']
  return dateFields.includes(column.name)
}

// 判断是否为布尔字段
const isBooleanField = (column) => {
  const booleanFields = ['deleted', 'enabled', 'isSystemTask']
  return booleanFields.includes(column.name)
}

// 可筛选的列
const filterableColumns = computed(() => {
  return props.columns.filter(col =>
    isTextField(col) || isDateField(col) || isBooleanField(col)
  )
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return Object.values(localFilters.value).some(v => v !== '' && v !== null && v !== undefined)
})

// 激活的筛选条件数量
const activeFilterCount = computed(() => {
  return Object.values(localFilters.value).filter(v => v !== '' && v !== null && v !== undefined).length
})

// 应用筛选
const handleApply = () => {
  emit('update:modelValue', { ...localFilters.value })
}

// 重置筛选
const handleReset = () => {
  localFilters.value = {}
  emit('reset')
}

// 自动应用筛选（防抖）已移除，改为手动应用
// let debounceTimer = null
// watch(localFilters, () => {
//   if (debounceTimer) clearTimeout(debounceTimer)
//   debounceTimer = setTimeout(() => {
//     handleApply()
//   }, 500)
// }, { deep: true })
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// 筛选面板 - 紧凑布局
.filter-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  padding: $spacing-4;
  margin-top: $spacing-3;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-4;

  h3 {
    margin: 0;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: $spacing-2;

    &::before {
      content: '';
      display: block;
      width: 3px;
      height: 14px;
      background: $accent-primary;
      border-radius: $radius-sm;
    }
  }

  .reset-btn {
    display: flex;
    align-items: center;
    gap: $spacing-1;
    padding: $spacing-1 $spacing-2;
    font-size: $font-size-xs;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    svg {
      width: 12px;
      height: 12px;
    }
  }
}

.filter-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: $spacing-3;

  .filter-loading,
  .filter-empty {
    grid-column: 1 / -1;
    padding: $spacing-6;
    text-align: center;
    color: var(--text-muted);

    p {
      margin: 0;
      font-size: $font-size-sm;
    }

    .filter-empty-hint {
      margin-top: $spacing-1;
      font-size: $font-size-xs;
      color: var(--text-placeholder);
    }
  }

  .filter-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-3;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: $accent-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;

  .filter-label {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
}

.filter-input,
.filter-select {
  padding: $spacing-2 $spacing-3;
  font-size: $font-size-sm;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  color: var(--text-primary);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--border-color-hover);
  }

  &:focus {
    outline: none;
    border-color: $accent-primary;
    box-shadow: 0 0 0 2px $accent-light;
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.filter-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: $spacing-8;
}

.date-range-filter {
  display: flex;
  gap: $spacing-2;

  .filter-input {
    flex: 1;
  }
}

.filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-4;
  padding-top: $spacing-3;
  border-top: 1px solid var(--divider-color);

  .filter-count {
    font-size: $font-size-xs;
    color: var(--text-muted);
  }

  .apply-btn {
    padding: $spacing-2 $spacing-5;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    background: $accent-primary;
    color: white;
    border: none;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: darken($accent-primary, 8%);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

// 响应式
@media (max-width: $breakpoint-md) {
  .filter-panel {
    padding: $spacing-3;
  }

  .filter-list {
    grid-template-columns: 1fr;
    gap: $spacing-2;
  }

  .filter-footer {
    flex-direction: column;
    gap: $spacing-2;
    align-items: stretch;

    .filter-count {
      text-align: center;
    }

    .apply-btn {
      width: 100%;
    }
  }
}
</style>
