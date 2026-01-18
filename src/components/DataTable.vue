<template>
  <div class="data-table-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <svg class="spinner" width="40" height="40" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clip-rule="evenodd" />
      </svg>
      <p>加载数据中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="rows.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
          clip-rule="evenodd" />
      </svg>
      <p>暂无数据</p>
    </div>

    <!-- 数据表格 -->
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.name" class="table-header"
              :class="{ sortable: true, sorted: sortColumn === column.name }" @click="handleSort(column.name)">
              <span>{{ columnDisplayNames[column.name] || column.name }}</span>
              <span v-if="sortColumn === column.name" class="sort-icon">
                <svg v-if="sortOrder === 'asc'" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 7.414V17a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 12.586V3a1 1 0 012 0v9.586l3.293-3.293a1 1 0 011.414 0z" />
                </svg>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="row.id || index" class="table-row">
            <td v-for="column in columns" :key="column.name" class="table-cell">
              <CellContent :value="row[column.name]" :column="column.name" @show-json="$emit('showJson', $event)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页器 -->
    <div v-if="pagination.totalPages > 1" class="pagination">
      <button class="pagination-btn" :disabled="pagination.page === 1"
        @click="$emit('pageChange', pagination.page - 1)">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd" />
        </svg>
      </button>

      <span class="pagination-info">
        第 {{ pagination.page }} / {{ pagination.totalPages }} 页 (共 {{ pagination.total }} 条)
      </span>

      <button class="pagination-btn" :disabled="pagination.page === pagination.totalPages"
        @click="$emit('pageChange', pagination.page + 1)">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import CellContent from './CellContent.vue'

const props = defineProps({
  columns: Array,
  rows: Array,
  loading: Boolean,
  pagination: Object,
  sortColumn: {
    type: String,
    default: 'id'
  },
  sortOrder: {
    type: String,
    default: 'DESC',
    validator: (value) => ['ASC', 'DESC', ''].includes(value)
  }
})

const emit = defineEmits(['pageChange', 'showJson', 'sortChange'])

// 处理排序
const handleSort = (column) => {
  if (props.sortColumn === column) {
    // 切换排序方向：ASC -> DESC -> 无
    if (props.sortOrder === 'ASC') {
      emit('sortChange', { column, order: 'DESC' })
    } else if (props.sortOrder === 'DESC') {
      emit('sortChange', { column: null, order: null })
    }
  } else {
    // 新列，默认升序
    emit('sortChange', { column, order: 'ASC' })
  }
}

// 列显示名称映射
const columnDisplayNames = {
  id: 'ID',
  content: '内容',
  project: '项目',
  workType: '工作类型',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  deleted: '已删除',
  deletedAt: '删除时间',
  weekStart: '周开始',
  weekEnd: '周结束',
  weekLabel: '周标签',
  markdown: 'Markdown',
  plainText: '纯文本',
  records: '记录数据',
  plans: '计划数据',
  reflections: '总结数据',
  key: '键',
  value: '值',
  name: '名称',
  hour: '小时',
  minute: '分钟',
  day_of_week: '星期',
  type: '类型',
  enabled: '启用',
  created_at: '创建时间',
  updated_at: '更新时间',
  isSystemTask: '系统任务',
  // plans 表新增字段
  status: '状态',
  convertedRecordId: '转换记录ID'
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.data-table-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-12;
  color: var(--text-muted);

  svg {
    margin-bottom: $spacing-4;
    color: var(--text-secondary);
  }

  p {
    margin: 0;
    font-size: $font-size-sm;
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.table-wrapper {
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
}

.data-table {
  width: 100%; // 确保表格始终占满容器宽度
  border-collapse: collapse;
  font-size: $font-size-sm;

  .table-header {
    position: sticky;
    top: 0;
    background: var(--bg-secondary);
    padding: $spacing-3 $spacing-4;
    text-align: left;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-color);
    white-space: nowrap;
    min-width: 100px; // 确保每列最小宽度
    z-index: 10;
    user-select: none;

    &.sortable {
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: var(--bg-card);
      }
    }

    &.sorted {
      color: $accent-primary;
    }

    .sort-icon {
      display: inline-block;
      margin-left: $spacing-2;
      color: $accent-primary;
    }
  }

  .table-row {
    &:hover {
      background: var(--bg-secondary);
    }

    &:not(:last-child) {
      border-bottom: 1px solid var(--divider-color);
    }
  }

  .table-cell {
    padding: $spacing-3 $spacing-4;
    color: var(--text-secondary);
    white-space: nowrap;
    min-width: 100px; // 最小宽度
    max-width: 300px; // 限制最大宽度，防止溢出
    overflow: hidden;
    text-overflow: ellipsis; // 超长内容显示省略号
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-4;
  padding: $spacing-4;
  border-top: 1px solid var(--border-color);

  .pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    color: var(--text-primary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--border-color-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .pagination-info {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}

// 响应式
@media (max-width: $breakpoint-md) {
  .table-wrapper {
    max-height: 400px;
  }

  .data-table .table-cell {
    max-width: 150px;
  }

  .pagination {
    flex-direction: column;
    gap: $spacing-2;

    .pagination-info {
      order: -1;
    }
  }
}
</style>
