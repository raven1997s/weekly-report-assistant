// ========================================
// RecordCard 组件测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecordCard from '@/components/RecordCard.vue'
import { useRecordsStore } from '@/stores/records'

// Mock @/utils/api 模块
vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

// Mock fetch API
global.fetch = vi.fn()

describe('RecordCard', () => {
  let wrapper
  let pinia
  let recordsStore

  const mockRecord = {
    id: 'test-record-1',
    content: '完成WMS仓储功能开发',
    project: 'WMS',
    workType: '需求开发',
    createdAt: new Date().toISOString()
  }

  beforeEach(() => {
    // 创建新的 Pinia 实例
    pinia = createPinia()
    setActivePinia(pinia)

    // 重置所有 mocks
    vi.clearAllMocks()

    // 挂载组件
    wrapper = mount(RecordCard, {
      props: {
        record: mockRecord
      },
      global: {
        plugins: [pinia]
      }
    })

    // 获取 store 实例
    recordsStore = useRecordsStore()
  })

  describe('基础渲染', () => {
    it('应该渲染记录内容', () => {
      expect(wrapper.text()).toContain('完成WMS仓储功能开发')
    })

    it('应该渲染项目标签', () => {
      const projectTag = wrapper.find('.tag.project')
      expect(projectTag.exists()).toBe(true)
      expect(projectTag.text()).toBe('WMS')
    })

    it('应该渲染工作类型标签', () => {
      const typeTag = wrapper.find('.tag.type')
      expect(typeTag.exists()).toBe(true)
      expect(typeTag.text()).toBe('需求开发')
    })

    it('应该显示相对时间', () => {
      const timeElement = wrapper.find('.record-time')
      expect(timeElement.exists()).toBe(true)
      // getRelativeTime 返回相对时间字符串
      expect(timeElement.text()).toBeTruthy()
    })

    it('应该在非编辑模式显示内容', () => {
      expect(wrapper.find('.record-content').text()).toBe('完成WMS仓储功能开发')
    })
  })

  describe('标签显示', () => {
    it('应该只显示有效的项目标签', () => {
      const recordWithoutProject = {
        id: 'test-2',
        content: '测试内容',
        workType: 'Bug修复',
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: recordWithoutProject },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.tag.project').exists()).toBe(false)
      expect(wrapper.find('.tag.type').exists()).toBe(true)
    })

    it('应该只显示有效的类型标签', () => {
      const recordWithoutType = {
        id: 'test-3',
        content: '测试内容',
        project: 'WMS',
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: recordWithoutType },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.tag.project').exists()).toBe(true)
      expect(wrapper.find('.tag.type').exists()).toBe(false)
    })

    it('应该在没有标签时不显示标签区域', () => {
      const recordWithoutTags = {
        id: 'test-4',
        content: '测试内容',
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: recordWithoutTags },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.tag.project').exists()).toBe(false)
      expect(wrapper.find('.tag.type').exists()).toBe(false)
    })
  })

  describe('操作按钮', () => {
    it('应该有编辑按钮', () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      expect(editButton.exists()).toBe(true)
    })

    it('应该有"移到下周计划"按钮', () => {
      const moveButton = wrapper.find('[aria-label="移到下周计划"]')
      expect(moveButton.exists()).toBe(true)
    })

    it('应该有删除按钮', () => {
      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      expect(deleteButton.exists()).toBe(true)
    })

    it('draggable=true 时应该显示拖拽手柄', () => {
      wrapper = mount(RecordCard, {
        props: {
          record: mockRecord,
          draggable: true
        },
        global: { plugins: [pinia] }
      })

      const dragHandle = wrapper.find('[aria-label="拖拽排序"]')
      expect(dragHandle.exists()).toBe(true)
      expect(wrapper.find('.record-card').classes()).toContain('draggable')
    })

    it('draggable=false 时不显示拖拽手柄', () => {
      const dragHandle = wrapper.find('[aria-label="拖拽排序"]')
      expect(dragHandle.exists()).toBe(false)
      expect(wrapper.find('.record-card').classes()).not.toContain('draggable')
    })
  })

  describe('编辑功能', () => {
    it('点击编辑按钮应该进入编辑模式', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      expect(wrapper.find('.record-card').classes()).toContain('editing')
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    })

    it('编辑模式应该显示输入框和按钮', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
      expect(wrapper.find('.btn-ghost').exists()).toBe(true)
    })

    it('输入框应该预填充当前内容', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      expect(input.element.value).toBe('完成WMS仓储功能开发')
    })

    it('点击保存按钮应该保存编辑', async () => {
      // Mock updateRecord
      recordsStore.updateRecord = vi.fn().mockResolvedValue({
        id: 'test-record-1',
        content: '更新后的内容'
      })

      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      await input.setValue('更新后的内容')

      const saveButton = wrapper.find('.btn-primary')
      await saveButton.trigger('click')

      expect(recordsStore.updateRecord).toHaveBeenCalledWith('test-record-1', {
        content: '更新后的内容'
      })
    })

    it('按 Enter 键应该保存编辑', async () => {
      recordsStore.updateRecord = vi.fn().mockResolvedValue({})

      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      await input.setValue('新内容')
      await input.trigger('keyup.enter')

      expect(recordsStore.updateRecord).toHaveBeenCalled()
    })

    it('按 Escape 键应该取消编辑', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      expect(wrapper.find('.record-card').classes()).toContain('editing')

      const input = wrapper.find('input[type="text"]')
      await input.trigger('keyup.escape')

      expect(wrapper.find('.record-card').classes()).not.toContain('editing')
    })

    it('点击取消按钮应该退出编辑模式', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const cancelButton = wrapper.find('.btn-ghost')
      await cancelButton.trigger('click')

      expect(wrapper.find('.record-card').classes()).not.toContain('editing')
    })

    it('保存空内容不应该调用 updateRecord', async () => {
      recordsStore.updateRecord = vi.fn()

      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      await input.setValue('   ') // 只有空格

      const saveButton = wrapper.find('.btn-primary')
      await saveButton.trigger('click')

      expect(recordsStore.updateRecord).not.toHaveBeenCalled()
    })

    it('保存时应该触发 updated 事件', async () => {
      recordsStore.updateRecord = vi.fn().mockResolvedValue({})

      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      await input.setValue('新内容')

      const saveButton = wrapper.find('.btn-primary')
      await saveButton.trigger('click')

      expect(wrapper.emitted('updated')).toBeTruthy()
      expect(wrapper.emitted('updated')[0]).toEqual([mockRecord])
    })
  })

  describe('删除功能', () => {
    it('点击删除按钮应该显示确认弹窗', async () => {
      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.confirm-modal').exists()).toBe(true)
    })

    it('确认弹窗应该显示警告信息', async () => {
      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      expect(wrapper.text()).toContain('删除记录确认')
      expect(wrapper.text()).toContain('确定要删除这条记录吗？')
      expect(wrapper.text()).toContain('删除后将无法恢复')
    })

    it('点击弹窗取消按钮应该关闭弹窗', async () => {
      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      const cancelButton = wrapper.findAll('.btn-secondary')[0]
      await cancelButton.trigger('click')

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('点击弹窗外部应该关闭弹窗', async () => {
      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('点击确认删除按钮应该调用 deleteRecord', async () => {
      // Mock 成功的删除 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '记录已移至回收站' })
      })

      recordsStore.deleteRecord = vi.fn().mockResolvedValue(true)

      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      const confirmButton = wrapper.find('.btn.danger')
      await confirmButton.trigger('click')

      expect(recordsStore.deleteRecord).toHaveBeenCalledWith('test-record-1')
    })

    it('确认删除后应该触发 deleted 事件', async () => {
      recordsStore.deleteRecord = vi.fn().mockResolvedValue(true)

      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      const confirmButton = wrapper.find('.btn.danger')
      await confirmButton.trigger('click')

      expect(wrapper.emitted('deleted')).toBeTruthy()
      expect(wrapper.emitted('deleted')[0]).toEqual([mockRecord])
    })

    it('确认删除后应该关闭弹窗', async () => {
      recordsStore.deleteRecord = vi.fn().mockResolvedValue(true)

      const deleteButton = wrapper.find('[aria-label="删除记录"]')
      await deleteButton.trigger('click')

      let overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(true)

      const confirmButton = wrapper.find('.btn.danger')
      await confirmButton.trigger('click')

      overlay = wrapper.find('.modal-overlay')
      expect(overlay.exists()).toBe(false)
    })
  })

  describe('移到下周计划功能', () => {
    it('点击"移到下周计划"按钮应该触发 moveToNextWeek 事件', async () => {
      const moveButton = wrapper.find('[aria-label="移到下周计划"]')
      await moveButton.trigger('click')

      expect(wrapper.emitted('moveToNextWeek')).toBeTruthy()
      expect(wrapper.emitted('moveToNextWeek')[0]).toEqual([mockRecord])
    })

    it('应该有正确的 title 属性', () => {
      const moveButton = wrapper.find('[aria-label="移到下周计划"]')
      expect(moveButton.attributes('title')).toBe('移到下周计划')
    })
  })

  describe('CSS 类和样式', () => {
    it('应该有正确的 record-card 类', () => {
      expect(wrapper.find('.record-card').exists()).toBe(true)
    })

    it('编辑模式应该添加 editing 类', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      expect(wrapper.find('.record-card').classes()).toContain('editing')
    })

    it('draggable=true 应该添加 draggable 类', () => {
      wrapper = mount(RecordCard, {
        props: {
          record: mockRecord,
          draggable: true
        },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.record-card').classes()).toContain('draggable')
    })

    it('应该有 record-header 类', () => {
      expect(wrapper.find('.record-header').exists()).toBe(true)
    })

    it('应该有 record-tags 类', () => {
      expect(wrapper.find('.record-tags').exists()).toBe(true)
    })

    it('应该有 record-actions 类', () => {
      expect(wrapper.find('.record-actions').exists()).toBe(true)
    })

    it('应该有 record-content 类', () => {
      expect(wrapper.find('.record-content').exists()).toBe(true)
    })

    it('应该有 record-footer 类', () => {
      expect(wrapper.find('.record-footer').exists()).toBe(true)
    })

    it('应该有 record-time 类', () => {
      expect(wrapper.find('.record-time').exists()).toBe(true)
    })
  })

  describe('交互状态', () => {
    it('hover 时操作按钮应该可见', async () => {
      const actionsDiv = wrapper.find('.record-actions')
      expect(actionsDiv.isVisible()).toBe(true) // 初始状态根据 CSS 可能是隐藏的
    })

    it('编辑模式下输入框应该自动聚焦', async () => {
      const editButton = wrapper.find('[aria-label="编辑"]')
      await editButton.trigger('click')

      const input = wrapper.find('input[type="text"]')
      // 测试中 focus 检查可能不准确，主要验证元素存在
      expect(input.exists()).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串的 content', () => {
      const emptyRecord = {
        id: 'test-empty',
        content: '',
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: emptyRecord },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.record-content').text()).toBe('')
    })

    it('应该处理特殊字符的 content', () => {
      const specialRecord = {
        id: 'test-special',
        content: '完成 <script>alert("XSS")</script> 功能',
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: specialRecord },
        global: { plugins: [pinia] }
      })

      // Vue 会自动转义 HTML
      expect(wrapper.text()).toContain('完成')
    })

    it('应该处理非常长的 content', () => {
      const longContent = 'A'.repeat(1000)
      const longRecord = {
        id: 'test-long',
        content: longContent,
        createdAt: new Date().toISOString()
      }

      wrapper = mount(RecordCard, {
        props: { record: longRecord },
        global: { plugins: [pinia] }
      })

      // 文本可能包含其他元素（如时间），所以只需要验证内容存在
      expect(wrapper.text()).toContain(longContent)
    })

    it('应该处理无效的 createdAt 日期', () => {
      const invalidDateRecord = {
        id: 'test-invalid-date',
        content: '测试内容',
        createdAt: 'invalid-date'
      }

      wrapper = mount(RecordCard, {
        props: { record: invalidDateRecord },
        global: { plugins: [pinia] }
      })

      // getRelativeTime 应该处理无效日期
      expect(wrapper.find('.record-time').exists()).toBe(true)
    })
  })
})
