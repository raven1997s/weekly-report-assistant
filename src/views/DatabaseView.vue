<template>
  <div class="database-view page-container-wide">
    <!-- 页面头部 -->
    <div class="page-header">
      <div>
        <h1>数据库管理</h1>
        <p class="page-header-subtitle">查看和管理应用数据（只读模式）</p>
      </div>
    </div>

    <!-- 表切换器（Segmented Control 风格） -->
    <div class="table-selector-wrapper">
      <div class="table-selector">
        <button v-for="table in tables" :key="table.name" class="table-tab"
          :class="{ active: currentTable === table.name }" @click="switchTable(table.name)">
          <span class="table-name">{{ tableDisplayNames[table.name] }}</span>
          <span class="table-badge">{{ table.rowCount }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-filter-wrapper">
      <div class="search-filter-bar">
        <div class="search-bar">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd" />
          </svg>
          <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索数据..."
            @keyup.enter="handleSearch" />
        </div>

        <button class="filter-toggle-btn" @click="showFilterPanel = !showFilterPanel"
          :class="{ active: showFilterPanel || hasActiveFilters }">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
              clip-rule="evenodd" />
          </svg>
          <span>筛选</span>
          <span v-if="hasActiveFilters && !showFilterPanel" class="filter-badge">{{ activeFilterCount }}</span>
        </button>
      </div>

      <!-- 筛选面板（带动画） -->
      <Transition name="slide-fade">
        <FilterPanel v-if="showFilterPanel" :columns="columns" v-model="filters" @reset="handleResetFilters"
          :loading="loading" />
      </Transition>
    </div>

    <!-- 数据表格区域 -->
    <Transition name="table-fade" mode="out-in">
      <div class="table-scroll-container" :key="currentTable">
        <DataTable :columns="columns" :rows="rows" :loading="loading" :pagination="pagination" :sort-column="sortColumn"
          :sort-order="sortOrder" @page-change="handlePageChange" @show-json="handleShowJson"
          @sort-change="handleSortChange" />
      </div>
    </Transition>

    <!-- JSON 查看器弹窗 -->
    <JsonViewer v-model="showJsonViewer" :data="jsonData" :title="jsonTitle" />

    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-message">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import DataTable from '../components/DataTable.vue'
import JsonViewer from '../components/JsonViewer.vue'
import FilterPanel from '../components/FilterPanel.vue'

// 表的显示名称
const tableDisplayNames = {
  records: '工作记录',
  reports: '周报归档',
  settings: '应用设置',
  scheduled_tasks: '定时任务',
  plans: '下周计划'
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

// JSON 查看器状态
const showJsonViewer = ref(false)
const jsonData = ref(null)
const jsonTitle = ref('')

// 筛选状态
const showFilterPanel = ref(false)
const filters = ref({})

// 排序状态
const sortColumn = ref('id')
const sortOrder = ref('DESC')

// 计算激活的筛选条件数量
const activeFilterCount = computed(() => {
  if (!filters.value) return 0
  return Object.values(filters.value).filter(v => v !== '' && v !== null && v !== undefined).length
})

// 是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return activeFilterCount.value > 0
})

// 处理搜索
const handleSearch = () => {
  pagination.value.page = 1
  fetchTableData()
}

// 处理筛选重置
const handleResetFilters = () => {
  filters.value = {}
  showFilterPanel.value = false
  pagination.value.page = 1
  fetchTableData()
}

// 处理 JSON 显示
const handleShowJson = (data) => {
  jsonData.value = data
  jsonTitle.value = `${tableDisplayNames[currentTable.value]} - JSON 数据`
  showJsonViewer.value = true
}

// 处理排序变化
const handleSortChange = ({ column, order }) => {
  sortColumn.value = column || 'id'
  sortOrder.value = order || 'DESC'
  fetchTableData()
}

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
      search: searchQuery.value,
      // column: filterColumn.value, // 已移除
      sortColumn: sortColumn.value,
      sortOrder: sortOrder.value
    })

    // 添加筛选参数
    for (const [key, value] of Object.entries(filters.value)) {
      if (value && value !== '') {
        params.append(`filters[${key}]`, value)
      }
    }

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
    // 重置所有状态防止污染
    columns.value = []
    rows.value = []
    pagination.value = { ...pagination.value, page: 1, total: 0 }
    searchQuery.value = ''
    filters.value = {}
    showFilterPanel.value = false
    sortColumn.value = null // 让后端决定默认排序字段
    sortOrder.value = 'DESC'

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

// 监听筛选变化，自动刷新
watch(filters, () => {
  pagination.value.page = 1
  fetchTableData()
}, { deep: true })

// 初始化
onMounted(() => {
  document.body.classList.add('allow-horizontal-scroll') // 允许横向滚动
  fetchTables()
  fetchTableData()
})

// 组件卸载时移除 class
onUnmounted(() => {
  document.body.classList.remove('allow-horizontal-scroll')
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// 页面容器 - 固定布局，禁止水平滚动
.database-view {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding-bottom: $spacing-8;
  overflow-x: hidden; // 禁止页面级水平滚动
}

// 页面头部
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4;
  padding-bottom: $spacing-6;
  max-width: 100%;

  h1 {
    font-family: $font-family-heading;
    font-size: $font-size-2xl;
    letter-spacing: -0.03em;
    line-height: 1.2;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .page-header-subtitle {
    letter-spacing: -0.01em;
    line-height: 1.5;
    margin-top: $spacing-1;
    color: var(--text-secondary);
    font-size: $font-size-sm;
  }
}

// ========================================
// 表切换器 - Segmented Control 风格
// ========================================
.table-selector-wrapper {
  margin-bottom: $spacing-5;
}

.table-selector {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: $radius-lg;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  // 隐藏滚动条但保持功能
  &::-webkit-scrollbar {
    height: 0;
  }

  .table-tab {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-4;
    background: transparent;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover:not(.active) {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    &.active {
      background: var(--bg-card);
      color: $accent-primary;
      box-shadow: $shadow-sm;
    }

    .table-name {
      font-weight: $font-weight-medium;
    }

    .table-badge {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: $radius-full;
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: var(--text-muted);
      transition: all 0.2s ease;
    }

    &.active .table-badge {
      background: $accent-light;
      color: $accent-primary;
    }
  }
}

// ========================================
// 搜索筛选区域 - 卡片容器
// ========================================
.search-filter-wrapper {
  margin-bottom: $spacing-5;
}

.search-filter-bar {
  display: flex;
  gap: $spacing-3;
  padding: $spacing-3;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  box-shadow: $shadow-xs;
  align-items: center;
}

.search-bar {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;

  .search-icon {
    position: absolute;
    left: $spacing-3;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
    z-index: 1;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    padding: $spacing-2 $spacing-4;
    padding-left: $spacing-10;
    font-size: $font-size-sm;
    background: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: $radius-md;
    color: var(--text-primary);
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--border-color);
    }

    &:focus {
      outline: none;
      background: var(--bg-card);
      border-color: $accent-primary;
      box-shadow: 0 0 0 3px $accent-light;
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: $radius-md;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  &:hover:not(.active) {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
  }

  &.active {
    background: $accent-light;
    border-color: $accent-primary;
    color: $accent-primary;

    svg {
      transform: rotate(180deg);
    }
  }

  .filter-badge {
    padding: 2px 6px;
    background: $accent-primary;
    color: white;
    border-radius: $radius-full;
    font-size: 10px;
    font-weight: $font-weight-bold;
    min-width: 18px;
    text-align: center;
  }
}

// ========================================
// 表格容器 - 独立水平滚动
// ========================================
.table-scroll-container {
  width: 100%;
  max-width: 100%; // 不超出父容器
  overflow-x: auto; // 只有表格区域可以水平滚动
  -webkit-overflow-scrolling: touch;
  border-radius: $radius-lg;

  // 自定义滚动条
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: $radius-full;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: $radius-full;

    &:hover {
      background: var(--border-color-hover);
    }
  }
}

// ========================================
// Toast 消息
// ========================================
.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: $spacing-3 $spacing-5;
  background: var(--text-primary);
  color: var(--bg-primary);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  z-index: $z-tooltip;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
}

// ========================================
// 动画效果
// ========================================

// Toast 淡入淡出
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 筛选面板滑动淡入
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// 表格切换淡入
.table-fade-enter-active {
  transition: opacity 0.2s ease-out;
}

.table-fade-leave-active {
  transition: opacity 0.15s ease-in;
}

.table-fade-enter-from,
.table-fade-leave-to {
  opacity: 0;
}

// ========================================
// 响应式布局
// ========================================
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-2;
    padding-bottom: $spacing-4;

    h1 {
      font-size: $font-size-xl;
    }
  }

  .table-selector-wrapper {
    margin: 0 (-$spacing-4);
    padding: 0 $spacing-4;
    overflow-x: auto;
  }

  .table-selector {
    width: max-content;
    min-width: 100%;
  }

  .search-filter-bar {
    flex-direction: column;
    padding: $spacing-2;
    gap: $spacing-2;
  }

  .search-bar {
    width: 100%;
  }

  .filter-toggle-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: $breakpoint-sm) {
  .table-selector .table-tab {
    padding: $spacing-2 $spacing-3;
    font-size: $font-size-xs;

    .table-badge {
      display: none;
    }
  }
}
</style>
