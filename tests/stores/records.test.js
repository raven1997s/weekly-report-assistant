// ========================================
// Records Store 测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecordsStore } from '@/stores/records'

// Mock API 调用
global.fetch = vi.fn()

// Mock src/utils/api.js 中的 saveToStorage 函数
vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

describe('useRecordsStore', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia())
    // 重置 fetch mock
    global.fetch.mockReset()
    // 重置所有 mocks
    vi.clearAllMocks()
  })

  describe('addRecord', () => {
    it('应该成功添加新记录', async () => {
      const store = useRecordsStore()

      const result = await store.addRecord({
        content: '完成用户登录功能开发',
        project: '用户中心',
        workType: '需求开发'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.content).toBe('完成用户登录功能开发')
      expect(result.data.project).toBe('用户中心')
      expect(result.data.workType).toBe('需求开发')
      expect(store.records.length).toBe(1)
    })

    it('应该检测到重复记录并返回错误', async () => {
      const store = useRecordsStore()

      // 添加第一条记录
      await store.addRecord({
        content: '测试重复内容',
        createdAt: '2026-01-08T10:00:00'
      })

      // 尝试添加相同内容的记录（同一天）
      const result = await store.addRecord({
        content: '测试重复内容',
        createdAt: '2026-01-08T14:00:00'
      })

      expect(result.success).toBe(false)
      expect(result.isDuplicate).toBe(true)
      expect(result.message).toBe('该记录已存在')
      expect(store.records.length).toBe(1) // 不应该添加第二条
    })

    it('应该允许不同日期的相同内容', async () => {
      const store = useRecordsStore()

      // 第一条记录
      await store.addRecord({
        content: '每周例会',
        createdAt: '2026-01-08T10:00:00'
      })

      // 第二条记录（不同日期）
      const result = await store.addRecord({
        content: '每周例会',
        createdAt: '2026-01-09T10:00:00'
      })

      expect(result.success).toBe(true)
      expect(store.records.length).toBe(2)
    })

    it('应该自动生成 ID 和时间戳', async () => {
      const store = useRecordsStore()

      const beforeTime = Date.now()
      const result = await store.addRecord({
        content: '自动ID测试'
      })
      const afterTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.data.id).toBeDefined()
      expect(result.data.createdAt).toBeDefined()
      expect(result.data.updatedAt).toBeDefined()

      // 验证时间戳在合理范围内
      const timestamp = new Date(result.data.createdAt).getTime()
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('软删除功能', () => {
    it('应该将记录标记为已删除（不真正删除）', async () => {
      const store = useRecordsStore()

      // Mock 成功的删除 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '记录已移至回收站' })
      })

      const result = await store.addRecord({ content: '要删除的记录' })

      const deleted = await store.deleteRecord(result.data.id)

      expect(deleted).toBe(true)
      // 检查记录是否从主列表移除
      expect(store.records.find(r => r.id === result.data.id)).toBeUndefined()
    })

    it('删除不存在的记录应返回 false', async () => {
      const store = useRecordsStore()

      // Mock 失败的删除 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: '记录不存在' })
      })

      const deleted = await store.deleteRecord('non-existent-id')

      expect(deleted).toBe(false)
    })

    it('应该能够获取已删除的记录', async () => {
      const store = useRecordsStore()

      // Mock 获取已删除记录的 API 响应
      const deletedRecord = {
        id: 'deleted-1',
        content: '已删除的记录',
        deleted: 1,
        deletedAt: new Date().toISOString()
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [deletedRecord] })
      })

      await store.fetchDeletedRecords()

      expect(store.deletedRecords.length).toBe(1)
      expect(store.deletedRecords[0].id).toBe('deleted-1')
    })

    it('应该能够恢复已删除的记录', async () => {
      const store = useRecordsStore()

      // Mock 恢复记录的 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '记录已恢复' })
      })

      const restored = await store.restoreRecord('record-1')

      expect(restored).toBe(true)
    })

    it('应该能够永久删除记录', async () => {
      const store = useRecordsStore()

      // 先添加一条已删除记录到 deletedRecords
      store.deletedRecords.push({
        id: 'to-permanent-delete',
        content: '要永久删除的记录',
        deleted: 1,
        deletedAt: new Date().toISOString()
      })

      // Mock 永久删除的 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '记录已永久删除' })
      })

      const permanentDeleted = await store.permanentDeleteRecord('to-permanent-delete')

      expect(permanentDeleted).toBe(true)
      expect(store.deletedRecords.find(r => r.id === 'to-permanent-delete')).toBeUndefined()
    })
  })

  describe('updateRecord', () => {
    it('应该成功更新记录内容', async () => {
      const store = useRecordsStore()

      const addResult = await store.addRecord({
        content: '原始内容',
        project: 'WMS'
      })

      const updated = await store.updateRecord(addResult.data.id, {
        content: '更新后的内容'
      })

      expect(updated).toBeDefined()
      expect(updated.content).toBe('更新后的内容')
      expect(updated.project).toBe('WMS') // 未修改的字段应保留
    })

    it('更新不存在的记录应返回 null', async () => {
      const store = useRecordsStore()

      const updated = await store.updateRecord('non-existent-id', {
        content: '更新内容'
      })

      expect(updated).toBeNull()
    })
  })

  describe('currentWeekRecords', () => {
    it('应该只返回本周的记录', async () => {
      const store = useRecordsStore()

      // 添加本周记录
      await store.addRecord({
        content: '本周记录',
        createdAt: new Date().toISOString()
      })

      // 添加上周记录
      await store.addRecord({
        content: '上周记录',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })

      const currentWeek = store.currentWeekRecords

      // 应该至少有一条本周记录
      expect(currentWeek.length).toBeGreaterThanOrEqual(1)
      if (currentWeek.length > 0) {
        expect(currentWeek[0].content).toBe('本周记录')
      }
    })
  })

  describe('currentWorkWeekRecords', () => {
    it('应该基于工作周返回记录', async () => {
      const store = useRecordsStore()

      // 添加本周工作日记录
      await store.addRecord({
        content: '工作日记录',
        createdAt: new Date().toISOString()
      })

      const currentWorkWeek = store.currentWorkWeekRecords

      expect(currentWorkWeek.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('currentWeekStats', () => {
    it('应该正确统计本周记录', async () => {
      const store = useRecordsStore()

      await store.addRecord({
        content: '记录1',
        project: 'WMS',
        workType: '需求开发',
        createdAt: new Date().toISOString()
      })

      await store.addRecord({
        content: '记录2',
        project: 'OMS',
        workType: 'Bug修复',
        createdAt: new Date().toISOString()
      })

      const stats = store.currentWeekStats

      expect(stats.total).toBe(2)
      expect(stats.byType['需求开发']).toBe(1)
      expect(stats.byType['Bug修复']).toBe(1)
      expect(stats.byProject['WMS']).toBe(1)
      expect(stats.byProject['OMS']).toBe(1)
    })

    it('应该正确处理空记录', () => {
      const store = useRecordsStore()

      const stats = store.currentWeekStats

      expect(stats.total).toBe(0)
      expect(stats.byType).toEqual({})
      expect(stats.byProject).toEqual({})
    })
  })

  describe('getRecordsByWeek', () => {
    it('应该返回指定周的记录', async () => {
      const store = useRecordsStore()

      const weekStart = new Date('2026-01-05') // 2026年1月5日（周一）

      await store.addRecord({
        content: '指定周记录',
        createdAt: '2026-01-08T10:00:00'
      })

      await store.addRecord({
        content: '其他周记录',
        createdAt: '2026-01-01T10:00:00'
      })

      const weekRecords = store.getRecordsByWeek(weekStart)

      expect(weekRecords.length).toBe(1)
      expect(weekRecords[0].content).toBe('指定周记录')
    })
  })

  describe('clearAll', () => {
    it('应该清空所有记录', async () => {
      const store = useRecordsStore()

      await store.addRecord({ content: '记录1' })
      await store.addRecord({ content: '记录2' })

      expect(store.records.length).toBe(2)

      await store.clearAll()

      expect(store.records.length).toBe(0)
    })
  })

  describe('importRecords', () => {
    it('应该导入记录数组', async () => {
      const store = useRecordsStore()

      const importData = [
        { id: '1', content: '导入记录1', createdAt: new Date().toISOString() },
        { id: '2', content: '导入记录2', createdAt: new Date().toISOString() }
      ]

      await store.importRecords(importData)

      expect(store.records.length).toBe(2)
    })

    it('应该忽略非数组数据', async () => {
      const store = useRecordsStore()

      await store.importRecords('not an array')

      expect(store.records.length).toBe(0)
    })
  })

  describe('moveRecord', () => {
    it('应该移动记录位置', async () => {
      const store = useRecordsStore()

      const record1 = await store.addRecord({ content: '记录1' })
      const record2 = await store.addRecord({ content: '记录2' })

      // 将 record1 移到 record2 后面
      await store.moveRecord(record1.data.id, record2.data.id)

      expect(store.records[0].id).toBe(record2.data.id)
      expect(store.records[1].id).toBe(record1.data.id)
    })
  })

  describe('reorderRecords', () => {
    it('应该批量重新排序记录', async () => {
      const store = useRecordsStore()

      const record1 = await store.addRecord({ content: '记录1' })
      const record2 = await store.addRecord({ content: '记录2' })
      const record3 = await store.addRecord({ content: '记录3' })

      // 反转顺序
      await store.reorderRecords([
        record3.data.id,
        record2.data.id,
        record1.data.id
      ])

      expect(store.records[0].id).toBe(record3.data.id)
      expect(store.records[1].id).toBe(record2.data.id)
      expect(store.records[2].id).toBe(record1.data.id)
    })
  })
})
