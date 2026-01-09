// ========================================
// 智能周报助手 - 定时任务管理器
// ========================================

import cron from 'node-cron'
import { createDbConnection, queryGet, queryAll } from './db.js'
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
    id: 'workday_530pm',
    name: '工作日下班前提醒',
    hour: 17,
    minute: 30,
    dayOfWeek: '*', // 每天运行，运行时校验是否为工作日
    type: 'reminder', // 填写提醒
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

  // 启动新任务
  tasks.forEach(task => {
    startTask(task)
  })

  console.log(`[Cron] 已启动 ${tasks.length} 个定时任务`)
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
    console.log(`[Cron] 执行任务: ${task.name}`)

    // ========== 新增：工作日校验 ==========
    const today = new Date()

    if (task.type === 'reminder') {
      // 提醒任务：只在真正的工作日执行
      const isTodayWorkday = isWorkday(today)
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

      if (todayStr !== lastWorkdayStr) {
        console.log(`[Cron] 今天不是工作周最后一天，跳过周报推送`)
        console.log(`[Cron] 今天: ${todayStr}, 最后工作日: ${lastWorkdayStr}`)
        return
      }
    }
    // ========== 校验结束 ==========

    // 获取钉钉配置
    const db = await createDbConnection()
    const webhookConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'dingtalk_webhookUrl'"
    )
    const secretConfig = await queryGet(
      db,
      "SELECT value FROM settings WHERE key = 'dingtalk_secret'"
    )

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

  if (result.errcode === 0) {
    return { success: true, message: '发送成功' }
  } else {
    return { success: false, message: result.errmsg || '发送失败' }
  }
}

export { initTemplates, startScheduledTasks, stopAllTasks, SCHEDULE_TEMPLATES }
