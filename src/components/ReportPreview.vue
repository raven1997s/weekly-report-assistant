<template>
  <div class="report-preview card">
    <div class="preview-header">
      <h3 class="preview-title">周报预览</h3>
      <div class="preview-actions">
        <button class="btn btn-secondary btn-sm" @click="copyText">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
            <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd"/>
          </svg>
          复制纯文本
        </button>
        <button class="btn btn-primary btn-sm" @click="copyMarkdown">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
            <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd"/>
          </svg>
          复制 Markdown
        </button>
        <button class="btn btn-secondary btn-sm" @click="download">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.91a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 2.456V2.75z"/>
            <path d="M3.5 12.75a.75.75 0 01.75.75h11a.75.75 0 010 1.5h-11a.75.75 0 01-.75-.75zM3.5 16.75a.75.75 0 01.75.75h11a.75.75 0 010 1.5h-11a.75.75 0 01-.75-.75z"/>
          </svg>
          下载文件
        </button>
        <button class="btn btn-accent btn-sm" @click="showPreviewModal = true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
          推送钉钉
        </button>
      </div>
    </div>

    <div class="preview-content markdown-body">
      <div v-html="renderedHtml"></div>
    </div>

    <!-- 成功提示 -->
    <Transition name="fade">
      <div v-if="successMessage" class="success-toast" :class="{ error: isError }">
        <svg v-if="!isError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        {{ successMessage }}
      </div>
    </Transition>

    <!-- 推送预览确认弹窗 -->
    <Transition name="fade">
      <div v-if="showPreviewModal" class="modal-overlay" @click="showPreviewModal = false">
        <div class="modal-content preview-modal" @click.stop>
          <div class="modal-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
              推送预览确认
            </h3>
            <button class="close-btn" @click="showPreviewModal = false">×</button>
          </div>
          <div class="modal-body">
            <!-- 弹框内部的错误提示 -->
            <Transition name="fade">
              <div v-if="successMessage && isError" class="modal-error-toast">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                </svg>
                <span>{{ successMessage }}</span>
              </div>
            </Transition>

            <div class="preview-info">
              <p class="info-text">
                <strong>目标：</strong>钉钉群聊
              </p>
              <p class="info-text">
                <strong>标题：</strong>{{ previewTitle }}
              </p>
            </div>
            <div class="preview-content-area">
              <h4>推送内容预览：</h4>
              <div class="content-preview markdown-body" v-html="previewContentHtml"></div>
            </div>
            <div class="preview-actions">
              <button class="btn btn-secondary" @click="showPreviewModal = false">
                取消
              </button>
              <button class="btn btn-accent" @click="confirmSend" :disabled="isSending">
                <svg v-if="isSending" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px; animation: spin 1s linear infinite;">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ isSending ? '发送中...' : '确认推送' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useGenerator } from '../composables/useGenerator'
import { useSettingsStore } from '../stores/settings'
import { sendMarkdownToDingTalk } from '../utils/dingtalk'
import { formatDate } from '../utils/date'

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})

const { copyReport, downloadReport } = useGenerator()
const settingsStore = useSettingsStore()
const successMessage = ref('')
const isError = ref(false)
const isSending = ref(false)
const showPreviewModal = ref(false)

// 渲染 Markdown 为 HTML
const renderedHtml = computed(() => {
  if (!props.report?.markdown) return '<p>暂无内容</p>'
  return marked(props.report.markdown)
})

// 预览标题
const previewTitle = computed(() => {
  let weekLabel = props.report.weekLabel
  if (!weekLabel) {
    // 尝试从 weekStart 计算
    if (props.report.weekStart) {
      weekLabel = formatDate(new Date(props.report.weekStart), 'YYYY年第W周')
    } else {
      // 使用当前日期
      weekLabel = formatDate(new Date(), 'YYYY年第W周')
    }
  }
  return `周报 - ${weekLabel}`
})

// 预览内容（转换为钉钉格式）
const previewContent = computed(() => {
  return convertMarkdownToDingFormat(props.report.markdown || '')
})

// 预览内容 HTML
const previewContentHtml = computed(() => {
  if (!previewContent.value) return ''
  return marked(previewContent.value)
})

// 显示提示
const showToast = (message, isErrorMessage = false) => {
  successMessage.value = message
  isError.value = isErrorMessage
  setTimeout(() => {
    successMessage.value = ''
    isError.value = false
  }, 3000)
}

// 复制纯文本
const copyText = async () => {
  const content = props.report.plainText || props.report.markdown || '暂无内容'
  const success = await copyReport(content)
  if (success) showToast('已复制纯文本')
}

// 复制 Markdown
const copyMarkdown = async () => {
  const content = props.report.markdown || '暂无内容'
  const success = await copyReport(content)
  if (success) showToast('已复制 Markdown')
}

// 下载文件
const download = () => {
  const content = props.report.markdown || '# 周报\n\n暂无内容'
  // 生成 weekLabel
  let weekLabel = props.report.weekLabel
  if (!weekLabel) {
    // 尝试从 weekStart 计算
    if (props.report.weekStart) {
      weekLabel = formatDate(new Date(props.report.weekStart), 'YYYY年第W周')
    } else {
      // 使用当前日期
      weekLabel = formatDate(new Date(), 'YYYY年第W周')
    }
  }
  const filename = `周报_${weekLabel}.md`
  downloadReport(content, filename)
  showToast('已开始下载')
}

// 确认推送
const confirmSend = async () => {
  // 检查配置
  if (!settingsStore.dingtalk.webhookUrl) {
    showToast('请先在设置中配置钉钉 Webhook URL', true)
    return
  }

  isSending.value = true

  try {
    const result = await sendMarkdownToDingTalk(
      previewTitle.value,
      previewContent.value,
      settingsStore.dingtalk
    )

    if (result.success) {
      showToast('已推送到钉钉')
      showPreviewModal.value = false
    } else {
      showToast(`推送失败: ${result.message}`, true)
    }
  } catch (error) {
    console.error('钉钉推送错误:', error)
    showToast(`推送失败: ${error.message}`, true)
  } finally {
    isSending.value = false
  }
}

// 转换 Markdown 为钉钉格式
const convertMarkdownToDingFormat = (markdown) => {
  // 钉钉 Markdown 语法转换
  return markdown
    // 标题转换
    .replace(/^### (.*$)/gim, '### $1')
    .replace(/^## (.*$)/gim, '## $1')
    // 列表转换
    .replace(/^- (.*$)/gim, '- $1')
    // 粗体转换
    .replace(/\*\*(.*?)\*\*/g, '**$1**')
    // 链接转换
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)')
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.report-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-header {
  padding: $spacing-md;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-md;

  .preview-title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.preview-actions {
  display: flex;
  gap: $spacing-sm;
}

.preview-content {
  padding: $spacing-lg;
  overflow-y: auto;
  max-height: calc(100vh - 300px);
  color: var(--text-primary);

  // 简单的 Markdown 样式适配
  :deep(h1), :deep(h2), :deep(h3) {
    margin-top: $spacing-lg;
    margin-bottom: $spacing-sm;
    color: var(--text-primary);
  }

  :deep(p) {
    margin-bottom: $spacing-md;
    line-height: 1.6;
  }

  :deep(ul), :deep(ol) {
    padding-left: $spacing-lg;
    margin-bottom: $spacing-md;
  }

  :deep(li) {
    margin-bottom: $spacing-xs;
  }

  :deep(blockquote) {
    border-left: 4px solid $accent-primary;
    padding-left: $spacing-md;
    color: var(--text-secondary);
    margin-bottom: $spacing-md;
  }
}

.success-toast {
  position: absolute;
  top: $spacing-md;
  left: 50%;
  transform: translateX(-50%);
  padding: $spacing-sm $spacing-md;
  background: $accent-primary;
  color: white;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba($accent-primary, 0.3);

  &.error {
    background: $error;
    box-shadow: 0 4px 12px rgba($error, 0.3);
  }
}

// 预览弹窗样式
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
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);

  &.preview-modal {
    display: flex;
    flex-direction: column;
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
}

// 弹框内部的错误提示
.modal-error-toast {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: rgba($error, 0.1);
  border: 1px solid $error;
  border-radius: $radius-md;
  color: $error;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  margin-bottom: $spacing-md;
}

.preview-info {
  margin-bottom: $spacing-lg;
  padding: $spacing-md;
  background: var(--bg-card);
  border-radius: $radius-md;
  border: 1px solid var(--border-color);

  .info-text {
    margin: $spacing-xs 0;
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
    }
  }
}

.preview-content-area {
  margin-bottom: $spacing-lg;

  h4 {
    font-size: $font-size-base;
    color: var(--text-primary);
    margin-bottom: $spacing-md;
  }

  .content-preview {
    padding: $spacing-md;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    max-height: 300px;
    overflow-y: auto;

    // Markdown 样式
    :deep(h1), :deep(h2), :deep(h3) {
      margin-top: $spacing-md;
      margin-bottom: $spacing-xs;
      color: var(--text-primary);
    }

    :deep(p) {
      margin-bottom: $spacing-sm;
      line-height: 1.6;
    }

    :deep(ul), :deep(ol) {
      padding-left: $spacing-md;
      margin-bottom: $spacing-sm;
    }

    :deep(li) {
      margin-bottom: $spacing-xs;
    }
  }
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid var(--border-color);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-fast;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
