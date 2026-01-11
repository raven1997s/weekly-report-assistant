// ============ 焦点陷阱 Composable ============
// 用于模态框等需要限制焦点范围的组件
// 符合 WCAG 2.1 Focus Order 标准

import { onMounted, onUnmounted, watch, nextTick } from 'vue'

/**
 * 焦点陷阱 Hook
 * @param {Ref} modalRef - 模态框容器的 ref
 * @param {Ref|Function} isOpen - 模态框是否打开的响应式引用或函数
 * @param {Object} options - 配置选项
 * @param {boolean} options.autoFocus - 是否自动聚焦到第一个可聚焦元素
 * @param {boolean} options.restoreFocus - 关闭时是否恢复焦点到之前的元素
 * @param {Function} options.onActivate - 激活时的回调
 * @param {Function} options.onDeactivate - 停用时的回调
 */
export function useFocusTrap(modalRef, isOpen, options = {}) {
  const {
    autoFocus = true,
    restoreFocus = true,
    onActivate = null,
    onDeactivate = null
  } = options

  let previousActiveElement = null
  let focusableElements = []
  let firstElement = null
  let lastElement = null
  let isTrapping = false

  /**
   * 获取所有可聚焦的元素
   * 遵循 WCAG 可聚焦元素标准
   */
  const getFocusableElements = () => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    const elements = Array.from(
      modalRef.value?.querySelectorAll(focusableSelectors) || []
    )

    // 过滤掉不可见的元素
    return elements.filter(el => {
      const style = window.getComputedStyle(el)
      return el.offsetParent !== null &&
             style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0'
    })
  }

  /**
   * 焦点陷阱事件处理
   * 当用户按下 Tab 键时，循环焦点在第一个和最后一个元素之间
   */
  const trapFocus = (e) => {
    if (!isTrapping || e.key !== 'Tab') return

    // 如果没有可聚焦元素，阻止默认行为
    if (!firstElement || !lastElement) {
      e.preventDefault()
      return
    }

    // Shift+Tab: 反向循环
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    }
    // Tab: 正向循环
    else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }

  /**
   * 激活焦点陷阱
   */
  const activate = async () => {
    if (isTrapping) return

    // 等待 DOM 更新完成
    await nextTick()

    // 保存当前聚焦的元素
    previousActiveElement = document.activeElement

    // 获取可聚焦元素列表
    focusableElements = getFocusableElements()
    firstElement = focusableElements[0]
    lastElement = focusableElements[focusableElements.length - 1]

    // 自动聚焦到第一个元素
    if (autoFocus && firstElement) {
      firstElement.focus()
    } else if (autoFocus && modalRef.value) {
      // 如果没有可聚焦元素，聚焦到模态框本身
      modalRef.value.focus()
    }

    // 添加键盘事件监听
    document.addEventListener('keydown', trapFocus)

    isTrapping = true

    // 触发激活回调
    if (onActivate) {
      onActivate()
    }
  }

  /**
   * 停用焦点陷阱
   */
  const deactivate = () => {
    if (!isTrapping) return

    // 移除键盘事件监听
    document.removeEventListener('keydown', trapFocus)

    // 恢复之前的焦点
    if (restoreFocus && previousActiveElement) {
      previousActiveElement.focus()
    }

    // 清理状态
    focusableElements = []
    firstElement = null
    lastElement = null
    previousActiveElement = null
    isTrapping = false

    // 触发停用回调
    if (onDeactivate) {
      onDeactivate()
    }
  }

  /**
   * 手动刷新可聚焦元素列表
   * 用于动态内容更新后重新计算焦点元素
   */
  const refreshFocusableElements = () => {
    if (!isTrapping) return

    focusableElements = getFocusableElements()
    firstElement = focusableElements[0]
    lastElement = focusableElements[focusableElements.length - 1]
  }

  // 监听 isOpen 变化
  if (typeof isOpen === 'function') {
    // 如果 isOpen 是函数，无法直接 watch，需要手动调用
    watch(() => {
      // 这是一个占位符，实际使用时应该传入 Ref
    }, () => {
      // 处理逻辑
    })
  } else {
    // isOpen 是 Ref
    watch(isOpen, (open) => {
      if (open) {
        activate()
      } else {
        deactivate()
      }
    })
  }

  // 组件卸载时清理
  onUnmounted(() => {
    deactivate()
  })

  return {
    activate,
    deactivate,
    refreshFocusableElements,
    isTrapping: () => isTrapping
  }
}

/**
 * 简化版焦点陷阱（自动监听 ref）
 * @param {Ref} modalRef - 模态框容器的 ref
 * @param {Ref} show - 控制显示的 ref
 */
export function useModalFocusTrap(modalRef, show) {
  const { activate, deactivate } = useFocusTrap(modalRef, show, {
    autoFocus: true,
    restoreFocus: true
  })

  watch(show, (isVisible) => {
    if (isVisible) {
      // 等待 Transition 动画完成后再激活
      setTimeout(() => {
        activate()
      }, 100)
    } else {
      deactivate()
    }
  })
}
