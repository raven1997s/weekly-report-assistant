// ========================================
// 智能周报助手 - 弹窗 Composable
// ========================================

import { ref, computed } from 'vue'

export function useConfirm() {
  const show = ref(false)
  const title = ref('')
  const message = ref('')
  const details = ref('')
  const resolveRef = ref(null)

  // 计算属性：只有当 show 为 true 且有消息时才真正激活
  const isActive = computed(() => show.value && message.value)

  const confirm = (options) => {
    return new Promise((resolve) => {
      // 只有在有消息时才显示弹窗
      if (!options.message) {
        resolve(false)
        return
      }
      title.value = options.title || ''
      message.value = options.message || ''
      details.value = options.details || ''
      resolveRef.value = resolve
      show.value = true
    })
  }

  const handleConfirm = () => {
    resolveRef.value?.(true)
    // 重置状态
    show.value = false
    title.value = ''
    message.value = ''
    details.value = ''
    resolveRef.value = null
  }

  const handleCancel = () => {
    resolveRef.value?.(false)
    // 重置状态
    show.value = false
    title.value = ''
    message.value = ''
    details.value = ''
    resolveRef.value = null
  }

  return {
    show,
    isActive,
    title,
    message,
    details,
    confirm,
    handleConfirm,
    handleCancel
  }
}

export function usePrompt() {
  const show = ref(false)
  const title = ref('')
  const message = ref('')
  const placeholder = ref('')
  const resolveRef = ref(null)

  // 计算属性：只有当 show 为 true 且有消息时才真正激活
  const isActive = computed(() => show.value && message.value)

  const prompt = (options) => {
    return new Promise((resolve) => {
      // 只有在有消息时才显示弹窗
      if (!options.message) {
        resolve(null)
        return
      }
      title.value = options.title || ''
      message.value = options.message || ''
      placeholder.value = options.placeholder || '请输入...'
      resolveRef.value = resolve
      show.value = true
    })
  }

  const handleConfirm = (value) => {
    resolveRef.value?.(value)
    // 重置状态
    show.value = false
    title.value = ''
    message.value = ''
    placeholder.value = ''
    resolveRef.value = null
  }

  const handleCancel = () => {
    resolveRef.value?.(null)
    // 重置状态
    show.value = false
    title.value = ''
    message.value = ''
    placeholder.value = ''
    resolveRef.value = null
  }

  return {
    show,
    isActive,
    title,
    message,
    placeholder,
    prompt,
    handleConfirm,
    handleCancel
  }
}
