# 任务清单：修复多个 UI 和功能 Bug

## 概述

本文档列出了修复 7 个 Bug 的详细任务清单，按优先级和依赖关系排序。

## 任务列表

### 阶段 1：快速修复（低风险，高价值）

#### Task 1.1：修复设置页面删除按钮图标

**优先级**：低
**估算**：15 分钟
**文件**：`src/views/SettingsView.vue`

**步骤**：
1. 打开 `src/views/SettingsView.vue`
2. 定位到第 46-50 行（项目管理删除按钮）
3. 替换 SVG 路径为垃圾桶图标
4. 定位到第 80-84 行（工作类型删除按钮）
5. 替换 SVG 路径为垃圾桶图标
6. 本地验证：打开设置页面，确认删除按钮显示垃圾桶图标

**验证标准**：
- [ ] 项目管理的删除按钮显示垃圾桶图标
- [ ] 工作类型的删除按钮显示垃圾桶图标
- [ ] 悬停时图标变红色

**回滚**：恢复原来的 SVG 路径

---

#### Task 1.2：修复定时任务不可编辑状态

**优先级**：中
**估算**：30 分钟
**文件**：`src/views/SettingsView.vue`

**步骤**：
1. 打开 `src/views/SettingsView.vue`
2. 修改模板中的 `task-item` 绑定：
   ```vue
   <div
     v-for="task in scheduledTasks"
     :key="task.id"
     class="task-item"
     :class="{
       'system-task': task.isSystemTask,
       'not-allowed': task.isSystemTask
     }"
   >
   ```
3. 在 CSS 中添加 `.not-allowed` 样式：
   ```scss
   .task-item {
     // 现有样式...
     &.not-allowed {
       cursor: not-allowed !important;
       .task-info {
         cursor: not-allowed !important;
         &:hover {
           background: transparent !important;
         }
       }
     }
   }
   ```
4. 本地验证：打开设置页面，悬停在系统任务上，确认显示 not-allowed 光标

**验证标准**：
- [ ] 系统任务在整个卡片区域显示 not-allowed 光标
- [ ] 非系统任务保持可点击状态
- [ ] 点击系统任务不触发编辑弹窗

**回滚**：移除 `not-allowed` class 和相关样式

---

### 阶段 2：中等修复（需要测试验证）

#### Task 2.1：修复周报预览排序问题

**优先级**：高
**估算**：30 分钟
**文件**：`src/composables/useGenerator.js`

**步骤**：
1. 打开 `src/composables/useGenerator.js`
2. 定位到 `generateReport()` 函数（约第 300 行）
3. 修改 `plans` 字段的返回值：
   ```javascript
   const generateReport = ({ records = [], plans = [], reflections = {} }) => {
       return {
           markdown: generateMarkdown({ records, plans, reflections }),
           plainText: generatePlainText({ records, plans, reflections }),
           records: [...records],
           plans: sortByPriority([...plans]),  // 添加排序
           reflections: { ...reflections },
           generatedAt: new Date().toISOString()
       }
   }
   ```
4. 本地验证：
   - 添加多个下周计划（包含不同的项目和类型组合）
   - 生成周报预览
   - 确认下周计划按优先级排序

**验证标准**：
- [ ] 下周计划按优先级排序（项目明确+类型明确 → 只有项目 → 只有类型 → 都是其他）
- [ ] [其他] 标签始终在最后
- [ ] 复制和下载的周报也符合排序规则

**回滚**：移除 `sortByPriority()` 调用

---

#### Task 2.2：修复下载文件名问题

**优先级**：中
**估算**：30 分钟
**文件**：`src/components/ReportPreview.vue`

**步骤**：
1. 打开 `src/components/ReportPreview.vue`
2. 导入 `formatDate` 函数（如果没有）：
   ```javascript
   import { formatDate } from '../utils/date'
   ```
3. 修改 `download()` 函数：
   ```javascript
   const download = () => {
     const content = props.report.markdown || '# 周报\n\n暂无内容'
     // 生成 weekLabel
     let weekLabel = props.report.weekLabel
     if (!weekLabel) {
       // 尝试从 weekStart 计算
       if (props.report.weekStart) {
         weekLabel = formatDate(new Date(props.report.weekStart), 'YYYY年第W周')
       } else {
         // 使用当前日期
         weekLabel = formatDate(new Date(), 'YYYY年第W周')
       }
     }
     const filename = `周报_${weekLabel}.md`
     downloadReport(content, filename)
     showToast('已开始下载')
   }
   ```
4. 本地验证：
   - 下载本周周报
   - 下载历史周报
   - 确认文件名正确

**验证标准**：
- [ ] 本周周报文件名包含当前周标签
- [ ] 历史周报文件名包含归档时的周标签
- [ ] 文件名格式为 `周报_YYYY年第WW周.md`

**回滚**：恢复原来的 `weekLabel || '未知'` 逻辑

---

#### Task 2.3：修复弹窗位置问题

**优先级**：高
**估算**：45 分钟
**文件**：`src/views/HomeView.vue`

**步骤**：
1. 打开 `src/views/HomeView.vue`
2. 在 `<script setup>` 中添加导入：
   ```javascript
   import { useDialogStore } from '../stores/dialog'
   import ConfirmDialog from '../components/ConfirmDialog.vue'
   ```
3. 创建 `dialogStore` 实例：
   ```javascript
   const dialogStore = useDialogStore()
   ```
4. 在模板末尾添加 ConfirmDialog 组件：
   ```vue
   <template>
     <div class="home-view page-container">
       <!-- 现有内容... -->

       <!-- 确认弹窗 -->
       <ConfirmDialog
         v-model:show="dialogStore.confirmShow"
         :title="dialogStore.confirmTitle || '确认'"
         :message="dialogStore.confirmMessage"
         :details="dialogStore.confirmDetails"
         @confirm="dialogStore.confirmHandle(true)"
         @cancel="dialogStore.confirmHandle(false)"
       />
     </div>
   </template>
   ```
5. 本地验证：
   - 打开工作记录页面
   - 选择一条记录
   - 点击"移到下周计划"
   - 确认弹窗可见

**验证标准**：
- [ ] 弹窗在工作记录页面可见
- [ ] 点击确认后操作成功
- [ ] 操作完成后显示 Toast 提示

**回滚**：从 HomeView 移除 ConfirmDialog 组件

---

### 阶段 3：复杂修复（需要后端配合）

#### Task 3.1：增强数据库管理搜索功能

**优先级**：中
**估算**：90 分钟
**文件**：`src/views/DatabaseView.vue`, `server/api.js`

**前端步骤**：
1. 打开 `src/views/DatabaseView.vue`
2. 添加 `filterColumn` 状态：
   ```javascript
   const filterColumn = ref('')
   ```
3. 添加 `searchableColumns` 计算属性：
   ```javascript
   const searchableColumns = computed(() => {
     return columns.value.filter(col => {
       const type = (col.type || '').toUpperCase()
       return type.includes('TEXT') || type.includes('CHAR') || type.includes('VARCHAR')
     })
   })
   ```
4. 修改搜索栏模板：
   ```vue
   <div class="search-bar">
     <svg class="search-icon">...</svg>
     <select v-model="filterColumn" class="filter-select">
       <option value="">全部字段</option>
       <option v-for="col in searchableColumns" :key="col.name" :value="col.name">
         {{ col.label || col.name }}
       </option>
     </select>
     <input
       v-model="searchQuery"
       type="text"
       class="search-input"
       placeholder="搜索数据..."
     />
   </div>
   ```
5. 修改 `fetchTableData()` 函数，添加 `column` 参数：
   ```javascript
   const params = new URLSearchParams({
     page: pagination.value.page,
     pageSize: pagination.value.pageSize,
     search: searchQuery.value,
     column: filterColumn.value
   })
   ```
6. 添加 CSS 样式：
   ```scss
   .search-bar {
     display: flex;
     gap: $spacing-3;
     .filter-select {
       padding: $spacing-3 $spacing-4;
       font-size: $font-size-sm;
       background: var(--bg-card);
       border: 1px solid var(--border-color);
       border-radius: $radius-md;
       color: var(--text-primary);
       cursor: pointer;
     }
   }
   ```

**后端步骤**：
1. 打开 `server/api.js`
2. 定义列白名单：
   ```javascript
   const TABLE_COLUMNS = {
     records: ['id', 'content', 'project', 'workType', 'createdAt', 'updatedAt', 'deleted', 'deletedAt'],
     reports: ['id', 'weekLabel', 'weekStart', 'weekEnd', 'markdown', 'plainText', 'createdAt', 'updatedAt', 'deleted', 'deletedAt'],
     settings: ['id', 'key', 'value', 'createdAt', 'updatedAt'],
     scheduled_tasks: ['id', 'name', 'type', 'hour', 'minute', 'dayOfWeek', 'enabled', 'isSystemTask', 'createdAt', 'updatedAt']
   }
   ```
3. 修改 `GET /api/database/table/:tableName` 处理逻辑：
   ```javascript
   app.get('/api/database/table/:tableName', async (req, res) => {
     try {
       const { tableName } = req.params
       const { page = 1, pageSize = 20, search = '', column = '' } = req.query

       // 白名单验证（表名）
       if (!TABLE_INFO[tableName]) {
         return res.status(400).json({ success: false, error: '无效的表名' })
       }

       const db = await createDbConnection()
       let sql = `SELECT * FROM ${tableName}`
       const params = []

       // 构建搜索条件
       if (search) {
         if (column) {
           // 按指定列搜索
           const allowedColumns = TABLE_COLUMNS[tableName]
           if (!allowedColumns.includes(column)) {
             db.close()
             return res.status(400).json({ success: false, error: '无效的列名' })
           }
           sql += ` WHERE ${column} LIKE ?`
           params.push(`%${search}%`)
         } else {
           // 全部字段搜索（原有逻辑）
           const tableInfo = await db.all(`PRAGMA table_info(${tableName})`)
           const textColumns = tableInfo
             .filter(col => {
               const type = (col.type || '').toUpperCase()
               return type.includes('TEXT') || type.includes('CHAR') || type.includes('VARCHAR')
             })
             .map(col => col.name)

           if (textColumns.length > 0) {
             const conditions = textColumns.map(col => `${col} LIKE ?`).join(' OR ')
             sql += ` WHERE ${conditions}`
             textColumns.forEach(() => params.push(`%${search}%`))
           }
         }
       }

       sql += ` ORDER BY rowid DESC LIMIT ? OFFSET ?`
       params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize))

       const rows = await db.all(sql, params)
       // ... 其他逻辑
     } catch (error) {
       // ... 错误处理
     }
   })
   ```

**验证标准**：
- [ ] 可以选择特定列进行搜索
- [ ] 可以选择"全部字段"进行模糊搜索
- [ ] 列名白名单验证生效
- [ ] SQL 注入防护有效

**回滚**：移除列选择器和后端参数处理

---

#### Task 3.2：修复回收站数据显示问题

**优先级**：高
**估算**：60 分钟
**文件**：`src/views/RecycleBinView.vue`, `src/stores/records.js`, `server/api.js`

**排查步骤**：
1. **后端检查**：
   ```bash
   # 检查 API 返回数据
   curl http://localhost:3000/api/records?deleted=1
   curl http://localhost:3000/api/reports?deleted=1

   # 检查数据库
   sqlite3 data/app.db "SELECT COUNT(*) FROM records WHERE deleted = 1;"
   sqlite3 data/app.db "SELECT COUNT(*) FROM reports WHERE deleted = 1;"
   ```

2. **前端检查**：
   打开 `src/views/RecycleBinView.vue`
   ```javascript
   const fetchDeletedData = async () => {
     console.log('[回收站] 开始获取已删除数据')

     await Promise.all([
       reportsStore.fetchDeletedReports().then(data => {
         deletedReports.value = data || []
         console.log('[回收站] 已删除周报:', deletedReports.value.length, deletedReports.value)
       }),
       recordsStore.fetchDeletedRecords().then(data => {
         console.log('[回收站] 已删除记录:', recordsStore.deletedRecords.length, recordsStore.deletedRecords)
       })
     ])

     console.log('[回收站] 数据获取完成')
   }
   ```

3. **Store 检查**：
   打开 `src/stores/records.js`
   ```javascript
   const fetchDeletedRecords = async () => {
       try {
           const response = await fetch(`${API_BASE}/records?deleted=1`)
           const result = await response.json()

           console.log('[Records] API 返回:', result)

           if (result.success) {
               deletedRecords.value = result.data
               console.log('[Records] 已删除记录:', deletedRecords.value.length)
               return result.data
           }
           return []
       } catch (error) {
           console.error('[Records] 获取已删除记录失败:', error)
           return []
       }
   }
   ```

4. **修复方案**（根据排查结果）：
   - 如果 API 返回数据不完整：修复后端 SQL 查询
   - 如果前端绑定问题：修复响应式绑定
   - 如果模板渲染问题：修复 v-for 逻辑

**验证标准**：
- [ ] 回收站显示所有已删除的工作记录
- [ ] 回收站显示所有已删除的周报
- [ ] 数量徽章正确显示
- [ ] 恢复功能正常工作
- [ ] 永久删除功能正常工作

**回滚**：恢复原来的数据处理逻辑

---

### 阶段 4：文档更新

#### Task 4.1：更新 CLAUDE.md 文档

**优先级**：中
**估算**：30 分钟
**文件**：`CLAUDE.md`

**步骤**：
1. 在"已知问题和解决方案"部分添加这些 bug 的记录
2. 更新版本号和日期
3. 添加相关代码位置索引

**更新内容**：
```markdown
## 最后更新

- **日期**: 2026-01-16
- **版本**: 3.2
- **主要更新**:
  - Bug 修复：周报预览排序问题（useGenerator.js 第 305 行）
  - Bug 修复：下载文件名显示"未知"问题（ReportPreview.vue 第 176 行）
  - Bug 修复：设置页面删除按钮图标错误（SettingsView.vue 第 46、80 行）
  - Bug 修复：定时任务不可编辑状态不正确（SettingsView.vue 第 157 行）
  - Bug 修复：弹窗位置问题（HomeView.vue 第 34 行）
  - Bug 修复：数据库管理搜索增强（DatabaseView.vue 第 33 行、server/api.js）
  - Bug 修复：回收站数据显示问题（RecycleBinView.vue 第 174 行）
```

**验证标准**：
- [ ] 文档已更新
- [ ] 版本号已更新
- [ ] 日期已更新

**回滚**：恢复文档内容

---

## 执行顺序

```
第 1 天（快速修复）：
├── Task 1.1：删除按钮图标（15 分钟）
└── Task 1.2：不可编辑状态（30 分钟）

第 2 天（中等修复）：
├── Task 2.1：周报排序（30 分钟）
├── Task 2.2：文件名问题（30 分钟）
└── Task 2.3：弹窗位置（45 分钟）

第 3 天（复杂修复）：
├── Task 3.1：数据库搜索增强（90 分钟）
└── Task 3.2：回收站数据问题（60 分钟）

第 4 天（文档和测试）：
├── Task 4.1：更新文档（30 分钟）
└── 回归测试（2 小时）
```

## 测试清单

### 本地测试

- [ ] 所有 Bug 修复已通过本地验证
- [ ] 单元测试通过（如果有）
- [ ] 手动测试完成

### 集成测试

- [ ] 周报生成和下载功能正常
- [ ] 设置页面功能正常
- [ ] 数据库管理功能正常
- [ ] 回收站功能正常
- [ ] 弹窗在所有页面正常显示

### 回归测试

- [ ] 不影响其他功能
- [ ] 无新的 bug 引入
- [ ] 性能无明显下降

## 部署清单

### 部署前

- [ ] 所有代码已提交
- [ ] 已创建 pull request
- [ ] 代码审查已完成
- [ ] 测试环境验证通过

### 部署步骤

1. **后端部署**（Bug 3.1, 3.2）：
   ```bash
   # 1. 拉取最新代码
   git pull origin main

   # 2. 重启后端服务
   npm run restart
   ```

2. **前端部署**（所有 Bug）：
   ```bash
   # 1. 拉取最新代码
   git pull origin main

   # 2. 构建生产版本
   npm run build

   # 3. 重启前端服务
   npm run restart
   ```

### 部署后验证

- [ ] 检查后端日志，无错误
- [ ] 检查前端控制台，无错误
- [ ] 验证所有 Bug 修复生效
- [ ] 监控错误率，无明显上升

## 回滚计划

如果出现问题，按以下步骤回滚：

```bash
# 回滚到修复前的版本
git revert <commit-hash>
npm run build
npm run restart
```

或者直接回滚到特定 commit：

```bash
git reset --hard <commit-before-fixes>
npm run build
npm run restart
```

## 注意事项

1. **备份**：部署前备份数据库和代码
2. **测试**：每个修复都要充分测试
3. **文档**：及时更新文档
4. **沟通**：如有问题及时沟通

## 相关资源

- [项目规范](../../CLAUDE.md)
- [OpenSpec 指南](../AGENTS.md)
- [Git 工作流](../../project.md#git-工作流)
