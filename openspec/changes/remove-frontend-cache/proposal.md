# Proposal: Remove Frontend Cache and Ensure Data Real-time Sync

## Metadata

- **ID**: `remove-frontend-cache`
- **Status**: `proposed`
- **Created**: 2026-01-16
- **Owner**: TBD

## Problem Statement

当前项目存在以下数据一致性和实时性问题：

1. **localStorage 降级逻辑导致数据不一致**
   - `reportsStore` 在 API 失败时会降级到 localStorage
   - 数据库和 localStorage 可能同时存在不同版本的数据
   - 迁移逻辑复杂，难以确定数据的真实来源

2. **多标签页/多设备数据不同步**
   - 应用只在启动时从数据库加载数据一次
   - 打开多个标签页时，一个标签页的修改不会反映到其他标签页
   - 多设备间需要手动刷新才能看到最新数据

3. **缓存策略混乱**
   - `records` 和 `settings` 直接从数据库加载（无缓存）
   - `reports` 使用双层存储（数据库 + localStorage）
   - 不同的数据源导致维护困难

## Impact

- **用户体验**: 多标签页操作时需要手动刷新页面才能看到最新数据
- **数据安全**: localStorage 降级可能导致数据丢失或不一致
- **维护成本**: 复杂的降级和迁移逻辑增加调试难度

## Proposed Solution

### 核心原则

**所有数据的增删改查行为全部都必须通过接口获取，禁止使用任何前端缓存。要确保数据的实时性。**

### 具体措施

1. **移除所有 localStorage 降级逻辑**
   - 删除 `saveToStorage()` 和 `loadFromStorage()` 中的 localStorage 操作
   - API 失败时直接向用户报错，不再静默降级
   - 保留 localStorage 仅用于离线诊断日志（可选）

2. **统一数据流为"数据库 → API → UI"**
   - 所有数据读取通过 API
   - 所有数据写入通过 API
   - 前端 Store 仅作为内存缓存（不持久化）

3. **添加数据刷新机制**
   - 页面可见性监听：切换回标签页时自动刷新
   - 定期轮询：每 30 秒自动刷新一次（可配置）
   - 实时推送（未来可选）：WebSocket 实现

4. **优化错误处理**
   - API 失败时显示用户友好的错误提示
   - 提供重试机制
   - 避免静默失败

5. **弃用批量替换接口**
   - 删除 `PUT /api/records/batch`（存在原子性问题）
   - 改为使用增量更新（逐条 CRUD）

## Affected Components

- **Frontend Stores**:
  - `src/stores/records.js`
  - `src/stores/reports.js`
  - `src/stores/settings.js`

- **API Layer**:
  - `src/utils/api.js`
  - `server/api.js`

- **Views**:
  - 所有使用数据的视图组件

## Related Specs

- **persistence**: 需要修改，移除 localStorage 降级逻辑
- **database-management**: 可能需要新增数据刷新相关的 API

## Alternatives Considered

### 1. 保留 localStorage 作为离线缓存

**优点**: 支持离线编辑
**缺点**: 增加复杂度，与"禁止前端缓存"原则冲突
**结论**: 不采纳

### 2. 使用 IndexedDB 替代 localStorage

**优点**: 存储容量更大，支持索引
**缺点**: 仍然是前端缓存，不符合需求
**结论**: 不采纳

### 3. 实现 Service Worker 离线功能

**优点**: 完整的离线支持
**缺点**: 开发成本高，复杂度显著增加
**结论**: 未来可选，当前不采纳

## Success Criteria

- [ ] 所有数据读取通过 API（无 localStorage 优先）
- [ ] 所有数据写入通过 API（无 localStorage 降级）
- [ ] 多标签页数据自动同步（页面可见性监听）
- [ ] API 失败时向用户显示明确错误
- [ ] 删除 `PUT /api/records/batch` 接口
- [ ] 更新 CLAUDE.md 文档，反映新架构

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 网络故障导致无法使用 | 高 | 提供明确的错误提示和重试按钮 |
| API 响应慢影响体验 | 中 | 添加加载状态指示，乐观更新 UI |
| 多用户编辑冲突 | 中 | 添加最后写入时间检测，提示用户刷新 |
| 旧用户 localStorage 数据丢失 | 低 | 一次性迁移脚本，启动时检测并迁移 |

## Timeline

- **阶段 1**: 移除 localStorage 降级逻辑
- **阶段 2**: 添加数据刷新机制
- **阶段 3**: 弃用批量替换接口
- **阶段 4**: 更新文档和测试

## Open Questions

1. 是否需要实现乐观更新（Optimistic UI）以提升体验？
2. 定期轮询的频率应该如何设置（30秒？1分钟？可配置？）
3. 是否需要添加"离线模式"提示？

## Dependencies

- 需要后端 API 保持高可用性
- 需要稳定的网络环境
- 用户需要理解"数据实时同步"的含义
