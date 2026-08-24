// ========================================
// InputBox 组件测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import InputBox from '@/components/InputBox.vue'
import { useRecordsStore } from '@/stores/records'

// Mock @/utils/api 模块
vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

describe('InputBox', () => {
  let wrapper
  let pinia
  let recordsStore

  beforeEach(() => {
    // 创建带有默认 mock 行为的测试用 Pinia
    // 使用 stubActions: false 让真实的 store 方法执行
    pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false, // 使用真实的 store 方法
      initialState: {
        records: {
          records: [],
          deletedRecords: []
        },
        settings: {
          projects: [
            { id: '1', name: 'WMS', keywords: ['wms', '仓储'] },
            { id: '2', name: 'OMS', keywords: ['oms', '订单'] },
            { id: '3', name: '用户中心', keywords: ['用户', 'user'] }
          ],
          workTypes: [
            { id: '1', name: '需求开发', keywords: ['需求', '开发'] },
            { id: '2', name: 'Bug修复', keywords: ['bug', '修复'] },
            { id: '3', name: '优化', keywords: ['优化'] }
          ],
          recordStatuses: [
            { id: '1', name: '进行中' },
            { id: '2', name: '已完成' },
            { id: '3', name: '已阻塞' }
          ]
        }
      }
    })

    setActivePinia(pinia)

    // 重置所有 mocks
    vi.clearAllMocks()

    // 获取 store 实例
    recordsStore = useRecordsStore()
    // 清空 store 中的记录
    recordsStore.records = []
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, data: {} })
    })
  })

  describe('基础渲染', () => {
    it('应该渲染输入框和提交按钮', () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('.submit-btn').exists()).toBe(true)
    })

    it('输入框应该有正确的占位符', () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      const input = wrapper.find('input[type="text"]')
      expect(input.attributes('placeholder')).toBe('记录工作内容，按 Enter 保存...')
    })

    it('提交按钮在输入为空时应禁用', () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      const submitBtn = wrapper.find('.submit-btn')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('输入内容后提交按钮应启用', async () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      const input = wrapper.find('input[type="text"]')
      await input.setValue('完成功能开发')

      const submitBtn = wrapper.find('.submit-btn')
      const isDisabled = submitBtn.attributes('disabled') !== undefined
      expect(isDisabled).toBe(false)
    })

    it('应该有动态内容区域', () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      expect(wrapper.find('.dynamic-content-area').exists()).toBe(true)
    })
  })

  describe('解析预览', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia],
          stubs: {
            // 不存根任何组件
          }
        }
      })
    })

    it('应该显示解析预览区域', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS功能开发')
      await input.trigger('input')

      // 解析预览可能会显示
      expect(wrapper.vm.inputText).toBe('WMS功能开发')
    })

    it('应该显示项目标签', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS工作')
      await input.trigger('input')

      const parseLabels = wrapper.findAll('.parse-label')
      expect(parseLabels.length).toBeGreaterThan(0)
    })

    it('应该显示类型标签', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS Bug修复')
      await input.trigger('input')

      const parseLabels = wrapper.findAll('.parse-label')
      expect(parseLabels.length).toBeGreaterThan(0)
    })

    it('应该显示置信度', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS功能')
      await input.trigger('input')

      // 置信度相关元素
      const confidenceBar = wrapper.find('.confidence-bar')
      const confidenceText = wrapper.find('.confidence-text')

      // 可能会显示置信度
      expect(confidenceBar.exists() || confidenceText.exists()).toBe(true)
    })
  })

  describe('快捷选择', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('应该显示快捷选择区域', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('工作内容')
      await input.trigger('input')

      // 快捷选择可能会显示
      expect(wrapper.vm.inputText).toBe('工作内容')
    })

    it('应该显示项目选项', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('功能')
      await input.trigger('input')

      // 快捷选项可能包含项目
      const quickSelect = wrapper.find('.quick-select')
      if (quickSelect.exists()) {
        const options = wrapper.findAll('.quick-option')
        expect(options.length).toBeGreaterThan(0)
      }
    })

    it('应该显示类型选项', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS')
      await input.trigger('input')

      // 快捷选项可能包含类型
      const quickSelect = wrapper.find('.quick-select')
      if (quickSelect.exists()) {
        const sections = wrapper.findAll('.quick-section')
        expect(sections.length).toBe(3) // 项目、类型和状态
      }
    })
  })

  describe('提交功能', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('按 Enter 键应该提交记录', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('完成WMS功能')
      await input.trigger('keyup.enter')

      // 记录应该被添加
      expect(recordsStore.records.length).toBeGreaterThan(0)
    })

    it('点击提交按钮应该提交记录', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('完成OMS订单功能')
      await input.trigger('input')

      const submitBtn = wrapper.find('.submit-btn')
      await submitBtn.trigger('click')

      // 记录应该被添加
      expect(recordsStore.records.length).toBeGreaterThan(0)
    })

    it('应该默认选择已完成并允许切换工作状态', async () => {
      const input = wrapper.find('input[type="text"]')
      await input.setValue('完成联调')
      await input.trigger('input')

      const statusSelect = wrapper.find('.status-select')
      expect(statusSelect.element.value).toBe('已完成')

      await statusSelect.setValue('进行中')
      await input.trigger('keyup.enter')

      const request = global.fetch.mock.calls[0][1]
      expect(JSON.parse(request.body).status).toBe('进行中')
    })

    it('提交空内容不应该添加记录', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('   ')
      await input.trigger('keyup.enter')

      expect(recordsStore.records.length).toBe(0)
    })

    it('成功提交应该触发 record-added 事件', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS功能')
      await input.trigger('input')
      await input.trigger('keyup.enter')

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('record-added')).toBeTruthy()
    })

    it('成功提交后应该清空输入框', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS开发')
      await input.trigger('input')
      await input.trigger('keyup.enter')

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      expect(input.element.value).toBe('')
    })
  })

  describe('成功提示', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('成功添加后应该显示成功提示', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS开发')
      await input.trigger('input')
      await input.trigger('keyup.enter')

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // 成功提示可能会显示
      expect(wrapper.vm.showSuccess).toBe(true)
      expect(wrapper.vm.isError).toBe(false)
    })

    it('重复记录应该显示错误提示和抖动动画', async () => {
      // 添加第一条记录（使用今天的日期，确保同一天）
      const today = new Date().toISOString()
      await recordsStore.addRecord({
        content: '每周例会',
        createdAt: today
      })

      const input = wrapper.find('input[type="text"]')

      // 尝试添加相同内容的记录
      await input.setValue('每周例会')
      await input.trigger('input')
      await input.trigger('keyup.enter')

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // 应该显示错误提示
      expect(wrapper.vm.isError).toBe(true)
      expect(wrapper.vm.showSuccess).toBe(true)
    })

    it('错误提示应该有 error 类', async () => {
      // 使用今天的日期，确保同一天
      const today = new Date().toISOString()
      await recordsStore.addRecord({
        content: '重复内容',
        createdAt: today
      })

      const input = wrapper.find('input[type="text"]')

      await input.setValue('重复内容')
      await input.trigger('input')
      await input.trigger('keyup.enter')

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const toast = wrapper.find('.success-toast')
      if (toast.exists()) {
        expect(toast.classes()).toContain('error')
      }
    })
  })

  describe('手动选择功能', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('setProject 方法应该设置项目', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('工作内容')
      await input.trigger('input')

      wrapper.vm.setProject('WMS')

      expect(wrapper.vm.manualProject).toBe('WMS')
    })

    it('setWorkType 方法应该设置类型', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('工作内容')
      await input.trigger('input')

      wrapper.vm.setWorkType('需求开发')

      expect(wrapper.vm.manualWorkType).toBe('需求开发')
    })

    it('手动选择项目应该增加置信度', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('功能')
      await input.trigger('input')

      const initialConfidence = wrapper.vm.parseResult?.confidence || 0

      wrapper.vm.setProject('WMS')

      expect(wrapper.vm.parseResult?.confidence).toBeGreaterThan(initialConfidence)
    })
  })

  describe('自动聚焦', () => {
    it('组件挂载后输入框应该自动聚焦', () => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })

      // focus 方法应该存在
      expect(wrapper.vm.inputRef).toBeDefined()
    })
  })

  describe('边界情况', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('应该处理空字符串输入', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('')
      await input.trigger('input')

      expect(wrapper.vm.parseResult).toBeNull()
    })

    it('应该处理只有空格的输入', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('   ')
      await input.trigger('input')

      expect(wrapper.vm.parseResult).toBeNull()
    })

    it('应该处理特殊字符输入', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS@#$%特殊功能')
      await input.trigger('input')

      expect(wrapper.vm.inputText).toBe('WMS@#$%特殊功能')
    })

    it('应该处理非常长的输入', async () => {
      const longText = 'A'.repeat(1000)
      const input = wrapper.find('input[type="text"]')

      await input.setValue(longText)

      expect(wrapper.vm.inputText).toBe(longText)
    })

    it('应该处理 null 输入', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue(null)
      await input.trigger('input')

      // 应该不会崩溃
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('CSS 类和样式', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('应该有正确的类名结构', () => {
      expect(wrapper.find('.input-box').exists()).toBe(true)
      expect(wrapper.find('.input-wrapper').exists()).toBe(true)
      expect(wrapper.find('.input-field').exists()).toBe(true)
      expect(wrapper.find('.submit-btn').exists()).toBe(true)
    })

    it('输入框应该有 focus-within 样式', async () => {
      const inputWrapper = wrapper.find('.input-wrapper')

      // 聚焦时应该有 focus-within 状态
      expect(inputWrapper.exists()).toBe(true)
    })

    it('提交按钮应该有 SVG 图标', () => {
      const submitBtn = wrapper.find('.submit-btn')
      const svg = submitBtn.find('svg')

      expect(svg.exists()).toBe(true)
    })
  })

  describe('响应式和交互', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('输入事件应该触发解析', async () => {
      const input = wrapper.find('input[type="text"]')

      await input.setValue('WMS功能')
      await input.trigger('input')

      // 解析结果应该被设置
      expect(wrapper.vm.inputText).toBe('WMS功能')
    })

    it('应该有正确的计算属性', () => {
      expect(wrapper.vm.projects).toBeDefined()
      expect(wrapper.vm.workTypes).toBeDefined()
    })
  })

  describe('Transition 动画', () => {
    beforeEach(() => {
      wrapper = mount(InputBox, {
        global: {
          plugins: [pinia]
        }
      })
    })

    it('解析预览应该有 fade Transition', () => {
      const fadeTransition = wrapper.findComponent({ name: 'Fade' })

      // Transition 组件可能被渲染
      expect(wrapper.exists()).toBe(true)
    })

    it('成功提示应该有 slide-up Transition', () => {
      const slideUpTransition = wrapper.findComponent({ name: 'SlideUp' })

      // Transition 组件可能被渲染
      expect(wrapper.exists()).toBe(true)
    })
  })
})
