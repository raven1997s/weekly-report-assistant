<template>
  <div class="history-view page-container">
    <div class="page-header">
      <h1 class="page-header-title">历史周报</h1>
      <p class="page-header-subtitle">查看和回顾过往的工作记录</p>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索周报内容..."
          class="search-input"
        />
        <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="project-filter">
        <select v-model="selectedProject" class="filter-select">
          <option value="">全部项目</option>
          <option v-for="project in allProjects" :key="project" :value="project">
            {{ project }}
          </option>
        </select>
      </div>
      <button
        v-if="reports.length > 0"
        class="btn btn-secondary btn-sm"
        @click="showBatchDelete = true"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 4px;">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        批量删除
      </button>
    </div>

    <!-- 批量删除弹窗 -->
    <Transition name="scale">
      <div v-if="showBatchDelete" class="modal-overlay" @click="showBatchDelete = false">
        <div class="modal-content batch-delete-modal" @click.stop>
          <div class="modal-header">
            <h3>批量删除历史周报</h3>
            <button class="close-btn" @click="showBatchDelete = false" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="batch-options">
              <button class="batch-option" @click="batchDeleteOlderThan(90)">
                <div class="option-icon">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="option-content">
                  <div class="option-title">删除3个月前的周报</div>
                  <div class="option-desc">保留最近3个月的数据</div>
                </div>
              </button>
              <button class="batch-option" @click="batchDeleteOlderThan(180)">
                <div class="option-icon">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="option-content">
                  <div class="option-title">删除6个月前的周报</div>
                  <div class="option-desc">保留最近6个月的数据</div>
                </div>
              </button>
              <button class="batch-option danger" @click="batchDeleteAll">
                <div class="option-icon">
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="option-content">
                  <div class="option-title">删除所有周报</div>
                  <div class="option-desc">此操作不可恢复！</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 列表展示 -->
    <div class="history-list">
      <div v-if="filteredReports.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
          </svg>
        </div>
        <div class="empty-state-title">暂无历史周报</div>
        <div class="empty-state-desc">生成的周报将会按照时间顺序归档在这里</div>
      </div>

      <div
        v-for="report in filteredReports"
        :key="report.id"
        class="history-card card"
        @click="viewReport(report)"
      >
        <div class="card-header">
          <div class="week-title">{{ getDisplayWeekLabel(report) }}</div>
          <div class="report-date">{{ formatDate(report.createdAt) }}</div>
        </div>
        <div class="card-preview">
          {{ getPreviewText(report.plainText) }}
        </div>
        <div class="card-footer">
          <button class="btn btn-ghost btn-sm" @click.stop="viewReport(report)">查看详情</button>
          <button
            v-if="isCurrentWeekReport(report)"
            class="btn btn-ghost btn-sm restore-btn"
            @click.stop="restoreCurrentWeekReport(report)"
          >
            恢复
          </button>
          <button class="btn btn-ghost btn-sm delete-btn" @click.stop="deleteReport(report.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Transition name="scale">
      <div v-if="selectedReport" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <button class="close-btn" @click="closeModal" aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
          <ReportPreview
            :report="selectedReport"
            :show-mail-draft-action="true"
            @save-mail-draft="openMailDraftDialog"
          />
        </div>
      </div>
    </Transition>

    <Transition name="scale">
      <div v-if="showMailDraftDialog" class="modal-overlay" @click="closeMailDraftDialog">
        <div class="modal-content confirm-modal" @click.stop>
          <div class="modal-header">
            <h3>保存到阿里邮箱草稿箱</h3>
            <button class="close-btn" @click="closeMailDraftDialog">×</button>
          </div>
          <div class="modal-body">
            <div class="mail-draft-content">
              <p class="confirm-message">选择模板后，将当前周报保存到阿里邮箱草稿箱。</p>
              <div class="mail-draft-picker">
                <label for="history-mail-template">邮件模板</label>
                <select id="history-mail-template" v-model="selectedMailTemplate" class="mail-template-select">
                  <option v-for="template in mailTemplates" :key="template.key" :value="template.key">
                    {{ template.name }}
                  </option>
                </select>
              </div>
              <p v-if="mailDraftWarning" class="confirm-hint warning-text">
                {{ mailDraftWarning }}
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeMailDraftDialog">取消</button>
            <button class="btn btn-primary" @click="saveSelectedReportToMailDraft" :disabled="isSavingMailDraft">
              {{ isSavingMailDraft ? '保存中...' : '确认保存' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-message">
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- 确认弹窗 -->
    <Transition name="scale">
      <div v-if="confirmConfig.show" class="modal-overlay" @click="confirmConfig.show = false">
        <div class="modal-content confirm-modal" @click.stop>
          <div class="modal-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
              {{ confirmConfig.title }}
            </h3>
            <button class="close-btn" @click="confirmConfig.show = false">×</button>
          </div>
          <div class="modal-body">
            <div class="confirm-content">
              <svg class="confirm-icon error" width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
              <p class="confirm-message">{{ confirmConfig.message }}</p>
              <p class="confirm-hint">{{ confirmConfig.hint }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="confirmConfig.show = false">取消</button>
            <button class="btn btn-primary danger" @click="handleConfirm">确认</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReportsStore } from '../stores/reports'
import { useRecordsStore } from '../stores/records'
import { useSettingsStore } from '../stores/settings'
import { formatDate, getWorkMonthWeekLabel } from '../utils/date'
import { getMailTemplates, createMailDraft } from '../utils/api'
import ReportPreview from '../components/ReportPreview.vue'

const reportsStore = useReportsStore()
const recordsStore = useRecordsStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const searchQuery = ref('')
const selectedProject = ref('')
const selectedReport = ref(null)
const showBatchDelete = ref(false)
const showMailDraftDialog = ref(false)
const isSavingMailDraft = ref(false)
const mailTemplates = ref([
  { key: 'gancao-department-weekly-report', name: '厚朴汤部门周报模板' }
])
const selectedMailTemplate = ref(settingsStore.mail?.defaultTemplate || 'gancao-department-weekly-report')

// Toast 状态
const toastMessage = ref('')
const toastTimer = ref(null)

// 确认弹窗状态
const confirmConfig = ref({
  show: false,
  title: '',
  message: '',
  hint: '',
  onConfirm: null
})

const mailDraftWarning = computed(() => {
  const mailConfig = settingsStore.mail || {}
  if (!mailConfig.account || !mailConfig.imapHost || !mailConfig.imapPort || !mailConfig.password) {
    return '企业邮箱配置不完整，请先前往设置页补全邮箱账号、IMAP 地址、端口和安全密码。'
  }

  if (!mailConfig.defaultTo && !mailConfig.defaultCc && !mailConfig.defaultBcc) {
    return '请先在设置页配置默认收件人、抄送或密送。'
  }

  return ''
})

// 获取所有周报
const reports = computed(() => reportsStore.getAllReports())
const isCurrentWeekReport = (report) => reportsStore.isCurrentWeekReport(report.weekStart)

// 获取所有项目
const allProjects = computed(() => {
  const projects = new Set()
  recordsStore.records.forEach(record => {
    if (record.project) {
      projects.add(record.project)
    }
  })
  settingsStore.projects.forEach(p => {
    projects.add(p.name)
  })
  return Array.from(projects).sort()
})

// 过滤后的列表
const filteredReports = computed(() => {
  let reports = reportsStore.searchReports(searchQuery.value)

  if (selectedProject.value) {
    reports = reports.filter(report => {
      const plainText = report.plainText || report.markdown || ''
      const markdown = report.markdown || ''
      return plainText.includes(selectedProject.value) ||
             markdown.includes(selectedProject.value)
    })
  }

  return reports
})

// 获取预览文本
const getPreviewText = (text) => {
  if (!text) return ''
  return text.substring(0, 100) + (text.length > 100 ? '...' : '')
}

const getDisplayWeekLabel = (report) => {
  if (report?.weekStart) {
    return getWorkMonthWeekLabel(new Date(report.weekStart))
  }

  return report?.weekLabel || '未命名周报'
}

// 显示 Toast
const showToast = (message) => {
  toastMessage.value = message
  if (toastTimer.value) {
    clearTimeout(toastTimer.value)
  }
  toastTimer.value = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

onMounted(async () => {
  try {
    const templates = await getMailTemplates()
    if (Array.isArray(templates) && templates.length > 0) {
      mailTemplates.value = templates
      const matchedTemplate = templates.find(template => template.key === selectedMailTemplate.value)
      selectedMailTemplate.value = matchedTemplate?.key || templates[0].key
    }
  } catch (error) {
    console.error('[HistoryView] 获取邮件模板失败:', error)
  }
})

// 显示确认弹窗
const showConfirm = (title, message, hint, onConfirm) => {
  confirmConfig.value = {
    show: true,
    title,
    message,
    hint,
    onConfirm
  }
}

// 确认操作
const handleConfirm = () => {
  if (confirmConfig.value.onConfirm) {
    confirmConfig.value.onConfirm()
  }
  confirmConfig.value.show = false
}

// 查看详情
const viewReport = (report) => {
  selectedReport.value = report
}

// 关闭弹窗
const closeModal = () => {
  selectedReport.value = null
}

const openMailDraftDialog = () => {
  if (!selectedReport.value) return
  showMailDraftDialog.value = true
}

const closeMailDraftDialog = () => {
  showMailDraftDialog.value = false
}

const saveSelectedReportToMailDraft = async () => {
  if (!selectedReport.value || isSavingMailDraft.value) return

  if (mailDraftWarning.value) {
    showToast(mailDraftWarning.value)
    return
  }

  isSavingMailDraft.value = true

  try {
    const result = await createMailDraft({
      templateKey: selectedMailTemplate.value,
      report: selectedReport.value
    })

    if (result.openUrl) {
      window.open(result.openUrl, '_blank', 'noopener')
    }

    closeMailDraftDialog()
    showToast('草稿已保存到阿里邮箱')
  } catch (error) {
    console.error('[HistoryView] 保存邮件草稿失败:', error)
    showToast(`保存草稿失败：${error.message}`)
  } finally {
    isSavingMailDraft.value = false
  }
}

const restoreCurrentWeekReport = async (report) => {
  showConfirm(
    '恢复本周周报',
    '确定要恢复本周周报吗？',
    '恢复后可回到工作记录页和生成周报页继续编辑，本次归档稿会移到回收站。',
    async () => {
      const success = await reportsStore.deleteReport(report.id)
      if (!success) {
        showToast('恢复失败，请重试')
        return
      }

      try {
        await reportsStore.updateReflections(report.reflections || { gains: '', losses: '' })
      } catch (error) {
        console.error('[HistoryView] 恢复本周周报总结失败:', error)
      }

      if (selectedReport.value?.id === report.id) {
        closeModal()
      }

      showToast('本周周报已恢复，可继续编辑')
      router.push('/report')
    }
  )
}

// 删除周报
const deleteReport = async (id) => {
  const report = reports.value.find(item => item.id === id)
  const isCurrentWeek = report ? isCurrentWeekReport(report) : false
  showConfirm(
    '删除周报确认',
    '确定要删除这份周报吗？',
    isCurrentWeek ? '删除后会进入回收站，且不能再恢复为本周编辑态' : '删除后可在回收站恢复',
    async () => {
      const success = await reportsStore.deleteReport(id)
      if (success) {
        if (selectedReport.value?.id === id) {
          closeModal()
        }
        showToast('已删除周报')
      } else {
        showToast('删除失败，请重试')
      }
    }
  )
}

// 批量删除
const batchDeleteOlderThan = async (days) => {
  const toDelete = reports.value.filter(r => {
    const reportDate = new Date(r.createdAt)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    return reportDate < cutoffDate
  })

  if (toDelete.length === 0) {
    showToast('没有找到符合条件的数据')
    return
  }

  showConfirm(
    '批量删除确认',
    `确定要删除 ${toDelete.length} 份${days >= 90 ? Math.round(days / 30) + '个月' : days + '天'}前的周报吗？`,
    '删除后可在回收站恢复',
    async () => {
      let successCount = 0
      for (const report of toDelete) {
        const success = await reportsStore.deleteReport(report.id)
        if (success) successCount++
      }
      showBatchDelete.value = false
      showToast(`已删除 ${successCount} 份周报`)
    }
  )
}

const batchDeleteAll = async () => {
  if (reports.value.length === 0) {
    showToast('没有周报可以删除')
    return
  }

  showConfirm(
    '删除所有周报确认',
    `确定要删除全部 ${reports.value.length} 份周报吗？`,
    '删除后可在回收站恢复',
    async () => {
      let successCount = 0
      for (const report of reports.value) {
        const success = await reportsStore.deleteReport(report.id)
        if (success) successCount++
      }
      showBatchDelete.value = false
      closeModal()
      showToast(`已删除 ${successCount} 份周报`)
    }
  )
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// 页面容器样式（规范 #1）
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

.filter-bar {
  display: flex;
  gap: $spacing-3;
  margin-bottom: $spacing-6;
  align-items: center;
  flex-wrap: wrap;

  .search-bar {
    flex: 1;
    min-width: 200px;
    position: relative;

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

    .search-icon {
      position: absolute;
      left: $spacing-3;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }
  }

  .project-filter {
    .filter-select {
      padding: $spacing-3 $spacing-4;
      font-size: $font-size-sm;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: $radius-md;
      color: var(--text-primary);
      cursor: pointer;
      transition: all $transition-fast;

      &:focus {
        outline: none;
        border-color: $accent-primary;
        box-shadow: 0 0 0 3px $accent-light;
      }

      option {
        background: var(--bg-card);
      }
    }
  }
}

.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $spacing-4;
}

.history-card {
  padding: $spacing-5;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--border-color-hover);
    box-shadow: var(--shadow-md);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $spacing-3;

    .week-title {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
    }

    .report-date {
      font-size: $font-size-xs;
      color: var(--text-muted);
    }
  }

  .card-preview {
    flex: 1;
    font-size: $font-size-sm;
    color: var(--text-secondary);
    line-height: $line-height-normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    margin-bottom: $spacing-4;
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-2;

    .restore-btn {
      color: $accent-primary;

      &:hover {
        background: rgba($accent-primary, 0.1);
      }
    }

    .delete-btn {
      color: $error;

      &:hover {
        background: rgba($error, 0.1);
      }
    }
  }
}

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
  padding: $spacing-4;
}

.modal-content {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-xl;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;

  &.batch-delete-modal {
    max-width: 480px;
  }

  .modal-header {
    padding: $spacing-5 $spacing-6;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);
    }
  }

  .modal-body {
    padding: $spacing-5 $spacing-6;
    overflow-y: auto;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: var(--text-primary);
      background: var(--bg-secondary);
    }
  }
}

.batch-options {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.batch-option {
  display: flex;
  gap: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;
  color: var(--text-primary);

  &:hover {
    background: var(--bg-secondary);
    border-color: $accent-primary;
  }

  &.danger {
    border-color: rgba($error, 0.3);
    color: $error;

    &:hover {
      background: rgba($error, 0.1);
      border-color: $error;
    }
  }

  .option-icon {
    font-size: $font-size-2xl;
  }

  .option-content {
    flex: 1;

    .option-title {
      font-size: $font-size-base;
      font-weight: $font-weight-medium;
      margin-bottom: $spacing-1;
    }

    .option-desc {
      font-size: $font-size-sm;
      color: var(--text-secondary);
    }
  }
}

.mail-draft-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.mail-draft-picker {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  label {
    font-size: $font-size-xs;
    color: var(--text-secondary);
  }
}

.mail-template-select {
  width: 100%;
  padding: $spacing-3 $spacing-4;
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

.warning-text {
  color: $warning;
}

// 响应式
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-4;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .history-list {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-width: calc(100vw - #{$spacing-8});
    margin: $spacing-4;
  }

  .confirm-modal .modal-footer {
    flex-direction: column-reverse;

    .btn {
      width: 100%;
    }
  }
}

// Toast 提示
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
  z-index: $z-modal-backdrop;
  font-weight: $font-weight-medium;
}

// 确认弹窗特有样式
.confirm-modal {
  max-width: 480px !important;
  text-align: center;

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
    color: $error;
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

.btn.danger {
  background: $error;
  color: white;

  &:hover {
    filter: brightness(0.9);
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-normal;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
</style>
