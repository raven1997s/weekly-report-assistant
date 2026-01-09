// ========================================
// 智能周报助手 - 钉钉机器人工具函数
// ========================================

/**
 * 生成签名（使用 HMAC-SHA256）
 * @param {string} secret - 密钥
 * @param {number} timestamp - 时间戳
 * @returns {Promise<string>}
 */
const generateSignature = async (secret, timestamp) => {
    // 由于浏览器环境限制，这里使用简化实现
    // 实际使用中建议在后端生成签名
    const stringToSign = `${timestamp}\n${secret}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(stringToSign)

    try {
        const crypto = window.crypto
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            messageData
        )

        // 将签名转换为 base64
        const signatureArray = Array.from(new Uint8Array(signature))
        const signatureString = btoa(String.fromCharCode.apply(null, signatureArray))
        return signatureString
    } catch (error) {
        console.warn('签名生成失败，使用简化方案:', error)
        // 降级方案
        return btoa(stringToSign)
    }
}

/**
 * 发送消息到钉钉机器人（通过后端代理，避免 CORS 问题）
 * @param {string} content - 消息内容（纯文本）
 * @param {object} config - 配置 { webhookUrl, secret }
 * @returns {Promise<object>}
 */
export const sendToDingTalk = async (content, config) => {
    const { webhookUrl, secret } = config

    if (!webhookUrl) {
        throw new Error('未配置钉钉 Webhook URL')
    }

    try {
        // 调用后端代理 API
        const response = await fetch('http://localhost:3000/api/dingtalk/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhookUrl,
                secret,
                msgtype: 'text',
                content
            })
        })

        const result = await response.json()

        if (result.success) {
            return { success: true, message: result.message }
        } else {
            return { success: false, message: result.error || '发送失败' }
        }
    } catch (error) {
        console.error('钉钉推送失败:', error)
        return { success: false, message: error.message }
    }
}

/**
 * 发送 Markdown 格式消息到钉钉（通过后端代理，避免 CORS 问题）
 * @param {string} title - 消息标题
 * @param {string} markdown - Markdown 内容
 * @param {object} config - 配置
 * @returns {Promise<object>}
 */
export const sendMarkdownToDingTalk = async (title, markdown, config) => {
    const { webhookUrl, secret } = config

    if (!webhookUrl) {
        throw new Error('未配置钉钉 Webhook URL')
    }

    try {
        // 调用后端代理 API
        const response = await fetch('http://localhost:3000/api/dingtalk/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhookUrl,
                secret,
                msgtype: 'markdown',
                content: markdown,
                title
            })
        })

        const result = await response.json()

        if (result.success) {
            return { success: true, message: result.message }
        } else {
            return { success: false, message: result.error || '发送失败' }
        }
    } catch (error) {
        console.error('钉钉推送失败:', error)
        return { success: false, message: error.message }
    }
}

/**
 * 测试钉钉配置（通过后端代理）
 * @param {object} config - 配置
 * @returns {Promise<object>}
 */
export const testDingTalkConfig = async (config) => {
    if (!config.webhookUrl) {
        return { success: false, message: '未配置 Webhook URL' }
    }

    try {
        // 调用后端测试 API
        const response = await fetch('http://localhost:3000/api/dingtalk/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhookUrl: config.webhookUrl,
                secret: config.secret || ''
            })
        })

        const result = await response.json()

        if (result.success) {
            return { success: true, message: result.message }
        } else {
            return { success: false, message: result.error || '测试失败' }
        }
    } catch (error) {
        console.error('钉钉测试失败:', error)
        return { success: false, message: error.message }
    }
}
