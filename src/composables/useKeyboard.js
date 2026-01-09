// ========================================
// 智能周报助手 - 快捷键 Composable
// ========================================

import { onMounted, onUnmounted } from 'vue'

/**
 * 快捷键管理
 */
export function useKeyboard() {
    const keyHandlers = new Map()

    /**
     * 注册快捷键
     * @param {string} shortcut - 快捷键，如 'Ctrl+N', 'Cmd+S'
     * @param {Function} handler - 处理函数
     * @param {string} description - 描述
     */
    const registerShortcut = (shortcut, handler, description = '') => {
        keyHandlers.set(shortcut, { handler, description })
    }

    /**
     * 解析快捷键字符串
     * @param {string} shortcut - 如 'Ctrl+N', 'Cmd+Shift+S'
     * @returns {object} { ctrl, shift, alt, meta, key }
     */
    const parseShortcut = (shortcut) => {
        const parts = shortcut.toLowerCase().split('+')
        return {
            ctrl: parts.includes('ctrl') || parts.includes('cmd'),
            shift: parts.includes('shift'),
            alt: parts.includes('alt'),
            meta: parts.includes('meta') || parts.includes('cmd'),
            key: parts[parts.length - 1].toUpperCase()
        }
    }

    /**
     * 检查事件是否匹配快捷键
     * @param {KeyboardEvent} event
     * @param {object} parsedShortcut
     * @returns {boolean}
     */
    const matchShortcut = (event, parsedShortcut) => {
        return (
            event.ctrlKey === parsedShortcut.ctrl &&
            event.shiftKey === parsedShortcut.shift &&
            event.altKey === parsedShortcut.alt &&
            event.metaKey === parsedShortcut.meta &&
            event.key.toUpperCase() === parsedShortcut.key
        )
    }

    /**
     * 键盘事件处理
     */
    const handleKeyDown = (event) => {
        // 在输入框中不触发快捷键（Esc 除外）
        const target = event.target
        const isInput = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.contentEditable === 'true'

        if (isInput && event.key !== 'Escape') {
            return
        }

        for (const [shortcut, { handler }] of keyHandlers) {
            const parsed = parseShortcut(shortcut)
            if (matchShortcut(event, parsed)) {
                event.preventDefault()
                handler(event)
                return
            }
        }
    }

    // 生命周期钩子
    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown)
    })

    return {
        registerShortcut
    }
}

/**
 * 快捷键列表（用于展示）
 */
export const SHORTCUTS = [
    { key: 'Ctrl+N', description: '新建记录（聚焦输入框）' },
    { key: 'Ctrl+G', description: '跳转到生成周报页面' },
    { key: 'Ctrl+H', description: '跳转到历史周报页面' },
    { key: 'Ctrl+,', description: '跳转到设置页面' },
    { key: 'Escape', description: '关闭弹窗/取消编辑' },
    { key: 'Ctrl+/', description: '显示快捷键帮助' }
]
