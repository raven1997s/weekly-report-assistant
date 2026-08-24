// ========================================
// 智能周报助手 - 工作记录状态管理
// ========================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeekStart, getWeekEnd, formatDate, getWorkWeekInfo } from '../utils/date'
import { loadFromStorage } from '../utils/api'
import { useToastStore } from './toast'
import { useSettingsStore } from './settings'
import { getDefaultRecordStatus, resolveRecordStatus } from '../../shared/record-status'

// API 基础 URL（支持环境变量）
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const STORAGE_KEY = 'weekly_report_records'

export const useRecordsStore = defineStore('records', () => {
    // ============ 状态 ============
    const records = ref([])
    const deletedRecords = ref([])  // 已删除的记录（用于回收站）

    // ============ 初始化 ============
    const init = async () => {
        const toast = useToastStore()
        try {
            const saved = await loadFromStorage(STORAGE_KEY)
            console.log('[Records] 从数据库加载到数据:', saved?.length || 0, '条')
            if (saved) {
                records.value = saved.map(record => ({
                    ...record,
                    status: resolveRecordStatus(record.status)
                }))
            }
        } catch (error) {
            console.error('[Records] ❌ 初始化失败:', error)
            toast.error(`加载数据失败: ${error.message}`)
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

    // 基于工作周的本周记录
    const currentWorkWeekRecords = computed(() => {
        const workWeekInfo = getWorkWeekInfo(new Date())

        // 处理全节假日周的情况
        if (workWeekInfo.hasNoWorkdays) {
            return []
        }

        const { start, end } = workWeekInfo
        return records.value.filter(record => {
            const recordDate = new Date(record.createdAt)
            return recordDate >= start && recordDate <= end
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
            status: resolveRecordStatus(record.status || getDefaultRecordStatus(useSettingsStore().recordStatuses)),
            createdAt: record.createdAt ? String(record.createdAt) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        console.log('[Records] 创建新记录:', newRecord)

        // 直接调用 API 添加记录
        try {
            const response = await fetch(`${API_BASE}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord)
            })
            const result = await response.json()

            if (result.success) {
                // 添加到本地列表
                records.value.unshift(newRecord)
                console.log('[Records] ✅ 记录已添加到数据库')
                return {
                    success: true,
                    data: newRecord
                }
            } else {
                throw new Error(result.error || '添加记录失败')
            }
        } catch (error) {
            console.error('[Records] ❌ 添加记录失败:', error)
            return {
                success: false,
                error: error.message
            }
        }
    }

    // 更新记录
    const updateRecord = async (id, data) => {
        try {
            const response = await fetch(`${API_BASE}/records/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    updatedAt: new Date().toISOString()
                })
            })
            const result = await response.json()

            if (result.success) {
                // 更新本地列表
                const index = records.value.findIndex(r => r.id === id)
                if (index !== -1) {
                    records.value[index] = {
                        ...records.value[index],
                        ...data,
                        status: resolveRecordStatus(data.status ?? records.value[index].status),
                        updatedAt: new Date().toISOString()
                    }
                }
                return records.value[index]
            }
            return null
        } catch (error) {
            console.error('[Records] ❌ 更新记录失败:', error)
            return null
        }
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
                // 重新获取已删除的记录
                await fetchDeletedRecords()
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
                deletedRecords.value = result.data.map(record => ({
                    ...record,
                    status: resolveRecordStatus(record.status)
                }))
                return deletedRecords.value
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

    // 清空所有记录（调用 API 逐个删除）
    const clearAll = async () => {
        const toast = useToastStore()
        try {
            // 逐个调用 API 删除
            for (const record of [...records.value]) {
                await deleteRecord(record.id)
            }
            console.log('[Records] ✅ 已清空所有记录')
        } catch (error) {
            console.error('[Records] ❌ 清空记录失败:', error)
            toast.error(`清空记录失败: ${error.message}`)
        }
    }

    // 导入记录（逐个调用 API 添加到数据库）
    const importRecords = async (data) => {
        const toast = useToastStore()
        if (!Array.isArray(data) || data.length === 0) return

        let successCount = 0
        for (const record of data) {
            try {
                const result = await addRecord(record)
                if (result.success) {
                    successCount++
                }
            } catch (error) {
                console.error('[Records] 导入记录失败:', error)
            }
        }
        console.log(`[Records] ✅ 导入了 ${successCount}/${data.length} 条记录`)
        if (successCount < data.length) {
            toast.warning(`导入完成,成功 ${successCount} 条,失败 ${data.length - successCount} 条`)
        }
    }

    // 移动记录位置（用于拖拽排序，仅本地操作）
    const moveRecord = (fromId, toId) => {
        const fromIndex = records.value.findIndex(r => r.id === fromId)
        const toIndex = records.value.findIndex(r => r.id === toId)

        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
            const [movedItem] = records.value.splice(fromIndex, 1)
            records.value.splice(toIndex, 0, movedItem)
        }
    }

    // 更新记录顺序（批量，仅本地操作）
    const reorderRecords = (recordIds) => {
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
    }

    return {
        // 状态
        records,
        deletedRecords,
        // 计算属性
        currentWeekRecords,        // 保留：基于自然周（向后兼容）
        currentWorkWeekRecords,    // 新增：基于工作周
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
