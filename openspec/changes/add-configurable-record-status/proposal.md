# Change: 添加可配置的工作记录状态

## Why

当前工作记录只能描述项目、工作类型和内容，无法表达“进行中、待验证、已阻塞”等实际进展。用户需要像管理项目和工作类型一样维护可选状态，并在记录列表中筛选，同时保持现有周报模板结构不变。

## What Changes

- 为工作记录新增单选状态字段
- 设置页新增工作状态配置，支持新增、编辑、删除和排序
- 提供“待开始、进行中、待验证、已完成、已阻塞、已暂停”默认状态
- 工作记录录入和编辑时可选择状态
- 工作记录页支持按项目、工作类型和状态组合筛选
- 周报记录标签扩展为 `[项目][工作类型][状态]`，不修改现有章节和下周计划格式
- 历史无状态记录按“已完成”兼容展示

## Impact

- Affected specs: `record-status`
- Affected code:
  - `server/db.js`
  - `server/api.js`
  - `server/cron.js`
  - `src/stores/records.js`
  - `src/stores/settings.js`
  - `src/components/InputBox.vue`
  - `src/components/RecordCard.vue`
  - `src/components/RecordList.vue`
  - `src/views/SettingsView.vue`
  - `src/composables/useGenerator.js`
  - 相关测试与文档

