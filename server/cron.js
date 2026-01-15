// ========================================
// 智能周报助手 - 定时任务管理器
// ========================================

import cron from 'node-cron'
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
    enabled: false
  },
  {
    id: 'workday_930am',
    name: '工作日上班后提醒',
    hour: 9,
    minute: 30,
    dayOfWeek: '*', // 每天运行，运行时校验是否为工作日
    type: 'reminder', // 填写提醒
    enabled: false
  },
  {
    id: 'workday_530pm',
    name: '工作日下班前提醒',
    hour: 17,
    minute: 30,
    dayOfWeek: '*', // 每天运行，运行时校验是否为工作日
    type: 'reminder', // 填写提醒
    enabled: false
  },
  {
    id: 'new_workweek_plan_convert',
    name: '新工作周计划转换',
    hour: 9,
    minute: 0,
    dayOfWeek: '*', // 每天运行，运行时校验
    type: 'convert', // 计划转换
    enabled: false
  }
]

// 存储已启动的 cron 任务
const activeJobs = new Map()

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
      // 插入预设模板
      await db.run(
        `INSERT INTO scheduled_tasks (id, name, hour, minute, day_of_week, type, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [template.id, template.name, template.hour, template.minute, template.dayOfWeek,
         template.type || 'report', template.enabled ? 1 : 0, new Date().toISOString(), new Date().toISOString()]
      )
      console.log(`[Cron] 初始化模板: ${template.name} (${template.type})`)
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
    'SELECT * FROM scheduled_tasks WHERE enabled = 1'
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

  console.log(`[Cron] ========== 已启动 ${tasks.length} 个定时任务 ==========`)
  tasks.forEach(task => {
    console.log(`[Cron]   - ${task.name} (${task.id})`)
    console.log(`[Cron]     时间: ${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`)
    console.log(`[Cron]     类型: ${task.type}`)
    console.log(`[Cron]     Cron: ${task.minute} ${task.hour} * * *`)
    console.log(`[Cron]     时区: Asia/Shanghai`)
  })
  console.log(`[Cron] ========================================`)
}

/**
 * 启动单个定时任务
 * 所有任务都设置为每天运行，在 executeTask 中进行运行时校验
 */
function startTask(task) {
  // 所有任务都使用相同的 cron 表达式：每天运行
  const cronExpression = `${task.minute} ${task.hour} * * *`

  const job = cron.schedule(cronExpression, async () => {
    await executeTask(task)  // 运行时校验是否应该执行
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  })

  activeJobs.set(task.id, job)
  console.log(`[Cron] 启动任务: ${task.name} (每天 ${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}，运行时校验)`)
}

/**
 * 停止所有定时任务
 */
function stopAllTasks() {
  activeJobs.forEach((job, id) => {
    job.stop()
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

      // 1. 判断是否为新工作周开始
      if (!isNewWorkWeekStart(today)) {
        console.log(`[Cron] 今天不是新工作周开始，跳过转换`)
        return
      }

      const todayStr = formatDate(today, 'yyyy-MM-dd')
      console.log(`[Cron] ✅ 检测到新工作周开始: ${todayStr}`)

      // 2. 打开数据库连接
      const db = await createDbConnection()

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
      const result = await sendReminder(webhookConfig.value, secretConfig?.value || '')
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
async function sendReminder(webhookUrl, secret) {
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

  // 构建提醒消息
  const messageBody = {
    msgtype: 'markdown',
    markdown: {
      title: '工作记录提醒',
      text: `## 📝 工作记录提醒\n\n` +
            `> ${dateStr} ${weekday}\n\n` +
            `下班啦！记得记录一下今天的工作内容哦~\n\n` +
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
  const todayStr = formatDate(today, 'yyyy-MM-dd')

  const report = await queryGet(
    db,
    `SELECT plans, weekStart FROM reports
     WHERE weekStart < ? AND deleted = 0
     ORDER BY weekStart DESC
     LIMIT 1`,
    [today.toISOString()]
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
    [`converted_plans_${weekStart}`]
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

  await db.run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [`converted_plans_${weekStart}`, JSON.stringify(markData)]
  )

  console.log(`[Cron] 已标记转换: ${weekStart}, ${recordIds.length} 条记录`)
}

export { initTemplates, startScheduledTasks, stopAllTasks, SCHEDULE_TEMPLATES, sendReminder, executeTask }
