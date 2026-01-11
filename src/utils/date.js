// ========================================
// 智能周报助手 - 日期工具函数
// ========================================

/**
 * 中国节假日数据（每年需要更新）
 * 格式：'MM-DD': 类型
 * 类型：'holiday' = 法定节假日, 'workday' = 调休工作日
 */
const CHINESE_HOLIDAYS = {
    // 2026年节假日（根据国务院办公厅2025年11月4日发布的通知）
    '01-01': 'holiday', // 元旦
    '01-02': 'holiday',
    '01-03': 'holiday',
    '01-04': 'workday', // 元旦调休补班（周日）

    '02-14': 'workday', // 春节调休补班（周六）
    '02-15': 'holiday', // 春节
    '02-16': 'holiday',
    '02-17': 'holiday',
    '02-18': 'holiday',
    '02-19': 'holiday',
    '02-20': 'holiday',
    '02-21': 'holiday',
    '02-22': 'holiday',
    '02-23': 'holiday', // 春节假期结束
    '02-24': 'workday', // 春节调休补班（周二）

    '04-04': 'holiday', // 清明节
    '04-05': 'holiday',
    '04-06': 'holiday',

    '05-01': 'holiday', // 劳动节
    '05-02': 'holiday',
    '05-03': 'holiday',
    '05-04': 'holiday',
    '05-05': 'holiday', // 劳动节假期结束
    '05-09': 'workday', // 劳动节调休补班（周六）

    '06-19': 'holiday', // 端午节
    '06-20': 'holiday',
    '06-21': 'holiday',

    '09-20': 'workday', // 国庆节调休补班（周日）
    '09-25': 'holiday', // 中秋节
    '09-26': 'holiday',
    '09-27': 'holiday',

    '10-01': 'holiday', // 国庆节
    '10-02': 'holiday',
    '10-03': 'holiday',
    '10-04': 'holiday',
    '10-05': 'holiday',
    '10-06': 'holiday',
    '10-07': 'holiday', // 国庆假期结束
    '10-10': 'workday', // 国庆节调休补班（周六）
}

/**
 * 检查指定日期是否为节假日
 * @param {Date} date
 * @returns {boolean}
 */
export const isHoliday = (date) => {
    const d = new Date(date)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return CHINESE_HOLIDAYS[key] === 'holiday'
}

/**
 * 检查指定日期是否为调休工作日
 * @param {Date} date
 * @returns {boolean}
 */
export const isExtraWorkday = (date) => {
    const d = new Date(date)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return CHINESE_HOLIDAYS[key] === 'workday'
}

/**
 * 检查指定日期是否为工作日
 * @param {Date} date
 * @returns {boolean}
 */
export const isWorkday = (date) => {
    const d = new Date(date)
    const day = d.getDay()

    // 周六周日
    if (day === 0 || day === 6) {
        // 检查是否为调休工作日
        return isExtraWorkday(date)
    }

    // 周一到周五，检查是否为节假日
    return !isHoliday(date)
}

/**
 * 获取指定日期所在周的周一（作为周起始）
 * @param {Date} date
 * @returns {Date}
 */
export const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 周一为周起始
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

/**
 * 获取指定日期所在周的周日（作为周结束）
 * @param {Date} date 
 * @returns {Date}
 */
export const getWeekEnd = (date) => {
    const start = getWeekStart(date)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
}

/**
 * 获取指定日期是一年中的第几周
 * @param {Date} date 
 * @returns {number}
 */
export const getWeekNumber = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * 格式化日期
 * @param {Date} date 
 * @param {string} format - 格式字符串，支持: YYYY, MM, DD, HH, mm, ss, W(周数)
 * @returns {string}
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const week = getWeekNumber(d)

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds)
        .replace('W', week)
}

/**
 * 获取相对时间描述
 * @param {Date|string} date 
 * @returns {string}
 */
export const getRelativeTime = (date) => {
    const now = new Date()
    const d = new Date(date)
    const diff = now - d

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${Math.floor(days / 365)}年前`
}

/**
 * 判断两个日期是否在同一周
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isSameWeek = (date1, date2) => {
    const start1 = getWeekStart(date1).getTime()
    const start2 = getWeekStart(date2).getTime()
    return start1 === start2
}

/**
 * 获取本周标签（如"2026年第2周"）
 * @param {Date} date 
 * @returns {string}
 */
export const getWeekLabel = (date) => {
    const d = new Date(date)
    return `${d.getFullYear()}年第${getWeekNumber(d)}周`
}

/**
 * 获取本周日期范围字符串（如"01.06 - 01.12"）
 * @param {Date} date
 * @returns {string}
 */
export const getWeekRange = (date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return `${formatDate(start, 'MM.DD')} - ${formatDate(end, 'MM.DD')}`
}

/**
 * 获取工作周范围
 *
 * 核心逻辑：在自然周范围内（周一到周日），识别工作周边界
 * 这样可以确保在同一周内不同日期打开页面，周信息保持一致
 *
 * 特殊处理：如果自然周内全是节假日，扩展到相邻的工作日
 *
 * @param {Date} date - 参考日期
 * @returns {Object} { start: Date, end: Date, workdays: Array, holidayCount: number, workdayCount: number, upcomingHolidays: Array }
 */
export const getWorkWeekInfo = (date) => {
    // ============ 第一步：获取自然周边界（周一到周日） ============
    const naturalWeekStart = getWeekStart(date)
    const naturalWeekEnd = getWeekEnd(date)

    // ============ 第二步：在自然周范围内，查找第一个工作日作为工作周开始 ============
    let startDate = null
    let currentDate = new Date(naturalWeekStart)

    while (currentDate <= naturalWeekEnd) {
        if (isWorkday(currentDate)) {
            startDate = new Date(currentDate)
            break
        }
        currentDate.setDate(currentDate.getDate() + 1)
    }

    // 特殊处理：如果自然周内没有工作日，往回找最近的工作日
    if (!startDate) {
        // 往回找最多7天
        startDate = new Date(naturalWeekStart)
        let searchCount = 0
        const maxSearchDays = 7

        while (!isWorkday(startDate) && searchCount < maxSearchDays) {
            startDate.setDate(startDate.getDate() - 1)
            searchCount++
        }

        // 如果还是找不到，使用自然周开始（兜底）
        if (!isWorkday(startDate)) {
            startDate = new Date(naturalWeekStart)
        }
    }

    // ============ 第三步：在自然周范围内，查找最后一个工作日作为工作周结束 ============
    let endDate = null
    currentDate = new Date(naturalWeekEnd)

    while (currentDate >= naturalWeekStart) {
        if (isWorkday(currentDate)) {
            endDate = new Date(currentDate)
            break
        }
        currentDate.setDate(currentDate.getDate() - 1)
    }

    // 特殊处理：如果自然周内没有工作日，往后找最近的工作日
    if (!endDate) {
        // 往后找最多7天
        endDate = new Date(naturalWeekEnd)
        let searchCount = 0
        const maxSearchDays = 7

        while (!isWorkday(endDate) && searchCount < maxSearchDays) {
            endDate.setDate(endDate.getDate() + 1)
            searchCount++
        }

        // 如果还是找不到，使用自然周结束（兜底）
        if (!isWorkday(endDate)) {
            endDate = new Date(naturalWeekEnd)
        }
    }

    // ============ 第四步：收集从startDate到endDate的所有日期 ============
    const workdays = []
    currentDate = new Date(startDate)
    let totalWorkdays = 0

    while (currentDate <= endDate) {
        if (isWorkday(currentDate)) {
            workdays.push({
                date: new Date(currentDate),
                isWorkday: true,
                isHoliday: isHoliday(currentDate),
                isExtraWorkday: isExtraWorkday(currentDate),
                weekday: currentDate.getDay()
            })
            totalWorkdays++
        } else {
            workdays.push({
                date: new Date(currentDate),
                isWorkday: false,
                isHoliday: isHoliday(currentDate),
                isExtraWorkday: isExtraWorkday(currentDate),
                weekday: currentDate.getDay()
            })
        }

        currentDate.setDate(currentDate.getDate() + 1)
    }

    const holidayCount = workdays.filter(d => !d.isWorkday).length

    // ============ 第五步：找出本周接下来的休息日（从最后一个工作日的后一天开始，最多7天） ============
    const upcomingHolidays = []
    const searchEnd = new Date(endDate)
    searchEnd.setDate(searchEnd.getDate() + 7)

    let searchDate = new Date(endDate)
    searchDate.setDate(searchDate.getDate() + 1)

    while (searchDate <= searchEnd) {
        if (!isWorkday(searchDate)) {
            upcomingHolidays.push({
                date: new Date(searchDate),
                isHoliday: isHoliday(searchDate),
                isWeekend: searchDate.getDay() === 0 || searchDate.getDay() === 6,
                weekday: searchDate.getDay()
            })
        }
        searchDate.setDate(searchDate.getDate() + 1)
    }

    return {
        start: startDate,
        end: endDate,
        workdays,
        holidayCount,
        workdayCount: totalWorkdays,
        upcomingHolidays
    }
}

