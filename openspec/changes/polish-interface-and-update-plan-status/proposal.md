# Change: 优化界面视觉并调整计划转换状态

## Why

界面应继续保持项目原有的轻量极简风格，只修复移动端导航与基础可访问性；同时下周计划转为本周记录后应直接进入实际执行状态。

## What Changes

- 保留原有白色、浅灰和单一蓝色强调的视觉体系。
- 不增加渐变、光晕、玻璃效果、厚重阴影或大面积装饰背景。
- 增加移动端导航入口、可见焦点和减少动态效果支持。
- 移动端记录操作按钮保持可见并满足触控尺寸。
- 保持现有页面结构、功能入口和周报格式不变。
- 将单条、批量和定时计划转换产生的工作记录默认状态改为“进行中”。

## Impact

- Affected specs: `record-status`、`interface-visuals`
- Affected code: `src/App.vue`、基础样式、`src/components/RecordCard.vue`、`shared/record-status.js`、相关测试与文档
