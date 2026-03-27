import { describe, it, expect } from 'vitest'
import { getConversionStatusKey } from '@/../server/cron.js'

describe('getConversionStatusKey', () => {
  it('应基于上周周报的 weekStart 生成统一转换标记 key', () => {
    const weekStart = '2026-03-23T00:00:00.000Z'

    expect(getConversionStatusKey(weekStart)).toBe(`converted_plans_${weekStart}`)
  })
})
