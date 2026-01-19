# database-management Spec Delta

## MODIFIED Requirements

### Requirement: 高级筛选面板

系统 SHALL 在数据加载期间禁用筛选按钮，防止用户在字段列表未就绪时打开筛选面板。

#### Scenario: 筛选按钮加载状态

- **WHEN** 表数据正在加载（`loading` 为 `true`）
- **THEN** 筛选按钮应该禁用，不可点击
- **AND** 按钮样式显示为禁用状态（灰色、cursor 为 not-allowed）
- **AND** 数据加载完成后按钮自动恢复可用状态

#### Scenario: 切换表时筛选面板行为

- **WHEN** 用户切换到另一个表
- **THEN** 系统关闭筛选面板
- **AND** 在数据加载期间禁用筛选按钮
- **AND** 数据加载完成后用户可以打开筛选面板
- **AND** 打开后立即显示完整的字段筛选选项
