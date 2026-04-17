import { getWorkMonthWeekLabel, getWorkWeekInfo } from './utils/date.js'

const DEFAULT_MAIL_TEMPLATE_CONFIG = {
  titleSuffix: '工作周报',
  subtitle: '降本增效、协同攻坚、高质量发展',
  bannerText: '星光闪烁，助我前行'
}

const LEGACY_TITLE_SUFFIXES = new Set([
  '厚朴汤部门工作周报'
])

const DEFAULT_MAIL_SIGNATURE_CONFIG = {
  enabled: true,
  displayName: '示例昵称',
  realName: '示例姓名',
  jobTitle: '软件开发工程师',
  mobile: '13800000000',
  fax: '010-12345678',
  website: 'www.example.com',
  company: '示例科技有限公司',
  address: '示例市示例区示例路 88 号'
}

const MAIL_TEMPLATES = [
  {
    key: 'gancao-department-weekly-report',
    name: '厚朴汤部门周报模板',
    description: '表格样式周报模板，支持固定文案与签名预览'
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

const normalizeTitleSuffix = (value) => {
  const trimmed = String(value || '').trim()

  if (!trimmed) {
    return DEFAULT_MAIL_TEMPLATE_CONFIG.titleSuffix
  }

  if (LEGACY_TITLE_SUFFIXES.has(trimmed.replace(/\s+/g, ''))) {
    return DEFAULT_MAIL_TEMPLATE_CONFIG.titleSuffix
  }

  return trimmed
}

const normalizeMailTemplateConfig = (config = {}) => ({
  titleSuffix: normalizeTitleSuffix(config.titleSuffix),
  subtitle: config.subtitle || DEFAULT_MAIL_TEMPLATE_CONFIG.subtitle,
  bannerText: config.bannerText || DEFAULT_MAIL_TEMPLATE_CONFIG.bannerText
})

const formatSubjectDate = (date) => {
  const target = new Date(date)
  return `${target.getMonth() + 1}.${target.getDate()}`
}

const parseTemplateConfigs = (settings = {}) => {
  if (!settings.mail_template_configs) {
    return {}
  }

  try {
    const parsed = JSON.parse(settings.mail_template_configs)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('[MailTemplates] 解析 mail_template_configs 失败，回退到旧配置:', error)
    return {}
  }
}

const getMailTemplateConfigFromSettings = (settings = {}, templateKey = 'gancao-department-weekly-report') => {
  const templateConfigs = parseTemplateConfigs(settings)
  const matchedConfig = templateConfigs[templateKey]

  if (matchedConfig && typeof matchedConfig === 'object') {
    return normalizeMailTemplateConfig(matchedConfig)
  }

  return normalizeMailTemplateConfig({
    titleSuffix: settings.mail_template_title_suffix || DEFAULT_MAIL_TEMPLATE_CONFIG.titleSuffix,
    subtitle: settings.mail_template_subtitle || DEFAULT_MAIL_TEMPLATE_CONFIG.subtitle,
    bannerText: settings.mail_template_banner_text || DEFAULT_MAIL_TEMPLATE_CONFIG.bannerText
  })
}

const getMailSignatureConfigFromSettings = (settings = {}) => ({
  enabled: settings.mail_signature_enabled === 'false'
    ? false
    : (settings.mail_signature_enabled === 'true'
      ? true
      : DEFAULT_MAIL_SIGNATURE_CONFIG.enabled),
  displayName: settings.mail_signature_display_name || DEFAULT_MAIL_SIGNATURE_CONFIG.displayName,
  realName: settings.mail_signature_real_name || DEFAULT_MAIL_SIGNATURE_CONFIG.realName,
  jobTitle: settings.mail_signature_job_title || DEFAULT_MAIL_SIGNATURE_CONFIG.jobTitle,
  mobile: settings.mail_signature_mobile || DEFAULT_MAIL_SIGNATURE_CONFIG.mobile,
  fax: settings.mail_signature_fax || DEFAULT_MAIL_SIGNATURE_CONFIG.fax,
  website: settings.mail_signature_website || DEFAULT_MAIL_SIGNATURE_CONFIG.website,
  company: settings.mail_signature_company || DEFAULT_MAIL_SIGNATURE_CONFIG.company,
  address: settings.mail_signature_address || DEFAULT_MAIL_SIGNATURE_CONFIG.address
})

const buildMailSubject = (report = {}, templateConfig = DEFAULT_MAIL_TEMPLATE_CONFIG) => {
  const reportDate = getReportDate(report)
  const rawLabel = getWorkMonthWeekLabel(reportDate)
  const normalizedConfig = normalizeMailTemplateConfig(templateConfig)
  const workWeekInfo = getWorkWeekInfo(reportDate)

  if (workWeekInfo.hasNoWorkdays || !workWeekInfo.start || !workWeekInfo.end) {
    return `${rawLabel}${normalizedConfig.titleSuffix}`
  }

  const range = `${formatSubjectDate(workWeekInfo.start)}-${formatSubjectDate(workWeekInfo.end)}`
  return `${rawLabel}${normalizedConfig.titleSuffix}（${range}）`
}

const renderMailSignature = (signatureConfig = DEFAULT_MAIL_SIGNATURE_CONFIG) => {
  if (!signatureConfig.enabled) {
    return ''
  }

  const hasName = signatureConfig.displayName || signatureConfig.realName || signatureConfig.jobTitle
  const nameLine = hasName
    ? `
      <p style="color: rgb(0, 0, 0); font-size: 14px; font-weight: 400; font-family: Calibri; margin: 1px 0 0; text-align: left; line-height: 17px;">
        <span style="font-family: Arial; color: rgb(0, 0, 0);">
          ${signatureConfig.displayName ? `<b style="color: rgb(0, 0, 0); font-family: 宋体; font-size: 16px;">${escapeHtml(signatureConfig.displayName)}</b>` : ''}
          ${signatureConfig.realName ? `<span style="font-size: 13px; font-weight: 400; color: rgb(0, 0, 0); font-family: 宋体;">（${escapeHtml(signatureConfig.realName)}）</span>` : ''}
          ${(signatureConfig.displayName || signatureConfig.realName) && signatureConfig.jobTitle ? '<span style="font-size: 13px; font-weight: 400; color: rgb(0, 0, 0); font-family: Arial;">/</span>' : ''}
          ${signatureConfig.jobTitle ? `<span style="font-size: 13px; font-weight: 700; color: rgb(0, 0, 0); font-family: 宋体;">${escapeHtml(signatureConfig.jobTitle)}</span>` : ''}
        </span>
      </p>
    `
    : ''

  const optionalLine = (label, value, fontFamily = 'Arial') => {
    if (!value) return ''
    return `
      <p style="color: rgb(0, 0, 0); font-size: 14px; font-weight: 400; font-family: Calibri; margin: 1px 0 0; text-align: left; line-height: 17px;">
        <span style="font-family: ${fontFamily}; color: rgb(0, 0, 0); font-size: 13px;">${escapeHtml(label)}</span>
        <span style="font-family: ${fontFamily}; color: rgb(0, 0, 0); font-size: 13px;">${escapeHtml(value)}</span>
      </p>
    `
  }

  const textLine = (value, fontFamily = '宋体') => {
    if (!value) return ''
    return `
      <p style="color: rgb(0, 0, 0); font-size: 14px; font-weight: 400; font-family: Calibri; margin: 1px 0 0; text-align: left; line-height: 17px;">
        <span style="font-family: ${fontFamily}; color: rgb(0, 0, 0); font-size: 13px;">${escapeHtml(value)}</span>
      </p>
    `
  }

  return `
    <div style="clear: both; margin-top: 18px;">
      ${nameLine}
      ${optionalLine('Mob:', signatureConfig.mobile)}
      ${signatureConfig.fax ? `<p style="color: rgb(0, 0, 0); font-size: 14px; font-weight: 400; font-family: Calibri; margin: 1px 0 0; text-align: left; line-height: 17px;"><span style="font-family: Arial; color: rgb(0, 0, 0); font-size: 13px;">Fax:${escapeHtml(signatureConfig.fax)}</span></p>` : ''}
      ${signatureConfig.website ? `<p style="color: rgb(0, 0, 0); font-size: 14px; font-weight: 400; font-family: Calibri; margin: 1px 0 0; text-align: left; line-height: 17px;"><span style="font-family: Arial; color: rgb(0, 0, 0); font-size: 13px;">Web:${escapeHtml(signatureConfig.website)}</span></p>` : ''}
      ${textLine(signatureConfig.company)}
      ${textLine(signatureConfig.address)}
    </div>
  `
}

const buildSignaturePlainText = (signatureConfig = DEFAULT_MAIL_SIGNATURE_CONFIG) => {
  if (!signatureConfig.enabled) {
    return ''
  }

  const lines = []
  const nameParts = []

  if (signatureConfig.displayName) {
    nameParts.push(signatureConfig.displayName)
  }

  if (signatureConfig.realName) {
    nameParts.push(`（${signatureConfig.realName}）`)
  }

  if (signatureConfig.jobTitle) {
    const prefix = nameParts.length > 0 ? '/' : ''
    nameParts.push(`${prefix}${signatureConfig.jobTitle}`)
  }

  if (nameParts.length > 0) {
    lines.push(nameParts.join(''))
  }

  if (signatureConfig.mobile) lines.push(`Mob:${signatureConfig.mobile}`)
  if (signatureConfig.fax) lines.push(`Fax:${signatureConfig.fax}`)
  if (signatureConfig.website) lines.push(`Web:${signatureConfig.website}`)
  if (signatureConfig.company) lines.push(signatureConfig.company)
  if (signatureConfig.address) lines.push(signatureConfig.address)

  return lines.join('\n')
}

const buildMailPlainText = (report = {}, signatureConfig = DEFAULT_MAIL_SIGNATURE_CONFIG) => {
  if (report.plainText) {
    const signatureText = buildSignaturePlainText(signatureConfig)
    return signatureText ? `${report.plainText}\n\n${signatureText}` : report.plainText
  }

  const recordLines = (report.records || []).map((item, index) => `${index + 1}. ${item.content}`)
  const planLines = (report.plans || []).map((item, index) => `${index + 1}. ${item.content}`)
  const reflectionLines = [report.reflections?.gains, report.reflections?.losses].filter(Boolean)
  const signatureText = buildSignaturePlainText(signatureConfig)

  const textBlocks = [
    '本周完成工作',
    recordLines.join('\n') || '暂无',
    '',
    '下周工作计划',
    planLines.join('\n') || '暂无',
    '',
    '本周得与失',
    reflectionLines.join('\n') || '暂无'
  ]

  if (signatureText) {
    textBlocks.push('', signatureText)
  }

  return textBlocks.join('\n')
}

const renderGancaoDepartmentTemplate = (
  report = {},
  {
    templateConfig = DEFAULT_MAIL_TEMPLATE_CONFIG,
    signatureConfig = DEFAULT_MAIL_SIGNATURE_CONFIG
  } = {}
) => {
  const subject = buildMailSubject(report, templateConfig)
  const records = (report.records || []).map(item => normalizeTextLine(`${generateTags(item.project, item.workType)} ${polishContent(item.content)}`.trim()))
  const plans = (report.plans || []).map(item => normalizeTextLine(`${generateTags(item.project, item.workType)} ${polishContent(item.content)}`.trim()))
  const reflections = [report.reflections?.gains, report.reflections?.losses].filter(Boolean).map(normalizeTextLine)
  const signatureHtml = renderMailSignature(signatureConfig)

  const html = `
    <html lang="zh-CN">
      <body style="margin: 0 24px; background-color: #FFFFFF; font-size: 14px; line-height: 1.666; word-wrap: break-word; font-family: Tahoma, Arial, STHeitiSC-Light, SimSun; color: #000;">
        <div style="clear: both;">
          <p style="margin: 0; line-height: 48px;">&nbsp;</p>
          <div style="width: 784px; text-align: center;">
            <p style="margin: 10px 0 0; text-align: center;">
              <span style="font-weight: 700; font-size: 24px; font-family: 黑体;">${escapeHtml(subject)}</span>
            </p>
            <p style="margin: 10px 0 0; text-align: center;">
              <span style="color: red; font-family: 黑体; font-size: 24px; font-weight: 700;">${escapeHtml(templateConfig.subtitle)}</span>
            </p>
            <p style="margin: 0;">&nbsp;</p>
          </div>
          <table style="width: 784px; border-collapse: collapse; border: 1px solid #000;" border="1" cellpadding="0" cellspacing="0">
            <tbody>
              <tr>
                <td colspan="5" style="border: 1px solid #000; background: rgb(207, 205, 205); padding: 0 7px;">
                  <p style="margin: 16px 0; font-size: 12px; font-family: 微软雅黑, sans-serif; color: #000; text-align: center;">${escapeHtml(templateConfig.bannerText)}</p>
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
          ${signatureHtml}
        </div>
      </body>
    </html>
  `

  return {
    subject,
    html,
    text: buildMailPlainText(report, signatureConfig)
  }
}

const renderMailTemplate = ({ templateKey, report, settings = {} }) => {
  const templateConfig = getMailTemplateConfigFromSettings(settings, templateKey)
  const signatureConfig = getMailSignatureConfigFromSettings(settings)

  switch (templateKey) {
    case 'gancao-department-weekly-report':
      return renderGancaoDepartmentTemplate(report, { templateConfig, signatureConfig })
    default:
      throw new Error('不支持的邮件模板')
  }
}

export {
  DEFAULT_MAIL_TEMPLATE_CONFIG,
  DEFAULT_MAIL_SIGNATURE_CONFIG,
  MAIL_TEMPLATES,
  buildMailPlainText,
  buildMailSubject,
  getMailSignatureConfigFromSettings,
  getMailTemplateConfigFromSettings,
  renderMailSignature,
  renderMailTemplate
}
