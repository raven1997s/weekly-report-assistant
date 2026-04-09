// ========================================
// 智能周报助手 - 周报生成 Composable
// ========================================

import { useParser } from './useParser'
import { copyToClipboard } from '../utils/clipboard'
import { getWeekLabel, getWeekRange } from '../utils/date'

/**
 * 周报生成功能
 */
export function useGenerator() {
    const { polishContent } = useParser()

    /**
     * 生成标签字符串（统一本周工作和下周计划的标签逻辑）
     * @param {string} project - 项目名称
     * @param {string} workType - 工作类型
     * @returns {string} 标签字符串，如 "[WMS][优化]"
     *
     * 标签显示规则：
     * 1. 项目明确 + 类型明确 → [项目][类型]
     * 2. 项目明确 + 类型为"其他" → [项目][其他]
     * 3. 项目为"其他" + 类型明确 → [类型]（不显示[其他]）
     * 4. 项目为"其他" + 类型为"其他" → [其他]
     * 5. 只有项目（没有类型字段） → [项目][其他]
     * 6. 只有类型（没有项目字段） → [类型]
     */
    const generateTags = (project, workType) => {
        const tags = []

        // 情况1: 项目明确，添加项目标签
        if (project && project !== '其他') {
            tags.push(`[${project}]`)
        }

        // 情况2: 类型明确，添加类型标签
        if (workType && workType !== '其他') {
            tags.push(`[${workType}]`)
        }

        // 情况3: 如果有项目但类型为"其他"，添加[其他]标签
        // 例如：[WMS][其他]
        if (project && project !== '其他' && (!workType || workType === '其他')) {
            tags.push('[其他]')
        }

        // 情况4: 如果都没有明确，显示[其他]
        if (tags.length === 0) {
            tags.push('[其他]')
        }

        return tags.join('')
    }

    /**
     * 按项目分组记录
     * @param {Array} records
     * @returns {Object} { projectName: [records] }
     */
    const groupByProject = (records) => {
        const grouped = {}

        records.forEach(record => {
            const project = record.project || '其他'
            if (!grouped[project]) {
                grouped[project] = []
            }
            grouped[project].push(record)
        })

        return grouped
    }

    /**
     * 按工作类型分组记录
     * @param {Array} records
     * @returns {Object} { typeName: [records] }
     */
    const groupByType = (records) => {
        const grouped = {}

        records.forEach(record => {
            const type = record.workType || '其他'
            if (!grouped[type]) {
                grouped[type] = []
            }
            grouped[type].push(record)
        })

        return grouped
    }

    /**
     * 计算记录的优先级（用于排序）
     * 优先级越小越靠前
     * @param {Object} record
     * @returns {number} 优先级值（0-3）
     */
    const getRecordPriority = (record) => {
        const hasProject = record.project && record.project !== '其他'
        const hasType = record.workType && record.workType !== '其他'

        if (hasProject && hasType) {
            return 0 // 项目和类型都明确，排最前
        } else if (hasProject && !hasType) {
            return 1 // 只有项目明确
        } else if (!hasProject && hasType) {
            return 2 // 只有类型明确
        } else {
            return 3 // 都不明确，排最后
        }
    }

    /**
     * 按优先级排序记录（明确的在前，"其他"在后）
     * 相同优先级内按项目分组，同项目内按创建时间排序
     * @param {Array} records
     * @returns {Array} 排序后的记录
     */
    const sortByPriority = (records) => {
        return [...records].sort((a, b) => {
            const priorityA = getRecordPriority(a)
            const priorityB = getRecordPriority(b)

            // 先按优先级排序
            if (priorityA !== priorityB) {
                return priorityA - priorityB
            }

            // 相同优先级内，按项目名称分组，确保预览顺序稳定
            const projectA = a.project || '其他'
            const projectB = b.project || '其他'
            const projectCompare = projectA.localeCompare(projectB, 'zh-CN')
            if (projectCompare !== 0) {
                return projectCompare
            }

            // 同项目内按创建时间排序，避免后端返回顺序影响预览
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeA - timeB
        })
    }

    /**
     * 生成周报 Markdown 内容
     * @param {Object} options
     * @param {Array} options.records - 工作记录
     * @param {Array} options.plans - 下周计划
     * @param {Object} options.reflections - 得与失 { gains, losses }
     * @returns {string}
     */
    const generateMarkdown = ({ records = [], plans = [], reflections = {} }) => {
        const lines = []

        // 本周完成工作
        lines.push('**本周完成工作**')
        lines.push('')

        if (records.length === 0) {
            lines.push('暂无工作记录')
        } else {
            // 先按优先级排序：明确的在前，"其他"的在后
            const sortedRecords = sortByPriority(records)

            sortedRecords.forEach((record, index) => {
                const content = polishContent(record.content)
                // 使用统一的标签生成函数，确保与下周计划的标签逻辑一致
                const tagStr = generateTags(record.project, record.workType)
                lines.push(`${index + 1}. ${tagStr} ${content}`)
            })
        }

        lines.push('')
        lines.push('')

        // 下周工作计划
        lines.push('**下周工作计划**')
        lines.push('')

        if (plans.length === 0) {
            lines.push('暂无计划')
        } else {
            // 按优先级排序：明确的在前，"其他"的在后
            const sortedPlans = sortByPriority(plans)
            sortedPlans.forEach((plan, index) => {
                const content = polishContent(plan.content)
                const tagStr = generateTags(plan.project, plan.workType)
                lines.push(`${index + 1}. ${tagStr} ${content}`)
            })
        }

        lines.push('')
        lines.push('')

        // 本周得与失
        lines.push('**本周得与失**')
        lines.push('')

        // 合并得与失到一个列表
        const items = []
        if (reflections.gains) {
            items.push(`1. ${reflections.gains}`)
        }
        if (reflections.losses) {
            items.push(`2. ${reflections.losses}`)
        }

        if (items.length === 0) {
            lines.push('暂无')
        } else {
            lines.push(items.join('\n'))
        }

        return lines.join('\n')
    }

    /**
     * 生成纯文本格式周报（用于钉钉等平台，不包含 Markdown 格式）
     * @param {Object} options
     * @returns {string}
     */
    const generatePlainText = ({ records = [], plans = [], reflections = {} }) => {
        const lines = []

        // 本周完成工作
        lines.push('本周完成工作')
        lines.push('')

        if (records.length === 0) {
            lines.push('暂无工作记录')
        } else {
            // 先按优先级排序：明确的在前，"其他"的在后
            const sortedRecords = sortByPriority(records)

            sortedRecords.forEach((record, index) => {
                const content = polishContent(record.content)
                // 使用统一的标签生成函数，确保与下周计划的标签逻辑一致
                const tagStr = generateTags(record.project, record.workType)
                lines.push(`${index + 1}. ${tagStr} ${content}`)
            })
        }

        lines.push('')
        lines.push('')

        // 下周工作计划
        lines.push('下周工作计划')
        lines.push('')

        if (plans.length === 0) {
            lines.push('暂无计划')
        } else {
            // 按优先级排序：明确的在前，"其他"的在后
            const sortedPlans = sortByPriority(plans)
            sortedPlans.forEach((plan, index) => {
                const content = polishContent(plan.content)
                const tagStr = generateTags(plan.project, plan.workType)
                lines.push(`${index + 1}. ${tagStr} ${content}`)
            })
        }

        lines.push('')
        lines.push('')

        // 本周得与失（纯文本格式，不包含 Markdown 符号）
        lines.push('本周得与失')
        lines.push('')

        // 合并得与失到一个列表
        const items = []
        if (reflections.gains) {
            items.push(`1. ${reflections.gains}`)
        }
        if (reflections.losses) {
            items.push(`2. ${reflections.losses}`)
        }

        if (items.length === 0) {
            lines.push('暂无')
        } else {
            lines.push(items.join('\n'))
        }

        return lines.join('\n')
    }

    /**
     * 生成完整周报对象
     * @param {Object} options 
     * @returns {Object}
     */
    const generateReport = ({ records = [], plans = [], reflections = {} }) => {
        return {
            markdown: generateMarkdown({ records, plans, reflections }),
            plainText: generatePlainText({ records, plans, reflections }),
            records: sortByPriority([...records]),
            plans: sortByPriority([...plans]),
            reflections: { ...reflections },
            generatedAt: new Date().toISOString()
        }
    }

    /**
     * 复制周报到剪贴板
     * @param {string} content 
     * @returns {Promise<boolean>}
     */
    const copyReport = async (content) => {
        return await copyToClipboard(content)
    }

    /**
     * 下载周报为文件
     * @param {string} content 
     * @param {string} filename 
     */
    const downloadReport = (content, filename = 'weekly_report.md') => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return {
        groupByProject,
        groupByType,
        generateTags,
        getRecordPriority,
        sortByPriority,
        generateMarkdown,
        generatePlainText,
        generateReport,
        copyReport,
        downloadReport
    }
}
