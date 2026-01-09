// ========================================
// Records Store 测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecordsStore } from '@/stores/records'

// Mock database functions
vi.mock('@/utils/database', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

describe('useRecordsStore', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia())
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

  describe('deleteRecord', () => {
    it('应该成功删除指定记录', async () => {
      const store = useRecordsStore()

      const result = await store.addRecord({
        content: '要删除的记录'
      })

      const deleted = await store.deleteRecord(result.data.id)

      expect(deleted).toBe(true)
      expect(store.records.length).toBe(0)
    })

    it('删除不存在的记录应返回 false', async () => {
      const store = useRecordsStore()

      const deleted = await store.deleteRecord('non-existent-id')

      expect(deleted).toBe(false)
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
  })

  describe('currentWeekRecords', () => {
    it('应该只返回本周的记录', async () => {
      const store = useRecordsStore()

      const today = new Date('2026-01-08') // 周三
      const weekStart = new Date('2026-01-05') // 本周一
      const weekEnd = new Date('2026-01-11') // 本周日

      // 添加本周记录
      await store.addRecord({
        content: '本周记录',
        createdAt: '2026-01-08T10:00:00'
      })

      // 添加上周记录
      await store.addRecord({
        content: '上周记录',
        createdAt: '2026-01-01T10:00:00'
      })

      const currentWeek = store.currentWeekRecords

      expect(currentWeek.length).toBe(1)
      expect(currentWeek[0].content).toBe('本周记录')
    })
  })
})
