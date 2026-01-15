// ========================================
// Reports Store 测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReportsStore } from '@/stores/reports'

// Mock API 调用
global.fetch = vi.fn()

// Mock src/utils/api.js 中的 saveToStorage 函数
vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve({
    reports: [],
    currentPlans: [],
    currentReflections: { gains: '', losses: '' }
  }))
}))

describe('useReportsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    global.fetch.mockReset()
    vi.clearAllMocks()
  })

  describe('init', () => {
    it('应该初始化空状态', async () => {
      const store = useReportsStore()

      await store.init()

      expect(store.reports).toEqual([])
      expect(store.currentPlans).toEqual([])
      expect(store.currentReflections).toEqual({ gains: '', losses: '' })
    })
  })

  describe('saveReport', () => {
    it('应该保存新周报', async () => {
      const store = useReportsStore()

      const reportData = {
        content: '周报内容',
        markdown: '**周报内容**',
        plainText: '周报内容',
        records: [],
        plans: [],
        reflections: { gains: '收获', losses: '不足' }
      }

      const report = await store.saveReport(reportData)

      expect(store.reports.length).toBe(1)
      expect(report.markdown).toBe('**周报内容**')
      expect(report.weekLabel).toMatch(/202\d年第\d+周/)
      // 保存后应该清空当前编辑状态
      expect(store.currentPlans).toEqual([])
      expect(store.currentReflections).toEqual({ gains: '', losses: '' })
    })

    it('应该更新已存在的周报', async () => {
      const store = useReportsStore()

      const reportData = {
        content: '原始内容',
        markdown: '**原始内容**',
        records: [],
        plans: [],
        reflections: {}
      }

      // 第一次保存
      await store.saveReport(reportData)

      // 第二次保存（更新）
      const updatedData = {
        content: '更新内容',
        markdown: '**更新内容**',
        records: [],
        plans: [],
        reflections: {}
      }

      const updated = await store.saveReport(updatedData)

      expect(store.reports.length).toBe(1) // 不应该新增
      expect(updated.markdown).toBe('**更新内容**')
    })
  })

  describe('getReport', () => {
    it('应该根据 ID 获取周报', async () => {
      const store = useReportsStore()

      const reportData = {
        content: '测试周报',
        markdown: '**测试周报**',
        records: [],
        plans: [],
        reflections: {}
      }

      const saved = await store.saveReport(reportData)
      const found = store.getReport(saved.id)

      expect(found).toBeDefined()
      expect(found.id).toBe(saved.id)
    })

    it('查找不存在的周报应返回 undefined', () => {
      const store = useReportsStore()

      const found = store.getReport('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('deleteReport', () => {
    it('应该成功删除周报', async () => {
      const store = useReportsStore()

      // Mock 成功的删除 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '周报已移至回收站' })
      })

      const reportData = {
        content: '要删除的周报',
        markdown: '**要删除的周报**',
        records: [],
        plans: [],
        reflections: {}
      }

      const saved = await store.saveReport(reportData)
      const deleted = await store.deleteReport(saved.id)

      expect(deleted).toBe(true)
      expect(store.reports.find(r => r.id === saved.id)).toBeUndefined()
    })

    it('删除失败应返回 false', async () => {
      const store = useReportsStore()

      // Mock 失败的删除 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: '删除失败' })
      })

      const deleted = await store.deleteReport('some-id')

      expect(deleted).toBe(false)
    })
  })

  describe('软删除功能', () => {
    it('应该能够获取已删除的周报', async () => {
      const store = useReportsStore()

      // Mock 获取已删除周报的 API 响应
      const deletedReport = {
        id: 'deleted-1',
        weekLabel: '2026年第1周',
        markdown: '**已删除的周报**',
        deleted: 1,
        deletedAt: new Date().toISOString()
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { reports: [deletedReport], currentPlans: [], currentReflections: {} } })
      })

      await store.fetchDeletedReports()

      expect(store.deletedReports.length).toBe(1)
      expect(store.deletedReports[0].id).toBe('deleted-1')
    })

    it('应该能够恢复已删除的周报', async () => {
      const store = useReportsStore()

      // Mock 恢复周报的 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '周报已恢复' })
      })

      const restored = await store.restoreReport('report-1')

      expect(restored).toBe(true)
    })

    it('应该能够永久删除周报', async () => {
      const store = useReportsStore()

      // 先添加一条已删除周报到 deletedReports
      store.deletedReports.push({
        id: 'to-permanent-delete',
        weekLabel: '2026年第1周',
        deleted: 1,
        deletedAt: new Date().toISOString()
      })

      // Mock 永久删除的 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '周报已永久删除' })
      })

      const permanentDeleted = await store.permanentDeleteReport('to-permanent-delete')

      expect(permanentDeleted).toBe(true)
      expect(store.deletedReports.find(r => r.id === 'to-permanent-delete')).toBeUndefined()
    })
  })

  describe('updatePlans', () => {
    it('应该更新下周计划', async () => {
      const store = useReportsStore()

      const plans = [
        { id: '1', content: '计划1', project: 'WMS', workType: '需求开发' },
        { id: '2', content: '计划2', project: 'OMS', workType: 'Bug修复' }
      ]

      await store.updatePlans(plans)

      expect(store.currentPlans).toEqual(plans)
    })
  })

  describe('addPlan', () => {
    it('应该添加新计划', async () => {
      const store = useReportsStore()

      const plan = {
        content: '完成WMS优化',
        project: 'WMS',
        workType: '优化'
      }

      await store.addPlan(plan)

      expect(store.currentPlans.length).toBe(1)
      expect(store.currentPlans[0].content).toBe('完成WMS优化')
      expect(store.currentPlans[0].project).toBe('WMS')
      expect(store.currentPlans[0].workType).toBe('优化')
    })
  })

  describe('removePlan', () => {
    it('应该删除计划项', async () => {
      const store = useReportsStore()

      const plan = {
        content: '要删除的计划'
      }

      await store.addPlan(plan)
      expect(store.currentPlans.length).toBe(1)

      await store.removePlan(store.currentPlans[0].id)

      expect(store.currentPlans.length).toBe(0)
    })
  })

  describe('appendPlans', () => {
    it('应该追加计划项', async () => {
      const store = useReportsStore()

      const plans = [
        { id: '1', content: '计划1', project: 'WMS', workType: '需求开发' },
        { id: '2', content: '计划2', project: 'OMS', workType: 'Bug修复' }
      ]

      await store.appendPlans(plans)

      expect(store.currentPlans.length).toBe(2)
      expect(store.currentPlans[0].content).toBe('计划1')
      expect(store.currentPlans[1].content).toBe('计划2')
    })

    it('应该忽略非数组输入', async () => {
      const store = useReportsStore()

      await store.appendPlans('not an array')

      expect(store.currentPlans.length).toBe(0)
    })

    it('应该保留项目和工作类型信息', async () => {
      const store = useReportsStore()

      const plans = [
        { id: '1', content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
      ]

      await store.appendPlans(plans)

      expect(store.currentPlans[0].project).toBe('WMS')
      expect(store.currentPlans[0].workType).toBe('需求开发')
    })
  })

  describe('updateReflections', () => {
    it('应该更新得与失', async () => {
      const store = useReportsStore()

      const reflections = {
        gains: '完成了重要功能',
        losses: '时间管理需要改进'
      }

      await store.updateReflections(reflections)

      expect(store.currentReflections).toEqual(reflections)
    })

    it('应该合并更新而不是替换', async () => {
      const store = useReportsStore()

      // 第一次更新
      await store.updateReflections({ gains: '收获1' })

      // 第二次更新（只更新 losses）
      await store.updateReflections({ losses: '不足1' })

      expect(store.currentReflections.gains).toBe('收获1')
      expect(store.currentReflections.losses).toBe('不足1')
    })
  })

  describe('searchReports', () => {
    it('应该根据关键词搜索周报', async () => {
      const store = useReportsStore()

      // 添加测试周报（模拟不同周的数据，因为同一周会更新）
      // 直接操作 reports 数组添加不同周的数据
      const week1 = new Date('2026-01-05') // 第一周
      const week2 = new Date('2026-01-12') // 第二周

      store.reports.push(
        {
          id: '1',
          weekStart: week1.toISOString(),
          weekLabel: '2026年第1周',
          content: 'WMS项目开发',
          markdown: '**WMS项目开发**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week1.toISOString(),
          updatedAt: week1.toISOString()
        },
        {
          id: '2',
          weekStart: week2.toISOString(),
          weekLabel: '2026年第2周',
          content: 'OMS项目开发',
          markdown: '**OMS项目开发**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week2.toISOString(),
          updatedAt: week2.toISOString()
        }
      )

      const results = store.searchReports('WMS')

      expect(results.length).toBe(1)
      expect(results[0].markdown).toContain('WMS')
    })

    it('应该支持周标签搜索', async () => {
      const store = useReportsStore()

      await store.saveReport({
        content: '测试',
        markdown: '**测试**',
        records: [],
        plans: [],
        reflections: {}
      })

      const results = store.searchReports('2026')

      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0].weekLabel).toContain('2026')
    })

    it('空关键词应返回所有周报', async () => {
      const store = useReportsStore()

      await store.saveReport({
        content: '测试',
        markdown: '**测试**',
        records: [],
        plans: [],
        reflections: {}
      })

      const results = store.searchReports('')

      expect(results.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getAllReports', () => {
    it('应该返回按时间倒序的周报列表', async () => {
      const store = useReportsStore()

      // 直接操作 reports 数组添加不同周的数据
      const week1 = new Date('2026-01-05')
      const week2 = new Date('2026-01-12')

      store.reports.push(
        {
          id: '1',
          weekStart: week1.toISOString(),
          weekLabel: '2026年第1周',
          content: '第一周',
          markdown: '**第一周**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week1.toISOString(),
          updatedAt: week1.toISOString()
        },
        {
          id: '2',
          weekStart: week2.toISOString(),
          weekLabel: '2026年第2周',
          content: '第二周',
          markdown: '**第二周**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week2.toISOString(),
          updatedAt: week2.toISOString()
        }
      )

      const allReports = store.getAllReports()

      expect(allReports.length).toBe(2)
      // 最新的应该在前面（第二周是 1/12，第一周是 1/5）
      expect(allReports[0].content).toBe('第二周')
      expect(allReports[1].content).toBe('第一周')
    })
  })

  describe('batchDelete', () => {
    it('应该批量删除周报', async () => {
      const store = useReportsStore()

      // 直接操作 reports 数组添加不同周的数据
      const week1 = new Date('2026-01-05')
      const week2 = new Date('2026-01-12')

      store.reports.push(
        {
          id: 'report1',
          weekStart: week1.toISOString(),
          weekLabel: '2026年第1周',
          content: '周报1',
          markdown: '**周报1**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week1.toISOString(),
          updatedAt: week1.toISOString()
        },
        {
          id: 'report2',
          weekStart: week2.toISOString(),
          weekLabel: '2026年第2周',
          content: '周报2',
          markdown: '**周报2**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week2.toISOString(),
          updatedAt: week2.toISOString()
        }
      )

      expect(store.reports.length).toBe(2)

      await store.batchDelete(['report1', 'report2'])

      expect(store.reports.length).toBe(0)
    })
  })

  describe('deleteOlderThan', () => {
    it('应该删除指定天数之前的周报', async () => {
      const store = useReportsStore()

      // 直接操作 reports 数组添加不同周的周报
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 30) // 30天前

      const newDate = new Date() // 今天

      store.reports.push(
        {
          id: 'old-report',
          weekStart: oldDate.toISOString(),
          weekLabel: '旧周',
          content: '旧周报',
          markdown: '**旧周报**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: oldDate.toISOString(),
          updatedAt: oldDate.toISOString()
        },
        {
          id: 'new-report',
          weekStart: newDate.toISOString(),
          weekLabel: '本周',
          content: '新周报',
          markdown: '**新周报**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: newDate.toISOString(),
          updatedAt: newDate.toISOString()
        }
      )

      expect(store.reports.length).toBe(2)

      await store.deleteOlderThan(7) // 删除7天前的

      expect(store.reports.length).toBe(1)
      expect(store.reports[0].content).toBe('新周报')
    })
  })

  describe('clearAll', () => {
    it('应该清空所有周报', async () => {
      const store = useReportsStore()

      // 直接操作 reports 数组添加不同周的数据
      const week1 = new Date('2026-01-05')
      const week2 = new Date('2026-01-12')

      store.reports.push(
        {
          id: 'report1',
          weekStart: week1.toISOString(),
          weekLabel: '2026年第1周',
          content: '周报1',
          markdown: '**周报1**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week1.toISOString(),
          updatedAt: week1.toISOString()
        },
        {
          id: 'report2',
          weekStart: week2.toISOString(),
          weekLabel: '2026年第2周',
          content: '周报2',
          markdown: '**周报2**',
          records: [],
          plans: [],
          reflections: {},
          createdAt: week2.toISOString(),
          updatedAt: week2.toISOString()
        }
      )

      expect(store.reports.length).toBe(2)

      await store.clearAll()

      expect(store.reports.length).toBe(0)
    })
  })

  describe('getCurrentWeekArchivedReport', () => {
    it('应该返回本周已归档的周报', async () => {
      const store = useReportsStore()

      const reportData = {
        content: '本周周报',
        markdown: '**本周周报**',
        records: [],
        plans: [],
        reflections: {}
      }

      await store.saveReport(reportData)

      const archived = store.getCurrentWeekArchivedReport()

      expect(archived).toBeDefined()
      expect(archived.content).toBe('本周周报')
    })

    it('本周没有归档周报时应返回 undefined', () => {
      const store = useReportsStore()

      const archived = store.getCurrentWeekArchivedReport()

      expect(archived).toBeUndefined()
    })
  })

  describe('hasCurrentWeekReport', () => {
    it('应该正确检测本周是否有归档周报', async () => {
      const store = useReportsStore()

      expect(store.hasCurrentWeekReport).toBe(false)

      await store.saveReport({
        content: '本周周报',
        markdown: '**本周周报**',
        records: [],
        plans: [],
        reflections: {}
      })

      expect(store.hasCurrentWeekReport).toBe(true)
    })
  })
})
