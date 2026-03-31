// ========================================
// 智能周报助手 - 定时任务管理器
// ========================================

import schedule from 'node-schedule'
import { createDbConnection, queryGet, queryAll, queryRun } from './db.js'
import { isWorkday, getWorkWeekInfo, formatDate } from './utils/date.js'

// 预设时间模板
// 注意：所有任务设置为每天运行（dayOfWeek: '*'），在运行时校验是否应该执行
const SCHEDULE_TEMPLATES = [
  {
    id: 'last_workday_3pm',
    name: '工作周最后一天周报',
    hour: 15,
    minute: 0,
    dayOfWeek: '*', // 每天运行，运行时校验是否为最后一个工作日
    type: 'report', // 周报推送
    enabled: false,
    isSystemTask: false
  },
  {
    id: 'workday_930am',
    name: '工作日上班后提醒',
    hour: 9,
    minute: 30,
    dayOfWeek: '*', // 每天运行，运行时校验是否为工作日
    type: 'reminder', // 填写提醒
    enabled: false,
    isSystemTask: false
  },
  {
    id: 'workday_530pm',
    name: '工作日下班前提醒',
    hour: 17,
    minute: 30,
    dayOfWeek: '*', // 每天运行，运行时校验是否为工作日
    type: 'reminder', // 填写提醒
    enabled: false,
    isSystemTask: false
  },
  {
    id: 'new_workweek_plan_convert',
    name: '新工作周计划转换',
    hour: 9,
    minute: 0,
    dayOfWeek: '*', // 每天运行，运行时校验
    type: 'convert', // 计划转换
    enabled: false,
    isSystemTask: true // 系统核心任务，禁止修改
  }
]

// 存储已启动的 cron 任务
const activeJobs = new Map()

function getConversionStatusKey(weekStart) {
  return `converted_plans_${weekStart}`
}

function getPlanConversionCutoff(today) {
  return getWeekStart(today).toISOString()
}

/**
 * 初始化预设模板到数据库
 */
async function initTemplates() {
  const db = await createDbConnection()

  for (const template of SCHEDULE_TEMPLATES) {
    // 检查是否已存在
    const existing = await queryGet(
      db,
      'SELECT id FROM scheduled_tasks WHERE id = ?',
      [template.id]
    )

    if (!existing) {
      // 插入预设模板（包含 isSystemTask 字段）
      await queryRun(
        db,
        `INSERT INTO scheduled_tasks (id, name, hour, minute, day_of_week, type, enabled, isSystemTask, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [template.id, template.name, template.hour, template.minute, template.dayOfWeek,
         template.type || 'report', template.enabled ? 1 : 0, template.isSystemTask ? 1 : 0,
         new Date().toISOString(), new Date().toISOString()]
      )
      console.log(`[Cron] 初始化模板: ${template.name} (${template.type})${template.isSystemTask ? ' [系统任务]' : ''}`)
    } else if (template.isSystemTask) {
      // 系统任务始终保持启用且恢复到预设定义，避免因历史配置失效
      await queryRun(
        db,
        `UPDATE scheduled_tasks
         SET name = ?, hour = ?, minute = ?, day_of_week = ?, type = ?, enabled = 1, isSystemTask = 1, deleted = 0, deletedAt = NULL, updated_at = ?
         WHERE id = ?`,
        [template.name, template.hour, template.minute, template.dayOfWeek, template.type, new Date().toISOString(), template.id]
      )
      console.log(`[Cron] 校正系统任务配置: ${template.name}`)
    }
  }

  await db.close()
}

/**
 * 启动所有启用的定时任务
 */
async function startScheduledTasks() {
  const db = await createDbConnection()

  // 获取所有启用的任务
  const tasks = await queryAll(
    db,
    'SELECT * FROM scheduled_tasks WHERE enabled = 1 AND deleted = 0'
  )

  await db.close()

  // 停止现有的任务
  stopAllTasks()

  if (tasks.length === 0) {
    console.log('[Cron] 没有启用的定时任务')
    return
  }

  // 启动新任务
  tasks.forEach(task => {
    startTask(task)
  })

  // 服务在计划时间之后启动时，补跑系统转换任务，避免必须依赖前端触发
  const convertTask = tasks.find(task => task.type === 'convert')
  if (convertTask) {
    await executeTask(convertTask)
  }

  console.log(`[Cron] ========== 已启动 ${tasks.length} 个定时任务 ==========`)
  tasks.forEach(task => {
    console.log(`[Cron]   - ${task.name} (${task.id})`)
    console.log(`[Cron]     时间: ${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`)
    console.log(`[Cron]     类型: ${task.type}`)
    console.log(`[Cron]     时区: Asia/Shanghai`)
  })
  console.log(`[Cron] ========================================`)
}

/**
 * 启动单个定时任务
 * 使用 node-schedule，基于规则对象调度，运行时校验是否应该执行
 */
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

  if (job) {
    activeJobs.set(task.id, job)
    console.log(`[Cron] 启动任务: ${task.name} (每天 ${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}，运行时校验)`)
    console.log(`[Cron]   下次触发: ${job.nextInvocation().toString()}`)
  } else {
    console.error(`[Cron] 启动任务失败: ${task.name}`)
  }
}

/**
 * 停止所有定时任务
 */
function stopAllTasks() {
  activeJobs.forEach((job, id) => {
    job.cancel()
  })
  activeJobs.clear()
}

/**
 * 执行定时推送任务
 */
async function executeTask(task) {
  try {
    const now = new Date()
    console.log(`[Cron] ========== 任务触发 ==========`)
    console.log(`[Cron] 任务: ${task.name} (${task.id})`)
    console.log(`[Cron] 当前时间: ${now.toISOString()}`)
    console.log(`[Cron] 当前时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
    console.log(`[Cron] 日期: ${formatDate(now, 'yyyy-MM-dd')} ${formatDate(now, 'HH:mm:ss')}`)

    // ========== 新增：工作日校验 ==========
    const today = new Date()

    if (task.type === 'reminder') {
      // 提醒任务：只在真正的工作日执行
      const isTodayWorkday = isWorkday(today)
      console.log(`[Cron] 工作日校验: ${isTodayWorkday ? '✅ 是工作日' : '❌ 非工作日'}`)
      if (!isTodayWorkday) {
        console.log(`[Cron] 今天不是工作日，跳过提醒`)
        return
      }
    } else if (task.type === 'report') {
      // 周报任务：只在最后一个工作日执行
      const workWeekInfo = getWorkWeekInfo(today)
      const lastWorkday = new Date(workWeekInfo.end)

      // 比较日期（忽略时分秒）
      const todayStr = formatDate(today, 'yyyy-MM-dd')
      const lastWorkdayStr = formatDate(lastWorkday, 'yyyy-MM-dd')

      console.log(`[Cron] 今天: ${todayStr}, 最后工作日: ${lastWorkdayStr}`)
      if (todayStr !== lastWorkdayStr) {
        console.log(`[Cron] 今天不是工作周最后一天，跳过周报推送`)
        return
      }
      console.log(`[Cron] ✅ 是工作周最后一天，准备推送周报`)
    }
    // ========== 校验结束 ==========

    // ========== 计划转换任务 ==========
    if (task.type === 'convert') {
      const today = new Date()
      const currentWeekStart = getWeekStart(today)
      const currentWeekStartStr = formatDate(currentWeekStart, 'yyyy-MM-dd')

      // 转换任务只在工作日执行；如果错过了周一，也允许在本工作周内补跑。
      if (!isWorkday(today)) {
        console.log(`[Cron] 今天不是工作日，跳过计划转换`)
        return
      }

      if (isNewWorkWeekStart(today)) {
        console.log(`[Cron] ✅ 检测到新工作周开始: ${currentWeekStartStr}`)
      } else {
        console.log(`[Cron] ⏰ 当前不是新工作周开始，进入补跑检查: ${currentWeekStartStr}`)
      }

      // 2. 打开数据库连接
      const db = await createDbConnection()
      const lockKey = `convert_lock_${currentWeekStartStr}`

      try {
        // 3. 查询上周周报的 plans
        const lastWeekData = await getLastWeekPlans(db, today)

        if (!lastWeekData || lastWeekData.plans.length === 0) {
          console.log(`[Cron] 上周无下周计划，跳过转换`)
          return
        }

        // 4. 检查是否已转换过
        const alreadyConverted = await isPlansConverted(db, lastWeekData.weekStart)
        if (alreadyConverted) {
          console.log(`[Cron] 上周计划已转换过，跳过: ${lastWeekData.weekStart}`)
          return
        }

        // 只有在确实存在待转换数据时才加锁，避免“先加锁后发现无数据”导致当天无法补跑。
        const existingLock = await queryGet(
          db,
          "SELECT value FROM settings WHERE key = ?",
          [lockKey]
        )

        if (existingLock) {
          const lockData = JSON.parse(existingLock.value)
          console.log(`[Cron] ⚠️ 本工作周已执行转换 (${lockData.lockedAt})，跳过: ${currentWeekStartStr}`)
          return
        }

        await queryRun(
          db,
          "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
          [lockKey, JSON.stringify({
            lockedAt: new Date().toISOString(),
            taskId: task.id,
            weekStart: currentWeekStart.toISOString()
          })]
        )
        console.log(`[Cron] 🔒 设置转换锁: ${currentWeekStartStr}`)

        // 5. 转换 plans 为 records
        const now = new Date().toISOString()
        const records = convertPlansToRecords(lastWeekData.plans, now)

        console.log(`[Cron] 准备插入 ${records.length} 条记录`)

        // 6. 批量插入 records 表
        let successCount = 0
        let skipCount = 0

        for (const record of records) {
          try {
            await queryRun(
              db,
              `INSERT INTO records (id, content, project, workType, createdAt, updatedAt, deleted)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [record.id, record.content, record.project, record.workType,
               record.createdAt, record.updatedAt, record.deleted]
            )
            successCount++
          } catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
              skipCount++
            } else {
              console.error(`[Cron] 插入记录失败 [${record.id}]:`, error.message)
            }
          }
        }

        // 7. 标记已转换
        await markPlansAsConverted(db, lastWeekData.weekStart, records.map(r => r.id))

        console.log(`[Cron] ✅ 计划转换成功: ${successCount} 条成功, ${skipCount} 条跳过`)

      } catch (error) {
        console.error(`[Cron] 计划转换失败:`, error)
        await queryRun(
          db,
          'DELETE FROM settings WHERE key = ?',
          [lockKey]
        )
        console.log(`[Cron] 已清理转换锁，允许后续重试: ${lockKey}`)
      } finally {
        await db.close()
      }

      return
    }
    // ========== 转换任务结束 ==========

    // 获取钉钉配置
    const db = await createDbConnection()
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

    // 检查钉钉功能是否启用
    if (!enabledConfig || enabledConfig.value !== 'true') {
      console.log('[Cron] 钉钉功能未启用，跳过推送')
      await db.close()
      return
    }

    if (!webhookConfig || !webhookConfig.value) {
      console.log('[Cron] 未配置钉钉 Webhook，跳过推送')
      await db.close()
      return
    }

    await db.close()

    // 根据任务类型执行不同的推送逻辑
    if (task.type === 'reminder') {
      // 填写提醒
      const result = await sendReminder(webhookConfig.value, secretConfig?.value || '', task)
      if (result.success) {
        console.log(`[Cron] ✅ 提醒发送成功: ${task.name}`)
      } else {
        console.log(`[Cron] ❌ 提醒发送失败: ${result.message}`)
      }
    } else {
      // 周报推送
      const db2 = await createDbConnection()
      const now = new Date()
      const weekStart = getWeekStart(now).toISOString()

      const report = await queryGet(
        db2,
        'SELECT * FROM reports WHERE weekStart = ?',
        [weekStart]
      )

      await db2.close()

      if (!report) {
        console.log('[Cron] 本周尚未生成周报，跳过推送')
        return
      }

      const result = await sendToDingTalk(report, webhookConfig.value, secretConfig?.value || '')
      if (result.success) {
        console.log(`[Cron] ✅ 推送成功: ${task.name}`)
      } else {
        console.log(`[Cron] ❌ 推送失败: ${result.message}`)
      }
    }

  } catch (error) {
    console.error(`[Cron] 执行任务失败:`, error)
  }
}

/**
 * 获取本周开始时间（周一）
 */
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 发送到钉钉
 */
async function sendToDingTalk(report, webhookUrl, secret) {
  const crypto = await import('crypto')

  // 构建消息
  const markdown = convertReportToMarkdown(report)

  // 生成签名
  let url = webhookUrl
  if (secret) {
    const timestamp = Date.now()
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    const sign = hmac.digest('base64')
    url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }

  // 发送请求
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        title: `周报 - ${report.weekLabel}`,
        text: markdown
      }
    })
  })

  const result = await response.json()

  if (result.errcode === 0) {
    return { success: true, message: '发送成功' }
  } else {
    return { success: false, message: result.errmsg || '发送失败' }
  }
}

/**
 * 转换周报为钉钉 Markdown 格式
 */
function convertReportToMarkdown(report) {
  let markdown = `## ${report.weekLabel || '周报'}\n\n`

  if (report.plainText) {
    markdown += report.plainText
  } else if (report.markdown) {
    markdown += report.markdown
      .replace(/### /g, '## ')
      .replace(/\*\*/g, '')
      .replace(/- /g, '• ')
  } else {
    markdown += '暂无内容'
  }

  return markdown
}

/**
 * 发送工作记录填写提醒
 */
async function sendReminder(webhookUrl, secret, task) {
  const crypto = await import('crypto')

  // 生成签名
  let url = webhookUrl
  if (secret) {
    const timestamp = Date.now()
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    const sign = hmac.digest('base64')
    url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }

  // 日志：发送前
  console.log(`[DingTalk] 准备发送提醒...`)
  console.log(`[DingTalk] Webhook URL: ${webhookUrl ? '已配置' : '未配置'}`)
  console.log(`[DingTalk] Secret: ${secret ? '已配置' : '未配置'}`)
  console.log(`[DingTalk] 使用签名: ${secret ? '是' : '否'}`)

  // 获取当前日期
  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[now.getDay()]

  // 根据任务时间选择人性化文案
  const hour = task?.hour || 9
  const isMorning = hour < 12

  let greeting, title, message

  if (isMorning) {
    // 上午提醒 - 快吃中午饭了
    title = '上午工作记录提醒'
    greeting = '快吃中午饭啦 🍱'
    message = `上午忙得怎么样？趁热记录一下上午的工作内容吧，避免午饭后忘记~`
  } else {
    // 下午提醒 - 快下班了
    title = '下午工作记录提醒'
    greeting = '快下班啦 👋'
    message = `辛苦一天了！临走前花 1 分钟记录一下今天的工作，让周报更轻松~`
  }

  // 构建提醒消息
  const messageBody = {
    msgtype: 'markdown',
    markdown: {
      title: title,
      text: `## 📝 ${title}\n\n` +
            `> ${dateStr} ${weekday}\n\n` +
            `**${greeting}**\n\n` +
            `${message}\n\n` +
            `**记录方式**：\n` +
            `1. 打开周报助手\n` +
            `2. 在首页输入今日工作\n` +
            `3. 系统会自动识别项目和类型\n\n` +
            `积累每一天，让周报更轻松！💪`
    }
  }

  // 发送请求
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messageBody)
  })

  const result = await response.json()

  // 日志：发送后
  console.log(`[DingTalk] 响应: errcode=${result.errcode}, errmsg=${result.errmsg}`)

  if (result.errcode === 0) {
    return { success: true, message: '发送成功' }
  } else {
    return { success: false, message: result.errmsg || '发送失败' }
  }
}

// ========================================
// 计划转换辅助函数
// ========================================

/**
 * 判断是否为新工作周开始
 * 条件：昨天不是工作日，今天是工作日
 */
function isNewWorkWeekStart(today) {
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isTodayWorkday = isWorkday(today)
  const wasYesterdayWorkday = isWorkday(yesterday)

  return isTodayWorkday && !wasYesterdayWorkday
}

/**
 * 获取上周周报的 plans
 * 查询最新的已归档周报（weekStart 小于今天的最新周报）
 */
async function getLastWeekPlans(db, today) {
  const cutoffWeekStart = getPlanConversionCutoff(today)

  const report = await queryGet(
    db,
    `SELECT plans, weekStart FROM reports
     WHERE weekStart < ? AND deleted = 0
     ORDER BY weekStart DESC
     LIMIT 1`,
    [cutoffWeekStart]
  )

  if (!report || !report.plans) {
    console.log(`[Cron] 未找到已归档的周报或无下周计划`)
    return null
  }

  const plans = JSON.parse(report.plans)
  console.log(`[Cron] 找到周报 ${report.weekStart.split('T')[0]} 的 ${plans.length} 条下周计划`)

  return { plans, weekStart: report.weekStart }
}

/**
 * 将 plans 转换为 records
 */
function convertPlansToRecords(plans, createdAt) {
  return plans.map(plan => ({
    id: plan.id,
    content: plan.content,
    project: plan.project || null,
    workType: plan.workType || null,
    createdAt: createdAt,
    updatedAt: createdAt,
    deleted: 0,
    deletedAt: null
  }))
}

/**
 * 检查该批计划是否已转换过
 */
async function isPlansConverted(db, weekStart) {
  const converted = await queryGet(
    db,
    "SELECT value FROM settings WHERE key = ?",
    [getConversionStatusKey(weekStart)]
  )

  return !!converted
}

/**
 * 标记该批计划已转换
 */
async function markPlansAsConverted(db, weekStart, recordIds) {
  const markData = {
    convertedAt: new Date().toISOString(),
    recordIds: recordIds,
    weekStart: weekStart
  }

  await queryRun(
    db,
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [getConversionStatusKey(weekStart), JSON.stringify(markData)]
  )

  console.log(`[Cron] 已标记转换: ${weekStart}, ${recordIds.length} 条记录`)
}

export {
  initTemplates,
  startScheduledTasks,
  stopAllTasks,
  SCHEDULE_TEMPLATES,
  sendReminder,
  executeTask,
  getConversionStatusKey,
  getPlanConversionCutoff
}
