import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RECORD_STATUS,
  PLAN_RECORD_STATUS,
  getDefaultRecordStatus,
  getRecordStatusNames,
  mergeRecordStatusNames,
  resolveRecordStatus
} from '../../shared/record-status.js'

describe('工作记录状态规则', () => {
  it('优先使用已完成作为手工记录默认状态', () => {
    expect(getDefaultRecordStatus([{ name: '进行中' }, { name: '已完成' }])).toBe('已完成')
  })

  it('已完成被删除时使用配置列表第一项', () => {
    expect(getDefaultRecordStatus([{ name: '进行中' }, { name: '已阻塞' }])).toBe('进行中')
  })

  it('空配置和历史空状态都回退为已完成', () => {
    expect(getDefaultRecordStatus([])).toBe(DEFAULT_RECORD_STATUS)
    expect(resolveRecordStatus(null)).toBe(DEFAULT_RECORD_STATUS)
  })

  it('计划转换状态固定为进行中', () => {
    expect(PLAN_RECORD_STATUS).toBe('进行中')
  })

  it('兼容字符串和对象格式的状态配置', () => {
    expect(getRecordStatusNames(['进行中', { name: '已完成' }, { name: '' }])).toEqual(['进行中', '已完成'])
  })

  it('筛选项合并配置和历史记录中的旧状态', () => {
    expect(mergeRecordStatusNames(
      [{ name: '已完成' }, { name: '进行中' }],
      [{ status: '已阻塞' }, { status: null }]
    )).toEqual(['已完成', '进行中', '已阻塞'])
  })
})
