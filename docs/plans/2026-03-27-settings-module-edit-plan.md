# 设置页模块化编辑 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将设置页改为模块化编辑交互，避免用户误触后立即修改并持久化配置。

**Architecture:** 前端在 `SettingsView` 中引入单模块编辑态和本地草稿，项目/工作类型通过批量草稿数组编辑，钉钉与邮箱配置通过局部表单草稿编辑；Pinia store 补充整组保存方法以支持“保存时一次性持久化”。

**Tech Stack:** Vue 3 Composition API、Pinia、Vite、Express API 持久化

---

### Task 1: 变更文档与规格

**Files:**
- Create: `docs/plans/2026-03-27-settings-module-edit-design.md`
- Create: `openspec/changes/update-settings-module-editing/proposal.md`
- Create: `openspec/changes/update-settings-module-editing/tasks.md`
- Create: `openspec/changes/update-settings-module-editing/specs/settings-management/spec.md`

**Step 1: 补充设计文档**

- 记录问题背景、目标、单模块编辑态方案、数据流和风险

**Step 2: 补充 OpenSpec 变更**

- 新增“设置管理”规格，明确默认只读、显式编辑、保存/取消的行为

### Task 2: Store 支持模块级保存

**Files:**
- Modify: `src/stores/settings.js`

**Step 1: 新增批量保存方法**

- 增加 `setProjects(projectList)` 和 `setWorkTypes(workTypeList)` 方法
- 在方法内部完成数据清洗与一次性持久化

**Step 2: 保持旧接口兼容**

- 保留已有 `add/update/delete` 接口，避免影响其他页面调用

### Task 3: 设置页改造为模块编辑态

**Files:**
- Modify: `src/views/SettingsView.vue`

**Step 1: 引入编辑态与草稿状态**

- 增加 `editingSection`
- 为项目、工作类型、钉钉、邮箱分别维护本地草稿

**Step 2: 改造模板**

- 只读态展示摘要
- 编辑态显示表单与增删按钮
- 为每个模块增加 `编辑 / 取消 / 保存`

**Step 3: 接入保存逻辑**

- 项目/类型保存时调用批量保存方法
- 钉钉/邮箱保存时调用现有更新方法
- 取消时丢弃草稿并回退显示

### Task 4: 验证

**Files:**
- Modify: `src/views/SettingsView.vue`
- Modify: `src/stores/settings.js`

**Step 1: 构建检查**

Run: `npm run build`

Expected: 构建成功，无 Vue 编译错误或脚本错误

**Step 2: 人工验证交互**

- 默认进入页面不可误改
- 点击编辑后才可修改
- 保存后刷新仍保留
- 取消后恢复原值
