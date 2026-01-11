// ========================================
// 智能周报助手 - 周报状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeekStart, formatDate } from '../utils/date'
import { saveToStorage, loadFromStorage } from '../utils/api'

// API 基础 URL（支持环境变量）
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const STORAGE_KEY = 'weekly_reports'

export const useReportsStore = defineStore('reports', () => {
    // ============ 状态 ============
    const reports = ref([])
    const deletedReports = ref([])     // 已删除的周报（用于回收站）
    const currentPlans = ref([])       // 下周计划
    const currentReflections = ref({   // 得与失
        gains: '',
        losses: ''
    })

    // ============ 初始化 ============
    const init = async () => {
        const saved = await loadFromStorage(STORAGE_KEY)
        if (saved) {
            reports.value = saved.reports || []
            currentPlans.value = saved.currentPlans || []
            currentReflections.value = saved.currentReflections || { gains: '', losses: '' }
        }
    }

    // ============ 计算属性 ============

    // 按时间倒序的周报列表
    const sortedReports = computed(() => {
        return [...reports.value].sort((a, b) =>
            new Date(b.weekStart) - new Date(a.weekStart)
        )
    })

    // 本周周报是否已生成
    const hasCurrentWeekReport = computed(() => {
        const weekStart = getWeekStart(new Date()).toISOString()
        return reports.value.some(r => r.weekStart === weekStart)
    })

    // ============ 方法 ============

    // 持久化保存
    const persist = async () => {
        // 创建纯净的副本，去除 Vue 响应式包装
        // 否则 JSON.stringify 会包含循环引用导致错误
        const cleanData = {
            reports: JSON.parse(JSON.stringify(reports.value)),
            currentPlans: JSON.parse(JSON.stringify(currentPlans.value)),
            currentReflections: JSON.parse(JSON.stringify(currentReflections.value))
        }

        // 添加日志便于调试
        const reportCount = cleanData.reports?.length || 0
        const planCount = cleanData.currentPlans?.length || 0

        await saveToStorage(STORAGE_KEY, cleanData)

        // 只在有数据时输出成功日志
        if (reportCount > 0 || planCount > 0) {
            console.log(`[Reports] ✅ 持久化成功: ${reportCount} 条周报, ${planCount} 条计划`)
        }
    }

    // 保存周报
    const saveReport = async (reportData) => {
        const weekStart = getWeekStart(new Date()).toISOString()

        // 检查是否已存在本周周报
        const existingIndex = reports.value.findIndex(r => r.weekStart === weekStart)

        const report = {
            id: existingIndex !== -1 ? reports.value[existingIndex].id : Date.now().toString(),
            weekStart,
            weekLabel: formatDate(new Date(), 'YYYY年第W周'),
            content: reportData.content,
            markdown: reportData.markdown,
            plainText: reportData.plainText || reportData.markdown || '',
            records: reportData.records || [],
            plans: reportData.plans || [],
            reflections: reportData.reflections || {},
            createdAt: existingIndex !== -1
                ? reports.value[existingIndex].createdAt
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        if (existingIndex !== -1) {
            reports.value[existingIndex] = report
        } else {
            reports.value.unshift(report)
        }

        // 清空当前编辑状态，确保显示归档数据
        currentPlans.value = []
        currentReflections.value = { gains: '', losses: '' }

        await persist()
        return report
    }

    // 获取指定周报
    const getReport = (id) => {
        return reports.value.find(r => r.id === id)
    }

    // 删除周报（软删除，调用后端 API）
    const deleteReport = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/reports/${id}`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                // 从本地列表中移除
                const index = reports.value.findIndex(r => r.id === id)
                if (index !== -1) {
                    reports.value.splice(index, 1)
                }
                await persist()
                return true
            }
            return false
        } catch (error) {
            console.error('[Reports] 删除周报失败:', error)
            return false
        }
    }

    // 获取已删除的周报
    const fetchDeletedReports = async () => {
        try {
            const response = await fetch(`${API_BASE}/reports?deleted=1`)
            const result = await response.json()

            if (result.success) {
                // API 返回 { success: true, data: { reports: [...], currentPlans: [], currentReflections: {} } }
                deletedReports.value = result.data.reports || []
                return deletedReports.value
            }
            return []
        } catch (error) {
            console.error('[Reports] 获取已删除周报失败:', error)
            return []
        }
    }

    // 恢复周报
    const restoreReport = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/reports/${id}/restore`, {
                method: 'POST'
            })
            const result = await response.json()

            if (result.success) {
                // 重新加载数据
                await init()
                return true
            }
            return false
        } catch (error) {
            console.error('[Reports] 恢复周报失败:', error)
            return false
        }
    }

    // 永久删除周报
    const permanentDeleteReport = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/reports/${id}/permanent`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                // 从已删除列表中移除
                const index = deletedReports.value.findIndex(r => r.id === id)
                if (index !== -1) {
                    deletedReports.value.splice(index, 1)
                }
                return true
            }
            return false
        } catch (error) {
            console.error('[Reports] 永久删除周报失败:', error)
            return false
        }
    }

    // 更新下周计划
    const updatePlans = async (plans) => {
        currentPlans.value = plans
        await persist()
    }

    // 添加计划项
    const addPlan = async (plan) => {
        currentPlans.value.push({
            id: Date.now().toString(),
            content: plan.content,
            project: plan.project || null,
            workType: plan.workType || null
        })
        await persist()
    }

    // 删除计划项
    const removePlan = async (id) => {
        const index = currentPlans.value.findIndex(p => p.id === id)
        if (index !== -1) {
            currentPlans.value.splice(index, 1)
            await persist()
        }
    }

    // 更新得与失
    const updateReflections = async (reflections) => {
        currentReflections.value = { ...currentReflections.value, ...reflections }
        await persist()
    }

    // 搜索周报
    const searchReports = (keyword) => {
        if (!keyword) return sortedReports.value
        const lower = keyword.toLowerCase()
        return sortedReports.value.filter(r =>
            r.markdown?.toLowerCase().includes(lower) ||
            r.weekLabel?.includes(keyword)
        )
    }

    // 获取所有周报
    const getAllReports = () => {
        return sortedReports.value
    }

    // 批量删除周报
    const batchDelete = async (ids) => {
        ids.forEach(id => {
            const index = reports.value.findIndex(r => r.id === id)
            if (index !== -1) {
                reports.value.splice(index, 1)
            }
        })
        await persist()
    }

    // 按日期删除周报
    const deleteOlderThan = async (days) => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const toDelete = []
        reports.value.forEach(report => {
            const reportDate = new Date(report.createdAt)
            if (reportDate < cutoffDate) {
                toDelete.push(report.id)
            }
        })

        return await batchDelete(toDelete)
    }

    // 清空所有周报
    const clearAll = async () => {
        reports.value = []
        await persist()
    }

    // 获取本周已归档的周报
    const getCurrentWeekArchivedReport = () => {
        const weekStart = getWeekStart(new Date()).toISOString()
        return reports.value.find(r => r.weekStart === weekStart)
    }

    return {
        // 状态
        reports,
        deletedReports,
        currentPlans,
        currentReflections,
        // 计算属性
        sortedReports,
        hasCurrentWeekReport,
        // 方法
        init,
        saveReport,
        getReport,
        deleteReport,
        fetchDeletedReports,
        restoreReport,
        permanentDeleteReport,
        updatePlans,
        addPlan,
        removePlan,
        updateReflections,
        searchReports,
        getAllReports,
        batchDelete,
        deleteOlderThan,
        clearAll,
        getCurrentWeekArchivedReport
    }
})
