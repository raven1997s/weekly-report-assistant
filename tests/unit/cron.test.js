import { describe, it, expect } from 'vitest'
import { getConversionStatusKey, getPlanConversionCutoff } from '@/../server/cron.js'

describe('getConversionStatusKey', () => {
  it('应基于上周周报的 weekStart 生成统一转换标记 key', () => {
    const weekStart = '2026-03-23T00:00:00.000Z'

    expect(getConversionStatusKey(weekStart)).toBe(`converted_plans_${weekStart}`)
  })
})

describe('getPlanConversionCutoff', () => {
  it('应使用本周开始时间作为转换来源周报的查询截止点，避免误取本周周报', () => {
    const today = new Date('2026-03-31T01:00:00.000Z')

    expect(getPlanConversionCutoff(today)).toBe('2026-03-29T16:00:00.000Z')
  })
})
