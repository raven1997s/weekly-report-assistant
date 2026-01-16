# 调试和错误排查

> 智能周报助手 - 常见问题排查指南

## 目录

- [前端调试](#前端调试)
- [后端调试](#后端调试)
- [数据库调试](#数据库调试)
- [常见错误](#常见错误)

## 前端调试

### 检查 Pinia 状态

在浏览器控制台中检查 Store 状态：

```javascript
// 检查工作记录
import { useRecordsStore } from './src/stores/records'
const recordsStore = useRecordsStore()
console.log(recordsStore.records)

// 检查周报归档
import { useReportsStore } from './src/stores/reports'
const reportsStore = useReportsStore()
console.log(reportsStore.reports)
```

### 检查网络请求

1. 打开浏览器开发者工具 → Network 标签页
2. 筛选 XHR 查看 API 请求
3. 检查请求参数和响应数据
4. 确认响应格式：`{ success: true, data: ... }`

### Vue DevTools

安装 [Vue DevTools](https://devtools.vuejs.org/) 浏览器扩展：
- 查看组件树
- 检查 Pinia Store 状态
- 追踪事件和性能

## 后端调试

### 检查 API 响应

```bash
# 查看所有工作记录
curl http://localhost:3000/api/records

# 查看所有周报
curl http://localhost:3000/api/reports

# 查看设置
curl http://localhost:3000/api/settings
```

### 检查后端日志

```bash
# 如果使用 docker
docker-compose logs -f app

# 如果使用 npm
npm run dev
```

### 数据库连接测试

```bash
# 进入项目目录
cd /Users/raven/Documents/devlop/all_in_ai/weekly_report_assistant

# 使用 SQLite 命令行
sqlite3 data/app.db
```

## 数据库调试

### 查看表结构

```sql
-- 查看所有表
.tables

-- 查看表结构
.schema records
.schema reports
.schema settings
```

### 查询数据

```sql
-- 查看工作记录
SELECT * FROM records WHERE deleted = 0;

-- 查看周报
SELECT * FROM reports WHERE deleted = 0;

-- 查看设置
SELECT * FROM settings;
```

### 清空数据

```sql
-- 清空工作记录
DELETE FROM records;

-- 清空周报归档
DELETE FROM reports;

-- 清空设置
DELETE FROM settings;
```

### 删除数据库

```bash
rm data/app.db
# 重启服务会自动创建新数据库
```

## 常见错误

### "Cannot read property XXX of undefined"

**原因**：访问未定义对象的属性

**解决方案**：
- 使用可选链：`obj?.prop`
- 使用默认值：`obj.prop || '默认值'`
- 检查数据来源，确保 API 返回正确数据

### "Network Error"

**原因**：后端服务未启动或网络配置错误

**解决方案**：
1. 检查后端服务是否启动：`http://localhost:3000`
2. 检查 API 路径是否正确
3. 查看后端控制台日志
4. 检查防火墙设置

### "WeekLabel is undefined"

**原因**：日期处理函数导入或使用错误

**解决方案**：
- 检查 `formatDate` 函数是否正确导入
- 检查日期对象是否有效：`new Date()`
- 确认 `src/utils/date.js` 文件存在

### 数据库锁死

**原因**：数据库连接未正确关闭

**解决方案**：
```bash
# 检查是否有进程占用数据库
lsof | grep app.db

# 重启服务释放连接
docker-compose restart
# 或
npm run dev
```

### 软删除数据查询

**原因**：查询未过滤 `deleted` 字段

**解决方案**：
```sql
-- 只查询未删除的数据
SELECT * FROM records WHERE deleted = 0;

-- 查询已删除的数据
SELECT * FROM records WHERE deleted = 1;
```

## 开发工具

### 推荐浏览器扩展

- Vue DevTools - Vue 调试
- React Developer Tools - 如果使用 React
- JSON Viewer - JSON 格式化显示

### 推荐命令行工具

- `curl` - API 测试
- `sqlite3` - 数据库操作
- `docker-compose` - 容器管理

## 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [Docker 部署指南](./deployment.md)
- [环境变量配置](./configuration.md)
