// ========================================
// Mock 数据生成器
// ========================================

/**
 * 生成模拟的工作记录
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 工作记录对象
 */
export const generateMockRecord = (overrides = {}) => {
  const now = new Date()
  return {
    id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: '完成WMS仓储功能开发',
    project: 'WMS',
    workType: '需求开发',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deleted: 0,
    deletedAt: null,
    ...overrides
  }
}

/**
 * 生成模拟的周报
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 周报对象
 */
export const generateMockReport = (overrides = {}) => {
  const now = new Date()
  return {
    id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    weekStart: now.toISOString(),
    weekLabel: '2026年第2周',
    content: '本周完成工作',
    markdown: '**本周完成工作**',
    plainText: '本周完成工作',
    records: [],
    plans: [],
    reflections: { gains: '', losses: '' },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deleted: 0,
    deletedAt: null,
    ...overrides
  }
}

/**
 * 生成模拟的定时任务
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 定时任务对象
 */
export const generateMockScheduledTask = (overrides = {}) => {
  const now = new Date()
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '工作日上班后提醒',
    type: 'daily_reminder',
    enabled: true,
    time: '09:00',
    dayOfWeek: '*',
    config: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deleted: 0,
    deletedAt: null,
    ...overrides
  }
}

/**
 * 生成模拟的应用设置
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 应用设置对象
 */
export const generateMockSettings = (overrides = {}) => {
  return {
    key: 'app_settings',
    value: {
      projects: ['WMS', 'OMS', '其他'],
      workTypes: ['需求开发', 'Bug修复', '优化', '其他'],
      theme: 'light',
      dingtalk: {
        webhookUrl: '',
        secret: '',
        enabled: false
      }
    },
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

/**
 * 获取节假日测试用例
 * @returns {Array} 节假日测试用例数组
 */
export const getHolidayTestCases = () => [
  // 2026年节假日测试用例
  { date: '2026-01-01', expectedHoliday: true, description: '元旦' },
  { date: '2026-01-02', expectedHoliday: true, description: '元旦假期' },
  { date: '2026-01-03', expectedHoliday: true, description: '元旦假期' },
  { date: '2026-01-04', expectedWorkday: true, description: '元旦调休（周日）' },

  { date: '2026-02-14', expectedWorkday: true, description: '春节调休（周六）' },
  { date: '2026-02-15', expectedHoliday: true, description: '春节' },
  { date: '2026-02-16', expectedHoliday: true, description: '春节' },
  { date: '2026-02-23', expectedHoliday: true, description: '春节假期' },
  { date: '2026-02-24', expectedWorkday: true, description: '春节调休（周二）' },

  { date: '2026-04-04', expectedHoliday: true, description: '清明节' },
  { date: '2026-04-05', expectedHoliday: true, description: '清明节' },
  { date: '2026-04-06', expectedHoliday: true, description: '清明节' },

  { date: '2026-05-01', expectedHoliday: true, description: '劳动节' },
  { date: '2026-05-02', expectedHoliday: true, description: '劳动节' },
  { date: '2026-05-03', expectedHoliday: true, description: '劳动节' },
  { date: '2026-05-04', expectedHoliday: true, description: '劳动节' },
  { date: '2026-05-05', expectedHoliday: true, description: '劳动节' },
  { date: '2026-05-09', expectedWorkday: true, description: '劳动节调休（周六）' },

  { date: '2026-06-19', expectedHoliday: true, description: '端午节' },
  { date: '2026-06-20', expectedHoliday: true, description: '端午节' },
  { date: '2026-06-21', expectedHoliday: true, description: '端午节' },

  { date: '2026-09-20', expectedWorkday: true, description: '国庆节调休（周日）' },
  { date: '2026-09-25', expectedHoliday: true, description: '中秋节' },
  { date: '2026-09-26', expectedHoliday: true, description: '中秋节' },
  { date: '2026-09-27', expectedHoliday: true, description: '中秋节' },

  { date: '2026-10-01', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-02', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-03', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-04', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-05', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-06', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-07', expectedHoliday: true, description: '国庆节' },
  { date: '2026-10-10', expectedWorkday: true, description: '国庆节调休（周六）' }
]

/**
 * 批量生成模拟记录
 * @param {number} count - 生成数量
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Array} 工作记录数组
 */
export const generateMockRecords = (count, overrides = {}) => {
  const records = []
  for (let i = 0; i < count; i++) {
    records.push(generateMockRecord({
      ...overrides,
      id: `record-${Date.now()}-${i}`,
      content: overrides.content || `完成工作记录 ${i + 1}`
    }))
  }
  return records
}

/**
 * 生成不同优先级的测试记录
 * @returns {Array} 包含所有优先级的记录数组
 */
export const generatePriorityTestRecords = () => {
  return [
    generateMockRecord({
      id: 'priority-0',
      project: 'WMS',
      workType: '需求开发',
      content: '优先级0：项目明确 + 类型明确'
    }),
    generateMockRecord({
      id: 'priority-1',
      project: 'WMS',
      workType: '其他',
      content: '优先级1：只有项目明确'
    }),
    generateMockRecord({
      id: 'priority-2',
      project: '其他',
      workType: 'Bug修复',
      content: '优先级2：只有类型明确'
    }),
    generateMockRecord({
      id: 'priority-3',
      project: '其他',
      workType: '其他',
      content: '优先级3：都是其他'
    })
  ]
}

/**
 * 生成 API 响应的 Mock 数据
 * @param {string} type - 响应类型（success/error）
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} API 响应对象
 */
export const generateMockApiResponse = (type = 'success', data = null, message = '') => {
  if (type === 'success') {
    return {
      success: true,
      data,
      message: message || '操作成功'
    }
  } else {
    return {
      success: false,
      error: message || '操作失败'
    }
  }
}

/**
 * 生成模拟的钉钉配置
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 钉钉配置对象
 */
export const generateMockDingTalkConfig = (overrides = {}) => {
  return {
    webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
    secret: 'SEC1234567890abcdef',
    enabled: true,
    ...overrides
  }
}

/**
 * 生成模拟的工作计划
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 工作计划对象
 */
export const generateMockPlan = (overrides = {}) => {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: '下周完成WMS优化',
    project: 'WMS',
    workType: '优化',
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

/**
 * 生成模拟的得与失
 * @param {Object} overrides - 覆盖默认值的属性
 * @returns {Object} 得与失对象
 */
export const generateMockReflections = (overrides = {}) => {
  return {
    gains: '完成了重要的功能开发',
    losses: '时间管理需要改进',
    ...overrides
  }
}
