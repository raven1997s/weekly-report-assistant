# Change: 调整设置页为模块化编辑模式

## Why

当前设置页采用直接编辑并立即保存的交互方式，用户在浏览配置时容易误触，导致项目、工作类型、钉钉配置和邮箱配置被意外修改。需要将设置页调整为更明确、更安全的模块化编辑模式。

## What Changes

- 将项目管理、工作类型、钉钉机器人配置、阿里企业邮箱草稿箱改为默认只读
- 为上述模块增加显式“编辑”入口
- 模块进入编辑态后支持在本地草稿中修改
- 用户点击“保存”后才真正写入后端
- 用户点击“取消”后放弃当前模块未保存修改
- 设置 store 增加适配模块级保存的批量写入方法

## Impact

- Affected specs: `settings-management`
- Affected code:
  - `src/views/SettingsView.vue`
  - `src/stores/settings.js`
