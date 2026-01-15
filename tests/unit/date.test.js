// ========================================
// 日期工具函数测试
// ========================================

import { describe, it, expect } from 'vitest'
import { getWeekStart, getWeekEnd, formatDate, isWorkday, getWorkWeekInfo } from '@/utils/date'

describe('isWorkday', () => {
  describe('普通工作日（周一到周五）', () => {
    it('应该正确识别周一到周五为工作日', () => {
      expect(isWorkday(new Date('2026-01-05'))).toBe(true) // 周一
      expect(isWorkday(new Date('2026-01-06'))).toBe(true) // 周二
      expect(isWorkday(new Date('2026-01-07'))).toBe(true) // 周三
      expect(isWorkday(new Date('2026-01-08'))).toBe(true) // 周四
      expect(isWorkday(new Date('2026-01-09'))).toBe(true) // 周五
    })
  })

  describe('普通周末（周六日）', () => {
    it('应该正确识别周六日为非工作日', () => {
      // 注意：1/4虽然是周六，但也是元旦调休补班（工作日）
      // 所以我们需要使用一个非补班的周末来测试
      // 2026-01-10 是周六，1/11 是周日
      expect(isWorkday(new Date('2026-01-10'))).toBe(false) // 周六（非补班）
      expect(isWorkday(new Date('2026-01-11'))).toBe(false) // 周日（非补班）
    })
  })

  describe('2026年元旦节假日', () => {
    it('应该识别1月1-3日为节假日（非工作日）', () => {
      expect(isWorkday(new Date('2026-01-01'))).toBe(false) // 元旦
      expect(isWorkday(new Date('2026-01-02'))).toBe(false) // 元旦假期
      expect(isWorkday(new Date('2026-01-03'))).toBe(false) // 元旦假期
    })

    it('应该识别1月4日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-01-04'))).toBe(true) // 元旦调休（周日）
    })
  })

  describe('2026年春节节假日', () => {
    it('应该识别2月15-23日为春节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-02-15'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-16'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-17'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-18'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-19'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-20'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-21'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-22'))).toBe(false) // 春节
      expect(isWorkday(new Date('2026-02-23'))).toBe(false) // 春节假期结束
    })

    it('应该识别2月14日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-02-14'))).toBe(true) // 春节调休（周六）
    })

    it('应该识别2月24日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-02-24'))).toBe(true) // 春节调休（周二）
    })
  })

  describe('2026年清明节', () => {
    it('应该识别4月4-6日为清明节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-04-04'))).toBe(false) // 清明节
      expect(isWorkday(new Date('2026-04-05'))).toBe(false) // 清明节
      expect(isWorkday(new Date('2026-04-06'))).toBe(false) // 清明节
    })
  })

  describe('2026年劳动节', () => {
    it('应该识别5月1-5日为劳动节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-05-01'))).toBe(false) // 劳动节
      expect(isWorkday(new Date('2026-05-02'))).toBe(false) // 劳动节
      expect(isWorkday(new Date('2026-05-03'))).toBe(false) // 劳动节
      expect(isWorkday(new Date('2026-05-04'))).toBe(false) // 劳动节
      expect(isWorkday(new Date('2026-05-05'))).toBe(false) // 劳动节
    })

    it('应该识别5月9日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-05-09'))).toBe(true) // 劳动节调休（周六）
    })
  })

  describe('2026年端午节', () => {
    it('应该识别6月19-21日为端午节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-06-19'))).toBe(false) // 端午节
      expect(isWorkday(new Date('2026-06-20'))).toBe(false) // 端午节
      expect(isWorkday(new Date('2026-06-21'))).toBe(false) // 端午节
    })
  })

  describe('2026年中秋节', () => {
    it('应该识别9月25-27日为中秋节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-09-25'))).toBe(false) // 中秋节
      expect(isWorkday(new Date('2026-09-26'))).toBe(false) // 中秋节
      expect(isWorkday(new Date('2026-09-27'))).toBe(false) // 中秋节
    })

    it('应该识别9月20日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-09-20'))).toBe(true) // 国庆节调休（周日）
    })
  })

  describe('2026年国庆节', () => {
    it('应该识别10月1-7日为国庆节假期（非工作日）', () => {
      expect(isWorkday(new Date('2026-10-01'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-02'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-03'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-04'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-05'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-06'))).toBe(false) // 国庆节
      expect(isWorkday(new Date('2026-10-07'))).toBe(false) // 国庆节
    })

    it('应该识别10月10日为调休补班（工作日）', () => {
      expect(isWorkday(new Date('2026-10-10'))).toBe(true) // 国庆节调休（周六）
    })
  })
})

describe('getWorkWeekInfo', () => {
  describe('普通工作周（无节假日）', () => {
    it('应该正确计算普通工作周', () => {
      // 2026-01-08 是周三，所在周是 1/5-1/11
      // 但上周日1/4是调休补班，所以工作周从1/4开始
      const info = getWorkWeekInfo(new Date('2026-01-08'))

      expect(info.workdayCount).toBe(6) // 周日补班 + 周一到周五
      expect(info.holidayCount).toBe(0) // workdays中都是工作日
      expect(info.hasNoWorkdays).toBe(false)
      expect(info.start.getDate()).toBe(4) // 从上周日1/4开始（补班）
      expect(info.end.getDate()).toBe(9) // 到周五1/9结束
    })

    it('应该包含所有工作日的详细信息', () => {
      const info = getWorkWeekInfo(new Date('2026-01-08'))

      expect(info.workdays.length).toBe(6) // 只包含工作日
      expect(info.workdays.filter(d => d.isWorkday).length).toBe(6) // 全是工作日
      expect(info.workdays[0].isExtraWorkday).toBe(true) // 第一天是补班
    })
  })

  describe('包含调休补班的工作周', () => {
    it('应该包含上周日的补班日（元旦调休）', () => {
      // 2026-01-05 是周一，上周日1/4是补班
      const info = getWorkWeekInfo(new Date('2026-01-05'))

      expect(info.workdayCount).toBe(6) // 6个工作日
      expect(info.start.getDate()).toBe(4) // 从上周日1/4开始
      expect(info.end.getDate()).toBe(9) // 到周五1/9结束
      expect(info.workdays[0].isExtraWorkday).toBe(true) // 1/4是补班
    })

    it('应该包含上周日的补班日（国庆调休）', () => {
      // 2026-09-21 是周一，上周日9/20是补班
      // 但9/25-27是中秋节，所以工作周到9/24结束
      const info = getWorkWeekInfo(new Date('2026-09-21'))

      expect(info.workdayCount).toBe(5) // 周日补班 + 周一到周四
      expect(info.start.getDate()).toBe(20) // 从上周日9/20开始
      expect(info.end.getDate()).toBe(24) // 到周四9/24结束（因为周五是中秋节）
    })
  })

  describe('全节假日周（春节）', () => {
    it('应该正确处理春节周（2/16-2/22）', () => {
      // 2026-02-16 是周一，春节周全是节假日
      const info = getWorkWeekInfo(new Date('2026-02-16'))

      expect(info.hasNoWorkdays).toBe(true)
      expect(info.workdayCount).toBe(0)
      expect(info.holidayCount).toBe(7)
      expect(info.start).toBe(null)
      expect(info.end).toBe(null)
      expect(info.workdays).toEqual([])
    })
  })

  describe('包含节假日的混合周', () => {
    it('应该正确处理春节后补班周', () => {
      // 2026-02-23 是周二，周一2/23是节假日，周二2/24是补班
      const info = getWorkWeekInfo(new Date('2026-02-23'))

      expect(info.workdayCount).toBe(4) // 周二补班 + 周三到周五
      expect(info.holidayCount).toBe(0) // workdays中都是工作日
      expect(info.start.getDate()).toBe(24) // 从周二2/24开始（补班）
      expect(info.end.getDate()).toBe(27) // 到周五2/27结束
    })

    it('应该正确处理劳动节周（5/1是周五节假日）', () => {
      // 2026-04-27 是周一，所在周包含劳动节假期
      // 但上周六4/26不是补班，所以从周一4/27开始
      const info = getWorkWeekInfo(new Date('2026-04-27'))

      expect(info.workdayCount).toBe(4) // 周一到周四（周五开始劳动节假期）
      expect(info.holidayCount).toBe(0) // workdays中都是工作日
      expect(info.start.getDate()).toBe(27) // 从周一4/27开始
      expect(info.end.getDate()).toBe(30) // 到周四4/30结束
    })
  })

  describe('即将到来的节假日', () => {
    it('应该正确识别即将到来的周末', () => {
      // 2026-01-08 是周三
      const info = getWorkWeekInfo(new Date('2026-01-08'))

      expect(info.upcomingHolidays.length).toBeGreaterThan(0)
      // 应该包含周六、周日
      const hasWeekend = info.upcomingHolidays.some(h => h.isWeekend)
      expect(hasWeekend).toBe(true)
    })

    it('应该正确识别即将到来的节假日', () => {
      // 2026-04-27 是周一，下周是劳动节
      const info = getWorkWeekInfo(new Date('2026-04-27'))

      // 应该包含劳动节假期
      const hasLaborDay = info.upcomingHolidays.some(h =>
        h.date.getMonth() === 4 && h.date.getDate() === 1
      )
      expect(hasLaborDay).toBe(true)
    })
  })

  describe('工作日详细信息', () => {
    it('应该正确标记补班日', () => {
      const info = getWorkWeekInfo(new Date('2026-01-05'))
      const extraWorkday = info.workdays.find(d =>
        d.date.getDate() === 4 && d.isExtraWorkday
      )

      expect(extraWorkday).toBeDefined()
      expect(extraWorkday.isWorkday).toBe(true)
      expect(extraWorkday.isHoliday).toBe(false)
      expect(extraWorkday.isExtraWorkday).toBe(true)
    })

    it('应该正确标记节假日（在workdays中不会有非工作日）', () => {
      // 注意：getWorkWeekInfo 只收集工作日到 workdays 数组中
      // 所以节假日不会出现在 workdays 中
      // 但我们可以通过 upcomingHolidays 查找即将到来的节假日
      const info = getWorkWeekInfo(new Date('2026-04-27'))
      const laborDay = info.upcomingHolidays.find(h =>
        h.date.getMonth() === 4 && h.date.getDate() === 1 && h.isHoliday
      )

      expect(laborDay).toBeDefined()
      expect(laborDay.isHoliday).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('应该正确处理跨月的工作周', () => {
      // 2026-01-29 是周四，所在周是 1/26-2/1
      const info = getWorkWeekInfo(new Date('2026-01-29'))

      expect(info.workdayCount).toBe(5)
      expect(info.start.getMonth()).toBe(0) // 1月
      expect(info.end.getMonth()).toBe(0) // 1月（到周五1/30）
    })

    it('应该正确处理跨年的工作周', () => {
      // 2025-12-31 是周三，所在周是 12/29-1/4
      const info = getWorkWeekInfo(new Date('2025-12-31'))

      expect(info.workdayCount).toBe(4) // 周四到周日，其中1/1-1/3是节假日
      expect(info.start.getFullYear()).toBe(2025)
      expect(info.end.getFullYear()).toBe(2026)
    })
  })
})

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
