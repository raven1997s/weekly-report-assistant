// ========================================
// 智能周报助手 - 后端日期工具函数
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
const isHoliday = (date) => {
    const d = new Date(date)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return CHINESE_HOLIDAYS[key] === 'holiday'
}

/**
 * 检查指定日期是否为调休工作日
 * @param {Date} date
 * @returns {boolean}
 */
const isExtraWorkday = (date) => {
    const d = new Date(date)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return CHINESE_HOLIDAYS[key] === 'workday'
}

/**
 * 检查指定日期是否为工作日
 * 工作日 = 需要上班的日子（不是简单的周一到周五）
 * 考虑因素：
 * 1. 周六周日：检查是否为调休补班
 * 2. 周一到周五：检查是否为法定节假日
 * @param {Date} date
 * @returns {boolean}
 */
const isWorkday = (date) => {
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
 * 获取工作周信息
 * 工作周 = 从第一个工作日到最后一个工作日的连续范围
 * @param {Date} date
 * @returns {Object} { start: Date, end: Date, workdayCount: number, holidayCount: number, upcomingHolidays: Array }
 */
const getWorkWeekInfo = (date) => {
    const referenceDate = new Date(date)

    // 第一步：从参考日期往回找工作周的开始（第一个连续工作日序列的开始）
    let startDate = new Date(referenceDate)
    const maxSearchDays = 14

    // 往回找，直到遇到非工作日
    while (true) {
        const prevDay = new Date(startDate)
        prevDay.setDate(prevDay.getDate() - 1)

        // 如果前一天不是工作日，则当前日期是周开始
        if (!isWorkday(prevDay)) {
            break
        }

        // 继续往前搜索
        startDate = prevDay

        // 安全检查
        const daysDiff = Math.round((referenceDate - startDate) / (1000 * 60 * 60 * 24))
        if (daysDiff > maxSearchDays) break
    }

    // 第二步：从参考日期往后找本周最后一个工作日
    let endDate = new Date(referenceDate)

    // 往后找，直到找到最后一个连续工作日
    while (true) {
        const nextDay = new Date(endDate)
        nextDay.setDate(nextDay.getDate() + 1)

        // 如果后一天不是工作日，或者是周日，则当前日期是周结束
        if (!isWorkday(nextDay) || nextDay.getDay() === 0) {
            break
        }

        // 继续往后搜索
        endDate = nextDay

        // 安全检查
        const daysDiff = Math.round((endDate - referenceDate) / (1000 * 60 * 60 * 24))
        if (daysDiff > maxSearchDays) break
    }

    // 第三步：收集从startDate到endDate的所有日期
    const workdays = []
    let currentDate = new Date(startDate)
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

    // 第四步：找出本周接下来的休息日（从最后一个工作日的后一天开始，最多7天）
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

/**
 * 格式化日期
 * @param {Date} date
 * @param {string} format - 格式字符串，支持: yyyy, MM, dd
 * @returns {string}
 */
const formatDate = (date, format = 'yyyy-MM-dd') => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')

    return format
        .replace('yyyy', year)
        .replace('yyyy', year) // 首先替换 yyyy（避免被 yy 替换）
        .replace('MM', month)
        .replace('dd', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds)
}

export {
    CHINESE_HOLIDAYS,
    isHoliday,
    isExtraWorkday,
    isWorkday,
    getWorkWeekInfo,
    formatDate
}
