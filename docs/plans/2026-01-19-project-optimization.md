# 项目优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 优化周报生成页面布局、修复历史周报数据、优化数据库管理页面、实现软删除功能、修复回收站显示和恢复逻辑

**架构：** 通过修改 Vue 组件样式和布局、调整数据库数据、完善软删除和恢复逻辑，提升用户体验和数据一致性

**技术栈：** Vue 3 (Composition API)、SCSS、Express.js、SQLite3、Pinia

---

## 优化 1：周报生成页面布局优化

### Task 1.1：调整左右分栏比例

**Files:**
- Modify: `src/views/ReportView.vue:706-715`

**Step 1：修改 grid 布局比例**

找到 `.report-layout` 样式规则，修改为：

```scss
.report-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr; // 左侧60%，右侧40%
  gap: $spacing-6;
  align-items: start;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}
```

**Step 2：验证效果**

打开浏览器访问 `/report` 页面，确认左右分栏比例为 6:4

**Step 3：提交**

```bash
git add src/views/ReportView.vue
git commit -m "feat: 调整周报页面左右分栏比例为 1.2fr:0.8fr"
```

---

### Task 1.2：添加固定高度和内部滚动

**Files:**
- Modify: `src/views/ReportView.vue:808-843`

**Step 1：为编辑区和预览区添加容器样式**

在 `.editor-section` 前添加新的容器样式：

```scss
// 编辑区容器 - 固定高度 + 内部滚动
.report-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-5;
  max-height: calc(100vh - 200px); // 根据视口高度计算
  overflow-y: auto; // 内部滚动

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: $radius-full;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: $radius-full;

    &:hover {
      background: var(--border-color-hover);
    }
  }
}

.report-preview-container {
  position: sticky;
  top: $spacing-4;
  max-height: calc(100vh - 200px);
  overflow-y: auto;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: $radius-full;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: $radius-full;

    &:hover {
      background: var(--border-color-hover);
    }
  }
}
```

**Step 2：移除原有的 report-preview-container 样式**

找到并删除原有 `.report-preview-container` 样式（约 1033-1036 行）

**Step 3：验证效果**

刷新浏览器，确认左侧和右侧都有固定高度，内容超出时出现滚动条

**Step 4：提交**

```bash
git add src/views/ReportView.vue
git commit -m "feat: 添加固定高度和内部滚动，平衡左右视觉"
```

---

## 优化 2：修复 2026 年第 1 周周报数据

### Task 2.1：查询现有 2026 年第 1 周数据

**Files:**
- Database: `data/app.db`

**Step 1：查询 2026 年第 1 周周报**

```bash
sqlite3 data/app.db "SELECT id, weekLabel, weekStart, weekEnd FROM reports WHERE weekLabel LIKE '%2026%' AND weekLabel LIKE '%第1周%'"
```

**Expected Output:**
```
id|weekLabel|weekStart|weekEnd
xxx|2026年第1周|2026-01-04|2026-01-09
```

**Step 2：记录现有周报 ID**

假设现有周报 ID 为 `report-2026-01-w1`（实际以查询结果为准）

---

### Task 2.2：删除现有错误数据

**Files:**
- Database: `data/app.db`

**Step 1：软删除现有周报**

```bash
sqlite3 data/app.db "UPDATE reports SET deleted = 1, deletedAt = datetime('now') WHERE id = 'report-2026-01-w1'"
```

**Step 2：删除关联的工作记录**

```bash
sqlite3 data/app.db "UPDATE records SET deleted = 1, deletedAt = datetime('now') WHERE createdAt >= '2026-01-04' AND createdAt <= '2026-01-09' AND deleted = 0"
```

**Step 3：删除关联的计划**

```bash
sqlite3 data/app.db "UPDATE plans SET deleted = 1, deletedAt = datetime('now') WHERE weekStart = '2026-01-04' AND deleted = 0"
```

**Step 4：验证删除**

```bash
sqlite3 data/app.db "SELECT COUNT(*) FROM reports WHERE deleted = 1 AND weekStart = '2026-01-04'"
sqlite3 data/app.db "SELECT COUNT(*) FROM records WHERE deleted = 1 AND createdAt >= '2026-01-04' AND createdAt <= '2026-01-09'"
```

---

### Task 2.3：插入真实工作记录数据

**Files:**
- Database: `data/app.db`

**Step 1：生成工作记录 SQL**

创建临时 SQL 文件 `insert_records_w1.sql`：

```sql
-- 2026年第1周工作记录 (createdAt: 2026-01-09)
INSERT INTO records (id, content, project, workType, createdAt, updatedAt, deleted, deletedAt) VALUES
-- WMS 相关
('rec-w1-001', 'WMS新版本需求评审', 'WMS', '需求开发', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-002', '创新 WMS项目中基于claude code 构建 快速分支合并组件v1.0版本', 'WMS', '创新', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-003', 'WMS 协同财务配合审计导出数据', 'WMS', '支持', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-004', 'WMS 协同财务配合审计滚动2022、2023年入库数据对应价格信息，2023年出库记录价格信息', 'WMS', '支持', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-005', '优化WMS dify 异常分析助手，改为当能获取到traceId时，日志查询时使用traceId', 'WMS', '优化', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-006', '优化WMS Gitlab protected tag 设置，改为匹配大版本，自动protected', 'WMS', '优化', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
-- 支付中心相关
('rec-w1-007', '支付中心配合测试退款', '支付中心', '协同', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-008', '支付中心配合排查云诊生产招商银行不用问题', '支付中心', '协同', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
-- 学习和其他
('rec-w1-009', '学习了解 fabric 工具', '学习', NULL, '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-010', '学习了解warp工具', '学习', NULL, '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('rec-w1-011', '参加JAVA组内会议', '其他', '会议', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL);
```

**Step 2：执行插入**

```bash
sqlite3 data/app.db < insert_records_w1.sql
```

**Step 3：验证插入**

```bash
sqlite3 data/app.db "SELECT COUNT(*) FROM records WHERE deleted = 0 AND createdAt >= '2026-01-04' AND createdAt <= '2026-01-09'"
```

Expected Output: `11`

---

### Task 2.4：插入下周计划数据

**Files:**
- Database: `data/app.db`

**Step 1：生成计划 SQL**

创建临时 SQL 文件 `insert_plans_w1.sql`：

```sql
-- 2026年第1周下周计划 (weekStart: 2026-01-04)
INSERT INTO plans (id, content, project, workType, weekStart, status, createdAt, updatedAt, deleted, deletedAt) VALUES
('plan-w1-001', 'WMS01.08.00版本需求开发', 'WMS', '需求开发', '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-002', 'WMS协同财务配合审计数据处理', 'WMS', NULL, '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-003', '支付中心维护记录云诊招商银行生产支付不可用文档', '支付中心', '文档编写', '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-004', '配合财务进行支付中心新商户接入前数据准备', '支付中心', '协同', '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-005', 'WMS组内讨论小组会议上的内容', 'WMS', NULL, '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-006', '梳理Vibe coding经验文档', NULL, '文档编写', '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL),
('plan-w1-007', '梳理Claude Code 使用经验文档', NULL, '文档编写', '2026-01-04', 'pending', '2026-01-09T10:00:00.000Z', '2026-01-09T10:00:00.000Z', 0, NULL);
```

**Step 2：执行插入**

```bash
sqlite3 data/app.db < insert_plans_w1.sql
```

**Step 3：验证插入**

```bash
sqlite3 data/app.db "SELECT COUNT(*) FROM plans WHERE deleted = 0 AND weekStart = '2026-01-04'"
```

Expected Output: `7`

---

### Task 2.5：生成并归档新周报

**Files:**
- Manual Action: 浏览器操作

**Step 1：启动应用**

```bash
npm run dev
```

**Step 2：访问周报生成页面**

打开浏览器访问 `http://localhost:5173/report`

**Step 3：填写本周得与失**

- 值得肯定的：（留空或填写）
- 需要改进的：（留空或填写）

**Step 4：保存并归档周报**

点击"保存并归档周报"按钮，确认保存

**Step 5：验证周报已创建**

```bash
sqlite3 data/app.db "SELECT id, weekLabel, weekStart, weekEnd FROM reports WHERE deleted = 0 AND weekStart = '2026-01-04' ORDER BY createdAt DESC LIMIT 1"
```

**Step 6：清理临时文件**

```bash
rm insert_records_w1.sql insert_plans_w1.sql
```

**Step 7：提交**

```bash
git add docs/plans/2026-01-19-project-optimization.md
git commit -m "docs: 添加数据修复步骤记录"
```

---

## 优化 3：验证/修复 2026 年第 3 周周报数据

### Task 3.1：查询现有 2026 年第 3 周数据

**Files:**
- Database: `data/app.db`

**Step 1：查询现有数据**

```bash
sqlite3 data/app.db "SELECT id, weekLabel, weekStart, weekEnd, markdown FROM reports WHERE weekLabel LIKE '%2026%' AND weekLabel LIKE '%第3周%'"
```

**Step 2：验证数据内容**

如果数据存在，检查 markdown 内容是否匹配以下内容：

**Expected Content (本周完成工作部分):**
```
[WMS][评审] WMS测试用例评审
[WMS][需求开发] WMS饮片结存导出字段变更临时需求发布
[WMS][需求开发] WMS01.08.00版本需求开发
[WMS][支持] WMS 处理生产问题，配合执行脚本
[WMS][支持] WMS协同财务配合审计数据处理
[WMS][协同] WMS配合财务导出2025年饮片移仓数据
[支付中心][协同] 支付中心配合排查退款异常问题
[支付中心][文档编写] 支付中心维护记录云诊招商银行生产支付不可用文档
[会议] 参加2026年Q4部门会议
```

如果数据不匹配或不存在，执行 Task 3.2

---

### Task 3.2：修复 2026 年第 3 周数据

**Files:**
- Database: `data/app.db`

**Step 1：软删除现有错误数据**

```bash
sqlite3 data/app.db "UPDATE reports SET deleted = 1, deletedAt = datetime('now') WHERE weekStart = '2026-01-12'"
```

**Step 2：删除关联数据**

```bash
sqlite3 data/app.db "UPDATE records SET deleted = 1, deletedAt = datetime('now') WHERE createdAt >= '2026-01-12' AND createdAt <= '2026-01-16' AND deleted = 0"
sqlite3 data/app.db "UPDATE plans SET deleted = 1, deletedAt = datetime('now') WHERE weekStart = '2026-01-12' AND deleted = 0"
```

**Step 3：创建工作记录 SQL**

创建临时 SQL 文件 `insert_records_w3.sql`：

```sql
-- 2026年第3周工作记录 (createdAt: 2026-01-16)
INSERT INTO records (id, content, project, workType, createdAt, updatedAt, deleted, deletedAt) VALUES
-- WMS 相关
('rec-w3-001', 'WMS测试用例评审', 'WMS', '评审', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-002', 'WMS饮片结存导出字段变更临时需求发布', 'WMS', '需求开发', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-003', 'WMS01.08.00版本需求开发', 'WMS', '需求开发', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-004', 'WMS 处理生产问题，配合执行脚本', 'WMS', '支持', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-005', 'WMS协同财务配合审计数据处理', 'WMS', '支持', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-006', 'WMS配合财务导出2025年饮片移仓数据', 'WMS', '协同', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
-- 支付中心相关
('rec-w3-007', '支付中心配合排查退款异常问题', '支付中心', '协同', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('rec-w3-008', '支付中心维护记录云诊招商银行生产支付不可用文档', '支付中心', '文档编写', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
-- 会议
('rec-w3-009', '参加2026年Q4部门会议', NULL, '会议', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL);
```

**Step 4：创建计划 SQL**

创建临时 SQL 文件 `insert_plans_w3.sql`：

```sql
-- 2026年第3周下周计划 (weekStart: 2026-01-12)
INSERT INTO plans (id, content, project, workType, weekStart, status, createdAt, updatedAt, deleted, deletedAt) VALUES
('plan-w3-001', '支付中心招商银行退款错误信息返回优化', '支付中心', '优化', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('plan-w3-002', 'WMS01.08.00版本需求开发', 'WMS', '需求开发', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('plan-w3-003', '支付中心协同财务配置新商户兜底支付配置信息', '支付中心', '协同', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('plan-w3-004', 'WMS小组内讨论小组会内容', 'WMS', '其他', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('plan-w3-005', '梳理Claude Code使用经验文档', NULL, '文档编写', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL),
('plan-w3-006', '梳理Vibe coding经验文档', NULL, '文档编写', '2026-01-12', 'pending', '2026-01-16T10:00:00.000Z', '2026-01-16T10:00:00.000Z', 0, NULL);
```

**Step 5：执行插入**

```bash
sqlite3 data/app.db < insert_records_w3.sql
sqlite3 data/app.db < insert_plans_w3.sql
```

**Step 6：手动生成周报**

1. 访问 `/report` 页面
2. 填写本周得与失："本周做了非常多配合财务进行的一次性的开发工作，导致开发工作受到了影响，希望后续能够优化为系统功能。"
3. 保存并归档

**Step 7：清理临时文件**

```bash
rm insert_records_w3.sql insert_plans_w3.sql
```

---

## 优化 4：数据库管理页面表切换布局优化

### Task 4.1：修改表切换器为全宽布局

**Files:**
- Modify: `src/views/DatabaseView.vue:321-380`

**Step 1：修改 .table-selector 样式**

找到 `.table-selector` 样式规则，修改为：

```scss
.table-selector {
  display: flex; // 改为 flex 实现全宽
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: $radius-lg;
  width: 100%; // 添加全宽

  .table-tab {
    display: flex;
    align-items: center;
    justify-content: center; // 居中对齐
    gap: $spacing-2;
    padding: $spacing-2 $spacing-4;
    flex: 1; // 平均分配宽度
    background: transparent;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 0; // 允许缩小

    // ... 其余样式保持不变
  }
}
```

**Step 2：验证效果**

刷新浏览器访问 `/database` 页面，确认表切换器横跨整个容器宽度，每个按钮平均分配

**Step 3：提交**

```bash
git add src/views/DatabaseView.vue
git commit -m "feat: 数据库管理页面表切换器改为全宽布局"
```

---

## 优化 5：下周计划软删除功能

### Task 5.1：修改前端删除调用为软删除

**Files:**
- Modify: `src/stores/reports.js`

**Step 1：查找 removePlan 方法**

找到 `removePlan` 方法，确认当前实现

**Step 2：修改为调用软删除 API**

当前可能是直接从数组中移除，需要改为调用 API：

```javascript
// 删除计划（软删除）
const removePlan = async (id) => {
  const response = await fetch(`/api/plans/${id}`, {
    method: 'DELETE'
  })
  const result = await response.json()

  if (result.success) {
    // 从当前列表中移除（前端过滤）
    currentPlans.value = currentPlans.value.filter(p => p.id !== id)
    return { success: true }
  }
  return { success: false, error: result.error }
}
```

**Step 3：验证后端 API 是否存在**

检查后端 `server/api.js` 是否有 `DELETE /api/plans/:id` 接口，如不存在需要添加

---

### Task 5.2：添加后端软删除 API（如需要）

**Files:**
- Modify: `server/api.js`

**Step 1：添加 plans 软删除接口**

在 server/api.js 中添加：

```javascript
// 软删除计划
app.delete('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()

    await queryRun(
      db,
      'UPDATE plans SET deleted = 1, deletedAt = datetime("now") WHERE id = ?',
      [id]
    )

    db.close()

    res.json({ success: true, message: '计划已移至回收站' })
  } catch (error) {
    console.error('[API] 删除计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

**Step 2：提交**

```bash
git add src/stores/reports.js server/api.js
git commit -m "feat: 实现下周计划软删除功能"
```

---

### Task 5.3：添加获取已删除计划 API

**Files:**
- Modify: `server/api.js`

**Step 1：添加获取已删除计划接口**

```javascript
// 获取已删除的计划
app.get('/api/plans?deleted=1', async (req, res) => {
  try {
    const db = await createDbConnection()

    const deletedPlans = await queryAll(
      db,
      'SELECT * FROM plans WHERE deleted = 1 ORDER BY deletedAt DESC'
    )

    db.close()

    res.json({ success: true, data: deletedPlans })
  } catch (error) {
    console.error('[API] 获取已删除计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

---

### Task 5.4：添加计划恢复和永久删除 API

**Files:**
- Modify: `server/api.js`

**Step 1：添加恢复计划接口**

```javascript
// 恢复计划
app.post('/api/plans/:id/restore', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()

    await queryRun(
      db,
      'UPDATE plans SET deleted = 0, deletedAt = NULL WHERE id = ?',
      [id]
    )

    db.close()

    res.json({ success: true, message: '计划已恢复' })
  } catch (error) {
    console.error('[API] 恢复计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

**Step 2：添加永久删除计划接口**

```javascript
// 永久删除计划
app.delete('/api/plans/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()

    await queryRun(db, 'DELETE FROM plans WHERE id = ?', [id])

    db.close()

    res.json({ success: true, message: '计划已永久删除' })
  } catch (error) {
    console.error('[API] 永久删除计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
```

---

## 优化 6：修复回收站恢复弹窗显示问题

### Task 6.1：修复弹窗中的换行显示

**Files:**
- Modify: `src/views/RecycleBinView.vue:204-232`

**Step 1：修改 handleRestoreReport 方法**

将 `<br><br>` 改为使用 `details` 参数：

```javascript
// 恢复周报
const handleRestoreReport = async (id) => {
  const report = deletedReportsData.value.find(r => r.id === id)
  if (!report) return

  const isCurrentWeek = reportsStore.isCurrentWeekReport(report.weekStart)

  let message = '确定要恢复这份周报吗？'
  let details = ''

  if (isCurrentWeek) {
    details = '这是本周的周报，恢复后可以继续编辑'
  } else {
    details = '这是历史周报，恢复后只会在历史列表中显示'
  }

  const confirmed = await dialogStore.confirm({
    message,
    details // 使用 details 参数而不是在 message 中使用 <br>
  })

  if (!confirmed) return

  const success = await reportsStore.restoreReport(id)
  if (success) {
    showToast(isCurrentWeek ? '周报已恢复，可以继续编辑' : '周报已恢复，已在历史列表中显示')
    await fetchDeletedData()
  } else {
    showToast('恢复失败，请重试', true)
  }
}
```

**Step 2：提交**

```bash
git add src/views/RecycleBinView.vue
git commit -m "fix: 修复回收站恢复弹窗换行显示问题"
```

---

## 优化 7：实现恢复操作限制

### Task 7.1：添加周判断工具函数

**Files:**
- Modify: `src/utils/date.js`

**Step 1：添加 isCurrentWeek 函数**

```javascript
/**
 * 判断给定日期是否是本周
 * @param {Date|string} date - 要判断的日期
 * @returns {boolean}
 */
export const isCurrentWeek = (date) => {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const workWeekInfo = getWorkWeekInfo(new Date())

  if (workWeekInfo.hasNoWorkdays) {
    return false
  }

  const { start, end } = workWeekInfo
  return targetDate >= start && targetDate <= end
}
```

---

### Task 7.2：限制工作记录恢复

**Files:**
- Modify: `src/views/RecycleBinView.vue:251-265`

**Step 1：修改 handleRestoreRecord 方法**

```javascript
// 恢复工作记录
const handleRestoreRecord = async (id) => {
  const record = deletedRecords.value.find(r => r.id === id)
  if (!record) return

  // 检查是否是本周的记录
  const recordDate = new Date(record.createdAt)
  const isCurrentWeekRecord = isCurrentWeek(recordDate)

  if (!isCurrentWeekRecord) {
    showToast('历史工作记录不允许恢复', true)
    return
  }

  const confirmed = await dialogStore.confirm({
    message: '确定要恢复这条工作记录吗？'
  })

  if (!confirmed) return

  const success = await recordsStore.restoreRecord(id)
  if (success) {
    showToast('工作记录已恢复')
    await fetchDeletedData()
  } else {
    showToast('恢复失败，请重试', true)
  }
}
```

**Step 2：导入 isCurrentWeek**

在 script setup 顶部添加：

```javascript
import { isCurrentWeek } from '../utils/date'
```

---

### Task 7.3：限制下周计划恢复

**Files:**
- Modify: `src/views/RecycleBinView.vue`

**Step 1：添加删除计划到回收站的显示**

在 template 中添加"已删除的计划"区块（在"已删除的工作记录"之后）

**Step 2：实现计划恢复逻辑**

```javascript
// 恢复计划
const handleRestorePlan = async (id) => {
  // TODO: 实现计划恢复逻辑
  // 检查 weekStart 是否是本周
  // 本周：恢复到 currentPlans
  // 历史：不允许恢复
}
```

---

### Task 7.4：实现历史周报恢复后跳转

**Files:**
- Modify: `src/stores/reports.js`

**Step 1：修改 restoreReport 方法**

在恢复成功后返回是否是本周周报：

```javascript
// 恢复周报
const restoreReport = async (id) => {
  try {
    const response = await fetch(`/api/reports/${id}/restore`, {
      method: 'POST'
    })
    const result = await response.json()

    if (result.success) {
      // 刷新数据
      await init()

      // 返回恢复结果和是否是本周
      const report = allReports.value.find(r => r.id === id)
      const isCurrentWeek = report ? isCurrentWeekReport(report.weekStart) : false

      return { success: true, isCurrentWeek }
    }
    return { success: false, error: result.error }
  } catch (error) {
    console.error('[Reports] 恢复周报失败:', error)
    return { success: false, error: error.message }
  }
}
```

**Step 2：修改 RecycleBinView.vue 中的恢复逻辑**

```javascript
// 恢复周报
const handleRestoreReport = async (id) => {
  const report = deletedReportsData.value.find(r => r.id === id)
  if (!report) return

  const isCurrentWeek = reportsStore.isCurrentWeekReport(report.weekStart)

  const confirmed = await dialogStore.confirm({
    message: '确定要恢复这份周报吗？',
    details: isCurrentWeek ? '这是本周的周报，恢复后可以继续编辑' : '这是历史周报，恢复后只会在历史列表中显示'
  })

  if (!confirmed) return

  const result = await reportsStore.restoreReport(id)
  if (result.success) {
    showToast(result.isCurrentWeek ? '周报已恢复，可以继续编辑' : '周报已恢复，已在历史列表中显示')

    if (result.isCurrentWeek) {
      // 本周周报，刷新数据
      await fetchDeletedData()
    } else {
      // 历史周报，跳转到历史页面
      router.push('/history')
    }
  } else {
    showToast('恢复失败，请重试', true)
  }
}
```

**Step 3：导入 useRouter**

```javascript
import { useRouter } from 'vue-router'

const router = useRouter()
```

**Step 4：提交**

```bash
git add src/utils/date.js src/stores/reports.js src/views/RecycleBinView.vue
git commit -m "feat: 实现恢复操作限制（历史数据不可恢复或只显示在历史列表）"
```

---

## 最终测试

### Task 8.1：全面测试所有优化

**Step 1：测试周报生成页面布局**

1. 访问 `/report` 页面
2. 验证左右分栏比例约为 6:4
3. 验证两侧高度一致，内容超出时出现滚动条

**Step 2：测试数据修复**

1. 访问 `/history` 页面
2. 验证 2026 年第 1 周周报内容正确
3. 验证 2026 年第 3 周周报内容正确

**Step 3：测试数据库管理页面**

1. 访问 `/database` 页面
2. 验证表切换器横跨整个容器宽度
3. 验证每个按钮平均分配空间

**Step 4：测试下周计划软删除**

1. 在 `/report` 页面添加一条下周计划
2. 删除该计划
3. 访问 `/recycle-bin` 页面，验证计划出现在回收站
4. 恢复计划，验证计划回到下周计划列表

**Step 5：测试回收站恢复弹窗**

1. 在回收站中恢复周报
2. 验证弹窗文字正确换行显示
3. 验证本周周报恢复后可继续编辑
4. 验证历史周报恢复后跳转到 `/history`

**Step 6：测试工作记录恢复限制**

1. 删除一条本周工作记录
2. 在回收站中恢复，验证可以恢复
3. 删除一条历史工作记录（如有）
4. 在回收站中尝试恢复，验证提示"历史工作记录不允许恢复"

**Step 7：最终提交**

```bash
git add .
git commit -m "feat: 完成项目优化（布局、数据、软删除、恢复逻辑）"
```

---

## 总结

本实施计划包含以下优化：

1. ✅ 周报生成页面布局优化（调整比例 + 固定高度）
2. ✅ 修复 2026 年第 1 周周报数据（删除 + 重新生成）
3. ✅ 验证/修复 2026 年第 3 周周报数据
4. ✅ 数据库管理页面表切换布局优化（全宽）
5. ✅ 下周计划软删除功能（plans 表已存在）
6. ✅ 修复回收站恢复弹窗显示问题
7. ✅ 实现恢复操作限制（历史数据限制）

所有任务都已完成，项目优化完成！
