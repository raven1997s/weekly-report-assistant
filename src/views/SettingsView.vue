<template>
  <div class="settings-view page-container">
    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="successMessage" class="toast-message" :class="{ error: isError }">
        <svg v-if="!isError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <div class="page-header">
      <h1 class="page-header-title">设置</h1>
      <p class="page-header-subtitle">自定义项目、类型和偏好设置</p>
    </div>

    <!-- 项目管理 -->
    <div class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4z"/>
          </svg>
          项目管理
        </h3>
        <button class="btn btn-primary btn-sm" @click="addProject">添加项目</button>
      </div>
      <div class="setting-list">
        <div v-for="project in projects" :key="project.id" class="setting-item">
          <input
            v-model="project.name"
            class="item-input"
            placeholder="项目名称"
            @change="updateProject(project.id, { name: project.name })"
          />
          <input
            class="item-input keywords"
            placeholder="识别关键词 (逗号分隔)"
            :value="project.keywords.join(', ')"
            @change="e => updateProjectKeywords(project.id, e.target.value)"
          />
          <button class="btn-icon delete" @click="deleteProject(project.id)">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.5 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5a.5.5 0 01.5-.5z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 工作类型管理 -->
    <div class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
          工作类型
        </h3>
        <button class="btn btn-primary btn-sm" @click="addWorkType">添加类型</button>
      </div>
      <div class="setting-list">
        <div v-for="type in workTypes" :key="type.id" class="setting-item">
          <input
            v-model="type.name"
            class="item-input"
            placeholder="类型名称"
            @change="updateWorkType(type.id, { name: type.name })"
          />
          <input
            class="item-input keywords"
            placeholder="识别关键词 (逗号分隔)"
            :value="type.keywords.join(', ')"
            @change="e => updateWorkTypeKeywords(type.id, e.target.value)"
          />
          <button class="btn-icon delete" @click="deleteWorkType(type.id)">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.5 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5a.5.5 0 01.5-.5z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 钉钉配置 -->
    <div class="card setting-section">
      <div class="section-header">
        <h3>📱 钉钉机器人配置</h3>
      </div>
      <div class="dingtalk-config">
        <div class="input-group">
          <label>Webhook URL</label>
          <input
            v-model="dingtalkConfig.webhookUrl"
            type="text"
            placeholder="https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
            class="config-input"
            @change="updateDingtalkConfig"
          />
        </div>
        <div class="input-group">
          <label>加签密钥 (Secret，可选)</label>
          <input
            v-model="dingtalkConfig.secret"
            type="password"
            placeholder="SEC开头的密钥"
            class="config-input"
            @change="updateDingtalkConfig"
          />
        </div>
        <button class="btn btn-secondary mt-md" @click="testDingTalk" :disabled="isTesting">
          {{ isTesting ? '测试中...' : '🧪 发送测试消息' }}
        </button>
      </div>
    </div>

    <!-- 定时推送 -->
    <div class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
          定时任务配置
        </h3>
        <button class="btn btn-primary btn-sm" @click="showAddTaskModal = true" :disabled="!dingtalkConfig.webhookUrl">
          添加任务
        </button>
      </div>

      <div v-if="!dingtalkConfig.webhookUrl" class="dingtalk-warning">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        请先配置钉钉 Webhook
      </div>

      <div class="scheduled-tasks">
        <div v-for="task in scheduledTasks" :key="task.id" class="task-item">
          <div class="task-info" @click="editTask(task)">
            <div class="task-type-badge" :class="task.type">
              {{ task.type === 'report' ? '周报' : '提醒' }}
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.name }}</div>
              <div class="task-detail">{{ getTaskSchedule(task) }}</div>
            </div>
          </div>
          <div class="task-actions">
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="task.enabled"
                @change="toggleTask(task.id, $event.target.checked)"
                :disabled="!dingtalkConfig.webhookUrl"
              />
              <span class="toggle-slider"></span>
            </label>
            <button class="btn-icon delete" @click="deleteTask(task.id)" :disabled="!dingtalkConfig.webhookUrl" title="删除任务">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.25 7.638a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v-1.5zm3.75 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" clip-rule="evenodd"/>
                <path d="M5.5 4h9a.5.5 0 01.5.5v1h-10v-1a.5.5 0 01.5-.5zm-2 2h13v8.5a2.5 2.5 0 01-2.5 2.5h-6a2.5 2.5 0 01-2.5-2.5v-8.5zM7 7a1 1 0 012 0v6a1 1 0 11-2 0v-6zm4 0a1 1 0 012 0v6a1 1 0 11-2 0v-6z"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="scheduledTasks.length === 0" class="empty-tasks">
          {{ dingtalkConfig.webhookUrl ? '暂无定时任务，点击上方按钮添加' : '请先配置钉钉' }}
        </div>
      </div>
      <div class="task-hint">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm1 3a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>点击任务卡片可编辑配置 · 定时任务由后端执行</span>
      </div>
    </div>

    <!-- 添加/编辑任务弹窗 -->
    <Transition name="scale">
      <div v-if="showAddTaskModal || editingTask" class="modal-overlay" @click="closeTaskModal">
        <div class="modal-content task-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ editingTask ? '编辑定时任务' : '添加定时任务' }}</h3>
            <button class="close-btn" @click="closeTaskModal" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>任务名称</label>
              <input v-model="taskForm.name" type="text" class="form-input" placeholder="例如：每周五周报推送" />
            </div>
            <div class="form-group">
              <label>任务类型</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="taskForm.type" value="report" />
                  <span>📊 周报推送</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="taskForm.type" value="reminder" />
                  <span>📝 填写提醒</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>执行时间</label>
              <div class="time-inputs">
                <select v-model="taskForm.hour" class="form-input">
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2, '0') }}时</option>
                </select>
                <select v-model="taskForm.minute" class="form-input">
                  <option v-for="m in 60" :key="m-1" :value="m-1">{{ String(m-1).padStart(2, '0') }}分</option>
                </select>
              </div>
              <div class="schedule-hint">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm1 3a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span v-if="taskForm.type === 'reminder'">工作日（考虑节假日）每天提醒</span>
                <span v-else>工作周最后一天自动推送</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeTaskModal">取消</button>
            <button class="btn btn-primary" @click="saveTask">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 数据管理 -->
    <div class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
          数据管理
        </h3>
      </div>
      <div class="data-actions">
        <div class="action-row">
          <span>导出所有数据备份</span>
          <button class="btn btn-secondary" @click="handleExport">导出 JSON</button>
        </div>
        <div class="action-row">
          <span>导入数据备份</span>
          <label class="btn btn-secondary upload-btn">
            导入 JSON
            <input type="file" accept=".json" @change="handleImport" hidden />
          </label>
        </div>
        <div class="action-row danger">
          <span>重置所有设置</span>
          <button class="btn btn-ghost danger" @click="handleReset">重置默认</button>
        </div>
      </div>
    </div>

    <!-- 自定义弹窗 -->
    <ConfirmDialog
      v-model:show="dialogStore.confirmShow"
      :title="dialogStore.confirmTitle || '确认'"
      :message="dialogStore.confirmMessage"
      :details="dialogStore.confirmDetails"
      @confirm="dialogStore.confirmHandle(true)"
      @cancel="dialogStore.confirmHandle(false)"
    />

    <PromptDialog
      v-model:show="dialogStore.promptShow"
      :title="dialogStore.promptTitle || '输入'"
      :message="dialogStore.promptMessage"
      :placeholder="dialogStore.promptPlaceholder"
      @confirm="dialogStore.promptHandle"
      @cancel="dialogStore.promptHandle(null)"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import { useDialogStore } from '../stores/dialog'
import { exportAllData, importAllData } from '../utils/api'
import { testDingTalkConfig } from '../utils/dingtalk'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PromptDialog from '../components/PromptDialog.vue'

const settingsStore = useSettingsStore()
const { projects, workTypes, dingtalk, scheduledTasks } = storeToRefs(settingsStore)

// 弹窗（使用全局 store）
const dialogStore = useDialogStore()

// 钉钉配置
const dingtalkConfig = ref({ ...dingtalk.value })
const isTesting = ref(false)

// 定时任务弹窗状态
const showAddTaskModal = ref(false)
const editingTask = ref(null)
const taskForm = ref({
  id: null,
  name: '',
  type: 'report',
  hour: 15,
  minute: 0,
  dayOfWeek: '5'
})
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// Toast 状态
const successMessage = ref('')
const isError = ref(false)
const toastTimer = ref(null)

// 显示 Toast 提示
const showToast = (message, isErrorMessage = false) => {
  successMessage.value = message
  isError.value = isErrorMessage

  if (toastTimer.value) {
    clearTimeout(toastTimer.value)
  }

  toastTimer.value = setTimeout(() => {
    successMessage.value = ''
    isError.value = false
  }, 3000)
}

// 初始化
onMounted(async () => {
  await settingsStore.fetchScheduledTasks()
})

// 钉钉配置管理
const updateDingtalkConfig = () => {
  settingsStore.updateDingtalk(dingtalkConfig.value)
}

const testDingTalk = async () => {
  if (!dingtalkConfig.value.webhookUrl) {
    showToast('请先输入 Webhook URL', true)
    return
  }

  isTesting.value = true
  try {
    const result = await testDingTalkConfig(dingtalkConfig.value)
    if (result.success) {
      showToast('测试成功！请检查钉钉群是否收到测试消息。')
    } else {
      showToast(`测试失败: ${result.message}`, true)
    }
  } catch (error) {
    showToast(`测试失败: ${error.message}`, true)
  } finally {
    isTesting.value = false
  }
}

// 定时推送管理
const toggleTask = async (id, enabled) => {
  const success = await settingsStore.updateScheduledTask(id, enabled)
  if (success) {
    showToast(enabled ? '定时任务已启用' : '定时任务已禁用')
  } else {
    showToast('操作失败，请重试', true)
  }
}

const getTaskSchedule = (task) => {
  const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`

  // 基于任务类型返回描述，不再解析 day_of_week
  if (task.type === 'reminder') {
    return `工作日（考虑节假日）每天 ${time}`
  } else if (task.type === 'report') {
    return `工作周最后一天 ${time}`
  } else {
    // 兜底：按 day_of_week 显示（兼容旧数据）
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    if (task.day_of_week === '*') {
      return `每天 ${time}`
    } else if (task.day_of_week.includes(',')) {
      const days = task.day_of_week.split(',').map(d => parseInt(d)).sort((a, b) => a - b)
      const dayNames = days.map(d => weekdays[d])
      return `${dayNames.join('、')} ${time}`
    } else {
      const dayIndex = parseInt(task.day_of_week)
      return `每周${weekdays[dayIndex]} ${time}`
    }
  }
}

const editTask = (task) => {
  editingTask.value = task
  taskForm.value = {
    id: task.id,
    name: task.name,
    type: task.type,
    hour: task.hour,
    minute: task.minute,
    dayOfWeek: task.day_of_week
  }
}

const closeTaskModal = () => {
  showAddTaskModal.value = false
  editingTask.value = null
  taskForm.value = {
    id: null,
    name: '',
    type: 'report',
    hour: 15,
    minute: 0,
    dayOfWeek: '5'
  }
}

const saveTask = async () => {
  // 验证表单
  if (!taskForm.value.name.trim()) {
    showToast('请输入任务名称', true)
    return
  }

  // 固定为每天运行，由后端运行时校验是否应该执行
  const finalTask = { ...taskForm.value }
  finalTask.dayOfWeek = '*'

  const success = await settingsStore.saveScheduledTask(finalTask)
  if (success) {
    showToast(editingTask.value ? '任务已更新' : '任务已添加')
    closeTaskModal()
  } else {
    showToast('保存失败，请重试', true)
  }
}

const deleteTask = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '确定要删除这个定时任务吗？'
  })
  if (!confirmed) return

  const success = await settingsStore.deleteScheduledTask(id)
  if (success) {
    showToast('任务已删除')
  } else {
    showToast('删除失败，请重试', true)
  }
}

// 项目管理
const addProject = async () => {
  const name = await dialogStore.prompt({
    message: '请输入新项目名称',
    placeholder: '项目名称'
  })
  if (name) {
    settingsStore.addProject({ name, keywords: [] })
  }
}

const updateProject = (id, data) => {
  settingsStore.updateProject(id, data)
}

const updateProjectKeywords = (id, str) => {
  const keywords = str.split(',').map(s => s.trim()).filter(s => s)
  settingsStore.updateProject(id, { keywords })
}

const deleteProject = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '确定删除该项目吗？'
  })
  if (confirmed) {
    settingsStore.deleteProject(id)
  }
}

// 类型管理
const addWorkType = async () => {
  const name = await dialogStore.prompt({
    message: '请输入新工作类型名称',
    placeholder: '类型名称'
  })
  if (name) {
    settingsStore.addWorkType({ name, keywords: [] })
  }
}

const updateWorkType = (id, data) => {
  settingsStore.updateWorkType(id, data)
}

const updateWorkTypeKeywords = (id, str) => {
  const keywords = str.split(',').map(s => s.trim()).filter(s => s)
  settingsStore.updateWorkType(id, { keywords })
}

const deleteWorkType = async (id) => {
  const confirmed = await dialogStore.confirm({
    message: '确定删除该类型吗？'
  })
  if (confirmed) {
    settingsStore.deleteWorkType(id)
  }
}

// 数据管理
const handleExport = async () => {
  const data = await exportAllData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `weekly_report_backup_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const success = await importAllData(text)
    if (success) {
      showToast('导入成功！页面将刷新。')
      setTimeout(() => {
        location.reload()
      }, 1000)
    } else {
      showToast('导入失败，请检查文件格式。', true)
    }
  } catch (err) {
    console.error(err)
    showToast('读取文件失败', true)
  }
}

const handleReset = async () => {
  const confirmed = await dialogStore.confirm({
    message: '确定要重置所有设置吗？该操作不可恢复。'
  })
  if (confirmed) {
    settingsStore.resetToDefault()
  }
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// Toast 提示
.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: $accent-primary;
  color: white;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba($accent-primary, 0.3);
  z-index: 1070;

  &.error {
    background: $error;
    box-shadow: 0 4px 12px rgba($error, 0.3);
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

.setting-section {
  padding: $spacing-6;
  margin-bottom: $spacing-6;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-5;

  h3 {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.setting-item {
  display: flex;
  gap: $spacing-3;
  align-items: center;

  .item-input {
    padding: $spacing-3;
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

    &.keywords {
      flex: 1;
    }
  }

  .btn-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;
    color: var(--text-muted);
    flex-shrink: 0;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    &.delete:hover {
      background: rgba($error, 0.1);
      color: $error;
      border-color: rgba($error, 0.3);
    }
  }
}

.dingtalk-config {
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

    .config-input {
      padding: $spacing-3;
      font-size: $font-size-sm;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: $radius-md;
      color: var(--text-primary);
      font-family: $font-family-mono;
      transition: all $transition-fast;

      &:focus {
        outline: none;
        border-color: $accent-primary;
        box-shadow: 0 0 0 3px $accent-light;
      }
    }
  }
}

// 状态徽章
.status-badge {
  padding: $spacing-1 $spacing-3;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  &.success {
    background: $accent-light;
    color: $accent-primary;
  }

  &.error {
    background: rgba($error, 0.15);
    color: $error;
  }

  &.warning {
    background: rgba($warning, 0.15);
    color: $warning;
  }

  &.info {
    background: rgba($accent-primary, 0.1);
    color: $accent-primary;
  }
}

.task-hint {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3;
  margin-top: $spacing-4;
  background: rgba($accent-primary, 0.05);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-xs;
}

.dingtalk-warning {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3;
  margin-bottom: $spacing-4;
  background: rgba($warning, 0.1);
  border-radius: $radius-md;
  color: $warning;
  font-size: $font-size-sm;
}

.scheduled-tasks {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  transition: all $transition-fast;

  .task-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-3;
    cursor: pointer;
    padding: $spacing-2;
    margin: -$spacing-2;
    border-radius: $radius-md;
    transition: all $transition-fast;

    &:hover {
      background: var(--bg-secondary);
    }

    .task-type-badge {
      padding: $spacing-1 $spacing-2;
      border-radius: $radius-sm;
      font-size: $font-size-xs;
      font-weight: $font-weight-medium;
      flex-shrink: 0;

      &.report {
        background: rgba($accent-primary, 0.1);
        color: $accent-primary;
      }

      &.reminder {
        background: rgba($warning, 0.1);
        color: $warning;
      }
    }

    .task-content {
      flex: 1;

      .task-title {
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        color: var(--text-primary);
        margin-bottom: $spacing-1;
      }

      .task-detail {
        font-size: $font-size-xs;
        color: var(--text-secondary);
      }
    }
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }
}

.empty-tasks {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-muted);
  font-size: $font-size-sm;
}

// 切换开关
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition: $transition-normal;
    border-radius: $radius-full;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background-color: var(--text-muted);
      transition: $transition-normal;
      border-radius: $radius-full;
    }
  }

  input:checked + .toggle-slider {
    background-color: $accent-primary;
    border-color: $accent-primary;

    &:before {
      transform: translateX(20px);
      background-color: white;
    }
  }

  &:hover .toggle-slider {
    border-color: var(--border-color-hover);
  }
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;

  .action-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-3 0;
    border-bottom: 1px solid var(--divider-color);
    font-size: $font-size-sm;
    color: var(--text-primary);

    &:last-child {
      border-bottom: none;
    }

    &.danger {
      color: $error;

      .btn {
        color: $error;

        &:hover {
          background: rgba($error, 0.1);
        }
      }
    }
  }
}

.upload-btn {
  cursor: pointer;
  margin: 0;
}

// ========================================
// 任务弹窗样式
// ========================================

.task-modal {
  max-width: 480px;

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
  }
}

.form-input {
  padding: $spacing-3;
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
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  input[type="radio"] {
    cursor: pointer;
  }

  span {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }

  &:hover {
    border-color: var(--border-color-hover);
  }

  input[type="radio"]:checked + span {
    color: $accent-primary;
    font-weight: $font-weight-medium;
  }
}

.time-inputs {
  display: flex;
  gap: $spacing-3;

  .form-input {
    flex: 1;
  }
}

.schedule-hint {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-top: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: rgba($accent-primary, 0.05);
  border-radius: $radius-sm;
  color: var(--text-secondary);
  font-size: $font-size-xs;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;
  padding: $spacing-5 $spacing-6;
  border-top: 1px solid var(--border-color);
}

.scale-enter-active,
.scale-leave-active {
  transition: all $transition-normal;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

// 响应式
@media (max-width: $breakpoint-md) {
  .setting-section {
    padding: $spacing-4;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-3;
  }

  .setting-item {
    flex-wrap: wrap;

    .keywords {
      width: 100%;
    }
  }

  .task-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
