// ========================================
// 智能周报助手 - 输入解析 Composable
// ========================================

import { useSettingsStore } from '../stores/settings'

/**
 * 智能解析用户输入的工作记录
 */
export function useParser() {
    const settingsStore = useSettingsStore()

    /**
     * 从文本中识别项目
     * @param {string} text 
     * @returns {object|null} { id, name } 或 null
     */
    const detectProject = (text) => {
        if (!text) return null

        const lowerText = text.toLowerCase()

        for (const project of settingsStore.projects || []) {
            if (!project || !project.name) continue

            // 检查项目名称
            if (lowerText.includes(project.name.toLowerCase())) {
                return { id: project.id, name: project.name }
            }

            // 检查关键词
            if (project.keywords && project.keywords.length > 0) {
                for (const keyword of project.keywords) {
                    if (lowerText.includes(keyword.toLowerCase())) {
                        return { id: project.id, name: project.name }
                    }
                }
            }
        }

        return null
    }

    /**
     * 从文本中识别工作类型
     * @param {string} text 
     * @returns {object|null} { id, name } 或 null
     */
    const detectWorkType = (text) => {
        if (!text) return null

        const lowerText = text.toLowerCase()

        for (const workType of settingsStore.workTypes || []) {
            if (!workType || !workType.name) continue

            // 检查类型名称
            if (lowerText.includes(workType.name.toLowerCase())) {
                return { id: workType.id, name: workType.name }
            }

            // 检查关键词
            if (workType.keywords && workType.keywords.length > 0) {
                for (const keyword of workType.keywords) {
                    if (lowerText.includes(keyword.toLowerCase())) {
                        return { id: workType.id, name: workType.name }
                    }
                }
            }
        }

        return null
    }

    /**
     * 完整解析用户输入
     * @param {string} text 
     * @returns {object} { content, project, workType, confidence }
     */
    const parseInput = (text) => {
        if (!text || !text.trim()) {
            return {
                content: '',
                project: null,
                workType: null,
                confidence: 0
            }
        }

        const content = text.trim()
        const project = detectProject(content)
        const workType = detectWorkType(content)

        // 计算置信度（0-100）
        let confidence = 50 // 基础分
        if (project) confidence += 25
        if (workType) confidence += 25

        return {
            content,
            project: project ? project.name : null,
            workType: workType ? workType.name : null,
            confidence
        }
    }

    /**
     * 润色工作记录内容（将口语化转为正式语句）
     * @param {string} text 
     * @returns {string}
     */
    const polishContent = (text) => {
        if (!text) return ''

        let polished = text.trim()

        // 移除开头的"完成"、"做了"等词，统一格式
        const prefixesToRemove = ['完成了', '完成', '做了', '搞定了', '解决了', '处理了']
        for (const prefix of prefixesToRemove) {
            if (polished.startsWith(prefix)) {
                polished = polished.substring(prefix.length).trim()
                break
            }
        }

        // 确保首字母大写（如果是英文开头）
        if (/^[a-z]/.test(polished)) {
            polished = polished.charAt(0).toUpperCase() + polished.slice(1)
        }

        // 移除末尾的标点符号（统一格式）
        polished = polished.replace(/[。，,\.!！]+$/, '')

        return polished
    }

    /**
     * 获取解析结果的反馈信息
     * @param {object} parseResult 
     * @returns {string}
     */
    const getParseResultMessage = (parseResult) => {
        const parts = ['已记录']

        if (parseResult.project) {
            parts.push(`项目: ${parseResult.project}`)
        } else {
            parts.push('项目: 待确认')
        }

        if (parseResult.workType) {
            parts.push(`类型: ${parseResult.workType}`)
        } else {
            parts.push('类型: 待确认')
        }

        return parts.join(' | ')
    }

    /**
     * 验证解析结果是否完整
     * @param {object} parseResult 
     * @returns {boolean}
     */
    const isParseComplete = (parseResult) => {
        return parseResult.project !== null && parseResult.workType !== null
    }

    return {
        detectProject,
        detectWorkType,
        parseInput,
        polishContent,
        getParseResultMessage,
        isParseComplete
    }
}
