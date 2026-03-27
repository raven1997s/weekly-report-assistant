import { describe, it, expect, beforeEach, vi } from 'vitest'
import { copyRichContentToClipboard } from '@/utils/clipboard'

describe('copyRichContentToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('应优先写入 text/html 和 text/plain 两种格式', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const clipboard = { write }

    global.navigator = {
      clipboard
    }

    global.ClipboardItem = class ClipboardItem {
      constructor(items) {
        this.items = items
      }
    }

    const success = await copyRichContentToClipboard({
      text: '纯文本内容',
      html: '<p><strong>富文本内容</strong></p>'
    })

    expect(success).toBe(true)
    expect(write).toHaveBeenCalledTimes(1)

    const [items] = write.mock.calls[0]
    expect(items).toHaveLength(1)
    expect(items[0].items['text/plain']).toBeInstanceOf(Blob)
    expect(items[0].items['text/html']).toBeInstanceOf(Blob)
  })

  it('不支持富文本剪贴板时应回退为纯文本复制', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    global.navigator = {
      clipboard: { writeText }
    }

    global.ClipboardItem = undefined

    const success = await copyRichContentToClipboard({
      text: '仅纯文本',
      html: '<p>仅纯文本</p>'
    })

    expect(success).toBe(true)
    expect(writeText).toHaveBeenCalledWith('仅纯文本')
  })
})
