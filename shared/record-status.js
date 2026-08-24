export const DEFAULT_RECORD_STATUS = '已完成'
export const PLAN_RECORD_STATUS = '待开始'
export const DEFAULT_RECORD_STATUSES = ['待开始', '进行中', '待验证', '已完成', '已阻塞', '已暂停']

export const getRecordStatusNames = (statuses = []) => statuses
  .map(status => typeof status === 'string' ? status : status?.name)
  .map(status => String(status || '').trim())
  .filter(Boolean)

export const getDefaultRecordStatus = (statuses = []) => {
  const names = getRecordStatusNames(statuses)
  return names.includes(DEFAULT_RECORD_STATUS) ? DEFAULT_RECORD_STATUS : (names[0] || DEFAULT_RECORD_STATUS)
}

export const resolveRecordStatus = (status) => String(status || '').trim() || DEFAULT_RECORD_STATUS

export const mergeRecordStatusNames = (statuses = [], records = []) => [
  ...new Set([
    ...getRecordStatusNames(statuses),
    ...records.map(record => resolveRecordStatus(record.status))
  ])
]
