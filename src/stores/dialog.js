// ========================================
// 智能周报助手 - 全局弹窗状态管理
// ========================================

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useDialogStore = defineStore('dialog', () => {
  // ============ 状态 ============

  // Confirm 状态
  const confirmShow = ref(false)
  const confirmTitle = ref('')
  const confirmMessage = ref('')
  const confirmDetails = ref('')
  const confirmResolve = ref(null)

  // Prompt 状态
  const promptShow = ref(false)
  const promptTitle = ref('')
  const promptMessage = ref('')
  const promptPlaceholder = ref('')
  const promptResolve = ref(null)

  // ============ 计算属性 ============

  const confirmActive = computed(() => confirmShow.value && confirmMessage.value)
  const promptActive = computed(() => promptShow.value && promptMessage.value)

  // ============ 方法 ============

  const confirm = (options) => {
    return new Promise((resolve) => {
      if (!options.message) {
        resolve(false)
        return
      }
      confirmTitle.value = options.title || ''
      confirmMessage.value = options.message
      confirmDetails.value = options.details || ''
      confirmResolve.value = resolve
      confirmShow.value = true
    })
  }

  const confirmHandle = (result) => {
    confirmResolve.value?.(result)
    confirmShow.value = false
    confirmTitle.value = ''
    confirmMessage.value = ''
    confirmDetails.value = ''
    confirmResolve.value = null
  }

  const prompt = (options) => {
    return new Promise((resolve) => {
      if (!options.message) {
        resolve(null)
        return
      }
      promptTitle.value = options.title || ''
      promptMessage.value = options.message
      promptPlaceholder.value = options.placeholder || '请输入...'
      promptResolve.value = resolve
      promptShow.value = true
    })
  }

  const promptHandle = (value) => {
    promptResolve.value?.(value)
    promptShow.value = false
    promptTitle.value = ''
    promptMessage.value = ''
    promptPlaceholder.value = ''
    promptResolve.value = null
  }

  return {
    // Confirm 状态
    confirmShow,
    confirmTitle,
    confirmMessage,
    confirmDetails,
    confirmActive,
    // Prompt 状态
    promptShow,
    promptTitle,
    promptMessage,
    promptPlaceholder,
    promptActive,
    // 方法
    confirm,
    confirmHandle,
    prompt,
    promptHandle
  }
})
