# Change: 重构数据库管理页面 UI

## Why

当前数据库管理页面存在以下问题：
1. **布局混乱**：单一页面显示 5 个表，所有字段堆砌在同一个表格中，可读性差
2. **表格体验差**：不同表的字段数量和类型差异大，通用表格无法很好地展示各表的特点
3. **视觉设计陈旧**：缺乏现代化的 UI 设计元素（卡片、动效、渐变等）
4. **实用性问题**：筛选、搜索等功能难以针对特定表优化

## What Changes

### 架构重构
- 将单一 `DatabaseView.vue` 拆分为多个专用视图组件
- 创建统一的数据表基础组件 `BaseDataTable.vue`
- 为每个表创建专用的预览卡片和详情视图

### UI 现代化
- 采用卡片式布局替代纯表格
- 添加玻璃态效果(glassmorphism)和微动画
- 优化颜色系统和视觉层次
- 响应式设计适配移动端

### 功能增强
- 为 `records` (工作记录) 表添加项目分组视图
- 为 `reports` (周报归档) 表添加时间线视图
- 为 `settings` (设置) 表添加键值对编辑预览
- 为 `scheduled_tasks` (定时任务) 表添加状态监控卡片
- 为 `plans` (计划) 表添加状态流转视图

## Impact

- Affected specs: `database-management`
- Affected code:
  - `src/views/DatabaseView.vue` (保留作为表选择入口)
  - `src/components/DataTable.vue` (增强为通用基础组件)
  - 新增 `src/views/database/` 目录下的专用视图

> [!IMPORTANT]
> **设计决策**：考虑到复杂度平衡，采用渐进式重构策略：
> 1. 第一阶段：优化现有 `DatabaseView.vue` 的布局和样式
> 2. 第二阶段（可选）：根据需要拆分独立视图
