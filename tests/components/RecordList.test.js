import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecordList from '@/components/RecordList.vue'
import { useRecordsStore } from '@/stores/records'
import { useSettingsStore } from '@/stores/settings'

vi.mock('@/utils/api', () => ({
  saveToStorage: vi.fn(() => Promise.resolve()),
  loadFromStorage: vi.fn(() => Promise.resolve([]))
}))

const DraggableStub = {
  props: ['list'],
  template: '<div><div v-for="element in list" :key="element.id"><slot name="item" :element="element" /></div></div>'
}

describe('RecordList 工作记录筛选', () => {
  let pinia
  let recordsStore
  let settingsStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    recordsStore = useRecordsStore()
    settingsStore = useSettingsStore()
    settingsStore.projects = [{ id: 'wms', name: 'WMS' }, { id: 'pay', name: '支付中心' }]
    settingsStore.workTypes = [{ id: 'dev', name: '需求开发' }, { id: 'support', name: '支持' }]
    settingsStore.recordStatuses = [{ id: 'done', name: '已完成' }, { id: 'doing', name: '进行中' }]
    recordsStore.records = [
      { id: '1', content: 'WMS开发', project: 'WMS', workType: '需求开发', status: '进行中', createdAt: new Date().toISOString() },
      { id: '2', content: '支付支持', project: '支付中心', workType: '支持', status: '历史状态', createdAt: new Date().toISOString() }
    ]
  })

  const mountList = () => mount(RecordList, {
    global: {
      plugins: [pinia],
      stubs: {
        draggable: DraggableStub,
        RecordCard: {
          props: ['record'],
          template: '<div class="record-stub">{{ record.content }}</div>'
        }
      }
    }
  })

  it('状态筛选应该包含配置外的历史状态', () => {
    const wrapper = mountList()
    const options = wrapper.findAll('.status-filter option').map(option => option.text())

    expect(options).toContain('历史状态')
  })

  it('项目、工作类型和状态应该使用 AND 关系组合筛选', async () => {
    const wrapper = mountList()

    await wrapper.find('.project-filter').setValue('WMS')
    await wrapper.find('.type-filter').setValue('需求开发')
    await wrapper.find('.status-filter').setValue('进行中')

    expect(wrapper.text()).toContain('WMS开发')
    expect(wrapper.text()).not.toContain('支付支持')
  })
})
