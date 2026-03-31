import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { DEFAULT_MAIL_SIGNATURE_CONFIG } from '@/../server/mail-templates.js'

describe('默认配置脱敏', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('前端默认邮件签名应使用通用示例而不是个人信息', () => {
    const settingsStore = useSettingsStore()

    expect(settingsStore.mailSignature.displayName).toBe('示例昵称')
    expect(settingsStore.mailSignature.realName).toBe('示例姓名')
    expect(settingsStore.mailSignature.mobile).toBe('13800000000')
    expect(settingsStore.mailSignature.fax).toBe('010-12345678')
    expect(settingsStore.mailSignature.website).toBe('www.example.com')
    expect(settingsStore.mailSignature.company).toBe('示例科技有限公司')
    expect(settingsStore.mailSignature.address).toBe('示例市示例区示例路 88 号')
  })

  it('服务端默认邮件签名应使用通用示例而不是个人信息', () => {
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.displayName).toBe('示例昵称')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.realName).toBe('示例姓名')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.mobile).toBe('13800000000')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.fax).toBe('010-12345678')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.website).toBe('www.example.com')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.company).toBe('示例科技有限公司')
    expect(DEFAULT_MAIL_SIGNATURE_CONFIG.address).toBe('示例市示例区示例路 88 号')
  })
})
