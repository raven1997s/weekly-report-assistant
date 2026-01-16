// ========================================
// 智能周报助手 - 周报状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeekStart, formatDate } from '../utils/date'
import { saveToStorage, loadFromStorage, saveCurrentState } from '../utils/api'

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
        // 从数据库加载历史周报和当前编辑状态
        try {
            const response = await fetch(`${API_BASE}/reports`)
            const result = await response.json()

            if (result.success) {
                reports.value = result.data.reports || []
                console.log(`[Reports] 从数据库加载了 ${reports.value.length} 条周报`)

                // 优先从数据库加载当前编辑状态
                const hasPlansFromDb = result.data.currentPlans && result.data.currentPlans.length > 0
                const hasReflectionsFromDb = result.data.currentReflections &&
                    (result.data.currentReflections.gains || result.data.currentReflections.losses)

                if (hasPlansFromDb || hasReflectionsFromDb) {
                    // 数据库有数据，直接使用
                    currentPlans.value = result.data.currentPlans || []
                    currentReflections.value = result.data.currentReflections || { gains: '', losses: '' }
                    console.log('[Reports] ✅ 从数据库加载了当前编辑状态')
                } else {
                    // 数据库无数据，尝试从 localStorage 迁移
                    const saved = await loadFromStorage(STORAGE_KEY)
                    if (saved && (saved.currentPlans?.length > 0 || saved.currentReflections?.gains || saved.currentReflections?.losses)) {
                        console.log('[Reports] 🔄 数据库无数据，从 localStorage 迁移编辑状态')
                        currentPlans.value = saved.currentPlans || []
                        currentReflections.value = saved.currentReflections || { gains: '', losses: '' }
                        // 迁移后自动保存到数据库（通过 persist）
                        await persist()
                        // 清除 localStorage 中的旧数据
                        saved.currentPlans = []
                        saved.currentReflections = { gains: '', losses: '' }
                        await saveToStorage(STORAGE_KEY, saved)
                        console.log('[Reports] ✅ 迁移完成，已清除 localStorage 旧数据')
                    }
                }
            }
        } catch (error) {
            console.error('[Reports] 从数据库加载失败，降级到 localStorage:', error)
            // 降级：从 localStorage 加载所有数据
            const saved = await loadFromStorage(STORAGE_KEY)
            if (saved) {
                reports.value = saved.reports || []
                currentPlans.value = saved.currentPlans || []
                currentReflections.value = saved.currentReflections || { gains: '', losses: '' }
            }
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
        const cleanPlans = JSON.parse(JSON.stringify(currentPlans.value))
        const cleanReflections = JSON.parse(JSON.stringify(currentReflections.value))

        // 尝试保存到数据库
        const result = await saveCurrentState(cleanPlans, cleanReflections)

        if (result.success) {
            // 保存成功，仍需保存 reports 到 localStorage（作为备份）
            const cleanData = {
                reports: JSON.parse(JSON.stringify(reports.value)),
                currentPlans: cleanPlans,
                currentReflections: cleanReflections
            }
            await saveToStorage(STORAGE_KEY, cleanData)
            console.log(`[Reports] ✅ 持久化成功: ${cleanPlans.length} 条计划`)
        } else {
            // API 失败，降级到 localStorage
            console.warn('[Reports] ⚠️ API 保存失败，降级到 localStorage')
            const cleanData = {
                reports: JSON.parse(JSON.stringify(reports.value)),
                currentPlans: cleanPlans,
                currentReflections: cleanReflections
            }
            await saveToStorage(STORAGE_KEY, cleanData)
            console.log(`[Reports] ✅ 降级成功: 已保存到 localStorage`)
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
                // 获取恢复的周报数据（后端应该在响应中返回）
                const restoredReport = result.data?.report

                if (restoredReport) {
                    const currentWeekStart = getWeekStart(new Date()).toISOString()
                    const isCurrentWeek = restoredReport.weekStart === currentWeekStart

                    if (isCurrentWeek) {
                        // 恢复的是本周周报：恢复到编辑状态
                        currentPlans.value = restoredReport.plans || []
                        currentReflections.value = restoredReport.reflections || { gains: '', losses: '' }
                        console.log('[Reports] 恢复本周周报到编辑状态')
                    } else {
                        // 恢复的是非本周周报：只添加到历史列表
                        console.log('[Reports] 恢复历史周报，不影响当前编辑状态')
                    }
                }

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

    // 追加计划项（用于"移到下周计划"功能）
    const appendPlans = async (plans) => {
        if (!Array.isArray(plans) || plans.length === 0) return

        plans.forEach(plan => {
            currentPlans.value.push({
                id: plan.id,
                content: plan.content,
                project: plan.project || null,
                workType: plan.workType || null
            })
        })

        await persist()
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

    // 检查周报是否属于本周
    const isCurrentWeekReport = (weekStart) => {
        const currentWeekStart = getWeekStart(new Date()).toISOString()
        return weekStart === currentWeekStart
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
        appendPlans,
        updateReflections,
        searchReports,
        getAllReports,
        batchDelete,
        deleteOlderThan,
        clearAll,
        getCurrentWeekArchivedReport,
        isCurrentWeekReport
    }
})
