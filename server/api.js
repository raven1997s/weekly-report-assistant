// ========================================
// 智能周报助手 - 后端 API 服务
// ========================================

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, queryAll, queryGet, queryRun, createDbConnection, migratePlansFromSettings } from './db.js'
import { initTemplates, startScheduledTasks, sendReminder, executeTask, getConversionStatusKey } from './cron.js'
import { MAIL_TEMPLATES, renderMailTemplate } from './mail-templates.js'
import { createMailDraft } from './mail-service.js'
import {
  PLAN_RECORD_STATUS,
  getDefaultRecordStatus,
  resolveRecordStatus
} from '../shared/record-status.js'

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

const getConfiguredRecordStatuses = async (db) => {
  const row = await queryGet(db, "SELECT value FROM settings WHERE key = 'recordStatuses'")
  if (!row?.value) return []

  try {
    return JSON.parse(row.value)
  } catch {
    return []
  }
}

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

    const records = (await queryAll(db, sql, params)).map(record => ({
      ...record,
      status: resolveRecordStatus(record.status)
    }))
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
    const { id, content, project, workType, status, createdAt, updatedAt } = req.body

    const db = await createDbConnection()
    const nextStatus = String(status || '').trim() || getDefaultRecordStatus(await getConfiguredRecordStatuses(db))
    await queryRun(
      db,
      'INSERT INTO records (id, content, project, workType, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, content, project || null, workType || null, nextStatus, createdAt, updatedAt]
    )
    db.close()

    res.json({
      success: true,
      data: { ...req.body, id, status: nextStatus }
    })
  } catch (error) {
    console.error('[API] 添加记录失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/records/:id - 更新工作记录
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { content, project, workType, status, updatedAt } = req.body

    const db = await createDbConnection()
    const existingRecord = await queryGet(db, 'SELECT * FROM records WHERE id = ?', [id])

    if (!existingRecord) {
      db.close()
      return res.status(404).json({ success: false, error: '记录不存在' })
    }

    const nextContent = content !== undefined ? content : existingRecord.content
    const nextProject = Object.prototype.hasOwnProperty.call(req.body, 'project')
      ? (project || null)
      : existingRecord.project
    const nextWorkType = Object.prototype.hasOwnProperty.call(req.body, 'workType')
      ? (workType || null)
      : existingRecord.workType
    const nextStatus = Object.prototype.hasOwnProperty.call(req.body, 'status')
      ? resolveRecordStatus(status)
      : resolveRecordStatus(existingRecord.status)
    const nextUpdatedAt = updatedAt || new Date().toISOString()

    await queryRun(
      db,
      'UPDATE records SET content = ?, project = ?, workType = ?, status = ?, updatedAt = ? WHERE id = ?',
      [nextContent, nextProject, nextWorkType, nextStatus, nextUpdatedAt, id]
    )
    db.close()

    res.json({
      success: true,
      data: {
        ...existingRecord,
        content: nextContent,
        project: nextProject,
        workType: nextWorkType,
        status: nextStatus,
        updatedAt: nextUpdatedAt,
        id
      }
    })
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

    // 2. 将记录写入 plans 表，统一使用单一数据源
    const now = new Date().toISOString()
    const targetWeekStart = getCurrentWeekStart()
    const newPlans = records.map(record => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      content: record.content,
      project: record.project || null,
      workType: record.workType || null,
      weekStart: targetWeekStart,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }))

    for (const plan of newPlans) {
      await queryRun(
        db,
        `INSERT INTO plans (id, content, project, workType, weekStart, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, plan.content, plan.project, plan.workType, plan.weekStart, plan.status, plan.createdAt, plan.updatedAt]
      )
    }

    // 3. 软删除这些记录
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
      newPlans,
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

    // 获取本周总结
    const reflectionsData = await queryGet(db, "SELECT value FROM settings WHERE key = 'currentReflections'")
    const currentReflections = reflectionsData ? JSON.parse(reflectionsData.value) : { gains: '', losses: '' }

    db.close()

    res.json({
      success: true,
      data: {
        reports: parsedReports,
        currentReflections
      }
    })
  } catch (error) {
    console.error('[API] 获取周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/current-state - 保存当前编辑状态（本周总结）
// 注意：下周计划已迁移到独立的 /api/plans 接口管理
app.put('/api/current-state', async (req, res) => {
  try {
    const { currentReflections } = req.body

    // 验证数据
    if (!currentReflections || typeof currentReflections !== 'object') {
      return res.status(400).json({ success: false, error: 'currentReflections 必须是对象' })
    }

    const db = await createDbConnection()

    // 只保存 currentReflections（currentPlans 通过 /api/plans 独立管理）
    await queryRun(
      db,
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['currentReflections', JSON.stringify(currentReflections)]
    )

    db.close()

    console.log(`[API] 保存当前编辑状态: ${currentReflections.gains || currentReflections.losses ? '有总结' : '无总结'}`)
    res.json({ success: true, message: '当前编辑状态已保存' })
  } catch (error) {
    console.error('[API] 保存当前编辑状态失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/reports - 保存单个周报归档
app.post('/api/reports', async (req, res) => {
  try {
    const { id, weekStart, weekLabel, content, markdown, plainText, records, plans, reflections, createdAt, updatedAt } = req.body

    // 验证必填字段
    if (!weekStart || !weekLabel) {
      return res.status(400).json({ success: false, error: '缺少必填字段: weekStart, weekLabel' })
    }

    const db = await createDbConnection()

    // 只把未删除的周报视为“已存在归档稿”，避免本周稿件进回收站后阻塞重新归档
    const existing = await queryGet(
      db,
      'SELECT * FROM reports WHERE weekStart = ? AND deleted = 0',
      [weekStart]
    )

    const reportId = id || `${weekStart}-${Date.now()}`

    if (existing) {
      // 更新现有周报
      await queryRun(
        db,
        `UPDATE reports SET
          weekLabel = ?,
          content = ?,
          markdown = ?,
          plainText = ?,
          records = ?,
          plans = ?,
          reflections = ?,
          updatedAt = ?
        WHERE id = ?`,
        [
          weekLabel,
          content || '',
          markdown || '',
          plainText || '',
          JSON.stringify(records || []),
          JSON.stringify(plans || []),
          JSON.stringify(reflections || {}),
          updatedAt || new Date().toISOString(),
          existing.id
        ]
      )
      console.log(`[API] 更新周报归档: ${existing.id} (${weekLabel})`)
    } else {
      // 计算 weekEnd（如果前端没有提供）
      const weekEndValue = req.body.weekEnd || (() => {
        const startDate = new Date(weekStart)
        startDate.setDate(startDate.getDate() + 6)
        return startDate.toISOString()
      })()

      // 插入新周报
      await queryRun(
        db,
        `INSERT INTO reports (id, weekStart, weekEnd, weekLabel, content, markdown, plainText, records, plans, reflections, createdAt, updatedAt, deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          reportId,
          weekStart,
          weekEndValue,
          weekLabel,
          content || '',
          markdown || '',
          plainText || '',
          JSON.stringify(records || []),
          JSON.stringify(plans || []),
          JSON.stringify(reflections || {}),
          createdAt || new Date().toISOString(),
          updatedAt || new Date().toISOString()
        ]
      )
      console.log(`[API] 创建周报归档: ${reportId} (${weekLabel})`)
    }

    db.close()

    res.json({
      success: true,
      data: {
        id: reportId,
        weekStart,
        weekLabel,
        message: '周报归档成功'
      }
    })
  } catch (error) {
    console.error('[API] 保存周报失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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
// 下周计划 API
// ============================================

/**
 * 获取当前周的周一日期（ISO 8601 格式）
 * @returns {string}
 */
const getCurrentWeekStart = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart.toISOString()
}

// GET /api/plans - 获取计划列表
app.get('/api/plans', async (req, res) => {
  try {
    const db = await createDbConnection()
    const { weekStart, deleted, status } = req.query

    // 默认获取当前周的计划
    const targetWeekStart = weekStart || getCurrentWeekStart()

    let sql = 'SELECT * FROM plans WHERE weekStart = ?'
    const params = [targetWeekStart]

    // 按删除状态筛选
    if (deleted === '1') {
      sql += ' AND deleted = 1'
    } else {
      sql += ' AND deleted = 0'
    }

    // 按状态筛选
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    sql += ' ORDER BY createdAt ASC'

    const plans = await queryAll(db, sql, params)
    db.close()

    res.json({ success: true, data: plans })
  } catch (error) {
    console.error('[API] 获取计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/plans - 添加新计划
app.post('/api/plans', async (req, res) => {
  try {
    const { id, content, project, workType, weekStart } = req.body

    if (!content) {
      return res.status(400).json({ success: false, error: '计划内容不能为空' })
    }

    const planId = id || Date.now().toString() + Math.random().toString(36).slice(2, 9)
    const now = new Date().toISOString()
    const targetWeekStart = weekStart || getCurrentWeekStart()

    const db = await createDbConnection()
    await queryRun(db, `
      INSERT INTO plans (id, content, project, workType, weekStart, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [planId, content, project || null, workType || null, targetWeekStart, now, now])
    db.close()

    const plan = {
      id: planId,
      content,
      project: project || null,
      workType: workType || null,
      weekStart: targetWeekStart,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }

    console.log(`[API] 添加计划: ${planId}`)
    res.json({ success: true, data: plan })
  } catch (error) {
    console.error('[API] 添加计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/plans/:id - 更新计划
app.put('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { content, project, workType, status } = req.body
    const now = new Date().toISOString()

    const db = await createDbConnection()

    // 构建更新语句
    const updates = []
    const params = []

    if (content !== undefined) {
      updates.push('content = ?')
      params.push(content)
    }
    if (project !== undefined) {
      updates.push('project = ?')
      params.push(project || null)
    }
    if (workType !== undefined) {
      updates.push('workType = ?')
      params.push(workType || null)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }
    updates.push('updatedAt = ?')
    params.push(now)
    params.push(id)

    await queryRun(db, `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`, params)
    db.close()

    console.log(`[API] 更新计划: ${id}`)
    res.json({ success: true, data: { id, ...req.body, updatedAt: now } })
  } catch (error) {
    console.error('[API] 更新计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/plans/:id - 软删除计划
app.delete('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deletedAt = new Date().toISOString()

    const db = await createDbConnection()
    await queryRun(db, 'UPDATE plans SET deleted = 1, deletedAt = ? WHERE id = ?', [deletedAt, id])
    db.close()

    console.log(`[API] 软删除计划: ${id}`)
    res.json({ success: true, message: '计划已移至回收站' })
  } catch (error) {
    console.error('[API] 删除计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/plans/:id/restore - 恢复计划
app.post('/api/plans/:id/restore', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await queryRun(db, 'UPDATE plans SET deleted = 0, deletedAt = NULL WHERE id = ?', [id])
    db.close()

    console.log(`[API] 恢复计划: ${id}`)
    res.json({ success: true, message: '计划已恢复' })
  } catch (error) {
    console.error('[API] 恢复计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/plans/:id/permanent - 永久删除计划
app.delete('/api/plans/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()
    await queryRun(db, 'DELETE FROM plans WHERE id = ?', [id])
    db.close()

    console.log(`[API] 永久删除计划: ${id}`)
    res.json({ success: true, message: '计划已永久删除' })
  } catch (error) {
    console.error('[API] 永久删除计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/plans/:id/convert - 将计划转换为工作记录
app.post('/api/plans/:id/convert', async (req, res) => {
  try {
    const { id } = req.params

    const db = await createDbConnection()

    // 获取计划
    const plan = await queryGet(db, 'SELECT * FROM plans WHERE id = ? AND deleted = 0', [id])
    if (!plan) {
      db.close()
      return res.status(404).json({ success: false, error: '计划不存在' })
    }

    if (plan.status === 'converted') {
      db.close()
      return res.status(400).json({ success: false, error: '该计划已转换' })
    }

    // 创建工作记录
    const recordId = Date.now().toString() + Math.random().toString(36).slice(2, 9)
    const now = new Date().toISOString()

    await queryRun(db, `
      INSERT INTO records (id, content, project, workType, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [recordId, plan.content, plan.project, plan.workType, PLAN_RECORD_STATUS, now, now])

    // 更新计划状态
    await queryRun(db, `
      UPDATE plans SET status = 'converted', convertedRecordId = ?, updatedAt = ? WHERE id = ?
    `, [recordId, now, id])

    db.close()

    console.log(`[API] 计划 ${id} 已转换为工作记录 ${recordId}`)
    res.json({
      success: true,
      data: {
        planId: id,
        recordId,
        record: {
          id: recordId,
          content: plan.content,
          project: plan.project,
          workType: plan.workType,
          status: PLAN_RECORD_STATUS,
          createdAt: now,
          updatedAt: now
        }
      }
    })
  } catch (error) {
    console.error('[API] 转换计划失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/plans/batch-convert - 批量转换计划为工作记录
app.post('/api/plans/batch-convert', async (req, res) => {
  try {
    const { planIds, weekStart } = req.body

    const db = await createDbConnection()
    const now = new Date().toISOString()
    const convertedRecords = []

    // 获取要转换的计划（支持按 ID 列表或按周获取）
    let plans = []
    if (planIds && Array.isArray(planIds) && planIds.length > 0) {
      for (const id of planIds) {
        const plan = await queryGet(db, 'SELECT * FROM plans WHERE id = ? AND deleted = 0 AND status = ?', [id, 'pending'])
        if (plan) plans.push(plan)
      }
    } else if (weekStart) {
      plans = await queryAll(db, 'SELECT * FROM plans WHERE weekStart = ? AND deleted = 0 AND status = ?', [weekStart, 'pending'])
    } else {
      // 默认转换当前周的所有待处理计划
      const currentWeekStart = getCurrentWeekStart()
      plans = await queryAll(db, 'SELECT * FROM plans WHERE weekStart = ? AND deleted = 0 AND status = ?', [currentWeekStart, 'pending'])
    }

    if (plans.length === 0) {
      db.close()
      return res.json({ success: true, convertedCount: 0, records: [] })
    }

    // 转换每个计划
    for (const plan of plans) {
      const recordId = Date.now().toString() + Math.random().toString(36).slice(2, 9)

      // 创建工作记录
      await queryRun(db, `
        INSERT INTO records (id, content, project, workType, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [recordId, plan.content, plan.project, plan.workType, PLAN_RECORD_STATUS, now, now])

      // 更新计划状态
      await queryRun(db, `
        UPDATE plans SET status = 'converted', convertedRecordId = ?, updatedAt = ? WHERE id = ?
      `, [recordId, now, plan.id])

      convertedRecords.push({
        planId: plan.id,
        recordId,
        content: plan.content,
        project: plan.project,
        workType: plan.workType,
        status: PLAN_RECORD_STATUS
      })
    }

    db.close()

    console.log(`[API] 批量转换 ${convertedRecords.length} 条计划为工作记录`)
    res.json({
      success: true,
      convertedCount: convertedRecords.length,
      records: convertedRecords
    })
  } catch (error) {
    console.error('[API] 批量转换计划失败:', error)
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
    const settingKeys = Object.keys(settings)

    // 仅更新当前提交的设置项，保留 currentReflections、计划转换标记等其他系统设置
    if (settingKeys.length > 0) {
      const placeholders = settingKeys.map(() => '?').join(', ')
      await queryRun(db, `DELETE FROM settings WHERE key IN (${placeholders})`, settingKeys)
    }

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

const getMailConfigFromSettings = (settings = {}) => ({
  account: settings.mail_account || '',
  imapHost: settings.mail_imap_host || '',
  imapPort: Number(settings.mail_imap_port || 993),
  secure: settings.mail_secure === 'false' ? false : true,
  password: settings.mail_password || '',
  draftsMailbox: settings.mail_drafts_mailbox || 'Drafts',
  webmailUrl: settings.mail_web_url || '',
  defaultTo: settings.mail_default_to || '',
  defaultCc: settings.mail_default_cc || '',
  defaultBcc: settings.mail_default_bcc || '',
  defaultTemplate: settings.mail_default_template || 'gancao-department-weekly-report'
})

const convertSettingsRowsToObject = (settingsArray = []) => {
  const settings = {}
  settingsArray.forEach(({ key, value }) => {
    settings[key] = value
  })
  return settings
}

const loadSettingsFromDb = async () => {
  const db = await createDbConnection()
  const settingsArray = await queryAll(db, 'SELECT * FROM settings')
  db.close()
  return convertSettingsRowsToObject(settingsArray)
}

const mergeSettings = (baseSettings = {}, settingsOverride = {}) => {
  const merged = { ...baseSettings }

  Object.entries(settingsOverride || {}).forEach(([key, value]) => {
    merged[key] = typeof value === 'boolean' ? String(value) : String(value ?? '')
  })

  return merged
}

// GET /api/mail/templates - 获取邮件模板列表
app.get('/api/mail/templates', async (req, res) => {
  res.json({ success: true, data: MAIL_TEMPLATES })
})

// POST /api/mail/preview - 预览邮件模板
app.post('/api/mail/preview', async (req, res) => {
  try {
    const { templateKey, report, settingsOverride } = req.body

    if (!report || typeof report !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 report 数据' })
    }

    const settings = mergeSettings(await loadSettingsFromDb(), settingsOverride)
    const mailConfig = getMailConfigFromSettings(settings)
    const finalTemplateKey = templateKey || mailConfig.defaultTemplate
    const rendered = renderMailTemplate({
      templateKey: finalTemplateKey,
      report,
      settings
    })

    res.json({
      success: true,
      data: {
        templateKey: finalTemplateKey,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      }
    })
  } catch (error) {
    console.error('[API] 预览邮件模板失败:', error)
    res.status(500).json({ success: false, error: error.message || '预览邮件模板失败' })
  }
})

// POST /api/mail/drafts - 创建企业邮箱草稿
app.post('/api/mail/drafts', async (req, res) => {
  try {
    const { templateKey, report } = req.body

    if (!report || typeof report !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 report 数据' })
    }

    const settings = await loadSettingsFromDb()
    const mailConfig = getMailConfigFromSettings(settings)
    const finalTemplateKey = templateKey || mailConfig.defaultTemplate
    const rendered = renderMailTemplate({
      templateKey: finalTemplateKey,
      report,
      settings
    })

    const result = await createMailDraft({
      config: mailConfig,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    })

    res.json({
      success: true,
      data: {
        templateKey: finalTemplateKey,
        subject: rendered.subject,
        mailbox: result.mailbox,
        openUrl: mailConfig.webmailUrl || ''
      }
    })
  } catch (error) {
    console.error('[API] 创建邮件草稿失败:', error)
    res.status(500).json({ success: false, error: error.message || '创建邮件草稿失败' })
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
      [getConversionStatusKey(weekStart)]
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
    await queryRun(
      db,
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [getConversionStatusKey(weekStart), JSON.stringify(markData)]
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

    // 将历史 settings.currentPlans 迁移到 plans 表，并清理旧键
    const db = await createDbConnection()
    await migratePlansFromSettings(db)
    await db.close()

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
