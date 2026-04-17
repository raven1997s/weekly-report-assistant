import { describe, expect, it } from 'vitest'
import { buildMailSubject, getMailTemplateConfigFromSettings } from '../../server/mail-templates.js'

describe('mail template subject', () => {
  it('应该生成旧版周报主题格式并包含工作周日期范围', () => {
    const subject = buildMailSubject({
      weekStart: '2026-04-13T00:00:00.000Z'
    })

    expect(subject).toBe('2026年4月第3周工作周报（4.13-4.17）')
  })

  it('应该将旧默认标题后缀兼容迁移为工作周报', () => {
    const templateConfig = getMailTemplateConfigFromSettings({
      mail_template_title_suffix: '厚朴汤 部门工作周报'
    })

    expect(templateConfig.titleSuffix).toBe('工作周报')
  })

  it('应该保留用户自定义标题后缀', () => {
    const templateConfig = getMailTemplateConfigFromSettings({
      mail_template_title_suffix: '研发组周报'
    })

    expect(templateConfig.titleSuffix).toBe('研发组周报')
  })
})
