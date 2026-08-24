import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const apiMocks = vi.hoisted(() => ({
  loadFromStorage: vi.fn(),
  saveToStorage: vi.fn()
}))

vi.mock('@/utils/api', () => apiMocks)

describe('工作状态设置', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    apiMocks.saveToStorage.mockResolvedValue(1)
  })

  it('应该兼容字符串和对象格式的状态配置', async () => {
    apiMocks.loadFromStorage.mockResolvedValue({
      recordStatuses: JSON.stringify(['进行中', { id: 'done', name: '已完成' }])
    })

    const store = useSettingsStore()
    await store.init()

    expect(store.recordStatusNames).toEqual(['进行中', '已完成'])
  })

  it('缺少配置时应该使用默认状态', async () => {
    apiMocks.loadFromStorage.mockResolvedValue({})

    const store = useSettingsStore()
    await store.init()

    expect(store.recordStatusNames).toEqual(['待开始', '进行中', '待验证', '已完成', '已阻塞', '已暂停'])
  })

  it('保存状态配置时应该写入现有 settings 存储', async () => {
    apiMocks.loadFromStorage.mockResolvedValue({})

    const store = useSettingsStore()
    await store.init()
    await store.setRecordStatuses([{ id: 'testing', name: '联调中' }])

    const [, saved] = apiMocks.saveToStorage.mock.calls.at(-1)
    expect(JSON.parse(saved.recordStatuses)).toEqual([{ id: 'testing', name: '联调中' }])
  })
})
