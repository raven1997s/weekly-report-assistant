// ========================================
// InputBox 组件测试
// ========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import InputBox from '@/components/InputBox.vue'

describe('InputBox', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    // 创建带有默认 mock 行为的测试用 Pinia
    pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        settings: {
          projects: [
            { id: '1', name: 'WMS', keywords: ['wms', '仓储'] },
            { id: '2', name: '支付中心', keywords: ['支付', 'pay'] },
            { id: '3', name: '用户中心', keywords: ['用户', 'user'] }
          ],
          workTypes: [
            { id: '1', name: '优化', keywords: ['优化'] },
            { id: '2', name: '支持', keywords: ['支持'] },
            { id: '3', name: '协同', keywords: ['协同'] }
          ]
        }
      }
    })

    setActivePinia(pinia)

    // Mock useParser
    vi.mock('@/composables/useParser', () => ({
      useParser: () => ({
        parseInput: vi.fn(() => ({
          project: 'WMS',
          workType: '优化',
          confidence: 85
        })),
        getParseResultMessage: vi.fn(() => '已识别项目和类型')
      })
    }))
  })

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
    // 检查按钮是否没有 disabled 属性或者 disabled 为 false
    const isDisabled = submitBtn.attributes('disabled') !== undefined
    expect(isDisabled).toBe(false)
  })
})
