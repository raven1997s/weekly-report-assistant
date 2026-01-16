# Design: 下周计划独立存储架构

## Context

当前系统将下周计划（`currentPlans`）存储在 `settings` 表的键值对中，这导致：
- 结存周报时清空编辑状态会丢失计划数据
- 无法追踪计划的历史状态（如：已转换、已完成）
- 无法在数据库管理中独立查看和管理计划

## Goals / Non-Goals

### Goals
- 将下周计划独立存储在 `plans` 表中
- 支持计划的完整生命周期管理（创建→转换→完成）
- 确保所有操作都通过 API 进行，无前端缓存依赖
- 修复数据库管理中的 JSON 查看和搜索问题

### Non-Goals
- 不改变周报归档逻辑
- 不改变工作记录（records）的存储方式
- 不引入复杂的权限控制

## Decisions

### 1. `plans` 表结构设计

```sql
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  project TEXT,
  workType TEXT,
  weekStart TEXT NOT NULL,        -- 所属周的周一日期（ISO 8601）
  status TEXT DEFAULT 'pending',  -- pending | converted | completed
  convertedRecordId TEXT,         -- 转换后的 records.id（可选）
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deleted INTEGER DEFAULT 0,
  deletedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_plans_deleted ON plans(deleted);
CREATE INDEX IF NOT EXISTS idx_plans_weekStart ON plans(weekStart);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
```

**字段说明**：
- `weekStart`：计划所属的周（用于区分不同周的计划）
- `status`：计划状态
  - `pending`：待处理（默认）
  - `converted`：已转换为工作记录
  - `completed`：已完成（手动标记）
- `convertedRecordId`：当计划转换为工作记录时，关联的 record ID

### 2. 计划生命周期

```
创建计划 → pending
    ↓
[用户操作]
    ├─→ 转换为工作记录 → converted (保留 convertedRecordId)
    ├─→ 手动完成 → completed
    └─→ 删除 → 软删除 (deleted = 1)
```

### 3. API 设计

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/plans` | 获取当前周的计划列表 |
| GET | `/api/plans?weekStart=xxx` | 获取指定周的计划 |
| POST | `/api/plans` | 添加新计划 |
| PUT | `/api/plans/:id` | 更新计划内容 |
| DELETE | `/api/plans/:id` | 软删除计划 |
| POST | `/api/plans/:id/convert` | 将计划转换为工作记录 |
| POST | `/api/plans/batch-convert` | 批量转换计划 |

### 4. 前端 Store 重构

**方案 A**：保持在 `reports.js` 中管理（推荐）
- 优点：改动最小，保持现有组件兼容
- 缺点：`reports.js` 职责较多

**方案 B**：创建独立的 `plans.js` store
- 优点：职责分离清晰
- 缺点：需要修改更多组件引用

**决策**：采用**方案 A**，在 `reports.js` 中重构计划管理逻辑，调用新的 `/api/plans` 接口。

### 5. 数据库管理白名单扩展

```javascript
const ALLOWED_TABLES = ['records', 'reports', 'settings', 'scheduled_tasks', 'plans']
```

### 6. JSON 字段点击修复

`CellContent.vue` 中的 `isJson` 判断需要扩展：

```javascript
const isJson = computed(() => {
  if (typeof props.value !== 'string') return false
  // 扩展 JSON 字段列表
  const jsonFields = ['records', 'plans', 'reflections', 'value', 'keywords']
  if (jsonFields.includes(props.column)) return true
  // 尝试解析 JSON
  try {
    const parsed = JSON.parse(props.value)
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
})
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 数据迁移失败 | 保留 settings 中的旧数据作为备份，迁移成功后再清理 |
| API 兼容性问题 | 首次请求 `/api/plans` 时自动触发迁移 |
| 前端状态不同步 | 所有操作先调用 API，成功后再更新内存状态 |

## Migration Plan

1. **Phase 1**：创建 `plans` 表（数据库初始化时自动执行）
2. **Phase 2**：添加 `/api/plans` 相关接口
3. **Phase 3**：前端重构，调用新接口
4. **Phase 4**：首次启动时迁移 `settings.currentPlans` 到 `plans` 表
5. **Phase 5**：验证完成后，可选清理 `settings.currentPlans`

**回滚方案**：如果迁移失败，保持使用 settings 表中的数据，不影响现有功能。

## Open Questions

1. ~~是否需要支持计划的历史版本？~~ **决定：暂不支持**
2. ~~计划转换后是否保留原计划记录？~~ **决定：保留，标记为 converted**
