// ========================================
// 智能周报助手 - 设置状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveToStorage, loadFromStorage } from '../utils/api'
import { useToastStore } from './toast'
import { DEFAULT_RECORD_STATUSES, getRecordStatusNames } from '../../shared/record-status'

// API 基础 URL（支持环境变量）
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const STORAGE_KEY = 'weekly_report_settings'
const DEFAULT_MAIL_TEMPLATE_KEY = 'gancao-department-weekly-report'
const LEGACY_MAIL_TITLE_SUFFIXES = new Set(['厚朴汤部门工作周报'])

// 默认配置
const DEFAULT_SETTINGS = {
    // 项目列表
    projects: [
        { id: '1', name: 'WMS', keywords: ['wms', '仓储', '库存', '出库', '入库'] },
        { id: '2', name: '支付中心', keywords: ['支付', 'pay', '微信支付', '支付宝', '银联'] },
        { id: '3', name: '用户中心', keywords: ['用户', 'user', '登录', '注册', '权限'] }
    ],

    // 工作类型
    workTypes: [
        { id: '1', name: '优化', keywords: ['优化', '改进', '提升', '重构'] },
        { id: '2', name: '支持', keywords: ['支持', '协助', '帮助', '处理'] },
        { id: '3', name: '协同', keywords: ['协同', '配合', '沟通', '对接'] },
        { id: '4', name: '创新', keywords: ['创新', '新功能', '探索'] },
        { id: '5', name: '学习', keywords: ['学习', '研究', '阅读', '培训'] },
        { id: '6', name: 'Bug修复', keywords: ['bug', '修复', '修复', 'fix', '问题'] },
        { id: '7', name: '需求开发', keywords: ['需求', '开发', '功能', '实现'] },
        { id: '8', name: '技术调研', keywords: ['调研', '技术', '方案', '评估'] },
        { id: '9', name: '文档编写', keywords: ['文档', '文档', 'doc', '记录'] }
    ],

    // 工作状态
    recordStatuses: DEFAULT_RECORD_STATUSES.map((name, index) => ({
        id: `status-${index + 1}`,
        name
    })),

    // 主题
    theme: 'dark',

    // 钉钉配置
    dingtalk: {
        webhookUrl: '',
        secret: '',
        enabled: false
    },

    // 企业邮箱草稿箱配置
    mail: {
        account: '',
        imapHost: 'imap.qiye.aliyun.com',
        imapPort: 993,
        secure: true,
        password: '',
        draftsMailbox: 'Drafts',
        webmailUrl: '',
        defaultTo: '',
        defaultCc: '',
        defaultBcc: '',
        defaultTemplate: 'gancao-department-weekly-report'
    },

    // 邮件模板配置（按模板分别保存）
    mailTemplateConfigs: {
        [DEFAULT_MAIL_TEMPLATE_KEY]: {
            titleSuffix: '工作周报',
            subtitle: '降本增效、协同攻坚、高质量发展',
            bannerText: '星光闪烁，助我前行'
        }
    },

    // 邮件签名配置
    mailSignature: {
        enabled: true,
        displayName: '示例昵称',
        realName: '示例姓名',
        jobTitle: '软件开发工程师',
        mobile: '13800000000',
        fax: '010-12345678',
        website: 'www.example.com',
        company: '示例科技有限公司',
        address: '示例市示例区示例路 88 号'
    }
}

export const useSettingsStore = defineStore('settings', () => {
    const normalizeSettingItems = (items = []) => items
        .map(item => ({
            id: String(item.id ?? Date.now()),
            name: String(item.name || '').trim(),
            keywords: Array.isArray(item.keywords)
                ? item.keywords.map(keyword => String(keyword).trim()).filter(Boolean)
                : []
        }))
        .filter(item => item.name)

    const normalizeRecordStatusItems = (items = []) => items
        .map((item, index) => ({
            id: String(typeof item === 'string' ? `status-${index + 1}` : (item.id ?? `status-${index + 1}`)),
            name: String(typeof item === 'string' ? item : (item.name || '')).trim()
        }))
        .filter(item => item.name)

    const normalizeTitleSuffix = (value) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) {
            return DEFAULT_SETTINGS.mailTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY].titleSuffix
        }

        if (LEGACY_MAIL_TITLE_SUFFIXES.has(trimmed.replace(/\s+/g, ''))) {
            return DEFAULT_SETTINGS.mailTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY].titleSuffix
        }

        return trimmed
    }

    const normalizeMailTemplateConfig = (config = {}, templateKey = DEFAULT_MAIL_TEMPLATE_KEY) => {
        const fallback = DEFAULT_SETTINGS.mailTemplateConfigs[templateKey]
            || DEFAULT_SETTINGS.mailTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY]

        return {
            titleSuffix: normalizeTitleSuffix(config.titleSuffix ?? fallback.titleSuffix),
            subtitle: config.subtitle || fallback.subtitle,
            bannerText: config.bannerText || fallback.bannerText
        }
    }

    const cloneMailTemplateConfigs = (configs = {}) => JSON.parse(JSON.stringify(configs))
    const getDefaultMailTemplateConfig = (templateKey = DEFAULT_SETTINGS.mail.defaultTemplate) => ({
        ...normalizeMailTemplateConfig(
            DEFAULT_SETTINGS.mailTemplateConfigs[templateKey] || DEFAULT_SETTINGS.mailTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY],
            templateKey
        )
    })

    // ============ 状态 ============
    const projects = ref([...DEFAULT_SETTINGS.projects])
    const workTypes = ref([...DEFAULT_SETTINGS.workTypes])
    const recordStatuses = ref([...DEFAULT_SETTINGS.recordStatuses])
    const theme = ref(DEFAULT_SETTINGS.theme)
    const dingtalk = ref({ ...DEFAULT_SETTINGS.dingtalk })
    const mail = ref({ ...DEFAULT_SETTINGS.mail })
    const mailTemplateConfigs = ref(cloneMailTemplateConfigs(DEFAULT_SETTINGS.mailTemplateConfigs))
    const mailSignature = ref({ ...DEFAULT_SETTINGS.mailSignature })
    const scheduledTasks = ref([])

    // ============ 初始化 ============
    const init = async () => {
        const toast = useToastStore()
        try {
            const saved = await loadFromStorage(STORAGE_KEY)
            if (saved) {
                // 解析 projects 和 workTypes（后端存储为 JSON 字符串）
                projects.value = typeof saved.projects === 'string'
                    ? JSON.parse(saved.projects)
                    : (saved.projects || DEFAULT_SETTINGS.projects)

                workTypes.value = typeof saved.workTypes === 'string'
                    ? JSON.parse(saved.workTypes)
                    : (saved.workTypes || DEFAULT_SETTINGS.workTypes)

                const savedRecordStatuses = typeof saved.recordStatuses === 'string'
                    ? JSON.parse(saved.recordStatuses)
                    : (saved.recordStatuses || DEFAULT_SETTINGS.recordStatuses)
                recordStatuses.value = normalizeRecordStatusItems(savedRecordStatuses)

                theme.value = saved.theme || DEFAULT_SETTINGS.theme

                // 合并钉钉配置（后端存储为分开的键）
                dingtalk.value = {
                    webhookUrl: saved.dingtalk_webhookUrl || '',
                    secret: saved.dingtalk_secret || '',
                    enabled: saved.dingtalk_enabled === 'true' || saved.dingtalk_enabled === true
                }

                mail.value = {
                    account: saved.mail_account || '',
                    imapHost: saved.mail_imap_host || DEFAULT_SETTINGS.mail.imapHost,
                    imapPort: Number(saved.mail_imap_port || DEFAULT_SETTINGS.mail.imapPort),
                    secure: saved.mail_secure === 'false' ? false : true,
                    password: saved.mail_password || '',
                    draftsMailbox: saved.mail_drafts_mailbox || DEFAULT_SETTINGS.mail.draftsMailbox,
                    webmailUrl: saved.mail_web_url || '',
                    defaultTo: saved.mail_default_to || '',
                    defaultCc: saved.mail_default_cc || '',
                    defaultBcc: saved.mail_default_bcc || '',
                    defaultTemplate: saved.mail_default_template || DEFAULT_SETTINGS.mail.defaultTemplate
                }

                const legacyTemplateConfig = {
                    titleSuffix: normalizeTitleSuffix(saved.mail_template_title_suffix || getDefaultMailTemplateConfig().titleSuffix),
                    subtitle: saved.mail_template_subtitle || getDefaultMailTemplateConfig().subtitle,
                    bannerText: saved.mail_template_banner_text || getDefaultMailTemplateConfig().bannerText
                }
                let parsedTemplateConfigs = cloneMailTemplateConfigs(DEFAULT_SETTINGS.mailTemplateConfigs)

                if (saved.mail_template_configs) {
                    try {
                        const rawConfigs = JSON.parse(saved.mail_template_configs)
                        parsedTemplateConfigs = {
                            ...parsedTemplateConfigs,
                            ...rawConfigs
                        }
                    } catch (error) {
                        console.warn('[Settings] 解析 mail_template_configs 失败，回退到旧格式:', error)
                    }
                }

                if (!parsedTemplateConfigs[mail.value.defaultTemplate]) {
                    parsedTemplateConfigs[mail.value.defaultTemplate] = legacyTemplateConfig
                }

                parsedTemplateConfigs = Object.fromEntries(
                    Object.entries(parsedTemplateConfigs).map(([templateKey, config]) => [
                        templateKey,
                        normalizeMailTemplateConfig(config, templateKey)
                    ])
                )

                parsedTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY] = normalizeMailTemplateConfig(
                    parsedTemplateConfigs[DEFAULT_MAIL_TEMPLATE_KEY] || getDefaultMailTemplateConfig(DEFAULT_MAIL_TEMPLATE_KEY),
                    DEFAULT_MAIL_TEMPLATE_KEY
                )

                mailTemplateConfigs.value = parsedTemplateConfigs

                mailSignature.value = {
                    enabled: saved.mail_signature_enabled === 'false'
                        ? false
                        : (saved.mail_signature_enabled === 'true'
                            ? true
                            : DEFAULT_SETTINGS.mailSignature.enabled),
                    displayName: saved.mail_signature_display_name || DEFAULT_SETTINGS.mailSignature.displayName,
                    realName: saved.mail_signature_real_name || DEFAULT_SETTINGS.mailSignature.realName,
                    jobTitle: saved.mail_signature_job_title || DEFAULT_SETTINGS.mailSignature.jobTitle,
                    mobile: saved.mail_signature_mobile || DEFAULT_SETTINGS.mailSignature.mobile,
                    fax: saved.mail_signature_fax || DEFAULT_SETTINGS.mailSignature.fax,
                    website: saved.mail_signature_website || DEFAULT_SETTINGS.mailSignature.website,
                    company: saved.mail_signature_company || DEFAULT_SETTINGS.mailSignature.company,
                    address: saved.mail_signature_address || DEFAULT_SETTINGS.mailSignature.address
                }
            } else {
                // 使用默认设置
                projects.value = DEFAULT_SETTINGS.projects
                workTypes.value = DEFAULT_SETTINGS.workTypes
                recordStatuses.value = DEFAULT_SETTINGS.recordStatuses
                theme.value = DEFAULT_SETTINGS.theme
                dingtalk.value = DEFAULT_SETTINGS.dingtalk
                mail.value = DEFAULT_SETTINGS.mail
                mailTemplateConfigs.value = cloneMailTemplateConfigs(DEFAULT_SETTINGS.mailTemplateConfigs)
                mailSignature.value = DEFAULT_SETTINGS.mailSignature
            }

            // 应用主题
            applyTheme(theme.value)
        } catch (error) {
            console.error('[Settings] ❌ 初始化失败:', error)
            toast.error(`加载设置失败: ${error.message}`)
            // 使用默认设置
            projects.value = DEFAULT_SETTINGS.projects
            workTypes.value = DEFAULT_SETTINGS.workTypes
            recordStatuses.value = DEFAULT_SETTINGS.recordStatuses
            theme.value = DEFAULT_SETTINGS.theme
            dingtalk.value = DEFAULT_SETTINGS.dingtalk
            mail.value = DEFAULT_SETTINGS.mail
            mailTemplateConfigs.value = cloneMailTemplateConfigs(DEFAULT_SETTINGS.mailTemplateConfigs)
            mailSignature.value = DEFAULT_SETTINGS.mailSignature
            applyTheme(theme.value)
        }
    }

    // ============ 计算属性 ============

    // 项目名称列表
    const projectNames = computed(() => projects.value.map(p => p.name))

    // 工作类型名称列表
    const workTypeNames = computed(() => workTypes.value.map(t => t.name))
    const recordStatusNames = computed(() => getRecordStatusNames(recordStatuses.value))
    const mailTemplate = computed(() => {
        const currentTemplateKey = mail.value.defaultTemplate || DEFAULT_SETTINGS.mail.defaultTemplate
        return normalizeMailTemplateConfig({
            ...getDefaultMailTemplateConfig(currentTemplateKey),
            ...(mailTemplateConfigs.value[currentTemplateKey] || {})
        }, currentTemplateKey)
    })

    // ============ 方法 ============

    // 持久化保存
    const persist = async () => {
        const toast = useToastStore()
        try {
            // 创建纯净的副本，去除 Vue 响应式包装
            const cleanData = {
                projects: JSON.stringify(projects.value),
                workTypes: JSON.stringify(workTypes.value),
                recordStatuses: JSON.stringify(recordStatuses.value),
                theme: theme.value,
                // 钉钉配置转换为后端期望的分开键格式
                dingtalk_webhookUrl: dingtalk.value.webhookUrl || '',
                dingtalk_secret: dingtalk.value.secret || '',
                dingtalk_enabled: String(dingtalk.value.enabled || false),
                // 企业邮箱配置
                mail_account: mail.value.account || '',
                mail_imap_host: mail.value.imapHost || '',
                mail_imap_port: String(mail.value.imapPort || ''),
                mail_secure: String(mail.value.secure !== false),
                mail_password: mail.value.password || '',
                mail_drafts_mailbox: mail.value.draftsMailbox || '',
                mail_web_url: mail.value.webmailUrl || '',
                mail_default_to: mail.value.defaultTo || '',
                mail_default_cc: mail.value.defaultCc || '',
                mail_default_bcc: mail.value.defaultBcc || '',
                mail_default_template: mail.value.defaultTemplate || DEFAULT_SETTINGS.mail.defaultTemplate,
                // 邮件模板配置（新结构 + 兼容旧结构）
                mail_template_configs: JSON.stringify(mailTemplateConfigs.value),
                mail_template_title_suffix: mailTemplate.value.titleSuffix || getDefaultMailTemplateConfig().titleSuffix,
                mail_template_subtitle: mailTemplate.value.subtitle || getDefaultMailTemplateConfig().subtitle,
                mail_template_banner_text: mailTemplate.value.bannerText || getDefaultMailTemplateConfig().bannerText,
                // 邮件签名配置
                mail_signature_enabled: String(mailSignature.value.enabled !== false),
                mail_signature_display_name: mailSignature.value.displayName || '',
                mail_signature_real_name: mailSignature.value.realName || '',
                mail_signature_job_title: mailSignature.value.jobTitle || '',
                mail_signature_mobile: mailSignature.value.mobile || '',
                mail_signature_fax: mailSignature.value.fax || '',
                mail_signature_website: mailSignature.value.website || '',
                mail_signature_company: mailSignature.value.company || '',
                mail_signature_address: mailSignature.value.address || ''
            }

            await saveToStorage(STORAGE_KEY, cleanData)
            console.log(`[Settings] ✅ 持久化成功: ${projects.value.length} 个项目, ${workTypes.value.length} 个工作类型`)
        } catch (error) {
            console.error('[Settings] ❌ 持久化失败:', error)
            toast.error(`保存设置失败: ${error.message}`)
            throw error
        }
    }

    // 应用主题
    const applyTheme = (themeName) => {
        if (themeName === 'dark') {
            document.body.classList.add('dark-theme')
        } else {
            document.body.classList.remove('dark-theme')
        }
    }

    // 切换主题
    const toggleTheme = async () => {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
        applyTheme(theme.value)
        await persist()
    }

    // 设置主题
    const setTheme = async (themeName) => {
        theme.value = themeName
        applyTheme(themeName)
        await persist()
    }

    // 添加项目
    const addProject = async (project) => {
        projects.value.push({
            id: Date.now().toString(),
            name: project.name,
            keywords: project.keywords || []
        })
        await persist()
    }

    // 更新项目
    const updateProject = async (id, data) => {
        const index = projects.value.findIndex(p => p.id === id)
        if (index !== -1) {
            projects.value[index] = { ...projects.value[index], ...data }
            await persist()
        }
    }

    // 批量覆盖项目（用于设置页模块化编辑保存）
    const setProjects = async (projectList) => {
        projects.value = normalizeSettingItems(projectList)
        await persist()
    }

    // 删除项目
    const deleteProject = async (id) => {
        const index = projects.value.findIndex(p => p.id === id)
        if (index !== -1) {
            projects.value.splice(index, 1)
            await persist()
        }
    }

    // 添加工作类型
    const addWorkType = async (workType) => {
        workTypes.value.push({
            id: Date.now().toString(),
            name: workType.name,
            keywords: workType.keywords || []
        })
        await persist()
    }

    // 更新工作类型
    const updateWorkType = async (id, data) => {
        const index = workTypes.value.findIndex(t => t.id === id)
        if (index !== -1) {
            workTypes.value[index] = { ...workTypes.value[index], ...data }
            await persist()
        }
    }

    // 批量覆盖工作类型（用于设置页模块化编辑保存）
    const setWorkTypes = async (workTypeList) => {
        workTypes.value = normalizeSettingItems(workTypeList)
        await persist()
    }

    // 批量覆盖工作状态
    const setRecordStatuses = async (statusList) => {
        recordStatuses.value = normalizeRecordStatusItems(statusList)
        await persist()
    }

    // 删除工作类型
    const deleteWorkType = async (id) => {
        const index = workTypes.value.findIndex(t => t.id === id)
        if (index !== -1) {
            workTypes.value.splice(index, 1)
            await persist()
        }
    }

    // 更新钉钉配置
    const updateDingtalk = async (config) => {
        dingtalk.value = { ...dingtalk.value, ...config }
        await persist()
    }

    // 更新企业邮箱配置
    const updateMail = async (config) => {
        mail.value = { ...mail.value, ...config }
        await persist()
    }

    // 更新邮件模板配置
    const updateMailTemplate = async (config) => {
        const templateKey = config.templateKey || mail.value.defaultTemplate || DEFAULT_SETTINGS.mail.defaultTemplate
        const nextConfig = { ...config }
        delete nextConfig.templateKey

        mailTemplateConfigs.value = {
            ...mailTemplateConfigs.value,
            [templateKey]: {
                ...getDefaultMailTemplateConfig(templateKey),
                ...(mailTemplateConfigs.value[templateKey] || {}),
                ...nextConfig
            }
        }
        await persist()
    }

    // 更新邮件签名配置
    const updateMailSignature = async (config) => {
        mailSignature.value = { ...mailSignature.value, ...config }
        await persist()
    }

    // 重置为默认设置
    const resetToDefault = async () => {
        projects.value = [...DEFAULT_SETTINGS.projects]
        workTypes.value = [...DEFAULT_SETTINGS.workTypes]
        recordStatuses.value = [...DEFAULT_SETTINGS.recordStatuses]
        theme.value = DEFAULT_SETTINGS.theme
        dingtalk.value = { ...DEFAULT_SETTINGS.dingtalk }
        mail.value = { ...DEFAULT_SETTINGS.mail }
        mailTemplateConfigs.value = cloneMailTemplateConfigs(DEFAULT_SETTINGS.mailTemplateConfigs)
        mailSignature.value = { ...DEFAULT_SETTINGS.mailSignature }
        applyTheme(theme.value)
        await persist()
    }

    // ============ 定时任务相关方法 ============

    // 获取定时任务列表
    const fetchScheduledTasks = async () => {
        try {
            const response = await fetch(`${API_BASE}/scheduled-tasks`)
            const result = await response.json()
            if (result.success) {
                scheduledTasks.value = result.data
                return result.data
            }
            return []
        } catch (error) {
            console.error('[Settings] 获取定时任务失败:', error)
            return []
        }
    }

    // 更新定时任务状态
    const updateScheduledTask = async (id, enabled) => {
        try {
            const response = await fetch(`${API_BASE}/scheduled-tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            })

            const result = await response.json()
            if (result.success) {
                // 重新获取任务列表
                await fetchScheduledTasks()
                return true
            }
            return false
        } catch (error) {
            console.error('[Settings] 更新定时任务失败:', error)
            return false
        }
    }

    // 保存定时任务（新增或更新）
    const saveScheduledTask = async (task) => {
        try {
            const isEdit = !!task.id
            const url = isEdit
                ? `${API_BASE}/scheduled-tasks/${task.id}`
                : `${API_BASE}/scheduled-tasks`

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: task.name,
                    type: task.type,
                    hour: task.hour,
                    minute: task.minute,
                    dayOfWeek: task.dayOfWeek,
                    enabled: false
                })
            })

            const result = await response.json()
            if (result.success) {
                await fetchScheduledTasks()
                return true
            }
            return false
        } catch (error) {
            console.error('[Settings] 保存定时任务失败:', error)
            return false
        }
    }

    // 删除定时任务
    const deleteScheduledTask = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/scheduled-tasks/${id}`, {
                method: 'DELETE'
            })

            const result = await response.json()
            if (result.success) {
                await fetchScheduledTasks()
                return true
            }
            return false
        } catch (error) {
            console.error('[Settings] 删除定时任务失败:', error)
            return false
        }
    }

    return {
        // 状态
        projects,
        workTypes,
        recordStatuses,
        theme,
        dingtalk,
        mail,
        mailTemplateConfigs,
        mailTemplate,
        mailSignature,
        scheduledTasks,
        // 计算属性
        projectNames,
        workTypeNames,
        recordStatusNames,
        // 方法
        init,
        toggleTheme,
        setTheme,
        addProject,
        updateProject,
        setProjects,
        deleteProject,
        addWorkType,
        updateWorkType,
        setWorkTypes,
        deleteWorkType,
        setRecordStatuses,
        updateDingtalk,
        updateMail,
        updateMailTemplate,
        updateMailSignature,
        resetToDefault,
        fetchScheduledTasks,
        updateScheduledTask,
        saveScheduledTask,
        deleteScheduledTask
    }
})
