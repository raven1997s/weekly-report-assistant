// ========================================
// 智能周报助手 - 工作记录状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeekStart, getWeekEnd, formatDate } from '../utils/date'
import { saveToStorage, loadFromStorage } from '../utils/api'

// API 基础 URL（支持环境变量）
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const STORAGE_KEY = 'weekly_report_records'

export const useRecordsStore = defineStore('records', () => {
    // ============ 状态 ============
    const records = ref([])
    const deletedRecords = ref([])  // 已删除的记录（用于回收站）

    // ============ 初始化 ============
    const init = async () => {
        try {
            const saved = await loadFromStorage(STORAGE_KEY)
            console.log('[Records] 从数据库加载到数据:', saved?.length || 0, '条')
            if (saved) {
                records.value = saved
            }
        } catch (error) {
            console.error('[Records] ❌ 初始化失败:', error)
        }
    }

    // ============ 计算属性 ============

    // 本周记录
    const currentWeekRecords = computed(() => {
        const weekStart = getWeekStart(new Date())
        const weekEnd = getWeekEnd(new Date())
        return records.value.filter(record => {
            const recordDate = new Date(record.createdAt)
            return recordDate >= weekStart && recordDate <= weekEnd
        })
    })

    // 按项目分组的本周记录
    const currentWeekByProject = computed(() => {
        const grouped = {}
        currentWeekRecords.value.forEach(record => {
            const project = record.project || '其他'
            if (!grouped[project]) {
                grouped[project] = []
            }
            grouped[project].push(record)
        })
        return grouped
    })

    // 本周统计
    const currentWeekStats = computed(() => {
        const stats = {
            total: currentWeekRecords.value.length,
            byType: {},
            byProject: {}
        }

        currentWeekRecords.value.forEach(record => {
            // 按类型统计
            const type = record.workType || '其他'
            stats.byType[type] = (stats.byType[type] || 0) + 1

            // 按项目统计
            const project = record.project || '其他'
            stats.byProject[project] = (stats.byProject[project] || 0) + 1
        })

        return stats
    })

    // ============ 方法 ============

    // 持久化保存
    const persist = async () => {
        try {
            // 创建纯净的副本，去除 Vue 响应式包装
            // 否则 JSON.stringify 会包含循环引用导致错误
            const cleanData = JSON.parse(JSON.stringify(records.value))
            await saveToStorage(STORAGE_KEY, cleanData)
            console.log('[Records] ✅ 持久化成功，当前记录数:', records.value.length)
        } catch (error) {
            console.error('[Records] ❌ 持久化失败:', error)
            throw error
        }
    }

    // 添加记录
    const addRecord = async (record) => {
        console.log('[Records] 收到添加请求:', record)

        // 提前检查重复（在创建对象之前）
        const recordDate = new Date(record.createdAt || new Date()).toDateString()
        const isDuplicate = records.value.some(r => {
            const sameDay = new Date(r.createdAt).toDateString() === recordDate
            return sameDay && r.content === record.content
        })

        console.log('[Records] 重复检测结果:', isDuplicate)

        if (isDuplicate) {
            console.log('[Records] 拒绝重复记录')
            return {
                success: false,
                isDuplicate: true,
                message: '该记录已存在'
            }
        }

        const newRecord = {
            id: Date.now().toString(),
            content: String(record.content),
            project: record.project ? String(record.project) : null,
            workType: record.workType ? String(record.workType) : null,
            createdAt: record.createdAt ? String(record.createdAt) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        console.log('[Records] 创建新记录:', newRecord)

        records.value.unshift(newRecord)
        await persist()

        console.log('[Records] 持久化完成，返回成功')
        return {
            success: true,
            data: newRecord
        }
    }

    // 更新记录
    const updateRecord = async (id, data) => {
        const index = records.value.findIndex(r => r.id === id)
        if (index !== -1) {
            records.value[index] = {
                ...records.value[index],
                ...data,
                updatedAt: new Date().toISOString()
            }
            await persist()
            return records.value[index]
        }
        return null
    }

    // 删除记录（软删除，调用后端 API）
    const deleteRecord = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/records/${id}`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                // 从本地列表中移除
                const index = records.value.findIndex(r => r.id === id)
                if (index !== -1) {
                    records.value.splice(index, 1)
                }
                return true
            }
            return false
        } catch (error) {
            console.error('[Records] 删除记录失败:', error)
            return false
        }
    }

    // 获取已删除的记录
    const fetchDeletedRecords = async () => {
        try {
            const response = await fetch(`${API_BASE}/records?deleted=1`)
            const result = await response.json()

            if (result.success) {
                deletedRecords.value = result.data
                return result.data
            }
            return []
        } catch (error) {
            console.error('[Records] 获取已删除记录失败:', error)
            return []
        }
    }

    // 恢复记录
    const restoreRecord = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/records/${id}/restore`, {
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
            console.error('[Records] 恢复记录失败:', error)
            return false
        }
    }

    // 永久删除记录
    const permanentDeleteRecord = async (id) => {
        try {
            const response = await fetch(`${API_BASE}/records/${id}/permanent`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                // 从已删除列表中移除
                const index = deletedRecords.value.findIndex(r => r.id === id)
                if (index !== -1) {
                    deletedRecords.value.splice(index, 1)
                }
                return true
            }
            return false
        } catch (error) {
            console.error('[Records] 永久删除记录失败:', error)
            return false
        }
    }

    // 获取指定周的记录
    const getRecordsByWeek = (weekStart) => {
        const start = new Date(weekStart)
        const end = getWeekEnd(start)
        return records.value.filter(record => {
            const recordDate = new Date(record.createdAt)
            return recordDate >= start && recordDate <= end
        })
    }

    // 清空所有记录
    const clearAll = async () => {
        records.value = []
        await persist()
    }

    // 导入记录
    const importRecords = async (data) => {
        if (Array.isArray(data)) {
            records.value = [...records.value, ...data]
            await persist()
        }
    }

    // 移动记录位置（用于拖拽排序）
    const moveRecord = async (fromId, toId) => {
        const fromIndex = records.value.findIndex(r => r.id === fromId)
        const toIndex = records.value.findIndex(r => r.id === toId)

        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
            const [movedItem] = records.value.splice(fromIndex, 1)
            records.value.splice(toIndex, 0, movedItem)
            await persist()
        }
    }

    // 更新记录顺序（批量）
    const reorderRecords = async (recordIds) => {
        const newRecords = []
        recordIds.forEach(id => {
            const record = records.value.find(r => r.id === id)
            if (record) newRecords.push(record)
        })
        // 添加未被排序的记录（如果有）
        records.value.forEach(record => {
            if (!recordIds.includes(record.id)) {
                newRecords.push(record)
            }
        })
        records.value = newRecords
        await persist()
    }

    return {
        // 状态
        records,
        deletedRecords,
        // 计算属性
        currentWeekRecords,
        currentWeekByProject,
        currentWeekStats,
        // 方法
        init,
        addRecord,
        updateRecord,
        deleteRecord,
        fetchDeletedRecords,
        restoreRecord,
        permanentDeleteRecord,
        getRecordsByWeek,
        clearAll,
        importRecords,
        moveRecord,
        reorderRecords
    }
})
