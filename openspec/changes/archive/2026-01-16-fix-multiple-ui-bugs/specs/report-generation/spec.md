# Capability: Report Generation

## MODIFIED Requirements

### Requirement: 周报预览中下周计划排序

周报生成系统 MUST 确保 `generateReport()` 返回的 `plans` 字段按优先级排序，SHALL 确保 [其他] 标签始终显示在最后位置。

#### Scenario: 生成周报时下周计划按优先级排序

- **GIVEN** 用户添加了多个下周计划，包含不同的项目和类型组合
- **WHEN** 用户生成周报预览
- **THEN** 周报预览中下周计划 MUST 按优先级显示（项目明确+类型明确 → 只有项目明确 → 只有类型明确 → 都是其他）
- **AND** 复制的周报文本 MUST 符合此排序
- **AND** 下载的周报文件 MUST 符合此排序

#### Scenario: 下载周报时文件名包含正确的周标签

- **GIVEN** 用户在周报预览页面
- **WHEN** 用户点击"下载文件"按钮
- **THEN** 下载的文件名 MUST 包含正确的周标签
- **AND** 如果是当前周报，MUST 使用当前日期的周标签
- **AND** 如果是历史周报，MUST 使用归档时保存的 weekLabel
- **AND** 文件名 SHALL NOT 包含"未知"字样
