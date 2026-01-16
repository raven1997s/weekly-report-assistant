# 变更：修复下周计划和本周总结的持久化问题

## Why

用户反馈当前周报数据存储存在严重的可靠性问题：

1. **数据来源不一致**：
   - 工作记录（records）从数据库 API 获取 ✅
   - 下周计划（plans）仅从 localStorage 获取 ❌
   - 本周总结（reflections）仅从 localStorage 获取 ❌

2. **localStorage 不可靠**：
   - 清除浏览器数据会丢失所有计划和总结
   - 跨设备无法同步数据
   - 不同浏览器之间数据隔离
   - 存储容量有限（通常 5-10MB）

3. **周报保存后的数据归属问题**：
   - 生成周报时，plans 和 reflections 被存入 `reports` 表
   - 但本周未生成周报前，这些数据只存在于前端 localStorage
   - 应该在数据库中有独立的存储区域

4. **违反数据一致性原则**：
   - 同一周报相关的三个模块（records、plans、reflections）应该使用统一的存储策略
   - 不应部分数据在数据库，部分数据在 localStorage

## What Changes

### 变更目标

将下周计划和本周总结的存储从 localStorage 迁移到数据库，与工作记录保持一致的数据来源。

### 受影响范围

**前端**：
- `src/stores/reports.js` - 修改初始化和持久化逻辑
- `src/utils/api.js` - 添加新的 API 调用方法

**后端**：
- `server/api.js` - 添加/修改下周计划和本周总结的 API
- `server/db.js` - 使用 settings 表存储 plans 和 reflections

### 技术方案

**方案选择**：复用现有的 `settings` 表

由于 `settings` 表已经是键值对存储，可以直接存储：
- `currentPlans` - 下周计划（JSON 数组）
- `currentReflections` - 本周总结（JSON 对象）

**数据流转**：
```
┌─────────────────────────────────────────────────────────┐
│  周报相关数据的完整生命周期                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. 编辑阶段（本周未生成周报）                            │
│     ├── records → database (records 表)                  │
│     ├── plans → database (settings 表)                   │
│     └── reflections → database (settings 表)              │
│                                                           │
│  2. 生成周报                                              │
│     ├── 从 database 读取 records、plans、reflections       │
│     ├── 生成 markdown 和 plainText                       │
│     └── 保存到 database (reports 表)                       │
│                                                           │
│  3. 保存后清理                                            │
│     └── 清空 plans 和 reflections（等待下周继续填写）      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 影响

**用户体验改进**：
- 数据不会因清除浏览器缓存而丢失
- 跨设备登录可同步计划和总结
- 与工作记录保持一致的可靠性

**兼容性考虑**：
- 保持 localStorage 作为降级方案（API 失败时）
- 迁移时从 localStorage 读取并写入数据库

## 测试计划

1. 测试下周计划添加/删除/修改后正确保存到数据库
2. 测试本周总结修改后正确保存到数据库
3. 测试页面刷新后数据从数据库正确加载
4. 测试生成周报后 plans 和 reflections 正确保存到 reports 表
5. 测试 API 失败时降级到 localStorage
