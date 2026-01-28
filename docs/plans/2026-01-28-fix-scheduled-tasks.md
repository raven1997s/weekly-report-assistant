# 定时任务问题修复实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 修复定时任务的三个问题：1) 转换任务重复执行导致重复生成记录，2) 服务重启后定时任务立即触发而非按设定时间执行，3) 前端检查转换状态时数据未刷新导致重复弹窗。

**架构：**
- 后端：在 `server/cron.js` 的 `executeTask()` 中添加数据库转换锁机制，每次执行转换前先检查当日是否已执行；修改 `startTask()` 函数，在首次调度时跳过立即触发，确保只在设定时间点执行。
- 前端：在 `src/views/ReportView.vue` 的 `onMounted()` 中，先强制刷新数据（`recordsStore.init()` + `reportsStore.init()`），等待数据加载完成后再检查转换状态。

**技术栈：** Node.js + Express + SQLite3 (后端), Vue 3 Composition API + Pinia (前端)

---

## 问题背景

通过日志分析发现三个问题：

### 问题 1：转换任务重复执行
**现象：** 日志显示 `2026-01-26 09:42:00.357` 和 `2026-01-26 09:42:00.412` 同一任务在 0.055 秒内执行两次
**原因：** 用户在设置页面修改定时任务时触发 `startScheduledTasks()` 重新调用，旧任务未停止完成，新任务已启动，导致竞态条件

### 问题 2：服务重启后立即触发
**现象：** 日志显示任务触发时间为 `17:42:00` 而非设定的 `09:00:00`
**原因：** `node-schedule` 在创建调度任务时，如果当前时间已过今天的调度时间，会立即触发一次。这是库的设计行为，不是 bug

### 问题 3：前端数据未刷新导致重复弹窗
**现象：** 后端已执行转换，但前端仍弹出转换确认框
**原因：** 前端 `onMounted()` 直接检查转换状态，未先刷新数据，可能读取到旧数据

---

## Task 1: 后端 - 添加数据库转换锁

**目标：** 防止同一转换任务在同一天内多次执行

**文件：**
- Modify: `server/cron.js:200-272`

### Step 1: 在转换任务执行前添加锁检查

**修改 `executeTask()` 函数中 `type === 'convert'` 部分：**

在 `server/cron.js` 第 200 行附近，找到转换任务的逻辑：

```javascript
if (task.type === 'convert') {
  const today = new Date()

  // 1. 判断是否为新工作周开始
  if (!isNewWorkWeekStart(today)) {
    console.log(`[Cron] 今天不是新工作周开始，跳过转换`)
    return
  }

  const todayStr = formatDate(today, 'yyyy-MM-dd')
  console.log(`[Cron] ✅ 检测到新工作周开始: ${todayStr}`)

  // 2. 打开数据库连接
  const db = await createDbConnection()
```

**在第 2 步打开数据库后，立即添加锁检查逻辑：**

```javascript
  // 2. 打开数据库连接
  const db = await createDbConnection()

  try {
    // ========== 新增：检查转换锁 ==========
    const lockKey = `convert_lock_${todayStr}`
    const existingLock = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = ?",
      [lockKey]
    )

    if (existingLock) {
      const lockData = JSON.parse(existingLock.value)
      console.log(`[Cron] ⚠️ 今日已执行转换 (${lockData.lockedAt})，跳过: ${todayStr}`)
      return
    }

    // ========== 新增：设置转换锁（24小时有效期）==========
    await db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [lockKey, JSON.stringify({
        lockedAt: new Date().toISOString(),
        taskId: task.id
      })]
    )
    console.log(`[Cron] 🔒 设置转换锁: ${todayStr}`)
    // ========== 锁设置结束 ==========

    // 3. 查询上周周报的 plans
    const lastWeekData = await getLastWeekPlans(db, today)
```

**后续代码保持不变，只需要在 `try-catch` 的 `finally` 块中关闭数据库连接。**

### Step 2: 验证锁机制是否生效

**运行测试：**

```bash
# 重启服务
docker compose restart

# 等待服务启动
sleep 5

# 查看日志
docker compose logs -f
```

**手动触发转换任务两次：**

```bash
# 第一次触发（应该成功）
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test

# 立即再次触发（应该被锁阻止）
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test
```

**预期结果：**
- 第一次触发：日志显示 `🔒 设置转换锁: 2026-01-XX`
- 第二次触发：日志显示 `⚠️ 今日已执行转换，跳过: 2026-01-XX`

### Step 3: 提交修改

```bash
git add server/cron.js
git commit -m "fix(cron): 添加数据库转换锁防止重复执行

- 在执行转换前检查当日是否已有转换锁
- 如果存在锁则跳过执行，避免重复生成记录
- 锁的 key 格式: convert_lock_YYYY-MM-DD
- 解决竞态条件导致的重复转换问题"
```

---

## Task 2: 后端 - 防止重启后立即触发

**目标：** 确保定时任务只在设定的精确时间点触发，不在服务重启时立即触发

**文件：**
- Modify: `server/cron.js:128-146`

### Step 1: 修改 startTask() 函数添加首次跳过逻辑

**在 `server/cron.js` 第 128 行的 `startTask()` 函数中：**

找到这段代码：

```javascript
function startTask(task) {
  // 创建调度规则：每天在指定时间执行（时区：Asia/Shanghai）
  const rule = new schedule.RecurrenceRule()
  rule.hour = task.hour
  rule.minute = task.minute
  rule.tz = 'Asia/Shanghai'

  const job = schedule.scheduleJob(rule, async () => {
    await executeTask(task)  // 运行时校验是否应该执行
  })
```

**修改为：**

```javascript
function startTask(task) {
  // 创建调度规则：每天在指定时间执行（时区：Asia/Shanghai）
  const rule = new schedule.RecurrenceRule()
  rule.hour = task.hour
  rule.minute = task.minute
  rule.tz = 'Asia/Shanghai'

  // ========== 新增：检查当前时间是否已过今天的调度时间 ==========
  const now = new Date()
  const scheduledTime = new Date()
  scheduledTime.setHours(task.hour, task.minute, 0, 0)
  scheduledTime.setSeconds(0, 0)

  // 如果当前时间已过今天的调度时间，标记需要跳过首次触发
  const shouldSkipFirstRun = now >= scheduledTime

  if (shouldSkipFirstRun) {
    console.log(`[Cron] ⏰ 当前时间已过 ${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}，跳过首次触发`)
  }
  // ========== 检查结束 ==========

  let isFirstRun = true  // 跟踪是否为首次运行

  const job = schedule.scheduleJob(rule, async () => {
    // ========== 新增：跳过首次触发 ==========
    if (isFirstRun && shouldSkipFirstRun) {
      isFirstRun = false
      console.log(`[Cron] 跳过首次立即触发，等待下一个调度周期`)
      return
    }
    isFirstRun = false
    // ========== 跳过结束 ==========

    await executeTask(task)  // 运行时校验是否应该执行
  })
```

### Step 2: 验证修改是否生效

**运行测试：**

```bash
# 重启服务（当前时间应该是下午，比如 15:00）
docker compose restart

# 查看日志
docker compose logs --tail=50
```

**预期结果：**
- 日志显示 `⏰ 当前时间已过 09:00，跳过首次触发`
- 没有看到 `[Cron] ========== 任务触发 ==========` 日志
- 只显示 `下次触发: 明天的日期 09:00:00`

**次日验证（或在第二天早上查看）：**

```bash
# 查看当天日志
docker compose logs --since "$(date -d 'today 00:00:00' +%Y-%m-%dT%H:%M:%S)" | grep "\[Cron\]"
```

**预期结果：**
- 在 09:00:00 看到 `[Cron] ========== 任务触发 ==========`
- 任务正常执行

### Step 3: 提交修改

```bash
git add server/cron.js
git commit -m "fix(cron): 防止服务重启后定时任务立即触发

- 检查当前时间是否已过今天的调度时间
- 如果已过，跳过 node-schedule 的首次立即触发
- 确保任务只在设定的精确时间点执行
- 解决重启后立即执行导致的问题"
```

---

## Task 3: 前端 - 刷新数据后再检查转换状态

**目标：** 确保前端检查转换状态时使用最新的后端数据，避免因数据未刷新导致的重复弹窗

**文件：**
- Modify: `src/views/ReportView.vue:444-464`

### Step 1: 修改 onMounted() 生命周期函数

**在 `src/views/ReportView.vue` 第 444 行的 `onMounted()` 函数中：**

找到这段代码：

```javascript
// 初始化
onMounted(async () => {
  // 如果本周已归档，加载归档的得与失数据
  if (reportsStore.hasCurrentWeekReport) {
    const archived = reportsStore.getCurrentWeekArchivedReport()
    if (archived?.reflections) {
      reflections.value = { ...archived.reflections }
    }
  } else {
    // 未归档时使用 store 中的数据
    reflections.value = { ...reportsStore.currentReflections }
  }

  // 初始化周信息
  weekInfo.value = getWorkWeekInfo(new Date())

  // 检查是否需要转换上周计划（异步）
  const shouldConvert = await shouldShowConvertPrompt()
  if (shouldConvert) {
    convertLastWeekPlansToRecords()
  }
})
```

**修改为：**

```javascript
// 初始化
onMounted(async () => {
  // ========== 新增：强制刷新数据，确保获取最新状态 ==========
  console.log('[ReportView] 开始初始化，先刷新数据...')

  // 并发刷新所有 store 数据
  await Promise.all([
    recordsStore.init(),
    reportsStore.init()
  ])

  console.log('[ReportView] 数据刷新完成')

  // 等待一小段时间，确保所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 300))
  // ========== 刷新结束 ==========

  // 如果本周已归档，加载归档的得与失数据
  if (reportsStore.hasCurrentWeekReport) {
    const archived = reportsStore.getCurrentWeekArchivedReport()
    if (archived?.reflections) {
      reflections.value = { ...archived.reflections }
    }
  } else {
    // 未归档时使用 store 中的数据
    reflections.value = { ...reportsStore.currentReflections }
  }

  // 初始化周信息
  weekInfo.value = getWorkWeekInfo(new Date())

  // ========== 新增：检查转换状态前再次确认数据已刷新 ==========
  console.log('[ReportView] 检查是否需要转换上周计划...')

  // 检查是否需要转换上周计划（异步）
  const shouldConvert = await shouldShowConvertPrompt()

  if (shouldConvert) {
    console.log('[ReportView] 需要转换，显示确认弹窗')
    convertLastWeekPlansToRecords()
  } else {
    console.log('[ReportView] 无需转换（已转换或无上周计划）')
  }
  // ========== 检查结束 ==========
})
```

### Step 2: 验证修改是否生效

**运行测试：**

```bash
# 1. 确保服务运行中
docker compose ps

# 2. 在前端设置页面手动触发一次转换任务
# 访问: http://localhost:3333/settings
# 点击"测试执行"按钮（如果有）

# 3. 清除浏览器缓存并刷新页面
# 按 Ctrl+Shift+R (或 Cmd+Shift+R) 强制刷新

# 4. 查看前端控制台日志
```

**预期结果：**
- 控制台显示 `[ReportView] 开始初始化，先刷新数据...`
- 控制台显示 `[ReportView] 数据刷新完成`
- 控制台显示 `[ReportView] 无需转换（已转换或无上周计划）`
- **不再显示转换确认弹窗**

### Step 3: 检查 shouldShowConvertPrompt() 函数逻辑

**确认 `shouldShowConvertPrompt()` 函数（第 475 行）正确检查后端状态：**

```javascript
const shouldShowConvertPrompt = async () => {
  // 1. 检查本周是否已有用户手动添加的记录
  const hasUserRecords = hasUserAddedRecordsThisWeek()
  if (hasUserRecords) {
    console.log('[转换] 本周已有用户记录，跳过转换')
    return false
  }

  // 2. 检查后端是否已转换过（关键步骤）
  const thisWeekStart = getWeekStart(new Date()).toISOString()
  try {
    const response = await fetch(`/api/convert/status?weekStart=${encodeURIComponent(thisWeekStart)}`)
    const result = await response.json()

    if (result.success && result.converted) {
      console.log('[转换] 后端已转换过，跳过提示')
      return false
    }
  } catch (error) {
    console.error('[转换] 检查转换状态失败:', error)
  }

  return true
}
```

**确认这个函数：**
- 正确调用 `/api/convert/status` API
- 正确解析 `result.converted` 字段
- 如果已转换则返回 `false`，不再弹窗

### Step 4: 提交修改

```bash
git add src/views/ReportView.vue
git commit -m "fix(frontend): 刷新数据后再检查转换状态，避免重复弹窗

- onMounted 时先强制刷新 recordsStore 和 reportsStore
- 等待数据加载完成后再检查转换状态
- 确保前端使用最新后端数据判断是否弹窗
- 解决因数据未刷新导致的重复转换问题"
```

---

## Task 4: 测试完整修复方案

**目标：** 验证三个修复一起工作是否正常

### Step 1: 准备测试环境

```bash
# 1. 确保所有修改已提交
git status

# 2. 重新构建并启动服务
docker compose down
docker compose up -d --build

# 3. 等待服务启动
sleep 10

# 4. 查看启动日志
docker compose logs --tail=50
```

### Step 2: 测试后端锁机制

**场景 1：同一天内手动触发两次转换任务**

```bash
# 第一次触发（模拟周一早上 9:00）
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test

# 等待 5 秒
sleep 5

# 第二次触发（应该被锁阻止）
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test
```

**预期结果：**
- 第一次：日志显示 `🔒 设置转换锁` 和 `✅ 计划转换成功`
- 第二次：日志显示 `⚠️ 今日已执行转换，跳过`
- 数据库中只有一份转换后的记录

**验证数据库：**

```bash
docker compose exec weekly-report sqlite3 /app/data/app.db \
  "SELECT COUNT(*) FROM records WHERE createdAt LIKE '$(date +%Y-%m-%d)%' AND deleted = 0;"
```

**预期：** 记录数量正确（不会重复）

### Step 3: 测试重启后立即触发问题

**场景 2：在下午重启服务，验证不会立即触发**

```bash
# 1. 停止服务
docker compose down

# 2. 启动服务
docker compose up -d

# 3. 立即查看日志
docker compose logs --tail=30
```

**预期结果：**
- 日志显示 `⏰ 当前时间已过 09:00，跳过首次触发`
- **没有** `任务触发` 日志
- 显示 `下次触发: 明天 09:00:00`

### Step 4: 测试前端弹窗逻辑

**场景 3：后端已转换，前端访问页面**

```bash
# 1. 手动触发一次转换（模拟周一早上）
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test

# 2. 打开浏览器，访问 http://localhost:3333/report

# 3. 清除缓存并刷新（Ctrl+Shift+R）

# 4. 查看浏览器控制台日志
```

**预期结果：**
- 控制台显示 `[ReportView] 开始初始化，先刷新数据...`
- 控制台显示 `[ReportView] 无需转换（已转换或无上周计划）`
- **不显示** 转换确认弹窗

### Step 5: 测试定时任务在正确时间触发

**场景 4：等待设定时间点验证任务触发**

**方法 A：修改任务时间进行快速测试**

```bash
# 1. 临时修改任务时间为当前时间 + 2 分钟
CURRENT_MIN=$(date +%M)
NEXT_MIN=$((CURRENT_MIN + 2))
if [ $NEXT_MIN -lt 10 ]; then
  NEXT_MIN="0$NEXT_MIN"
fi

# 2. 通过 API 更新任务时间
curl -X PUT http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert \
  -H "Content-Type: application/json" \
  -d "{\"hour\": $(date +%H), \"minute\": $NEXT_MIN, \"enabled\": true}"

# 3. 等待到设定时间
echo "等待到 $(date +%H):$NEXT_MIN 执行..."
sleep 120

# 4. 查看日志
docker compose logs --tail=50 | grep "\[Cron\]"
```

**预期结果：**
- 在设定时间点看到 `[Cron] ========== 任务触发 ==========`
- 任务正常执行
- 如果再次触发，会被锁阻止

**方法 B：等待真实的 09:00（如果时间接近）**

```bash
# 监控日志
docker compose logs -f | grep "\[Cron\]"
```

### Step 6: 提交测试文档

```bash
# 创建测试文档
cat > docs/tests/scheduled-tasks-fix-validation.md << 'EOF'
# 定时任务修复验证测试

## 测试环境
- 日期: $(date +%Y-%m-%d)
- 服务版本: 定时任务修复版

## 测试结果

### 1. 数据库锁机制
- [ ] 同一天内手动触发两次，第二次被阻止
- [ ] 锁的 key 格式正确: convert_lock_YYYY-MM-DD
- [ ] 锁包含锁定时间和任务 ID

### 2. 重启后立即触发问题
- [ ] 服务重启后不立即触发任务
- [ ] 日志显示"跳过首次触发"消息
- [ ] 下次触发时间显示为明天 09:00

### 3. 前端弹窗逻辑
- [ ] 后端已转换时，前端不弹窗
- [ ] 前端控制台显示数据刷新日志
- [ ] 转换状态检查使用最新后端数据

### 4. 定时任务在正确时间触发
- [ ] 任务在 09:00:00 准时触发
- [ ] 触发后执行转换并设置锁
- [ ] 第二次触发被锁阻止

## 已知问题
（如有）
EOF

git add docs/tests/scheduled-tasks-fix-validation.md
git commit -m "test: 添加定时任务修复验证测试文档"
```

---

## Task 5: 更新 CLAUDE.md 文档

**目标：** 记录本次修复，防止未来重复遇到相同问题

**文件：**
- Modify: `CLAUDE.md`

### Step 1: 在 CLAUDE.md 中添加新章节

**在"已知问题和解决方案"章节后添加：**

```markdown
### 问题 6：定时任务重复执行和重启立即触发

**现象**：
- 转换任务在极短时间内（0.055秒）执行两次，生成重复记录
- 服务重启后定时任务立即触发，而非按设定时间（09:00）执行
- 后端已执行转换，前端仍弹出转换确认弹窗

**原因**：
1. **重复执行**：修改定时任务时触发 `startScheduledTasks()` 重新调用，旧任务未停止完成，新任务已启动，导致竞态条件
2. **立即触发**：`node-schedule` 在创建调度任务时，如果当前时间已过今天的调度时间，会立即触发一次（库的设计行为）
3. **前端数据未刷新**：`onMounted()` 直接检查转换状态，未先刷新数据，读取到旧状态

**解决方案**：
1. **数据库锁**：在 `server/cron.js` 的 `executeTask()` 中添加锁机制
   - 执行转换前检查 `settings` 表中的 `convert_lock_YYYY-MM-DD` 键
   - 如果存在锁则跳过执行
   - 执行前设置锁（包含锁定时间和任务 ID）

2. **跳过首次触发**：在 `server/cron.js` 的 `startTask()` 中添加跳过逻辑
   - 检查当前时间是否已过今天的调度时间
   - 如果已过，标记 `shouldSkipFirstRun = true`
   - 首次触发时检查该标记并跳过

3. **前端数据刷新**：在 `src/views/ReportView.vue` 的 `onMounted()` 中
   - 先调用 `recordsStore.init()` 和 `reportsStore.init()` 刷新数据
   - 等待 300ms 确保异步操作完成
   - 再检查转换状态

**相关文件**：
- `server/cron.js:200-272` - 转换锁逻辑
- `server/cron.js:128-146` - 跳过首次触发逻辑
- `src/views/ReportView.vue:444-464` - 前端数据刷新逻辑

**测试方法**：
```bash
# 测试锁机制：手动触发两次
curl -X POST http://localhost:3333/api/scheduled-tasks/new_workweek_plan_convert/test

# 测试重启立即触发：下午重启服务
docker compose restart

# 测试前端弹窗：后端转换后访问页面
# 浏览器访问 http://localhost:3333/report
```
```

### Step 2: 更新文档版本信息

**在"最后更新"章节更新：**

```markdown
## 最后更新

- **日期**: 2026-01-28
- **版本**: 5.1
- **主要更新**:
  - **修复问题 #6**：定时任务重复执行、重启立即触发、前端数据未刷新
  - 添加数据库锁机制防止转换任务重复执行
  - 修改任务启动逻辑，防止服务重启后立即触发
  - 前端强制刷新数据后再检查转换状态
  - 之前版本（5.0）：文档精简和子文档创建
```

### Step 3: 提交文档更新

```bash
git add CLAUDE.md
git commit -m "docs: 更新 CLAUDE.md 记录定时任务修复

- 添加问题 #6：定时任务重复执行和重启立即触发
- 记录问题原因和三个解决方案
- 提供测试方法和相关文件位置
- 更新版本号至 5.1"
```

---

## 完成检查清单

**在实施过程中，确保完成以下检查：**

### 后端修改
- [ ] `server/cron.js` 中添加了转换锁逻辑
- [ ] `server/cron.js` 中添加了跳过首次触发逻辑
- [ ] 锁的 key 格式为 `convert_lock_YYYY-MM-DD`
- [ ] 锁包含 `lockedAt` 和 `taskId` 字段
- [ ] 日志清晰显示锁的设置和检查过程

### 前端修改
- [ ] `src/views/ReportView.vue` 中添加了数据刷新逻辑
- [ ] 使用 `Promise.all()` 并发刷新 store
- [ ] 添加了 300ms 等待时间
- [ ] 控制台日志清晰显示刷新过程

### 测试验证
- [ ] 手动触发两次转换，第二次被阻止
- [ ] 服务重启后不立即触发任务
- [ ] 前端在正确情况下不弹窗
- [ ] 定时任务在设定时间正确触发

### 文档更新
- [ ] `CLAUDE.md` 添加了问题 #6 的完整记录
- [ ] 版本号更新至 5.1
- [ ] 测试文档已创建

---

## 相关文档

- **问题分析报告**: 通过日志分析发现了三个问题的根本原因
- **测试文档**: `docs/tests/scheduled-tasks-fix-validation.md`
- **CLAUDE.md**: 项目开发规范和已知问题
- **相关 API**:
  - `POST /api/scheduled-tasks/:id/test` - 手动触发定时任务
  - `GET /api/convert/status?weekStart=xxx` - 检查转换状态
  - `PUT /api/scheduled-tasks/:id` - 更新定时任务

---

## 回滚方案

如果修复后出现问题，可以回滚到修复前的版本：

```bash
# 查看提交历史
git log --oneline -10

# 回滚到修复前的版本
git revert <commit-hash>

# 或者完全回滚（不推荐）
git reset --hard <commit-hash>
docker compose down
docker compose up -d --build
```

---

## 注意事项

1. **时区问题**：确保 Docker 容器时区设置为 `Asia/Shanghai`（已在 `docker-compose.yml` 中配置）
2. **数据库锁过期**：锁设置为永久有效（通过 `INSERT OR REPLACE` 覆盖），如果需要可以添加过期时间
3. **前端刷新时机**：在 `onMounted()` 中刷新是最早时机，确保用户看到最新数据
4. **测试环境**：建议在测试环境先验证，确认无误后再部署到生产环境

---

**实施完毕后，请运行完整测试套件并验证所有检查项。**
