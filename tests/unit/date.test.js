// ========================================
// 日期工具函数测试
// ========================================

import { describe, it, expect } from 'vitest'
import { getWeekStart, getWeekEnd, formatDate } from '@/utils/date'

describe('getWeekStart', () => {
  it('应该返回本周一的开始时间（周一为每周第一天）', () => {
    // 2026-01-08 是周三
    const date = new Date('2026-01-08T10:00:00')
    const weekStart = getWeekStart(date)

    // 应该返回 2026-01-05（周一）00:00:00
    expect(weekStart.getDay()).toBe(1) // 周一
    expect(weekStart.getHours()).toBe(0)
    expect(weekStart.getMinutes()).toBe(0)
    expect(weekStart.getSeconds()).toBe(0)
  })

  it('应该正确处理周一本身', () => {
    // 2026-01-05 是周一
    const date = new Date('2026-01-05T15:30:00')
    const weekStart = getWeekStart(date)

    expect(weekStart.toDateString()).toBe('Mon Jan 05 2026')
    expect(weekStart.getHours()).toBe(0)
  })
})

describe('getWeekEnd', () => {
  it('应该返回本周日的结束时间', () => {
    // 2026-01-08 是周三
    const date = new Date('2026-01-08T10:00:00')
    const weekEnd = getWeekEnd(date)

    // 应该返回 2026-01-11（周日）23:59:59
    expect(weekEnd.getDay()).toBe(0) // 周日
    expect(weekEnd.getHours()).toBe(23)
    expect(weekEnd.getMinutes()).toBe(59)
    expect(weekEnd.getSeconds()).toBe(59)
  })
})

describe('formatDate', () => {
  it('应该正确格式化年份和周数', () => {
    const date = new Date('2026-01-08') // 2026年第2周
    const formatted = formatDate(date, 'YYYY年第W周')

    expect(formatted).toMatch(/2026年第\d周/)
  })

  it('应该正确格式化完整日期', () => {
    const date = new Date('2026-01-08T14:30:00')
    const formatted = formatDate(date, 'YYYY-MM-DD HH:mm:ss')

    expect(formatted).toBe('2026-01-08 14:30:00')
  })

  it('应该处理空字符串格式', () => {
    const date = new Date('2026-01-08')
    const formatted = formatDate(date, '')

    expect(formatted).toBe('')
  })
})
