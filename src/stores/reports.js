// ========================================
// 智能周报助手 - 周报状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeekStart, getWorkMonthWeekLabel } from '../utils/date'
import { useToastStore } from './toast'

// API 基础 URL（支持环境变量）
const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const useReportsStore = defineStore('reports', () => {
    // ============ 状态 ============
    const reports = ref([])
    const deletedReports = ref([])     // 已删除的周报（用于回收站）
    const currentPlans = ref([])       // 下周计划（从独立的 plans 表加载）
    const currentReflections = ref({   // 得与失
        gains: '',
        losses: ''
    })

    // ============ 初始化 ============
    const init = async () => {
        const toast = useToastStore()
        try {
            // 1. 从数据库加载历史周报和本周总结
            const reportsResponse = await fetch(`${API_BASE}/reports`)
            const reportsResult = await reportsResponse.json()

            if (reportsResult.success) {
                reports.value = reportsResult.data.reports || []
                currentReflections.value = reportsResult.data.currentReflections || { gains: '', losses: '' }
                console.log(`[Reports] 从数据库加载了 ${reports.value.length} 条周报`)
            }

            // 2. 从独立的 plans 表加载下周计划
            const plansResponse = await fetch(`${API_BASE}/plans`)
            const plansResult = await plansResponse.json()

            if (plansResult.success) {
                currentPlans.value = plansResult.data || []
                console.log(`[Reports] 从 plans 表加载了 ${currentPlans.value.length} 条计划`)
            }

            console.log('[Reports] ✅ 数据初始化完成')
        } catch (error) {
            console.error('[Reports] 从数据库加载失败:', error)
            toast.error(`加载数据失败: ${error.message}`)
            throw error
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

    // 待处理的计划（未转换）
    const pendingPlans = computed(() => {
        return currentPlans.value.filter(p => p.status === 'pending')
    })

    // ============ 方法 ============

    // 保存本周总结到数据库（不再保存计划，计划通过独立 API 管理）
    const persistReflections = async () => {
        const toast = useToastStore()
        const cleanReflections = JSON.parse(JSON.stringify(currentReflections.value))

        try {
            const response = await fetch(`${API_BASE}/current-state`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentReflections: cleanReflections })
            })
            const result = await response.json()

            if (result.success) {
                console.log('[Reports] ✅ 本周总结保存成功')
            } else {
                console.error('[Reports] ❌ 保存本周总结失败:', result.error)
                toast.error(`保存失败: ${result.error || '未知错误'}`)
                throw new Error(result.error || '保存失败')
            }
        } catch (error) {
            console.error('[Reports] ❌ 保存本周总结失败:', error)
            toast.error(`保存失败: ${error.message}`)
            throw error
        }
    }

    // 保存周报（调用后端 API 保存到数据库）
    const saveReport = async (reportData) => {
        const toast = useToastStore()
        const now = new Date()
        const weekStart = getWeekStart(now).toISOString()
        // 计算周结束日期（周日）
        const weekEndDate = new Date(getWeekStart(now))
        weekEndDate.setDate(weekEndDate.getDate() + 6)
        const weekEnd = weekEndDate.toISOString()

        // 检查是否已存在本周周报
        const existingIndex = reports.value.findIndex(r => r.weekStart === weekStart)

        const report = {
            id: existingIndex !== -1 ? reports.value[existingIndex].id : Date.now().toString(),
            weekStart,
            weekEnd,
            weekLabel: getWorkMonthWeekLabel(now),
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

        try {
            // 调用后端 API 保存周报到数据库
            const response = await fetch(`${API_BASE}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            })
            const result = await response.json()

            if (!result.success) {
                toast.error(`保存周报失败: ${result.error}`)
                throw new Error(result.error)
            }

            console.log('[Reports] ✅ 周报已保存到数据库:', result.data.id)

            // 更新本地状态
            if (existingIndex !== -1) {
                reports.value[existingIndex] = report
            } else {
                reports.value.unshift(report)
            }

            // 清空当前的本周总结（计划数据保留在 plans 表中，不受影响）
            currentReflections.value = { gains: '', losses: '' }
            await persistReflections()

            return report
        } catch (error) {
            console.error('[Reports] ❌ 保存周报失败:', error)
            toast.error(`保存周报失败: ${error.message}`)
            throw error
        }
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
                const restoredReport = result.data?.report
                let isCurrentWeek = false

                if (restoredReport) {
                    const currentWeekStart = getWeekStart(new Date()).toISOString()
                    isCurrentWeek = restoredReport.weekStart === currentWeekStart

                    if (isCurrentWeek) {
                        // 恢复的是本周周报：恢复本周总结
                        currentReflections.value = restoredReport.reflections || { gains: '', losses: '' }
                        console.log('[Reports] 恢复本周周报的总结')
                    }
                }

                await init()
                return { success: true, isCurrentWeek }
            }
            return { success: false, isCurrentWeek: false }
        } catch (error) {
            console.error('[Reports] 恢复周报失败:', error)
            return { success: false, isCurrentWeek: false }
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

    // ============ 计划管理方法（调用独立的 /api/plans 接口）============

    // 添加计划项
    const addPlan = async (plan) => {
        const toast = useToastStore()
        try {
            const response = await fetch(`${API_BASE}/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: plan.content,
                    project: plan.project || null,
                    workType: plan.workType || null
                })
            })
            const result = await response.json()

            if (result.success) {
                currentPlans.value.push(result.data)
                console.log(`[Reports] 添加计划成功: ${result.data.id}`)
                return result.data
            } else {
                toast.error(`添加计划失败: ${result.error}`)
                throw new Error(result.error)
            }
        } catch (error) {
            console.error('[Reports] 添加计划失败:', error)
            toast.error(`添加计划失败: ${error.message}`)
            throw error
        }
    }

    // 删除计划项（软删除）
    const removePlan = async (id) => {
        const toast = useToastStore()
        try {
            const response = await fetch(`${API_BASE}/plans/${id}`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                const index = currentPlans.value.findIndex(p => p.id === id)
                if (index !== -1) {
                    currentPlans.value.splice(index, 1)
                }
                console.log(`[Reports] 删除计划成功: ${id}`)
                return true
            } else {
                toast.error(`删除计划失败: ${result.error}`)
                return false
            }
        } catch (error) {
            console.error('[Reports] 删除计划失败:', error)
            toast.error(`删除计划失败: ${error.message}`)
            return false
        }
    }

    // 更新计划项
    const updatePlan = async (id, updates) => {
        const toast = useToastStore()
        try {
            const response = await fetch(`${API_BASE}/plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            const result = await response.json()

            if (result.success) {
                const index = currentPlans.value.findIndex(p => p.id === id)
                if (index !== -1) {
                    currentPlans.value[index] = { ...currentPlans.value[index], ...updates }
                }
                console.log(`[Reports] 更新计划成功: ${id}`)
                return true
            } else {
                toast.error(`更新计划失败: ${result.error}`)
                return false
            }
        } catch (error) {
            console.error('[Reports] 更新计划失败:', error)
            toast.error(`更新计划失败: ${error.message}`)
            return false
        }
    }

    // 批量更新计划（逐个调用 API 更新）
    const updatePlans = async (plans) => {
        // 先更新内存状态
        currentPlans.value = plans

        // 逐个调用 API 更新
        for (const plan of plans) {
            try {
                await fetch(`${API_BASE}/plans/${plan.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: plan.content,
                        project: plan.project,
                        workType: plan.workType
                    })
                })
            } catch (error) {
                console.error('[Reports] 更新计划失败:', error)
            }
        }
    }

    // 追加计划项（用于"移到下周计划"功能）
    const appendPlans = async (plans) => {
        if (!Array.isArray(plans) || plans.length === 0) return

        const toast = useToastStore()
        const addedPlans = []

        for (const plan of plans) {
            try {
                const response = await fetch(`${API_BASE}/plans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: plan.content,
                        project: plan.project || null,
                        workType: plan.workType || null
                    })
                })
                const result = await response.json()

                if (result.success) {
                    addedPlans.push(result.data)
                    currentPlans.value.push(result.data)
                }
            } catch (error) {
                console.error('[Reports] 追加计划失败:', error)
            }
        }

        if (addedPlans.length > 0) {
            console.log(`[Reports] 追加了 ${addedPlans.length} 条计划`)
        } else {
            toast.error('追加计划失败')
        }

        return addedPlans
    }

    // 将计划转换为工作记录
    const convertPlan = async (id) => {
        const toast = useToastStore()
        try {
            const response = await fetch(`${API_BASE}/plans/${id}/convert`, {
                method: 'POST'
            })
            const result = await response.json()

            if (result.success) {
                // 更新本地计划状态
                const index = currentPlans.value.findIndex(p => p.id === id)
                if (index !== -1) {
                    currentPlans.value[index].status = 'converted'
                    currentPlans.value[index].convertedRecordId = result.data.recordId
                }
                console.log(`[Reports] 计划 ${id} 已转换为工作记录 ${result.data.recordId}`)
                return result.data
            } else {
                toast.error(`转换计划失败: ${result.error}`)
                return null
            }
        } catch (error) {
            console.error('[Reports] 转换计划失败:', error)
            toast.error(`转换计划失败: ${error.message}`)
            return null
        }
    }

    // 批量转换计划为工作记录
    const batchConvertPlans = async (planIds) => {
        const toast = useToastStore()
        try {
            const response = await fetch(`${API_BASE}/plans/batch-convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planIds })
            })
            const result = await response.json()

            if (result.success) {
                // 更新本地状态
                for (const record of result.records) {
                    const index = currentPlans.value.findIndex(p => p.id === record.planId)
                    if (index !== -1) {
                        currentPlans.value[index].status = 'converted'
                        currentPlans.value[index].convertedRecordId = record.recordId
                    }
                }
                console.log(`[Reports] 批量转换了 ${result.convertedCount} 条计划`)
                return result
            } else {
                toast.error(`批量转换失败: ${result.error}`)
                return null
            }
        } catch (error) {
            console.error('[Reports] 批量转换计划失败:', error)
            toast.error(`批量转换失败: ${error.message}`)
            return null
        }
    }

    // ============ 本周总结管理 ============

    // 更新得与失
    const updateReflections = async (reflections) => {
        currentReflections.value = { ...currentReflections.value, ...reflections }
        await persistReflections()
    }

    // ============ 周报查询方法 ============

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
        for (const id of ids) {
            await deleteReport(id)
        }
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
        for (const report of [...reports.value]) {
            await deleteReport(report.id)
        }
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
        pendingPlans,
        // 方法
        init,
        saveReport,
        getReport,
        deleteReport,
        fetchDeletedReports,
        restoreReport,
        permanentDeleteReport,
        // 计划管理
        addPlan,
        removePlan,
        updatePlan,
        updatePlans,
        appendPlans,
        convertPlan,
        batchConvertPlans,
        // 本周总结
        updateReflections,
        // 周报查询
        searchReports,
        getAllReports,
        batchDelete,
        deleteOlderThan,
        clearAll,
        getCurrentWeekArchivedReport,
        isCurrentWeekReport
    }
})
