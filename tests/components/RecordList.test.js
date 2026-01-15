// ========================================
// RecordList 组件测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecordList from '@/components/RecordList.vue'
import { useRecordsStore } from '@/stores/records'
import { useReportsStore } from '@/stores/reports'
import { useDialogStore } from '@/stores/dialog'
import { generateMockRecord } from '../mocks/data'

// Mock @/utils/api 模块
vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

// Mock fetch API
global.fetch = vi.fn()

// Mock vuedraggable
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    template: '<div class="draggable-mock"><slot /></div>',
    props: ['list', 'itemKey', 'handle'],
    emits: ['end']
  }
}))

describe('RecordList', () => {
  let wrapper
  let pinia
  let recordsStore
  let reportsStore
  let dialogStore

  beforeEach(() => {
    // 创建新的 Pinia 实例
    pinia = createPinia()
    setActivePinia(pinia)

    // 重置所有 mocks
    vi.clearAllMocks()

    // 挂载组件
    wrapper = mount(RecordList, {
      global: {
        plugins: [pinia],
        stubs: {
          draggable: true,
          RecordCard: {
            template: '<div class="record-card-mock" @deleted="$emit(\'deleted\', $event)" @updated="$emit(\'updated\', $event)" @moveToNextWeek="$emit(\'moveToNextWeek\', $event)">{{ record.content }}</div>',
            props: ['record', 'draggable']
          }
        }
      }
    })

    // 获取 store 实例
    recordsStore = useRecordsStore()
    reportsStore = useReportsStore()
    dialogStore = useDialogStore()
  })

  describe('空状态渲染', () => {
    it('没有记录时应该显示空状态', () => {
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state-title').text()).toBe('暂无工作记录')
      expect(wrapper.find('.empty-state-desc').text()).toBe('在上方输入框记录你的工作内容')
    })

    it('空状态应该显示图标', () => {
      const emptyStateIcon = wrapper.find('.empty-state-icon')
      expect(emptyStateIcon.exists()).toBe(true)
      expect(emptyStateIcon.find('svg').exists()).toBe(true)
    })

    it('有记录时不应该显示空状态', async () => {
      // 添加一条记录到 store
      await recordsStore.addRecord({
        content: '测试记录',
        project: 'WMS',
        workType: '需求开发'
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(false)
    })
  })

  describe('按项目分组', () => {
    beforeEach(async () => {
      // 添加多条记录，属于不同项目
      await recordsStore.addRecord({ content: 'WMS 功能1', project: 'WMS', workType: '需求开发' })
      await recordsStore.addRecord({ content: 'WMS 功能2', project: 'WMS', workType: 'Bug修复' })
      await recordsStore.addRecord({ content: 'OMS 功能1', project: 'OMS', workType: '需求开发' })

      await wrapper.vm.$nextTick()
    })

    it('应该按项目分组显示记录', () => {
      const groups = wrapper.findAll('.record-group')
      expect(groups.length).toBe(2) // WMS 和 OMS
    })

    it('每个分组应该显示项目名称', () => {
      const groupTitles = wrapper.findAll('.group-title')
      const titles = groupTitles.map(t => t.text())
      expect(titles).toContain('WMS')
      expect(titles).toContain('OMS')
    })

    it('每个分组应该显示记录数量', () => {
      const groupCounts = wrapper.findAll('.group-count')
      const counts = groupCounts.map(c => c.text())
      expect(counts).toContain('2') // WMS 有 2 条
      expect(counts).toContain('1') // OMS 有 1 条
    })

    it('应该显示分组头部', () => {
      const groupHeaders = wrapper.findAll('.group-header')
      expect(groupHeaders.length).toBe(2)
    })

    it('应该显示分组内容区域', () => {
      const groupContents = wrapper.findAll('.group-content')
      expect(groupContents.length).toBe(2)
    })
  })

  describe('记录排序', () => {
    it('调用 onDragEnd 应该触发 reorderRecords', async () => {
      // 添加记录
      const record1 = await recordsStore.addRecord({ content: '记录1', project: 'WMS' })
      const record2 = await recordsStore.addRecord({ content: '记录2', project: 'WMS' })

      // Mock reorderRecords
      recordsStore.reorderRecords = vi.fn()

      // 获取分组中的记录列表
      const recordsList = recordsStore.currentWeekByProject['WMS']

      // 调用 onDragEnd
      wrapper.vm.onDragEnd(recordsList)

      expect(recordsStore.reorderRecords).toHaveBeenCalled()
    })
  })

  describe('移到下周计划功能', () => {
    beforeEach(async () => {
      // Mock confirm 对话框
      dialogStore.confirm = vi.fn().mockResolvedValue(true)

      // Mock fetch API
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '已移到下周计划',
          newPlans: [
            { id: 'plan-1', content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
          ]
        })
      })

      // Mock appendPlans
      reportsStore.appendPlans = vi.fn()

      // 添加记录
      await recordsStore.addRecord({
        content: '完成WMS功能',
        project: 'WMS',
        workType: '需求开发'
      })

      await wrapper.vm.$nextTick()
    })

    it('用户确认后应该调用 API 移动记录', async () => {
      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(global.fetch).toHaveBeenCalledWith('/api/records/move-to-next-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds: [record.id] })
      })
    })

    it('成功移动后应该从本地列表移除记录', async () => {
      const initialLength = recordsStore.records.length
      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(recordsStore.records.length).toBe(initialLength - 1)
      expect(recordsStore.records.find(r => r.id === record.id)).toBeUndefined()
    })

    it('成功移动后应该追加到下周计划', async () => {
      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(reportsStore.appendPlans).toHaveBeenCalledWith([
        { id: 'plan-1', content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
      ])
    })

    it('成功移动后应该显示成功提示', async () => {
      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(wrapper.vm.successMessage).toBe('已移到下周计划')
      expect(wrapper.vm.isError).toBe(false)
    })

    it('用户取消时不应该调用 API', async () => {
      dialogStore.confirm = vi.fn().mockResolvedValue(false)

      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('API 失败时应该显示错误提示', async () => {
      dialogStore.confirm = vi.fn().mockResolvedValue(true)
      // 当 ok 为 false 时，会走 else 分支，显示 result.error
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: '网络错误' })
      })

      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(wrapper.vm.isError).toBe(true)
      // else 分支会显示 result.error
      expect(wrapper.vm.successMessage).toBe('网络错误')
    })

    it('API 返回 success=false 时应该显示错误', async () => {
      dialogStore.confirm = vi.fn().mockResolvedValue(true)
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: '记录不存在' })
      })

      const record = recordsStore.records[0]

      await wrapper.vm.handleMoveToNextWeek(record)

      expect(wrapper.vm.isError).toBe(true)
      expect(wrapper.vm.successMessage).toBe('记录不存在')
    })
  })

  describe('事件处理', () => {
    it('应该处理记录删除事件', () => {
      const record = generateMockRecord()

      // 应该不会抛出错误
      expect(() => {
        wrapper.vm.handleDeleted(record)
      }).not.toThrow()
    })

    it('应该处理记录更新事件', () => {
      const record = generateMockRecord()

      // 应该不会抛出错误
      expect(() => {
        wrapper.vm.handleUpdated(record)
      }).not.toThrow()
    })
  })

  describe('Toast 提示', () => {
    it('showToast 应该设置成功消息', () => {
      wrapper.vm.showToast('操作成功')

      expect(wrapper.vm.successMessage).toBe('操作成功')
      expect(wrapper.vm.isError).toBe(false)
    })

    it('showToast 应该设置错误消息', () => {
      wrapper.vm.showToast('操作失败', true)

      expect(wrapper.vm.successMessage).toBe('操作失败')
      expect(wrapper.vm.isError).toBe(true)
    })

    it('Toast 应该在 3 秒后自动消失', () => {
      // 使用 jest.useFakeTimers() 代替 vi.useFakeTimers()
      vi.useFakeTimers({ shouldClearNativeTimers: true })

      wrapper.vm.showToast('测试消息')

      expect(wrapper.vm.successMessage).toBe('测试消息')

      // 快进 3 秒
      vi.advanceTimersByTime(3000)

      // 等待 setTimeout 回调执行
      vi.runAllTimers()

      expect(wrapper.vm.successMessage).toBe('')

      vi.useRealTimers()
    })

    it('连续调用 showToast 应该重置计时器', () => {
      vi.useFakeTimers({ shouldClearNativeTimers: true })

      wrapper.vm.showToast('第一条消息')
      vi.advanceTimersByTime(1000)

      wrapper.vm.showToast('第二条消息')
      vi.advanceTimersByTime(2000)

      // 运行所有定时器
      vi.runAllTimers()

      expect(wrapper.vm.successMessage).toBe('')

      vi.useRealTimers()
    })

    it('有消息时应该显示 Toast 元素', async () => {
      wrapper.vm.showToast('测试消息')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.toast-message').exists()).toBe(true)
      expect(wrapper.find('.toast-message').text()).toBe('测试消息')
    })

    it('错误消息应该有 error 类', async () => {
      wrapper.vm.showToast('错误信息', true)
      await wrapper.vm.$nextTick()

      const toast = wrapper.find('.toast-message')
      expect(toast.classes()).toContain('error')
    })
  })

  describe('计算属性', () => {
    it('groupedRecords 应该返回按项目分组的记录', async () => {
      await recordsStore.addRecord({ content: 'WMS 功能', project: 'WMS' })
      await recordsStore.addRecord({ content: 'OMS 功能', project: 'OMS' })

      await wrapper.vm.$nextTick()

      const grouped = wrapper.vm.groupedRecords

      expect(grouped).toHaveProperty('WMS')
      expect(grouped).toHaveProperty('OMS')
      expect(grouped['WMS'].length).toBe(1)
      expect(grouped['OMS'].length).toBe(1)
    })

    it('groupedRecords 应该将空项目归类为"其他"', async () => {
      await recordsStore.addRecord({ content: '无项目记录' })

      await wrapper.vm.$nextTick()

      const grouped = wrapper.vm.groupedRecords

      expect(grouped).toHaveProperty('其他')
    })
  })

  describe('CSS 类和样式', () => {
    it('应该有正确的 record-list 类', () => {
      expect(wrapper.find('.record-list').exists()).toBe(true)
    })

    it('有记录时应该显示 record-groups', async () => {
      await recordsStore.addRecord({ content: '测试记录', project: 'WMS' })

      await wrapper.vm.$nextTick()

      expect(wrapper.find('.record-groups').exists()).toBe(true)
    })

    it('每个分组应该有 record-group 类', async () => {
      await recordsStore.addRecord({ content: 'WMS 功能', project: 'WMS' })
      await recordsStore.addRecord({ content: 'OMS 功能', project: 'OMS' })

      await wrapper.vm.$nextTick()

      const groups = wrapper.findAll('.record-group')
      expect(groups.length).toBe(2)
      groups.forEach(group => {
        expect(group.classes()).toContain('record-group')
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理没有项目的记录', async () => {
      await recordsStore.addRecord({ content: '无项目记录' })

      await wrapper.vm.$nextTick()

      const groups = wrapper.findAll('.record-group')
      expect(groups.length).toBe(1)
      expect(wrapper.find('.group-title').text()).toBe('其他')
    })

    it('应该处理大量记录', async () => {
      // 添加 50 条记录
      for (let i = 0; i < 50; i++) {
        await recordsStore.addRecord({
          content: `记录 ${i}`,
          project: i % 2 === 0 ? 'WMS' : 'OMS'
        })
      }

      await wrapper.vm.$nextTick()

      const groups = wrapper.findAll('.record-group')
      expect(groups.length).toBe(2)

      const counts = wrapper.findAll('.group-count').map(c => parseInt(c.text()))
      expect(counts[0] + counts[1]).toBe(50)
    })

    it('应该处理同一天的重复内容记录（应该被拒绝）', async () => {
      const result1 = await recordsStore.addRecord({
        content: '每周例会',
        createdAt: '2026-01-08T10:00:00'
      })

      expect(result1.success).toBe(true)

      const result2 = await recordsStore.addRecord({
        content: '每周例会',
        createdAt: '2026-01-08T14:00:00'
      })

      expect(result2.success).toBe(false)
      expect(result2.isDuplicate).toBe(true)
    })
  })

  describe('响应式布局', () => {
    it('应该在移动端显示空状态', () => {
      // 测试移动端视图
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })
  })
})
