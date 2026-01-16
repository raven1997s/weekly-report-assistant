<template>
  <div class="database-view page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div>
        <h1>数据库管理</h1>
        <p class="page-header-subtitle">查看和管理应用数据（只读模式）</p>
      </div>
    </div>

    <!-- 表切换器 -->
    <div class="table-selector">
      <button
        v-for="table in tables"
        :key="table.name"
        class="table-tab"
        :class="{ active: currentTable === table.name }"
        @click="switchTable(table.name)"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
        </svg>
        <span>{{ tableDisplayNames[table.name] }}</span>
        <span class="table-badge">{{ table.rowCount }}</span>
      </button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索数据..."
        class="search-input"
      />
    </div>

    <!-- 数据表格 -->
    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      @page-change="handlePageChange"
    />

    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-message">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import DataTable from '../components/DataTable.vue'

// 表的显示名称
const tableDisplayNames = {
  records: '工作记录',
  reports: '周报归档',
  settings: '应用设置',
  scheduled_tasks: '定时任务'
}

const tables = ref([])
const currentTable = ref('records')
const searchQuery = ref('')
const loading = ref(false)
const columns = ref([])
const rows = ref([])
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

// Toast 状态
const toastMessage = ref('')
let toastTimer = null

// 获取表列表
const fetchTables = async () => {
  try {
    const response = await fetch('/api/database/tables')
    const result = await response.json()
    if (result.success) {
      tables.value = result.data
    } else {
      showToast(result.error || '获取表列表失败')
    }
  } catch (error) {
    showToast('网络错误，请重试')
  }
}

// 获取表数据
const fetchTableData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchQuery.value
    })

    const response = await fetch(`/api/database/table/${currentTable.value}?${params}`)
    const result = await response.json()

    if (result.success) {
      columns.value = result.data.columns
      rows.value = result.data.rows
      pagination.value = result.data.pagination
    } else {
      showToast(result.error || '加载数据失败')
    }
  } catch (error) {
    showToast('网络错误，请重试')
  } finally {
    loading.value = false
  }
}

// 切换表
const switchTable = (tableName) => {
  if (currentTable.value !== tableName) {
    currentTable.value = tableName
    pagination.value.page = 1
    searchQuery.value = ''
    fetchTableData()
  }
}

// 翻页
const handlePageChange = (page) => {
  pagination.value.page = page
  fetchTableData()
}

// 显示 Toast
const showToast = (message) => {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

// 监听搜索输入（防抖）
let searchTimer = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.page = 1
    fetchTableData()
  }, 500)
})

// 初始化
onMounted(() => {
  fetchTables()
  fetchTableData()
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4;
  max-width: 100%;

  h1 {
    font-family: $font-family-heading;
    letter-spacing: -0.03em;
    line-height: 1.2;
    font-weight: 700;
  }

  .page-header-subtitle {
    letter-spacing: -0.01em;
    line-height: 1.5;
    margin-top: $spacing-2;
  }

  @media (min-width: $breakpoint-xl) {
    gap: $spacing-8;
  }
}

.table-selector {
  display: flex;
  gap: $spacing-2;
  margin-bottom: $spacing-6;
  overflow-x: auto;
  padding-bottom: $spacing-2;

  .table-tab {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover {
      background: var(--bg-secondary);
      border-color: var(--border-color-hover);
    }

    &.active {
      background: $accent-light;
      border-color: $accent-primary;
      color: $accent-primary;
    }

    .table-badge {
      padding: 2px 6px;
      background: var(--bg-secondary);
      border-radius: $radius-full;
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
    }
  }
}

.search-bar {
  position: relative;
  margin-bottom: $spacing-6;

  .search-icon {
    position: absolute;
    left: $spacing-3;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: $spacing-3 $spacing-4;
    padding-left: $spacing-10;
    font-size: $font-size-sm;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    color: var(--text-primary);
    transition: all $transition-fast;

    &:focus {
      outline: none;
      border-color: $accent-primary;
      box-shadow: 0 0 0 3px $accent-light;
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: $spacing-4 $spacing-6;
  background: $accent-primary;
  color: white;
  border-radius: $radius-lg;
  box-shadow: var(--shadow-xl);
  z-index: $z-tooltip;
  font-weight: $font-weight-medium;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-normal;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 响应式
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-4;
  }

  .table-selector {
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
