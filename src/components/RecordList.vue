<template>
  <div class="record-list">
    <!-- 空状态 -->
    <div v-if="groupedRecords && Object.keys(groupedRecords).length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </div>
      <div class="empty-state-title">暂无工作记录</div>
      <div class="empty-state-desc">在上方输入框记录你的工作内容</div>
    </div>

    <!-- 按项目分组展示 -->
    <div v-else class="record-groups">
      <div
        v-for="(records, project) in groupedRecords"
        :key="project"
        class="record-group"
      >
        <div class="group-header">
          <h3 class="group-title">{{ project }}</h3>
          <span class="group-count">{{ records.length }}</span>
        </div>
        <div class="group-content">
          <draggable
            :list="records"
            item-key="id"
            handle=".drag-handle"
            @end="onDragEnd(records)"
            ghost-class="ghost-card"
            drag-class="dragging-card"
          >
            <template #item="{ element: record }">
              <Transition name="list-item" appear>
                <RecordCard
                  :record="record"
                  :draggable="true"
                  @deleted="handleDeleted"
                  @updated="handleUpdated"
                />
              </Transition>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import draggable from 'vuedraggable'
import RecordCard from './RecordCard.vue'
import { useRecordsStore } from '../stores/records'

const recordsStore = useRecordsStore()

// 按项目分组的记录
const groupedRecords = computed(() => recordsStore.currentWeekByProject)

// 处理删除事件
const handleDeleted = (record) => {
  console.log('Record deleted:', record)
}

// 处理更新事件
const handleUpdated = (record) => {
  console.log('Record updated:', record)
}

// 拖拽结束
const onDragEnd = (recordsList) => {
  // 更新所有记录的顺序
  const recordIds = recordsList.map(r => r.id)
  recordsStore.reorderRecords(recordIds)
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.record-list {
  margin-top: $spacing-6;
}

.record-groups {
  display: flex;
  flex-direction: column;
  gap: $spacing-10; // 增加项目分组之间的间距

  // 大屏幕上增加间距
  @media (min-width: $breakpoint-xl) {
    gap: $spacing-12;
  }
}

.record-group {
  // 超大屏幕上使用网格布局展示记录卡片
  @media (min-width: 1400px) {
    .group-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-6; // 增加网格卡片之间的间距
    }
  }

  // 极宽屏幕上进一步增加间距
  @media (min-width: 1600px) {
    .group-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-8; // 更大的间距
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-3;
    border-bottom: 1px solid var(--divider-color);

    // 大屏幕上增大尺寸
    @media (min-width: $breakpoint-xl) {
      margin-bottom: $spacing-5;
      padding-bottom: $spacing-4;
      gap: $spacing-4;
    }

    .group-title {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.3;

      @media (min-width: $breakpoint-xl) {
        font-size: $font-size-xl;
      }
    }

    .group-count {
      font-size: $font-size-xs;
      font-weight: $font-weight-medium;
      color: var(--text-muted);
      padding: $spacing-1 $spacing-2;
      background: var(--bg-secondary);
      border-radius: $radius-full;

      @media (min-width: $breakpoint-xl) {
        font-size: $font-size-sm;
        padding: $spacing-2 $spacing-3;
      }
    }
  }

  .group-content {
    display: flex;
    flex-direction: column;
    gap: $spacing-6; // 进一步增加同一项目下卡片之间的间距
    min-height: 50px;

    // 大屏幕上增加间距
    @media (min-width: $breakpoint-xl) {
      gap: $spacing-8;
    }

    // 超大屏幕上进一步增加
    @media (min-width: 1600px) {
      gap: $spacing-10;
    }
  }
}

// 拖拽样式
:deep(.ghost-card) {
  opacity: 0.5;
  background: var(--bg-card);
  border: 2px dashed $accent-primary;
}

:deep(.dragging-card) {
  opacity: 0.9;
  transform: rotate(2deg);
  box-shadow: var(--shadow-lg);
}

// 列表项平滑进入动画
.list-item-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-item-enter-to {
  opacity: 1;
  transform: translateY(0);
}

// ========================================
// 响应式断点
// ========================================

// 平板设备
@media (max-width: $breakpoint-lg) {
  .record-groups {
    gap: $spacing-6;
  }
}

// 移动设备
@media (max-width: $breakpoint-md) {
  .record-list {
    margin-top: $spacing-4;
  }

  .record-groups {
    gap: $spacing-8; // 移动端也保持较大的间距
  }

  .record-group {
    .group-header {
      margin-bottom: $spacing-3;
      padding-bottom: $spacing-2;

      .group-title {
        font-size: $font-size-base;
      }
    }

    .group-content {
      gap: $spacing-5; // 移动端也增加卡片间距
    }
  }
}

// 小屏手机
@media (max-width: $breakpoint-sm) {
  .record-groups {
    gap: $spacing-6; // 小屏也保持足够的间距
  }

  .record-group {
    .group-header {
      gap: $spacing-2;
    }

    .group-content {
      gap: $spacing-4; // 小屏也增加卡片间距
    }
  }
}
</style>
