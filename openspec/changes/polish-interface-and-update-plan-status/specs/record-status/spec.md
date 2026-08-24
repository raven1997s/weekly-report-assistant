## MODIFIED Requirements

### Requirement: 计划转换状态

系统 SHALL 将下周计划转换生成的工作记录状态设置为“进行中”。

#### Scenario: 单条计划转换

- **WHEN** 用户将一条下周计划转换为工作记录
- **THEN** 新工作记录的状态为“进行中”

#### Scenario: 定时或批量计划转换

- **WHEN** 系统定时或批量将计划转换为工作记录
- **THEN** 每条新工作记录的状态均为“进行中”

