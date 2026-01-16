# Tasks: Remove Frontend Cache and Ensure Data Real-time Sync

## Overview

本提案将系统从"混合存储架构"（数据库 + localStorage）迁移到"纯 API 架构"（仅数据库），确保数据实时性和一致性。

## Task Breakdown

### Phase 1: 移除 localStorage 降级逻辑

#### Task 1.1: 修改 `src/utils/api.js`
- [x] 移除 `saveToStorage()` 中的 localStorage 操作
- [x] 移除 `loadFromStorage()` 中的 localStorage 操作
- [x] 修改 `saveToStorage()` 仅调用 API，失败时抛出错误
- [x] 修改 `loadFromStorage()` 仅调用 API，失败时抛出错误
- [x] 验证：API 调用失败时前端能正确捕获错误

**Validation**: 运行应用，断开网络后操作数据，应显示错误提示而非静默降级

#### Task 1.2: 修改 `src/stores/records.js`
- [x] 移除 `persist()` 中的 localStorage 相关代码
- [x] 修改 `init()` 仅从 API 加载数据
- [x] 移除迁移逻辑（不需要从 localStorage 迁移）
- [x] 添加错误处理：API 失败时显示 Toast 提示
- [x] 验证：添加/修改/删除记录后，刷新页面数据一致

**Validation**:
- 添加记录后立即刷新页面，记录应存在
- API 模拟失败（500错误），应显示错误提示

#### Task 1.3: 修改 `src/stores/reports.js`
- [x] 移除 `persist()` 中的 localStorage 备份逻辑
- [x] 移除 `init()` 中的 localStorage 迁移逻辑
- [x] 移除 `init()` 中的 localStorage 降级逻辑
- [x] 修改 `init()` 仅从 `GET /api/reports` 加载数据
- [x] 添加错误处理：API 失败时显示 Toast 提示
- [x] 验证：保存周报后，刷新页面数据一致

**Validation**:
- 保存周报后立即刷新页面，周报应存在
- 编辑下周计划后刷新，计划应保留
- API 模拟失败，应显示错误提示

#### Task 1.4: 修改 `src/stores/settings.js`
- [x] 移除 `persist()` 中的 localStorage 操作
- [x] 修改 `init()` 仅从 API 加载数据
- [x] 移除迁移逻辑
- [x] 添加错误处理：API 失败时显示 Toast 提示
- [x] 验证：修改设置后，刷新页面设置一致

**Validation**:
- 修改项目配置后刷新，配置应保留
- 切换主题后刷新，主题应保持
- API 模拟失败，应显示错误提示

### Phase 2: 添加数据刷新机制

#### Task 2.1: 实现页面可见性监听
- [x] 在 `src/App.vue` 中添加 `visibilitychange` 事件监听
- [x] 当页面从隐藏变为可见时，调用所有 Store 的 `init()` 方法
- [x] 添加防抖：避免频繁切换导致过多 API 调用（500ms）
- [x] 验证：在两个标签页中操作，切换标签页后数据同步

**Validation**:
- 打开两个标签页，一个添加记录，切换到另一个标签页，记录应自动出现
- 频繁切换标签页，API 调用应有节流

#### Task 2.2: 实现定期轮询刷新
- [x] 在 `src/App.vue` 中添加 `setInterval` 定时刷新
- [x] 默认每 30 秒调用所有 Store 的 `init()` 方法
- [x] 当页面隐藏时暂停轮询，可见时恢复
- [ ] 添加配置项：`settings.pollingInterval`（默认 30000ms）
- [x] 验证：30秒内无操作，数据自动刷新

**Validation**:
- 打开两个标签页，一个添加记录，30秒内另一个标签页自动更新
- 切换到其他标签页，轮询应暂停
- 修改轮询间隔设置，间隔应生效

#### Task 2.3: 添加数据同步状态指示
- [ ] 在 Store 中添加 `syncing` 状态（布尔值）
- [ ] 刷新开始时设置 `syncing = true`，结束时设置 `syncing = false`
- [ ] 在 UI 中显示"正在同步..."提示（如顶部进度条或 Toast）
- [ ] 验证：刷新时用户能看到同步状态

**Validation**:
- 页面可见性变化时，显示"正在同步..."
- 定期轮询时，后台静默刷新（不显示提示）

### Phase 3: 弃用批量替换接口

#### Task 3.1: 删除 `PUT /api/records/batch` 接口
- [x] 在 `server/api.js` 中删除 `app.put('/api/records/batch', ...)` 路由
- [x] 确认没有前端代码调用此接口（全局搜索）
- [x] 验证：应用功能正常，无错误日志

**Validation**:
- 运行应用，添加/编辑/删除记录功能正常
- 检查浏览器控制台，无 404 或 500 错误

#### Task 3.3: 确认使用增量更新
- [x] 确认所有记录操作使用单个 CRUD 接口：
  - `POST /api/records` - 添加
  - `PUT /api/records/:id` - 更新
  - `DELETE /api/records/:id` - 删除
- [x] 验证：批量操作时逐条调用 API

**Validation**:
- 添加多条记录时，每条记录独立调用 API
- 更新多条记录时，每条记录独立调用 API

### Phase 4: 更新文档和测试

#### Task 4.1: 更新 CLAUDE.md
- [x] 在"数据持久化规范"章节更新：
  - 移除"localStorage 降级"相关内容
  - 明确"禁止使用前端缓存"
  - 更新数据流图：仅"数据库 → API → UI"
- [x] 在"已知问题和解决方案"章节移除：
  - Reports Store 双层存储问题
  - localStorage 降级逻辑复杂性问题
- [x] 新增"数据刷新机制"章节：
  - 页面可见性监听规则
  - 定期轮询规则
  - 配置项说明
- [x] 更新版本号和更新日期

**Validation**: 文档内容与实现代码一致

#### Task 4.2: 添加集成测试
- [ ] 测试 API 失败时的错误处理
- [ ] 测试多标签页数据同步
- [ ] 测试定期轮询功能
- [ ] 测试页面可见性监听
- [ ] 验证：所有测试通过

**Validation**: 运行测试套件，所有测试通过

#### Task 4.3: 清理遗留代码
- [x] 全局搜索 `localStorage` 关键字，确认无残留使用
- [x] 全局搜索 `sessionStorage` 关键字，确认无残留使用
- [x] 删除 `src/utils/api.js` 中的 `localStorageKey` 相关代码
- [x] 验证：代码库无遗留缓存逻辑

**Validation**:
```bash
grep -r "localStorage" src/ --exclude-dir=node_modules
# 应仅返回注释或文档
```

## Dependencies

- **Phase 1** 必须在 **Phase 2** 之前完成（先移除缓存，再添加刷新）
- **Phase 3** 可以与 **Phase 1** 并行进行
- **Phase 4** 必须在所有实现完成后进行

## Parallelizable Work

- Task 1.1, 1.2, 1.3, 1.4 可以并行修改不同 Store
- Task 3.1 和 Task 3.3 可以并行进行
- Task 4.1, 4.2, 4.3 可以并行进行

## Rollback Plan

如果新架构导致严重问题：

1. 恢复 `src/utils/api.js` 中的 localStorage 操作
2. 恢复 `src/stores/*.js` 中的降级逻辑
3. 禁用数据刷新机制（注释掉 `visibilitychange` 和 `setInterval`）
4. 恢复 `PUT /api/records/batch` 接口

回滚后，系统恢复到"混合存储架构"，用户可以正常使用。

## Definition of Done

- [x] 所有 localStorage 操作已移除
- [x] 所有数据通过 API 读取和写入
- [x] 多标签页数据自动同步
- [x] API 失败时显示明确错误提示
- [x] 批量替换接口已删除
- [x] CLAUDE.md 文档已更新
- [ ] 集成测试已通过
- [x] 代码库无遗留缓存逻辑
