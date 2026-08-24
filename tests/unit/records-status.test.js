import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRecordsStore } from '@/stores/records'
import { useSettingsStore } from '@/stores/settings'

const apiMocks = vi.hoisted(() => ({
  loadFromStorage: vi.fn(),
  saveToStorage: vi.fn()
}))

vi.mock('@/utils/api', () => apiMocks)

describe('工作记录状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('读取历史记录时应该将空状态解析为已完成', async () => {
    apiMocks.loadFromStorage.mockResolvedValue([
      { id: 'legacy', content: '历史工作', createdAt: new Date().toISOString(), status: null }
    ])

    const store = useRecordsStore()
    await store.init()

    expect(store.records[0].status).toBe('已完成')
  })

  it('新增记录未指定状态时应该使用当前配置默认值', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.recordStatuses = [{ id: 'doing', name: '进行中' }]
    global.fetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, data: {} })
    })

    const store = useRecordsStore()
    await store.addRecord({ content: '开发功能', createdAt: new Date().toISOString() })

    const request = global.fetch.mock.calls[0][1]
    expect(JSON.parse(request.body).status).toBe('进行中')
    expect(store.records[0].status).toBe('进行中')
  })
})
