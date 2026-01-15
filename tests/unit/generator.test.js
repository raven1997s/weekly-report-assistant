// ========================================
// 周报生成逻辑测试
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGenerator } from '@/composables/useGenerator'

// Mock useParser 中的 polishContent 函数
vi.mock('@/composables/useParser', () => ({
  useParser: () => ({
    polishContent: (content) => content // 直接返回原内容
  })
}))

describe('generateTags', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该生成 [项目][类型] 格式（项目明确 + 类型明确）', () => {
    expect(generator.generateTags('WMS', '需求开发')).toBe('[WMS][需求开发]')
  })

  it('应该生成 [项目][其他] 格式（项目明确 + 类型为其他）', () => {
    expect(generator.generateTags('WMS', '其他')).toBe('[WMS][其他]')
    expect(generator.generateTags('WMS', null)).toBe('[WMS][其他]')
  })

  it('应该生成 [类型] 格式（项目为其他 + 类型明确）', () => {
    expect(generator.generateTags('其他', 'Bug修复')).toBe('[Bug修复]')
    expect(generator.generateTags(null, 'Bug修复')).toBe('[Bug修复]')
  })

  it('应该生成 [其他] 格式（项目为其他 + 类型为其他）', () => {
    expect(generator.generateTags('其他', '其他')).toBe('[其他]')
    expect(generator.generateTags(null, null)).toBe('[其他]')
  })

  it('应该生成 [项目] 格式（只有项目，没有类型）', () => {
    expect(generator.generateTags('WMS', undefined)).toBe('[WMS][其他]')
  })

  it('应该生成 [类型] 格式（只有类型，没有项目）', () => {
    expect(generator.generateTags(undefined, 'Bug修复')).toBe('[Bug修复]')
  })
})

describe('getRecordPriority', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该返回优先级 0（项目明确 + 类型明确）', () => {
    const record = { project: 'WMS', workType: '需求开发' }
    expect(generator.getRecordPriority(record)).toBe(0)
  })

  it('应该返回优先级 1（只有项目明确）', () => {
    const record = { project: 'WMS', workType: '其他' }
    expect(generator.getRecordPriority(record)).toBe(1)
  })

  it('应该返回优先级 1（只有项目明确，类型为空）', () => {
    const record = { project: 'WMS', workType: null }
    expect(generator.getRecordPriority(record)).toBe(1)
  })

  it('应该返回优先级 2（只有类型明确）', () => {
    const record = { project: '其他', workType: 'Bug修复' }
    expect(generator.getRecordPriority(record)).toBe(2)
  })

  it('应该返回优先级 2（只有类型明确，项目为空）', () => {
    const record = { project: null, workType: 'Bug修复' }
    expect(generator.getRecordPriority(record)).toBe(2)
  })

  it('应该返回优先级 3（都是其他）', () => {
    const record = { project: '其他', workType: '其他' }
    expect(generator.getRecordPriority(record)).toBe(3)
  })

  it('应该返回优先级 3（都是空）', () => {
    const record = { project: null, workType: null }
    expect(generator.getRecordPriority(record)).toBe(3)
  })
})

describe('sortByPriority', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该按优先级从小到大排序', () => {
    const records = [
      { project: '其他', workType: '其他' }, // 优先级 3
      { project: 'WMS', workType: '需求开发' }, // 优先级 0
      { project: 'WMS', workType: '其他' }, // 优先级 1
      { project: '其他', workType: 'Bug修复' } // 优先级 2
    ]
    const sorted = generator.sortByPriority(records)

    expect(sorted[0].project).toBe('WMS')
    expect(sorted[0].workType).toBe('需求开发')
    expect(sorted[1].project).toBe('WMS')
    expect(sorted[1].workType).toBe('其他')
    expect(sorted[2].project).toBe('其他')
    expect(sorted[2].workType).toBe('Bug修复')
    expect(sorted[3].project).toBe('其他')
    expect(sorted[3].workType).toBe('其他')
  })

  it('应该保持相同优先级的记录的相对顺序', () => {
    const records = [
      { id: 1, project: 'WMS', workType: '需求开发' },
      { id: 2, project: 'WMS', workType: 'Bug修复' },
      { id: 3, project: 'OMS', workType: '需求开发' }
    ]
    const sorted = generator.sortByPriority(records)

    // 所有记录优先级都是 0，顺序应该保持不变
    expect(sorted[0].id).toBe(1)
    expect(sorted[1].id).toBe(2)
    expect(sorted[2].id).toBe(3)
  })

  it('应该返回新数组而不修改原数组', () => {
    const records = [
      { project: 'WMS', workType: '需求开发' }
    ]
    const sorted = generator.sortByPriority(records)

    expect(sorted).not.toBe(records)
    expect(records).toHaveLength(1)
  })
})

describe('groupByProject', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该按项目分组记录', () => {
    const records = [
      { id: 1, content: '完成WMS功能', project: 'WMS' },
      { id: 2, content: '修复OMS Bug', project: 'OMS' },
      { id: 3, content: 'WMS优化', project: 'WMS' }
    ]
    const grouped = generator.groupByProject(records)

    expect(Object.keys(grouped)).toHaveLength(2)
    expect(grouped.WMS).toHaveLength(2)
    expect(grouped.OMS).toHaveLength(1)
    expect(grouped.WMS[0].id).toBe(1)
    expect(grouped.WMS[1].id).toBe(3)
  })

  it('应该将 project 为 null 的记录归为"其他"', () => {
    const records = [
      { id: 1, content: '完成功能', project: null },
      { id: 2, content: '修复Bug', project: undefined }
    ]
    const grouped = generator.groupByProject(records)

    expect(grouped['其他']).toHaveLength(2)
  })
})

describe('groupByType', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该按工作类型分组记录', () => {
    const records = [
      { id: 1, content: '完成功能', workType: '需求开发' },
      { id: 2, content: '修复Bug', workType: 'Bug修复' },
      { id: 3, content: '优化性能', workType: '需求开发' }
    ]
    const grouped = generator.groupByType(records)

    expect(Object.keys(grouped)).toHaveLength(2)
    expect(grouped['需求开发']).toHaveLength(2)
    expect(grouped['Bug修复']).toHaveLength(1)
  })

  it('应该将 workType 为 null 的记录归为"其他"', () => {
    const records = [
      { id: 1, content: '完成功能', workType: null },
      { id: 2, content: '修复Bug', workType: undefined }
    ]
    const grouped = generator.groupByType(records)

    expect(grouped['其他']).toHaveLength(2)
  })
})

describe('generateMarkdown', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该生成包含标题的 Markdown', () => {
    const result = generator.generateMarkdown({
      records: [],
      plans: [],
      reflections: {}
    })

    expect(result).toContain('**本周完成工作**')
    expect(result).toContain('**下周工作计划**')
    expect(result).toContain('**本周得与失**')
  })

  it('应该生成带加粗的标题', () => {
    const result = generator.generateMarkdown({
      records: [],
      plans: [],
      reflections: {}
    })

    // Markdown 格式带 **
    expect(result).toMatch(/\*\*本周完成工作\*\*/)
    expect(result).toMatch(/\*\*下周工作计划\*\*/)
    expect(result).toMatch(/\*\*本周得与失\*\*/)
  })

  it('应该生成带标签的工作记录', () => {
    const records = [
      { content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
    ]
    const result = generator.generateMarkdown({ records, plans: [], reflections: {} })

    expect(result).toContain('[WMS][需求开发]')
    expect(result).toContain('完成WMS功能')
  })

  it('应该按优先级排序（明确的在前，其他的在后）', () => {
    const records = [
      { content: '其他任务', project: '其他', workType: '其他' },
      { content: 'WMS功能', project: 'WMS', workType: '需求开发' }
    ]
    const result = generator.generateMarkdown({ records, plans: [], reflections: {} })

    // WMS 应该在其他之前
    const wmsIndex = result.indexOf('WMS功能')
    const otherIndex = result.indexOf('其他任务')
    expect(wmsIndex).toBeLessThan(otherIndex)
  })

  it('应该生成固定编号的得与失', () => {
    const reflections = {
      gains: '完成了重要的功能',
      losses: '时间管理需要改进'
    }
    const result = generator.generateMarkdown({ records: [], plans: [], reflections })

    expect(result).toContain('1. 完成了重要的功能')
    expect(result).toContain('2. 时间管理需要改进')
  })

  it('应该处理空的得与失', () => {
    const result = generator.generateMarkdown({
      records: [],
      plans: [],
      reflections: {}
    })

    expect(result).toContain('暂无')
  })

  it('应该处理只有得的情况', () => {
    const reflections = {
      gains: '完成了重要的功能',
      losses: ''
    }
    const result = generator.generateMarkdown({ records: [], plans: [], reflections })

    expect(result).toContain('1. 完成了重要的功能')
    expect(result).not.toContain('2.')
  })

  it('应该处理只有失的情况', () => {
    const reflections = {
      gains: '',
      losses: '时间管理需要改进'
    }
    const result = generator.generateMarkdown({ records: [], plans: [], reflections })

    // 注意：由于 gains 为空，编号从 2 开始（保留固定的 1. 2. 格式）
    expect(result).toContain('2. 时间管理需要改进')
  })
})

describe('generatePlainText', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该生成不包含 Markdown 格式的纯文本', () => {
    const result = generator.generatePlainText({
      records: [],
      plans: [],
      reflections: {}
    })

    // 纯文本格式不带 **
    expect(result).toContain('本周完成工作')
    expect(result).toContain('下周工作计划')
    expect(result).toContain('本周得与失')

    // 不应该有 **
    expect(result).not.toContain('**')
  })

  it('应该生成带标签的工作记录', () => {
    const records = [
      { content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
    ]
    const result = generator.generatePlainText({ records, plans: [], reflections: {} })

    expect(result).toContain('[WMS][需求开发]')
    expect(result).toContain('完成WMS功能')
  })

  it('应该生成固定编号的得与失', () => {
    const reflections = {
      gains: '完成了重要的功能',
      losses: '时间管理需要改进'
    }
    const result = generator.generatePlainText({ records: [], plans: [], reflections })

    expect(result).toContain('1. 完成了重要的功能')
    expect(result).toContain('2. 时间管理需要改进')
  })
})

describe('generateReport', () => {
  let generator

  beforeEach(() => {
    generator = useGenerator()
  })

  it('应该生成完整的周报对象', () => {
    const records = [
      { content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
    ]
    const plans = [
      { content: '下周计划', project: 'WMS', workType: '需求开发' }
    ]
    const reflections = {
      gains: '完成了重要的功能',
      losses: '时间管理需要改进'
    }

    const report = generator.generateReport({ records, plans, reflections })

    expect(report).toHaveProperty('markdown')
    expect(report).toHaveProperty('plainText')
    expect(report).toHaveProperty('records')
    expect(report).toHaveProperty('plans')
    expect(report).toHaveProperty('reflections')
    expect(report).toHaveProperty('generatedAt')
  })

  it('应该同时生成 Markdown 和纯文本', () => {
    const records = [
      { content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
    ]

    const report = generator.generateReport({ records })

    expect(report.markdown).toContain('**本周完成工作**')
    expect(report.plainText).toContain('本周完成工作')
    expect(report.plainText).not.toContain('**')
  })

  it('应该记录生成时间', () => {
    const before = new Date()
    const report = generator.generateReport({})
    const after = new Date()

    const generatedAt = new Date(report.generatedAt)
    expect(generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(generatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('应该创建数组副本（浅拷贝）', () => {
    const originalRecords = [
      { content: '完成WMS功能', project: 'WMS', workType: '需求开发' }
    ]
    const report = generator.generateReport({ records: originalRecords })

    // 数组本身是新的副本
    expect(report.records).not.toBe(originalRecords)

    // 但对象引用是相同的（浅拷贝）
    expect(report.records[0]).toBe(originalRecords[0])
  })
})
