import { getWorkMonthWeekLabel } from './utils/date.js'

const MAIL_TEMPLATES = [
  {
    key: 'gancao-department-weekly-report',
    name: '厚朴汤部门周报模板',
    description: '表格样式周报模板，默认不带签名'
  }
]

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const polishContent = (text = '') => {
  let polished = String(text || '').trim()

  const prefixesToRemove = ['完成了', '完成', '做了', '搞定了', '解决了', '处理了']
  for (const prefix of prefixesToRemove) {
    if (polished.startsWith(prefix)) {
      polished = polished.slice(prefix.length).trim()
      break
    }
  }

  if (/^[a-z]/.test(polished)) {
    polished = polished.charAt(0).toUpperCase() + polished.slice(1)
  }

  return polished.replace(/[。，,\.!！]+$/, '')
}

const generateTags = (project, workType) => {
  const tags = []

  if (project && project !== '其他') {
    tags.push(`[${project}]`)
  }

  if (workType && workType !== '其他') {
    tags.push(`[${workType}]`)
  }

  if (project && project !== '其他' && (!workType || workType === '其他')) {
    tags.push('[其他]')
  }

  if (tags.length === 0) {
    tags.push('[其他]')
  }

  return tags.join('')
}

const renderOrderedList = (items = []) => {
  const normalizedItems = items.filter(Boolean)

  if (normalizedItems.length === 0) {
    return `
      <ol style="padding: 0 0 0 30px; margin: 2px 0 0;">
        <li style="margin: 0 0 6px 0; line-height: 18px; word-break: break-all;">&nbsp;</li>
      </ol>
    `
  }

  return `
    <ol style="padding: 0 0 0 30px; margin: 2px 0 0;">
      ${normalizedItems.map(item => `
        <li style="margin: 0 0 6px 0; line-height: 18px; word-break: break-all; font-family: 微软雅黑, sans-serif; font-size: 13px;">
          ${escapeHtml(item)}
        </li>
      `).join('')}
    </ol>
  `
}

const renderBlankDirectionRows = (title) => `
  <tr>
    <td rowspan="2" style="border: 1px solid #000; padding: 0 7px; width: 72px;">
      <p style="margin: 0; text-align: center; font-family: 微软雅黑, sans-serif; font-size: 12px;">${escapeHtml(title)}</p>
    </td>
    <td style="border: 1px solid #000; padding: 0 7px; width: 54px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px; width: 78px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px; width: 108px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px; width: 394px;"><p style="margin: 0;">&nbsp;</p></td>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0;">&nbsp;</p></td>
    <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0;">&nbsp;</p></td>
  </tr>
`

const normalizeTextLine = (value) => {
  const text = String(value || '').trim()
  return text || '；'
}

const getReportDate = (report = {}) => {
  if (report.weekStart) {
    return new Date(report.weekStart)
  }

  return new Date()
}

const buildMailSubject = (report = {}) => {
  const reportDate = getReportDate(report)
  const rawLabel = getWorkMonthWeekLabel(reportDate)
  const match = rawLabel.match(/^(\d{4})年(\d{1,2})月第(\d+)周$/)

  if (match) {
    const [, year, month, week] = match
    return `${year} 年 ${month} 月 ${week} 周 厚朴汤 部门工作周报`
  }

  return `${rawLabel} 厚朴汤 部门工作周报`
}

const buildPlainText = (report = {}) => {
  if (report.plainText) {
    return report.plainText
  }

  const recordLines = (report.records || []).map((item, index) => `${index + 1}. ${item.content}`)
  const planLines = (report.plans || []).map((item, index) => `${index + 1}. ${item.content}`)
  const reflectionLines = [report.reflections?.gains, report.reflections?.losses].filter(Boolean)

  return [
    '本周完成工作',
    recordLines.join('\n') || '暂无',
    '',
    '下周工作计划',
    planLines.join('\n') || '暂无',
    '',
    '本周得与失',
    reflectionLines.join('\n') || '暂无'
  ].join('\n')
}

const renderGancaoDepartmentTemplate = (report = {}) => {
  const subject = buildMailSubject(report)
  const records = (report.records || []).map(item => normalizeTextLine(`${generateTags(item.project, item.workType)} ${polishContent(item.content)}`.trim()))
  const plans = (report.plans || []).map(item => normalizeTextLine(`${generateTags(item.project, item.workType)} ${polishContent(item.content)}`.trim()))
  const reflections = [report.reflections?.gains, report.reflections?.losses].filter(Boolean).map(normalizeTextLine)

  const html = `
    <html lang="zh-CN">
      <body style="margin: 0 24px; background-color: #FFFFFF; font-size: 14px; line-height: 1.666; word-wrap: break-word; font-family: Tahoma, Arial, STHeitiSC-Light, SimSun; color: #000;">
        <div style="clear: both;">
          <p style="margin: 10px 0 0; text-align: center;">
            <span style="font-weight: 700; font-size: 24px; font-family: 黑体;">${escapeHtml(subject)}</span>
          </p>
          <p style="margin: 10px 0 0; text-align: center;">
            <span style="color: red; font-family: 黑体; font-size: 24px; font-weight: 700;">降本增效、协同攻坚、高质量发展</span>
          </p>
          <p style="margin: 0;">&nbsp;</p>

          <table style="width: 784px; border-collapse: collapse; border: 1px solid #000;" border="1" cellpadding="0" cellspacing="0">
            <tbody>
              <tr>
                <td colspan="5" style="border: 1px solid #000; background: rgb(207, 205, 205); padding: 0 7px;">
                  <p style="margin: 16px 0; font-size: 12px; font-family: 微软雅黑, sans-serif; color: #000; text-align: center;">星光闪烁，助我前行</p>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 0 7px; width: 72px;">
                  <p style="margin: 0; text-align: center; font-family: 微软雅黑, sans-serif; font-size: 12px;">关键词</p>
                  <p style="margin: 0; text-align: center; font-family: 微软雅黑, sans-serif; font-size: 12px;">事迹推车</p>
                </td>
                <td colspan="4" style="border: 1px solid #000; padding: 0 7px; word-break: break-all;">
                  <p style="margin: 0; min-height: 36px; font-size: 12px; font-family: 微软雅黑, sans-serif;">&nbsp;</p>
                </td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; background: rgb(216, 216, 216); padding: 0 7px;">
                  <p style="margin: 0; font-size: 12px; font-family: 微软雅黑, sans-serif; color: #000; text-align: center;">诚信坦荡，我想听你说</p>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0; text-align: center; font-size: 12px; font-family: 微软雅黑, sans-serif;">方向</p></td>
                <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0; text-align: center; font-size: 12px; font-family: 微软雅黑, sans-serif;">建议人</p></td>
                <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0; text-align: center; font-size: 12px; font-family: 微软雅黑, sans-serif;">@ta推进</p></td>
                <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0; text-align: center; font-size: 12px; font-family: 微软雅黑, sans-serif;">存在问题</p></td>
                <td style="border: 1px solid #000; padding: 0 7px;"><p style="margin: 0; text-align: center; font-size: 12px; font-family: 微软雅黑, sans-serif;">建设性意见与措施</p></td>
              </tr>
              ${renderBlankDirectionRows('降本增效')}
              ${renderBlankDirectionRows('协同攻坚')}
              ${renderBlankDirectionRows('高质量发展')}
              <tr>
                <td colspan="5" style="border: 1px solid #000; background: rgb(216, 216, 216); padding: 0 7px;">
                  <p style="margin: 0; font-size: 12px; font-family: 微软雅黑, sans-serif; color: #000; text-align: center;">工作复盘与规划</p>
                </td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 12px 10px;" valign="top">
                  <p style="margin: 0 0 12px; font-family: 微软雅黑, sans-serif; font-weight: 700; font-size: 13px;">本周完成工作</p>
                  ${renderOrderedList(records)}

                  <p style="margin: 12px 0 12px; font-family: 微软雅黑, sans-serif; font-weight: 700; font-size: 13px;">下周工作计划</p>
                  ${renderOrderedList(plans)}

                  <p style="margin: 12px 0 12px; font-family: 微软雅黑, sans-serif; font-weight: 700; font-size: 13px;">本周得与失</p>
                  ${renderOrderedList(reflections)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `

  return {
    subject,
    html,
    text: buildPlainText(report)
  }
}

const renderMailTemplate = ({ templateKey, report }) => {
  switch (templateKey) {
    case 'gancao-department-weekly-report':
      return renderGancaoDepartmentTemplate(report)
    default:
      throw new Error('不支持的邮件模板')
  }
}

export {
  MAIL_TEMPLATES,
  buildMailSubject,
  renderMailTemplate
}
