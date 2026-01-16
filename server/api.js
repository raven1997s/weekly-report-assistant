// ========================================
// 智能周报助手 - 后端 API 服务
// ========================================

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, queryAll, queryGet, queryRun, createDbConnection } from './db.js'
import { initTemplates, startScheduledTasks, sendReminder, executeTask } from './cron.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 托管静态文件（前端构建产物）
app.use(express.static(path.join(__dirname, '../dist')))

// 日志中间件
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`)
  next()
})

// ============================================
// 工作记录 API
// ============================================

// GET /api/records - 获取所有工作记录
app.get('/api/records', async (req, res) => {
  try {
    const db = await createDbConnection()
    const { deleted } = req.query

    // 支持查询已删除的记录（用于回收站）
    let sql = 'SELECT * FROM records'
    let params = []

    if (deleted === '1') {
      sql += ' WHERE deleted = 1'
    } else {
      // 默认只返回未删除的记录
      sql += ' WHERE deleted = 0'
    }

    sql += ' ORDER BY createdAt DESC'

    const records = await queryAll(db, sql, params)
    db.close()
    res.json({ success: true, data: records })
  } catch (error) {
    console.error('[API] 获取记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/records - 添加工作记录
app.post('/api/records', async (req, res) => {
  try {
    const { id, content, project, workType, createdAt, updatedAt } = req.body

    const db = await createDbConnection()
    const result = await queryRun(
      db,
      'INSERT INTO records (id, content, project, workType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, content, project || null, workType || null, createdAt, updatedAt]
    )
    db.close()

    res.json({
      success: true,
      data: { ...req.body, id }
    })
  } catch (error) {
    console.error('[API] 添加记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/records/batch - 批量保存工作记录（替换全部）
// 注意：必须在 /api/records/:id 之前定义，否则 batch 会被当作 :id 匹配
app.put('/api/records/batch', async (req, res) => {
  try {
    const { records } = req.body

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: '记录必须是数组' })
    }

    const db = await createDbConnection()

    // 清空现有记录
    await queryRun(db, 'DELETE FROM records', [])

    // 使用 Promise 批量插入所有记录
    const insertPromises = records.map(record => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO records (id, content, project, workType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [record.id, record.content, record.project || null, record.workType || null, record.createdAt, record.updatedAt],
          function (err) {
            if (err) reject(err)
            else resolve(this.lastID)
          }
        )
      })
    })

    await Promise.all(insertPromises)
    db.close()

    console.log(`[API] 批量保存了 ${records.length} 条记录`)
    res.json({ success: true, count: records.length })
  } catch (error) {
    console.error('[API] 批量保存失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/records/:id - 更新工作记录
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { content, project, workType, updatedAt } = req.body

    const db = await createDbConnection()
    await queryRun(
      db,
      'UPDATE records SET content = ?, project = ?, workType = ?, updatedAt = ? WHERE id = ?',
      [content, project || null, workType || null, updatedAt, id]
    )
    db.close()

    res.json({ success: true, data: { ...req.body, id } })
  } catch (error) {
    console.error('[API] 更新记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/records/:id - 删除工作记录（软删除）
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deletedAt = new Date().toISOString()

    const db = await createDbConnection()
    await queryRun(db, 'UPDATE records SET deleted = 1, deletedAt = ? WHERE id = ?', [deletedAt, id])
    db.close()

    console.log(`[API] 软删除记录: ${id}`)
    res.json({ success: true, message: '记录已移至回收站' })
  } catch (error) {
    console.error('[API] 删除记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/records/:id/restore - 恢复工作记录
app.post('/api/records/:id/restore', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await queryRun(db, 'UPDATE records SET deleted = 0, deletedAt = NULL WHERE id = ?', [id])
    db.close()

    console.log(`[API] 恢复记录: ${id}`)
    res.json({ success: true, message: '记录已恢复' })
  } catch (error) {
    console.error('[API] 恢复记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/records/:id/permanent - 永久删除工作记录
app.delete('/api/records/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await queryRun(db, 'DELETE FROM records WHERE id = ?', [id])
    db.close()

    console.log(`[API] 永久删除记录: ${id}`)
    res.json({ success: true, message: '记录已永久删除' })
  } catch (error) {
    console.error('[API] 永久删除记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/records/move-to-next-week - 将记录移到下周计划
app.post('/api/records/move-to-next-week', async (req, res) => {
  try {
    const { recordIds } = req.body

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要移动的记录ID' })
    }

    const db = await createDbConnection()

    // 1. 查询记录
    const records = []
    for (const id of recordIds) {
      const record = await queryGet(
        db,
        'SELECT * FROM records WHERE id = ? AND deleted = 0',
        [id]
      )
      if (record) {
        records.push(record)
      }
    }

    if (records.length === 0) {
      await db.close()
      return res.status(404).json({ success: false, error: '未找到有效记录' })
    }

    // 2. 获取当前的 currentPlans
    const plansConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'currentPlans'"
    )
    const currentPlans = plansConfig ? JSON.parse(plansConfig.value) : []

    // 3. 将记录转为计划并追加
    const newPlans = records.map(record => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: record.content,
      project: record.project || null,
      workType: record.workType || null
    }))

    const updatedPlans = [...currentPlans, ...newPlans]

    // 4. 保存 currentPlans
    await queryRun(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('currentPlans', ?)",
      [JSON.stringify(updatedPlans)]
    )

    // 5. 软删除这些记录
    const deletedAt = new Date().toISOString()
    for (const id of recordIds) {
      await queryRun(
        db,
        'UPDATE records SET deleted = 1, deletedAt = ? WHERE id = ?',
        [deletedAt, id]
      )
    }

    await db.close()

    console.log(`[API] 已将 ${records.length} 条记录移到下周计划`)

    res.json({
      success: true,
      movedCount: records.length,
      newPlans: newPlans,
      message: `已将 ${records.length} 条记录移到下周计划`
    })
  } catch (error) {
    console.error('[API] 移到下周计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// 周报归档 API
// ============================================

// GET /api/reports - 获取所有周报归档
app.get('/api/reports', async (req, res) => {
  try {
    const db = await createDbConnection()
    const { deleted } = req.query

    // 支持查询已删除的周报（用于回收站）
    let sql = 'SELECT * FROM reports'
    if (deleted === '1') {
      sql += ' WHERE deleted = 1'
    } else {
      // 默认只返回未删除的周报
      sql += ' WHERE deleted = 0'
    }
    sql += ' ORDER BY weekStart DESC'

    // 获取周报列表
    const reports = await queryAll(db, sql)

    // 解析 JSON 字段
    const parsedReports = reports.map(report => ({
      ...report,
      records: JSON.parse(report.records || '[]'),
      plans: JSON.parse(report.plans || '[]'),
      reflections: JSON.parse(report.reflections || '{}')
    }))

    // 获取下周计划
    const plansData = await queryGet(db, "SELECT value FROM settings WHERE key = 'currentPlans'")
    const currentPlans = plansData ? JSON.parse(plansData.value) : []

    // 获取本周总结
    const reflectionsData = await queryGet(db, "SELECT value FROM settings WHERE key = 'currentReflections'")
    const currentReflections = reflectionsData ? JSON.parse(reflectionsData.value) : { gains: '', losses: '' }

    db.close()

    res.json({
      success: true,
      data: {
        reports: parsedReports,
        currentPlans,
        currentReflections
      }
    })
  } catch (error) {
    console.error('[API] 获取周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/reports - 保存周报归档
// ⚠️ 已删除 PUT /api/reports 端点（2026-01-16）
// 原因：该端点会先删除所有数据再插入（DELETE FROM reports），存在严重数据丢失风险
// 现在使用单个周报保存接口（通过 saveReport），不再需要批量同步

// DELETE /api/reports/:id - 删除周报（软删除）
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deletedAt = new Date().toISOString()

    const db = await createDbConnection()
    await queryRun(db, 'UPDATE reports SET deleted = 1, deletedAt = ? WHERE id = ?', [deletedAt, id])
    db.close()

    console.log(`[API] 软删除周报: ${id}`)
    res.json({ success: true, message: '周报已移至回收站' })
  } catch (error) {
    console.error('[API] 删除周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/reports/:id/restore - 恢复周报
app.post('/api/reports/:id/restore', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()

    // 先获取周报数据
    const report = await queryGet(db, 'SELECT * FROM reports WHERE id = ?', [id])

    if (!report) {
      await db.close()
      return res.status(404).json({ success: false, error: '周报不存在' })
    }

    // 恢复周报
    await queryRun(db, 'UPDATE reports SET deleted = 0, deletedAt = NULL WHERE id = ?', [id])
    await db.close()

    console.log(`[API] 恢复周报: ${id}`)
    res.json({
      success: true,
      message: '周报已恢复',
      data: {
        report: {
          weekStart: report.weekStart,
          plans: report.plans ? JSON.parse(report.plans) : [],
          reflections: report.reflections ? JSON.parse(report.reflections) : {}
        }
      }
    })
  } catch (error) {
    console.error('[API] 恢复周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/reports/:id/permanent - 永久删除周报
app.delete('/api/reports/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await queryRun(db, 'DELETE FROM reports WHERE id = ?', [id])
    db.close()

    console.log(`[API] 永久删除周报: ${id}`)
    res.json({ success: true, message: '周报已永久删除' })
  } catch (error) {
    console.error('[API] 永久删除周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// 应用设置 API
// ============================================

// GET /api/settings - 获取所有设置
app.get('/api/settings', async (req, res) => {
  try {
    const db = await createDbConnection()
    const settingsArray = await queryAll(db, 'SELECT * FROM settings')
    db.close()

    // 转换为对象格式
    const settings = {}
    settingsArray.forEach(({ key, value }) => {
      settings[key] = value
    })

    res.json({ success: true, data: settings })
  } catch (error) {
    console.error('[API] 获取设置失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/settings - 保存所有设置
app.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body

    const db = await createDbConnection()

    // 清空现有设置
    await queryRun(db, 'DELETE FROM settings', [])

    // 使用 Promise 批量插入所有设置
    const insertPromises = Object.entries(settings).map(([key, value]) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO settings (key, value) VALUES (?, ?)',
          [key, value],
          function (err) {
            if (err) reject(err)
            else resolve(this.lastID)
          }
        )
      })
    })

    await Promise.all(insertPromises)
    db.close()

    console.log('[API] 设置已保存')
    res.json({ success: true })
  } catch (error) {
    console.error('[API] 保存设置失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// 钉钉机器人代理 API
// ============================================

/**
 * 生成钉钉签名（HMAC-SHA256）
 * @param {string} secret - 密钥
 * @param {number} timestamp - 时间戳
 * @returns {string} base64 编码的签名
 */
const generateDingTalkSignature = (secret, timestamp) => {
  const stringToSign = `${timestamp}\n${secret}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(stringToSign)
  const signature = hmac.digest('base64')
  return signature
}

/**
 * 发送消息到钉钉（后端代理函数，避免 CORS 问题）
 * @param {string} webhookUrl - Webhook URL
 * @param {string} secret - 密钥（可选）
 * @param {object} messageBody - 消息体
 * @returns {Promise<object>}
 */
const sendToDingTalkBackend = async (webhookUrl, secret, messageBody) => {
  try {
    // 构建请求 URL
    let url = webhookUrl
    if (secret) {
      const timestamp = Date.now()
      const sign = generateDingTalkSignature(secret, timestamp)
      url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
    }

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageBody)
    })

    const result = await response.json()

    if (result.errcode === 0) {
      return { success: true, message: '发送成功' }
    } else {
      return { success: false, message: result.errmsg || '发送失败' }
    }
  } catch (error) {
    console.error('[钉钉] 发送失败:', error)
    return { success: false, message: error.message }
  }
}

// POST /api/dingtalk/send - 发送钉钉消息（代理）
app.post('/api/dingtalk/send', async (req, res) => {
  try {
    const { webhookUrl, secret, msgtype, content, title } = req.body

    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: '未配置 Webhook URL' })
    }

    // 构建消息体
    let messageBody
    if (msgtype === 'markdown') {
      messageBody = {
        msgtype: 'markdown',
        markdown: {
          title: title || '周报通知',
          text: content
        }
      }
    } else {
      // 默认为文本消息
      messageBody = {
        msgtype: 'text',
        text: {
          content: content
        }
      }
    }

    // 发送消息
    const result = await sendToDingTalkBackend(webhookUrl, secret, messageBody)

    if (result.success) {
      res.json({ success: true, message: result.message })
    } else {
      res.status(400).json({ success: false, error: result.message })
    }
  } catch (error) {
    console.error('[API] 钉钉发送失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/dingtalk/test - 测试钉钉配置
app.post('/api/dingtalk/test', async (req, res) => {
  try {
    const { webhookUrl, secret } = req.body

    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: '未配置 Webhook URL' })
    }

    const messageBody = {
      msgtype: 'text',
      text: {
        content: '智能周报助手测试消息\n\n这是一条测试消息，如果你收到这条消息，说明配置正确！'
      }
    }

    const result = await sendToDingTalkBackend(webhookUrl, secret, messageBody)

    if (result.success) {
      res.json({ success: true, message: result.message })
    } else {
      res.status(400).json({ success: false, error: result.message })
    }
  } catch (error) {
    console.error('[API] 钉钉测试失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/dingtalk/test-reminder - 手动发送提醒测试
app.post('/api/dingtalk/test-reminder', async (req, res) => {
  try {
    const db = await createDbConnection()

    // 获取钉钉配置
    const enabledConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'dingtalk_enabled'"
    )
    const webhookConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'dingtalk_webhookUrl'"
    )
    const secretConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'dingtalk_secret'"
    )

    await db.close()

    if (!enabledConfig || enabledConfig.value !== 'true') {
      return res.status(400).json({ success: false, error: '钉钉功能未启用' })
    }

    if (!webhookConfig || !webhookConfig.value) {
      return res.status(400).json({ success: false, error: '未配置钉钉 Webhook' })
    }

    // 调用 cron.js 中的 sendReminder
    const result = await sendReminder(webhookConfig.value, secretConfig?.value || '')

    if (result.success) {
      res.json({ success: true, message: '测试提醒已发送，请检查钉钉群' })
    } else {
      res.status(500).json({ success: false, error: result.message })
    }
  } catch (error) {
    console.error('[API] 发送测试提醒失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/scheduled-tasks/:id/test - 手动触发定时任务
app.post('/api/scheduled-tasks/:id/test', async (req, res) => {
  try {
    const db = await createDbConnection()
    const task = await queryGet(
      db,
      'SELECT * FROM scheduled_tasks WHERE id = ?',
      [req.params.id]
    )
    await db.close()

    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    await executeTask(task)

    res.json({ success: true, message: '任务已执行，请查看后端日志' })
  } catch (error) {
    console.error('[API] 执行任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// 计划转换状态 API
// ============================================

// GET /api/convert/status?weekStart=xxx - 检查指定周的计划是否已转换
app.get('/api/convert/status', async (req, res) => {
  try {
    const { weekStart } = req.query

    if (!weekStart) {
      return res.status(400).json({ success: false, error: '缺少 weekStart 参数' })
    }

    const db = await createDbConnection()
    const converted = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = ?",
      [`converted_plans_${weekStart}`]
    )
    db.close()

    if (converted) {
      const data = JSON.parse(converted.value)
      res.json({ success: true, converted: true, data })
    } else {
      res.json({ success: true, converted: false, data: null })
    }
  } catch (error) {
    console.error('[API] 检查转换状态失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/convert/mark - 标记指定周的计划已转换
app.post('/api/convert/mark', async (req, res) => {
  try {
    const { weekStart, recordIds } = req.body

    if (!weekStart) {
      return res.status(400).json({ success: false, error: '缺少 weekStart 参数' })
    }

    const markData = {
      convertedAt: new Date().toISOString(),
      recordIds: recordIds || [],
      weekStart: weekStart
    }

    const db = await createDbConnection()
    await db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [`converted_plans_${weekStart}`, JSON.stringify(markData)]
    )
    db.close()

    console.log(`[API] 已标记转换: ${weekStart}`)
    res.json({ success: true, message: '转换标记已保存' })
  } catch (error) {
    console.error('[API] 标记转换失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// 定时任务 API
// ============================================

// GET /api/scheduled-tasks - 获取所有定时任务
app.get('/api/scheduled-tasks', async (req, res) => {
  try {
    const db = await createDbConnection()
    const { deleted } = req.query

    // 支持查询已删除的任务（用于回收站）
    let sql = 'SELECT * FROM scheduled_tasks'
    if (deleted === '1') {
      sql += ' WHERE deleted = 1'
    } else {
      // 默认只返回未删除的任务
      sql += ' WHERE deleted = 0'
    }
    sql += ' ORDER BY day_of_week, hour, minute'

    const tasks = await queryAll(db, sql)

    // 转换 enabled 和 isSystemTask 字段
    const result = tasks.map(task => ({
      ...task,
      enabled: task.enabled === 1,
      isSystemTask: task.isSystemTask === 1
    }))

    await db.close()
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('[API] 获取定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/scheduled-tasks - 创建新的定时任务
app.post('/api/scheduled-tasks', async (req, res) => {
  try {
    const { name, type, hour, minute, dayOfWeek, enabled } = req.body

    if (!name || type === undefined || hour === undefined || minute === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }

    // 直接使用传入的 dayOfWeek，或默认为 '*'（每天运行，运行时校验）
    const finalDayOfWeek = dayOfWeek || '*'

    const db = await createDbConnection()
    const id = `task_${Date.now()}`

    await db.run(
      `INSERT INTO scheduled_tasks (id, name, hour, minute, day_of_week, type, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, hour, minute, finalDayOfWeek, type, enabled ? 1 : 0, new Date().toISOString(), new Date().toISOString()]
    )

    db.close()

    // 重启定时任务
    await startScheduledTasks()

    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('[API] 创建定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/scheduled-tasks/:id - 更新定时任务
app.put('/api/scheduled-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, hour, minute, dayOfWeek, enabled } = req.body

    const db = await createDbConnection()

    // 检查是否为系统任务
    const task = await queryGet(db, 'SELECT isSystemTask FROM scheduled_tasks WHERE id = ?', [id])

    if (task && task.isSystemTask === 1) {
      await db.close()
      return res.status(403).json({ success: false, error: '系统任务无法修改' })
    }

    // 如果只更新 enabled，则只更新该字段
    if (enabled !== undefined && name === undefined) {
      await queryRun(
        db,
        'UPDATE scheduled_tasks SET enabled = ?, updated_at = ? WHERE id = ?',
        [enabled ? 1 : 0, new Date().toISOString(), id]
      )
    } else {
      // 更新所有字段
      await queryRun(
        db,
        `UPDATE scheduled_tasks
         SET name = ?, hour = ?, minute = ?, day_of_week = ?, type = ?, enabled = ?, updated_at = ?
         WHERE id = ?`,
        [name, hour, minute, dayOfWeek, type, enabled ? 1 : 0, new Date().toISOString(), id]
      )
    }

    await db.close()

    // 重启定时任务
    await startScheduledTasks()

    res.json({ success: true })
  } catch (error) {
    console.error('[API] 更新定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/scheduled-tasks/:id - 删除定时任务（软删除）
app.delete('/api/scheduled-tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deletedAt = new Date().toISOString()

    const db = await createDbConnection()

    // 检查是否为系统任务
    const task = await queryGet(db, 'SELECT isSystemTask FROM scheduled_tasks WHERE id = ?', [id])

    if (task && task.isSystemTask === 1) {
      await db.close()
      return res.status(403).json({ success: false, error: '系统任务无法删除' })
    }

    await queryRun(db, 'UPDATE scheduled_tasks SET deleted = 1, deletedAt = ?, enabled = 0 WHERE id = ?', [deletedAt, id])
    await db.close()

    // 重启定时任务
    await startScheduledTasks()

    console.log(`[API] 软删除定时任务: ${id}`)
    res.json({ success: true, message: '定时任务已移至回收站' })
  } catch (error) {
    console.error('[API] 删除定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/scheduled-tasks/:id/restore - 恢复定时任务
app.post('/api/scheduled-tasks/:id/restore', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await db.run('UPDATE scheduled_tasks SET deleted = 0, deletedAt = NULL WHERE id = ?', [id])
    db.close()

    console.log(`[API] 恢复定时任务: ${id}`)
    res.json({ success: true, message: '定时任务已恢复' })
  } catch (error) {
    console.error('[API] 恢复定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/scheduled-tasks/:id/permanent - 永久删除定时任务
app.delete('/api/scheduled-tasks/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await db.run('DELETE FROM scheduled_tasks WHERE id = ?', [id])
    db.close()

    // 重启定时任务
    await startScheduledTasks()

    console.log(`[API] 永久删除定时任务: ${id}`)
    res.json({ success: true, message: '定时任务已永久删除' })
  } catch (error) {
    console.error('[API] 永久删除定时任务失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============================================
// SPA 路由 fallback
// ============================================

// 所有非 API 请求返回 index.html（支持 Vue Router）
app.use((req, res) => {
  // 如果是 API 请求，返回 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' })
  }
  // 其他请求返回 index.html
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// ============================================
// 启动服务器
// ============================================

async function startServer() {
  try {
    // 初始化数据库
    await initDatabase()

    // 初始化定时任务模板
    await initTemplates()
    console.log('[Cron] 定时任务模板初始化完成')

    // 启动定时任务
    await startScheduledTasks()

    // 启动 Express
    app.listen(PORT, () => {
      console.log(`\n===========================================`)
      console.log(`🚀 后端服务已启动`)
      console.log(`📍 地址: http://localhost:${PORT}`)
      console.log(`===========================================\n`)
    })
  } catch (error) {
    console.error('[API] 启动失败:', error)
    process.exit(1)
  }
}

startServer()
