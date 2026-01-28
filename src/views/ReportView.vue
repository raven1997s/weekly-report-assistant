<template>
  <div class="report-view page-container">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">生成周报</h1>
        <p class="page-header-subtitle">补充计划与总结，一键生成完整周报</p>
      </div>
      <!-- 简洁的周信息提示 -->
      <div v-if="weekInfo" class="week-info-wrapper">
        <div class="week-badge">
          <span class="week-range">{{ formatDate(weekInfo.start, 'MM.DD') }} - {{ formatDate(weekInfo.end, 'MM.DD')
            }}</span>
          <span class="week-divider">|</span>
          <span class="workday-count">{{ weekInfo.workdayCount }}个工作日</span>
          <span v-if="weekInfo.holidayCount > 0" class="holiday-hint">含{{ weekInfo.holidayCount }}天假期</span>
        </div>
        <!-- 假期详情 -->
        <div v-if="upcomingHolidaysText" class="upcoming-holidays">
          <svg class="holiday-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd" />
          </svg>
          <span class="holiday-text">{{ upcomingHolidaysText }}</span>
        </div>
      </div>
    </div>

    <!-- 锁定提示 -->
    <Transition name="fade">
      <div v-if="isCurrentWeekSaved" class="locked-notice">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clip-rule="evenodd" />
        </svg>
        <span>本周周报已归档，如需修改请前往历史周报页面</span>
      </div>
    </Transition>

    <div class="report-layout">
      <!-- 左侧编辑区 -->
      <div class="report-editor">
        <!-- 本周工作记录（批量选择区域） -->
        <div v-if="!isCurrentWeekSaved" class="card editor-section records-section">
          <div class="section-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"
                style="vertical-align: middle; margin-right: 8px; color: var(--text-primary);">
                <path fill-rule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clip-rule="evenodd" />
              </svg>
              本周工作记录
            </h3>
            <span class="record-count">{{ recordsStore.currentWeekRecords.length }} 条</span>
          </div>

          <!-- 记录列表 -->
          <div v-if="recordsStore.currentWeekRecords.length > 0" class="records-selection-list">
            <div v-for="record in recordsStore.currentWeekRecords" :key="record.id" class="record-selection-item"
              :class="{ selected: selectedRecordIds.has(record.id) }" @click="toggleRecordSelection(record.id)">
              <div class="record-checkbox">
                <svg v-if="selectedRecordIds.has(record.id)" width="18" height="18" viewBox="0 0 20 20"
                  fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clip-rule="evenodd" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="currentColor"
                  style="color: var(--border-color);">
                  <path fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="record-selection-content">
                <div class="record-selection-tags">
                  <span v-if="record.project" class="mini-tag project">{{ record.project }}</span>
                  <span v-if="record.workType" class="mini-tag type">{{ record.workType }}</span>
                </div>
                <div class="record-selection-text">{{ record.content }}</div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="records-empty">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="currentColor" style="color: var(--text-muted);">
              <path
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p>本周暂无工作记录</p>
            <p class="empty-hint">可以直接在下方添加，或前往首页添加</p>
          </div>

          <!-- 快速添加工作记录输入框 -->
          <InputBox v-if="!isCurrentWeekSaved" @record-added="handleRecordAdded" />

          <!-- 批量操作条 -->
          <Transition name="slide-up">
            <div v-if="selectedRecordIds.size > 0" class="batch-actions-bar">
              <span class="selected-count">已选择 {{ selectedRecordIds.size }} 条</span>
              <div class="batch-actions-buttons">
                <button class="btn btn-sm btn-ghost" @click="selectedRecordIds.clear()">
                  取消选择
                </button>
                <button class="btn btn-sm btn-primary" @click="moveSelectedToNextWeek">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
                    <path fill-rule="evenodd"
                      d="M8 3a5 5 0 100 10A5 5 0 008 3zm3.25 5.5a.75.75 0 01-.75.75H6.5v1.69a.75.75 0 01-1.28.53l-2.5-2.5a.75.75 0 010-1.06l2.5-2.5a.75.75 0 011.28.53V7.5h4a.75.75 0 01.75.75z"
                      clip-rule="evenodd" />
                  </svg>
                  移到下周计划
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 下周计划 -->
        <div class="card editor-section" :class="{ locked: isCurrentWeekSaved }">
          <div class="section-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"
                style="vertical-align: middle; margin-right: 8px; color: var(--text-primary);">
                <path fill-rule="evenodd"
                  d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                  clip-rule="evenodd" />
              </svg>
              下周计划
            </h3>
          </div>
          <div class="plan-list">
            <div v-for="plan in displayPlans" :key="plan.id" class="plan-item">
              <span class="plan-text">{{ plan.content }}</span>
              <button class="delete-btn" @click="removePlan(plan.id)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                </svg>
              </button>
            </div>
          </div>
          <PlanInputBox v-if="!isCurrentWeekSaved" @plan-added="handleAddPlan" />
        </div>

        <!-- 本周得与失 -->
        <div class="card editor-section" :class="{ locked: isCurrentWeekSaved }">
          <div class="section-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"
                style="vertical-align: middle; margin-right: 8px; color: var(--text-primary);">
                <path
                  d="M10 2a6 6 0 00-6 6c0 2.5 1.5 4.5 3.5 5.5V15a1 1 0 001 1h3a1 1 0 001-1v-1.5c2-1 3.5-3 3.5-5.5a6 6 0 00-6-6zM8 16.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
                <path fill-rule="evenodd"
                  d="M5.5 13a.5.5 0 01.5-.5h8a.5.5 0 010 1H6a.5.5 0 01-.5-.5zM5.5 15a.5.5 0 01.5-.5h8a.5.5 0 010 1H6a.5.5 0 01-.5-.5z"
                  clip-rule="evenodd" />
              </svg>
              本周总结
            </h3>
          </div>
          <div class="reflection-inputs">
            <div class="input-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
                  style="vertical-align: middle; margin-right: 6px; color: #3b82f6;">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clip-rule="evenodd" />
                </svg>
                值得肯定的
              </label>
              <textarea v-model="reflections.gains" placeholder="本周做得好的地方，收获了什么..." rows="3"
                :disabled="isCurrentWeekSaved" @input="updateReflections"></textarea>
            </div>
            <div class="input-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
                  style="vertical-align: middle; margin-right: 6px; color: #f59e0b;">
                  <path fill-rule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clip-rule="evenodd" />
                </svg>
                需要改进的
              </label>
              <textarea v-model="reflections.losses" placeholder="本周遇到的问题，有哪些教训..." rows="3"
                :disabled="isCurrentWeekSaved" @input="updateReflections"></textarea>
            </div>
          </div>
        </div>

        <!-- 保存按钮 -->
        <button class="btn btn-primary full-width mt-md" :disabled="isCurrentWeekSaved" @click="saveCurrentReport">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 6px;">
            <path
              d="M10 3.5a.5.5 0 01.5.5v5a.5.5 0 01-.5.5H6a.5.5 0 000 1h4v5.5a.5.5 0 01-1 0v-5H5a.5.5 0 01-.5-.5v-9A2.5 2.5 0 017 2h6a2.5 2.5 0 012.5 2.5V9a.5.5 0 01-1 0v-4.5A1.5 1.5 0 0013 3H7a1.5 1.5 0 00-1.5 1.5v9z" />
            <path
              d="M4 15a1 1 0 001 1h8a1 1 0 001-1v-4a1 1 0 00-1-1H5a1 1 0 00-1 1v4zm1-3.5a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5z" />
          </svg>
          {{ isCurrentWeekSaved ? '已归档' : '保存并归档周报' }}
        </button>
      </div>

      <!-- 右侧预览区 -->
      <div class="report-preview-container">
        <ReportPreview :report="previewReport" />
      </div>
    </div>

    <!-- 验证提示 Toast -->
    <Transition name="slide-down">
      <div v-if="validationMessage" class="validation-toast" :class="{ error: isValidationError }">
        <svg v-if="!isValidationError" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd" />
        </svg>
        <span>{{ validationMessage }}</span>
      </div>
    </Transition>

    <!-- 保存确认弹窗 -->
    <Transition name="scale">
      <div v-if="showSaveConfirm" class="modal-overlay" @click="showSaveConfirm = false">
        <div class="modal-content confirm-modal" @click.stop>
          <div class="modal-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"
                style="vertical-align: middle; margin-right: 8px;">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd" />
              </svg>
              保存周报确认
            </h3>
            <button class="close-btn" @click="showSaveConfirm = false">×</button>
          </div>
          <div class="modal-body">
            <div class="confirm-content">
              <svg class="confirm-icon" width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd" />
              </svg>
              <p class="confirm-message">确定要保存并归档本周周报吗？</p>
              <p class="confirm-hint">保存后本周周报将被锁定，如需修改请前往历史周报页面</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showSaveConfirm = false">取消</button>
            <button class="btn btn-primary" @click="confirmSaveReport">确认保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 自定义确认弹窗 -->
    <ConfirmDialog v-model:show="dialogStore.confirmShow" :title="dialogStore.confirmTitle || '确认'"
      :message="dialogStore.confirmMessage" :details="dialogStore.confirmDetails"
      @confirm="dialogStore.confirmHandle(true)" @cancel="dialogStore.confirmHandle(false)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordsStore } from '../stores/records'
import { useReportsStore } from '../stores/reports'
import { useDialogStore } from '../stores/dialog'
import { useGenerator } from '../composables/useGenerator'
import { getWeekStart, getWorkWeekInfo, formatDate } from '../utils/date'
import ReportPreview from '../components/ReportPreview.vue'
import InputBox from '../components/InputBox.vue'
import PlanInputBox from '../components/PlanInputBox.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const recordsStore = useRecordsStore()
const reportsStore = useReportsStore()
const dialogStore = useDialogStore()
const { generateReport } = useGenerator()

// 记录选择状态
const selectedRecordIds = ref(new Set())

// 周信息
const weekInfo = ref(null)

// 计算即将到来的假期文本
const upcomingHolidaysText = computed(() => {
  if (!weekInfo.value || !weekInfo.value.upcomingHolidays || weekInfo.value.upcomingHolidays.length === 0) {
    return ''
  }

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const holidays = weekInfo.value.upcomingHolidays

  if (holidays.length === 0) return ''

  // 生成假期描述
  const descriptions = holidays.map(h => {
    const dateStr = formatDate(h.date, 'M.DD')
    const weekday = weekdays[h.weekday]
    return `${weekday}(${dateStr})`
  })

  return descriptions.join('、') + ' 休息'
})

// 状态
const validationMessage = ref('')
const isValidationError = ref(false)
const validationTimer = ref(null)
const showSaveConfirm = ref(false)

// 检查本周是否已保存
const isCurrentWeekSaved = computed(() => reportsStore.hasCurrentWeekReport)

// 获取本周已归档的数据
const archivedReport = computed(() => {
  if (reportsStore.hasCurrentWeekReport) {
    return reportsStore.getCurrentWeekArchivedReport()
  }
  return null
})

// 如果已归档，使用归档数据；否则使用 store 中的数据
const displayPlans = computed(() => {
  if (archivedReport.value) {
    return archivedReport.value.plans || []
  }
  return reportsStore.currentPlans
})

const displayReflections = computed(() => {
  if (archivedReport.value) {
    return archivedReport.value.reflections || { gains: '', losses: '' }
  }
  return reportsStore.currentReflections
})

// 本地 ref 状态（仅用于未归档时的编辑）
const reflections = ref({ ...reportsStore.currentReflections })

// 实时更新得与失
const updateReflections = () => {
  reportsStore.updateReflections(reflections.value)
}

// 显示验证提示
const showValidationAlert = (message, isError = false) => {
  validationMessage.value = message
  isValidationError.value = isError

  if (validationTimer.value) {
    clearTimeout(validationTimer.value)
  }

  validationTimer.value = setTimeout(() => {
    validationMessage.value = ''
    isValidationError.value = false
  }, 3000)
}

// 预览数据 - 如果已归档，使用归档数据；否则重新生成
const previewReport = computed(() => {
  // 如果已归档，直接返回归档的 report（包含保存时的 markdown 和 plainText）
  if (archivedReport.value) {
    return {
      ...archivedReport.value,
      // 确保 weekLabel 存在（用于显示标题）
      weekLabel: archivedReport.value.weekLabel || formatDate(new Date(), 'YYYY年第W周')
    }
  }

  // 未归档时，动态生成
  return generateReport({
    records: recordsStore.currentWeekRecords,
    plans: displayPlans.value,
    reflections: displayReflections.value
  })
})

// 添加计划
const handleAddPlan = (plan) => {
  reportsStore.addPlan(plan)
}

// 删除计划
const removePlan = (id) => {
  reportsStore.removePlan(id)
}

// 添加工作记录后的处理
const handleRecordAdded = (record) => {
  console.log('[ReportView] 工作记录已添加:', record)
  // 记录会自动显示在列表中（Vue 响应式）
}

// 保存周报
const saveCurrentReport = () => {
  // 验证是否已保存
  if (reportsStore.hasCurrentWeekReport) {
    showValidationAlert('本周周报已归档，如需修改请前往历史周报页面', true)
    return
  }

  // 验证下周计划（使用 displayPlans，归档后会是空数组，但上面已经拦截）
  if (displayPlans.value.length === 0) {
    showValidationAlert('请至少添加一条下周计划', true)
    return
  }

  // 验证得与失（使用 displayReflections）
  const currentReflections = displayReflections.value
  if (!currentReflections.gains && !currentReflections.losses) {
    showValidationAlert('请至少填写一项本周总结（值得肯定的 或 需要改进的）', true)
    return
  }

  // 显示确认弹窗
  showSaveConfirm.value = true
}

// 确认保存
const confirmSaveReport = async () => {
  try {
    await reportsStore.saveReport(previewReport.value)
    showSaveConfirm.value = false
    router.push('/history')
  } catch (error) {
    // 保存失败,错误已由 store 显示 toast
    showSaveConfirm.value = false
  }
}

// 初始化
onMounted(async () => {
  // ========== 新增：强制刷新数据，确保获取最新状态 ==========
  console.log('[ReportView] 开始初始化，先刷新数据...')

  // 并发刷新所有 store 数据
  await Promise.all([
    recordsStore.init(),
    reportsStore.init()
  ])

  console.log('[ReportView] 数据刷新完成')

  // 等待一小段时间，确保所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 300))
  // ========== 刷新结束 ==========

  // 如果本周已归档，加载归档的得与失数据
  if (reportsStore.hasCurrentWeekReport) {
    const archived = reportsStore.getCurrentWeekArchivedReport()
    if (archived?.reflections) {
      reflections.value = { ...archived.reflections }
    }
  } else {
    // 未归档时使用 store 中的数据
    reflections.value = { ...reportsStore.currentReflections }
  }

  // 初始化周信息
  weekInfo.value = getWorkWeekInfo(new Date())

  // ========== 新增：检查转换状态前再次确认数据已刷新 ==========
  console.log('[ReportView] 检查是否需要转换上周计划...')

  // 检查是否需要转换上周计划（异步）
  const shouldConvert = await shouldShowConvertPrompt()

  if (shouldConvert) {
    console.log('[ReportView] 需要转换，显示确认弹窗')
    convertLastWeekPlansToRecords()
  } else {
    console.log('[ReportView] 无需转换（已转换或无上周计划）')
  }
  // ========== 检查结束 ==========
})

// ============================================
// 计划转换相关函数
// ============================================

/**
 * 检查是否需要提示转换上周计划
 * 1. 检查本周是否已有用户手动添加的记录
 * 2. 检查后端是否已转换过
 */
const shouldShowConvertPrompt = async () => {
  // 1. 检查本周是否已有用户手动添加的记录
  const hasUserRecords = hasUserAddedRecordsThisWeek()
  if (hasUserRecords) {
    console.log('[转换] 本周已有用户记录，跳过转换')
    return false
  }

  // 2. 检查后端是否已转换过
  const thisWeekStart = getWeekStart(new Date()).toISOString()
  try {
    const response = await fetch(`/api/convert/status?weekStart=${encodeURIComponent(thisWeekStart)}`)
    const result = await response.json()

    if (result.success && result.converted) {
      console.log('[转换] 后端已转换过，跳过提示')
      return false
    }
  } catch (error) {
    console.error('[转换] 检查转换状态失败:', error)
  }

  return true
}

/**
 * 标记已转换（调用后端 API）
 */
const markAsConverted = async (recordIds) => {
  const thisWeekStart = getWeekStart(new Date()).toISOString()
  try {
    const response = await fetch('/api/convert/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: thisWeekStart, recordIds })
    })

    if (response.ok) {
      console.log('[转换] 已标记转换:', thisWeekStart)
    } else {
      console.error('[转换] 标记转换失败')
    }
  } catch (error) {
    console.error('[转换] 标记转换失败:', error)
  }
}

/**
 * 检查本周是否已有用户手动添加的记录
 */
const hasUserAddedRecordsThisWeek = () => {
  const workWeekInfo = getWorkWeekInfo(new Date())

  // 处理全节假日周
  if (workWeekInfo.hasNoWorkdays) {
    return false
  }

  const { start, end } = workWeekInfo
  return recordsStore.records.some(record => {
    const recordDate = new Date(record.createdAt)
    return recordDate >= start && recordDate <= end
  })
}

/**
 * 获取上周周报
 */
const getLastWeekReport = () => {
  const allReports = reportsStore.getAllReports()
  if (allReports.length === 0) return null

  const thisWeekStart = getWeekStart(new Date())
  const previousReports = allReports.filter(r => {
    const reportWeekStart = new Date(r.weekStart)
    return reportWeekStart < thisWeekStart
  })

  if (previousReports.length === 0) return null

  return previousReports[0] // 最新的上周周报
}

/**
 * 将上周的"下周计划"转换为工作记录
 */
const convertLastWeekPlansToRecords = async () => {
  // 1. 获取上周周报
  const lastWeekReport = getLastWeekReport()

  if (!lastWeekReport?.plans || lastWeekReport.plans.length === 0) {
    console.log('[转换] 上周无计划，跳过转换')
    return
  }

  // 2. 生成计划摘要
  const planSummary = lastWeekReport.plans.map(p => `• ${p.content}`).join('\n')

  // 3. 弹窗询问用户
  const confirmed = await dialogStore.confirm({
    title: '转换上周计划',
    message: `检测到上周有 ${lastWeekReport.plans.length} 条"下周计划"，是否转换为本周工作记录？`,
    details: planSummary
  })

  if (!confirmed) {
    console.log('[转换] 用户取消转换')
    return
  }

  // 4. 获取本周第一个工作日作为创建时间
  const workWeekInfo = getWorkWeekInfo(new Date())

  // 处理全节假日周
  if (workWeekInfo.hasNoWorkdays) {
    console.log('[转换] 本周无工作日，跳过转换')
    return
  }

  const createdAt = workWeekInfo.start.toISOString()
  const createdRecordIds = []

  // 5. 转换为工作记录
  for (const plan of lastWeekReport.plans) {
    const result = await recordsStore.addRecord({
      content: plan.content,
      project: plan.project || null,
      workType: plan.workType || null,
      createdAt: createdAt
    })

    if (result.success) {
      createdRecordIds.push(result.data.id)
    }
  }

  console.log(`[转换] 成功转换 ${createdRecordIds.length} 条计划为工作记录`)

  // 6. 标记已转换
  await markAsConverted(createdRecordIds)
}

// ============================================
// 记录选择和移动相关函数
// ============================================

/**
 * 切换记录选择状态
 */
const toggleRecordSelection = (id) => {
  if (selectedRecordIds.value.has(id)) {
    selectedRecordIds.value.delete(id)
  } else {
    selectedRecordIds.value.add(id)
  }
  // 强制更新响应式
  selectedRecordIds.value = new Set(selectedRecordIds.value)
}

/**
 * 将选中的记录移到下周计划
 */
const moveSelectedToNextWeek = async () => {
  if (selectedRecordIds.value.size === 0) {
    showValidationAlert('请先选择要移动的记录', true)
    return
  }

  const confirmed = await dialogStore.confirm({
    title: '移到下周计划',
    message: `确定要将选中的 ${selectedRecordIds.value.size} 条记录移到下周计划吗？`
  })

  if (!confirmed) return

  try {
    const ids = Array.from(selectedRecordIds.value)
    const response = await fetch('/api/records/move-to-next-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordIds: ids })
    })

    const result = await response.json()

    if (result.success) {
      // 从本地记录列表移除（通过重新初始化 store）
      await recordsStore.init()

      // 追加到下周计划
      await reportsStore.appendPlans(result.newPlans)

      // 清空选择
      selectedRecordIds.value.clear()

      showValidationAlert(result.message || `已将 ${result.movedCount} 条记录移到下周计划`)
    } else {
      showValidationAlert(result.error || '操作失败，请重试', true)
    }
  } catch (error) {
    console.error('移到下周计划失败:', error)
    showValidationAlert('操作失败，请重试', true)
  }
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// ========================================
// 页面头部（与 HomeView 保持一致）
// ========================================

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4; // 顶部留白
  max-width: 100%;

  // 标题优化
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

  // 大屏幕上增加间距
  @media (min-width: $breakpoint-xl) {
    gap: $spacing-8;
  }
}

.report-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr; // 左侧60%，右侧40%
  gap: $spacing-6;
  align-items: start;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}

// ========================================
// 周信息样式（与 HomeView 保持一致）
// ========================================

// 周信息包装器（包含徽章和假期详情）
.week-info-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $spacing-2;
  flex-shrink: 0; // 防止被压缩
}

// 简洁的周信息徽章
.week-badge {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-2 $spacing-4;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  white-space: nowrap;
  transition: all $transition-fast;

  // 大屏幕上稍微增大
  @media (min-width: $breakpoint-xl) {
    padding: $spacing-3 $spacing-5;
    font-size: $font-size-base;
  }

  &:hover {
    border-color: var(--border-color-hover);
    background: var(--bg-card-hover);
  }

  .week-range {
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .week-divider {
    color: var(--divider-color);
    font-weight: $font-weight-normal;
  }

  .workday-count {
    color: var(--text-secondary);
    font-weight: $font-weight-medium;
    letter-spacing: -0.01em;
  }

  .holiday-hint {
    color: #f59e0b;
    font-weight: $font-weight-semibold;
    letter-spacing: -0.01em;
  }
}

// 假期详情
.upcoming-holidays {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: $font-size-xs;
  color: var(--text-muted);
  transition: all $transition-fast;

  // 大屏幕上稍微增大
  @media (min-width: $breakpoint-xl) {
    font-size: $font-size-sm;
    gap: $spacing-3;
  }

  .holiday-icon {
    font-size: $font-size-sm;

    @media (min-width: $breakpoint-xl) {
      font-size: $font-size-base;
    }
  }

  .holiday-text {
    color: var(--text-secondary);
    letter-spacing: -0.01em;
    font-weight: $font-weight-medium;
  }
}

// 编辑区容器 - 固定高度 + 内部滚动
.report-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;
  max-height: calc(100vh - 200px); // 根据视口高度计算
  overflow-y: auto; // 内部滚动
  padding-right: $spacing-2; // 给滚动条留空间

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
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

.editor-section {
  padding: $spacing-5;
  margin-bottom: $spacing-5;

  .section-header {
    margin-bottom: $spacing-4;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
    }

    .record-count {
      font-size: $font-size-xs;
      font-weight: $font-weight-medium;
      color: var(--text-muted);
      padding: $spacing-1 $spacing-2;
      background: var(--bg-secondary);
      border-radius: $radius-full;
    }
  }

  &.locked {
    opacity: 0.7;
    pointer-events: none;

    textarea:disabled {
      background: var(--bg-secondary);
      cursor: not-allowed;
    }
  }
}

.locked-notice {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: $radius-md;
  color: #856404;
  margin-bottom: $spacing-5;
  font-weight: $font-weight-medium;
}

.plan-list {
  margin-bottom: $spacing-4;
}

.plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--border-color-hover);
  }

  &.completed {
    opacity: 0.6;
  }

  .plan-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;

    input {
      display: none;
    }

    .checkmark {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-radius: $radius-sm;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all $transition-fast;
      position: relative;
      background: var(--bg-card);

      &::after {
        content: '';
        width: 10px;
        height: 10px;
        background: $accent-primary;
        border-radius: 2px;
        transform: scale(0);
        transition: transform $transition-fast;
      }
    }

    input:checked+.checkmark {
      border-color: $accent-primary;
      background: $accent-light;

      &::after {
        transform: scale(1);
      }
    }
  }

  .plan-text {
    flex: 1;
    font-size: $font-size-sm;
    color: var(--text-primary);
    transition: all $transition-normal;

    &.line-through {
      text-decoration: line-through;
      color: var(--text-muted);
    }
  }

  .delete-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    cursor: pointer;
    flex-shrink: 0;
    transition: all $transition-fast;

    &:hover {
      color: $error;
      background: rgba($error, 0.1);
    }
  }
}

.add-plan {
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

.reflection-inputs {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  .input-group {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;

    label {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      color: var(--text-secondary);
    }

    textarea {
      padding: $spacing-3;
      font-size: $font-size-sm;
      font-family: $font-family;
      line-height: $line-height-normal;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: $radius-md;
      color: var(--text-primary);
      resize: vertical;
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
}

.full-width {
  width: 100%;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.report-preview-container {
  position: sticky;
  top: $spacing-4;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: $spacing-2; // 给滚动条留空间

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
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

// 验证提示 Toast
.validation-toast {
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
  display: flex;
  align-items: center;
  gap: $spacing-3;
  font-weight: $font-weight-medium;

  &.error {
    background: $error;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all $transition-normal;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

// 弹窗样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal-backdrop;
  padding: $spacing-xl;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);

  &.confirm-modal {
    text-align: center;
  }

  .modal-header {
    padding: $spacing-lg;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: $font-size-lg;
      color: var(--text-primary);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      font-size: $font-size-xl;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;

      &:hover {
        color: var(--text-primary);
      }
    }
  }

  .modal-body {
    padding: $spacing-lg;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    gap: $spacing-3;
    justify-content: center;
    padding: $spacing-lg;
    border-top: 1px solid var(--border-color);
  }
}

.confirm-content {
  padding: $spacing-6 $spacing-4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-4;

  .confirm-icon {
    color: $accent-primary;
  }

  .confirm-message {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;
  }

  .confirm-hint {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    margin: 0;
  }
}

.scale-enter-active,
.scale-leave-active {
  transition: all $transition-normal;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

// 响应式
@media (max-width: $breakpoint-md) {
  .report-layout {
    gap: $spacing-4;
  }

  .editor-section {
    padding: $spacing-4;
    margin-bottom: $spacing-4;
  }

  .report-preview-container {
    position: static;
  }

  // 周信息响应式（与 HomeView 保持一致）
  .week-info-wrapper {
    width: 100%;
    align-items: center;
  }

  .week-badge {
    width: 100%;
    justify-content: center;
  }

  .upcoming-holidays {
    justify-content: center;
  }
}

// 平板设备
@media (max-width: $breakpoint-lg) {
  .page-header {
    gap: $spacing-4;
  }
}

// ============================================
// 本周工作记录选择区域样式
// ============================================

.records-section {
  margin-bottom: $spacing-6;
}

.records-selection-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
  margin-bottom: $spacing-4;
  max-height: 400px;
  overflow-y: auto;
}

.record-selection-item {
  display: flex;
  gap: $spacing-3;
  padding: $spacing-3;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--border-color-hover);
    background: var(--bg-secondary);
  }

  &.selected {
    border-color: $accent-primary;
    background: rgba($accent-primary, 0.05);
  }
}

.record-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.record-selection-content {
  flex: 1;
  min-width: 0;
}

.record-selection-tags {
  display: flex;
  gap: $spacing-2;
  margin-bottom: $spacing-2;
}

.mini-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px $spacing-2;
  font-size: 11px;
  font-weight: $font-weight-medium;
  border-radius: $radius-sm;
  line-height: 1.2;

  &.project {
    background: rgba($accent-primary, 0.1);
    color: $accent-primary;
  }

  &.type {
    background: rgba($accent-secondary, 0.1);
    color: $accent-secondary;
  }
}

.record-selection-text {
  font-size: $font-size-sm;
  color: var(--text-primary);
  line-height: $line-height-relaxed;
  word-break: break-word;
}

.records-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-8 $spacing-4;
  color: var(--text-muted);
  text-align: center;

  p {
    margin: $spacing-2 0 0 0;
    font-size: $font-size-base;
    color: var(--text-secondary);
  }

  .empty-hint {
    font-size: $font-size-sm;
    color: var(--text-muted);
  }
}

.batch-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-3 $spacing-4;
  background: var(--bg-secondary);
  border: 1px solid $accent-primary;
  border-radius: $radius-md;
  margin-top: $spacing-4;

  .selected-count {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-primary);
  }
}

.batch-actions-buttons {
  display: flex;
  gap: $spacing-2;
}

// 滑入动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all $transition-normal;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
