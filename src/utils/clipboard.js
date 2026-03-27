// ========================================
// 智能周报助手 - 剪贴板工具函数
// ========================================

/**
 * 复制文本到剪贴板
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export const copyToClipboard = async (text) => {
    try {
        // 优先使用现代 API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }

        // 降级方案：使用 execCommand
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()

        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        return success
    } catch (error) {
        console.error('复制到剪贴板失败:', error)
        return false
    }
}

/**
 * 同时写入纯文本和 HTML 到剪贴板。
 * 支持的邮箱/编辑器会优先读取 HTML，从而保留格式。
 * 不支持富文本剪贴板时自动回退为纯文本。
 * @param {{ text: string, html: string }} payload
 * @returns {Promise<boolean>}
 */
export const copyRichContentToClipboard = async ({ text, html }) => {
    try {
        if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            const item = new ClipboardItem({
                'text/plain': new Blob([text], { type: 'text/plain' }),
                'text/html': new Blob([html], { type: 'text/html' })
            })

            await navigator.clipboard.write([item])
            return true
        }

        return await copyToClipboard(text)
    } catch (error) {
        console.error('复制富文本到剪贴板失败:', error)
        return await copyToClipboard(text)
    }
}

/**
 * 从剪贴板读取文本
 * @returns {Promise<string|null>}
 */
export const readFromClipboard = async () => {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            return await navigator.clipboard.readText()
        }
        return null
    } catch (error) {
        console.error('从剪贴板读取失败:', error)
        return null
    }
}
