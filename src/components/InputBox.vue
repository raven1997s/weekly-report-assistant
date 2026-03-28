<template>
  <div class="input-box">
    <div ref="wrapperRef" class="input-wrapper">
      <input
        ref="inputRef"
        v-model="inputText"
        type="text"
        class="input-field"
        :placeholder="disabled ? disabledPlaceholder : '记录工作内容，按 Enter 保存...'"
        :disabled="disabled"
        @keyup.enter="handleSubmit"
        @input="handleInput"
      />
      <button
        class="submit-btn"
        :disabled="disabled || !inputText.trim()"
        type="button"
        @click="handleSubmit"
        :title="disabled ? '请先恢复本周周报后再新增记录' : '快捷键: Enter'"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5h-5.5a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 3z"/>
        </svg>
      </button>
    </div>

    <!-- 动态内容区域：使用固定高度容器防止布局抖动 -->
    <div class="dynamic-content-area">
      <!-- 解析预览 -->
      <Transition name="fade">
        <div v-if="!disabled && parseResult && inputText.trim()" class="parse-preview">
          <div class="parse-item">
            <span class="parse-label">项目</span>
            <span class="parse-value" :class="{ detected: parseResult.project }">
              {{ parseResult.project || '待识别' }}
            </span>
          </div>
          <div class="parse-item">
            <span class="parse-label">类型</span>
            <span class="parse-value" :class="{ detected: parseResult.workType }">
              {{ parseResult.workType || '待识别' }}
            </span>
          </div>
          <div class="parse-confidence">
            <div class="confidence-bar">
              <div
                class="confidence-fill"
                :style="{ width: parseResult.confidence + '%' }"
              ></div>
            </div>
            <span class="confidence-text">{{ parseResult.confidence }}%</span>
          </div>
        </div>
      </Transition>

      <!-- 快捷选择 -->
      <Transition name="fade">
        <div v-if="!disabled && showQuickSelect && inputText.trim()" class="quick-select">
          <div class="quick-section">
            <span class="quick-label">选择项目</span>
            <div class="quick-options">
              <button
                v-for="project in projects"
                :key="project"
                class="quick-option"
                type="button"
                :class="{ active: parseResult?.project === project }"
                @mousedown.prevent
                @click="setProject(project)"
              >
                {{ project }}
              </button>
            </div>
          </div>
          <div class="quick-section">
            <span class="quick-label">选择类型</span>
            <div class="quick-options">
              <button
                v-for="type in workTypes"
                :key="type"
                class="quick-option"
                type="button"
                :class="{ active: parseResult?.workType === type }"
                @mousedown.prevent
                @click="setWorkType(type)"
              >
                {{ type }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <!-- 成功提示 -->
    <Transition name="slide-up">
      <div v-if="showSuccess" class="success-toast" :class="{ error: isError }" role="alert" aria-live="polite">
        <!-- 成功图标 -->
        <svg v-if="!isError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <!-- 警告图标 -->
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRecordsStore } from '../stores/records'
import { useSettingsStore } from '../stores/settings'
import { useParser } from '../composables/useParser'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  disabledPlaceholder: {
    type: String,
    default: '本周周报已归档，请先恢复本周周报后再新增记录'
  }
})

const emit = defineEmits(['record-added'])

const recordsStore = useRecordsStore()
const settingsStore = useSettingsStore()
const { parseInput, getParseResultMessage } = useParser()

// 状态
const inputRef = ref(null)
const wrapperRef = ref(null)
const inputText = ref('')
const parseResult = ref(null)
const showQuickSelect = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const isError = ref(false)
const manualProject = ref(null)
const manualWorkType = ref(null)

// 项目和类型列表
const projects = computed(() => settingsStore.projectNames)
const workTypes = computed(() => settingsStore.workTypeNames)

const focusInput = async () => {
  await nextTick()
  inputRef.value?.focus()
}

// 处理输入
const handleInput = () => {
  if (props.disabled) {
    return
  }

  if (inputText.value.trim()) {
    parseResult.value = parseInput(inputText.value)

    // 如果有手动选择，覆盖解析结果
    if (manualProject.value) {
      parseResult.value.project = manualProject.value
    }
    if (manualWorkType.value) {
      parseResult.value.workType = manualWorkType.value
    }

    // 如果解析不完整，显示快捷选择
    showQuickSelect.value = !parseResult.value.project || !parseResult.value.workType
  } else {
    parseResult.value = null
    showQuickSelect.value = false
  }
}

// 手动设置项目
const setProject = async (project) => {
  manualProject.value = project
  if (parseResult.value) {
    parseResult.value.project = project
    parseResult.value.confidence = Math.min(100, parseResult.value.confidence + 25)
  }
  // 检查是否还需要显示快捷选择
  showQuickSelect.value = !parseResult.value.workType
  await focusInput()
}

// 手动设置工作类型
const setWorkType = async (type) => {
  manualWorkType.value = type
  if (parseResult.value) {
    parseResult.value.workType = type
    parseResult.value.confidence = Math.min(100, parseResult.value.confidence + 25)
  }
  // 检查是否还需要显示快捷选择
  showQuickSelect.value = !parseResult.value.project
  await focusInput()
}

// 提交记录
const handleSubmit = async () => {
  if (props.disabled) {
    successMessage.value = props.disabledPlaceholder
    isError.value = true
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
      isError.value = false
    }, 2000)
    return
  }

  if (!inputText.value.trim()) return

  // 创建纯净的记录对象（去除 Vue 响应式包装，确保可以序列化）
  const record = {
    content: String(inputText.value.trim()),
    project: parseResult.value?.project ? String(parseResult.value.project) : null,
    workType: parseResult.value?.workType ? String(parseResult.value.workType) : null,
    createdAt: new Date().toISOString()
  }

  console.log('[InputBox] 准备添加记录:', record)

  const result = await recordsStore.addRecord(record)

  console.log('[InputBox] addRecord 返回结果:', result)

  // 处理返回结果
  if (result.success) {
    console.log('[InputBox] 成功添加，清空输入框')
    // 成功添加
    successMessage.value = getParseResultMessage({
      project: record.project,
      workType: record.workType
    })
    isError.value = false
    showSuccess.value = true

    // 清空输入
    inputText.value = ''
    parseResult.value = null
    showQuickSelect.value = false
    manualProject.value = null
    manualWorkType.value = null

    // 触发事件
    emit('record-added', result.data)
  } else if (result.isDuplicate) {
    console.log('[InputBox] 检测到重复记录')
    // 重复记录 - 触发抖动动画
    if (wrapperRef.value) {
      wrapperRef.value.classList.add('shake')
      setTimeout(() => {
        wrapperRef.value?.classList.remove('shake')
      }, 500)
    }

    successMessage.value = result.message
    isError.value = true
    showSuccess.value = true
    // 不清空输入，让用户可以修改
  } else {
    console.error('[InputBox] 添加失败，原因未知:', result)
    // 未知错误
    successMessage.value = result.message || '添加失败，请重试'
    isError.value = true
    showSuccess.value = true
    // 不清空输入，让用户可以重试
  }

  // 隐藏提示（缩短显示时间，避免遮挡）
  const duration = isError.value ? 2500 : 1500
  setTimeout(() => {
    showSuccess.value = false
    isError.value = false
  }, duration)
}

// 挂载后聚焦输入框
onMounted(() => {
  inputRef.value?.focus()
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;
@use 'sass:color';

.input-box {
  position: relative;
}

.input-wrapper {
  display: flex;
  gap: $spacing-2;
  padding: $spacing-2;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-lg;
  transition: all $transition-fast;

  &:focus-within {
    border-color: $accent-primary;
    box-shadow: 0 0 0 3px $accent-light;
  }

  // 抖动动画（重复记录时触发）
  &.shake {
    animation: shake 0.5s ease-in-out;
  }
}

// 抖动动画关键帧
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.input-field {
  flex: 1;
  padding: $spacing-3 $spacing-2;
  font-size: $font-size-base;
  color: var(--text-primary);
  background: transparent;
  border: none;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    outline: none;
  }
}

.submit-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $accent-primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// 动态内容区域 - 使用绝对定位防止布局抖动
.dynamic-content-area {
  position: relative;
  // 不设置高度，让内容自适应
}

// 解析预览 - 绝对定位，不影响布局
.parse-preview {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-4;
  margin-top: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border-radius: $radius-md;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

.parse-item {
  display: flex;
  align-items: center;
  gap: $spacing-2;

  .parse-label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: var(--text-muted);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .parse-value {
    font-size: $font-size-sm;
    color: var(--text-secondary);
    padding: 2px $spacing-2;
    background: var(--bg-card);
    border-radius: $radius-sm;
    border: 1px solid var(--border-color);
    font-weight: $font-weight-medium;
    letter-spacing: -0.01em;

    &.detected {
      color: $accent-primary;
      background: $accent-light;
      border-color: rgba($accent-primary, 0.3);
      font-weight: $font-weight-semibold;
    }
  }
}

.parse-confidence {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: $spacing-2;

  .confidence-bar {
    width: 60px;
    height: 4px;
    background: var(--bg-card);
    border-radius: $radius-full;
    overflow: hidden;

    .confidence-fill {
      height: 100%;
      background: $accent-gradient;
      transition: width $transition-normal;
    }
  }

  .confidence-text {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: var(--text-muted);
  }
}

// 快捷选择 - 绝对定位，不影响布局
.quick-select {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  margin-top: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border-radius: $radius-md;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

.quick-section {
  margin-bottom: $spacing-4;

  &:last-child {
    margin-bottom: 0;
  }
}

.quick-label {
  display: block;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  color: var(--text-muted);
  margin-bottom: $spacing-2;
}

.quick-options {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.quick-option {
  padding: $spacing-1 $spacing-3;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-color-hover);
    background: var(--bg-primary);
  }

  &.active {
    color: $accent-primary;
    background: $accent-light;
    border-color: $accent-primary;
  }
}

// 成功提示 - 使用固定定位，确保始终在最上层
.success-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: var(--bg-card);
  border: 1px solid $accent-primary;
  color: var(--text-primary);
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  border-radius: $radius-lg;
  box-shadow: var(--shadow-xl);
  z-index: $z-modal-backdrop;
  transition: all $transition-fast;
  pointer-events: none; // 让鼠标穿透，不影响后续操作
  white-space: nowrap; // 防止换行

  // 成功图标颜色（与主题蓝色一致）
  svg {
    flex-shrink: 0;
    color: $accent-primary;
  }

  // 浅色模式优化
  html:not(.dark) & {
    background: white;
    border-color: $accent-primary;
  }

  // 深色模式优化
  html.dark & {
    background: var(--bg-card);
    border-color: $accent-primary;
  }

  // 错误状态（重复记录）- 红色醒目提示
  &.error {
    border-color: #ef4444;
    background: #fef2f2;
    box-shadow: var(--shadow-lg), 0 0 0 1px rgba(239, 68, 68, 0.15);

    svg {
      color: #ef4444;
    }

    // 浅色模式
    html:not(.dark) & {
      background: #fef2f2;
      border-color: #ef4444;
    }

    // 深色模式
    html.dark & {
      background: rgba(127, 29, 29, 0.9);
      border-color: #ef4444;
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $easing-default;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 弹窗从输入框下方平滑出现
.slide-up-enter-active {
  transition: all $duration-normal $easing-out;
}

.slide-up-leave-active {
  transition: all $duration-fast $easing-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// 响应式
@media (max-width: $breakpoint-md) {
  .parse-preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .parse-confidence {
    margin-left: 0;
    margin-top: $spacing-2;
  }

  .quick-options {
    gap: $spacing-1;
  }

  .quick-option {
    padding: 4px $spacing-2;
    font-size: $font-size-xs;
  }
}
</style>
