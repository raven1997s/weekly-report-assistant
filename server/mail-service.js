import { ImapFlow } from 'imapflow'

const wrapBase64 = (content) => {
  return Buffer.from(content, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n')
}

const encodeHeader = (value) => {
  if (!value) {
    return ''
  }

  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`
}

const splitAddresses = (value = '') => {
  return String(value)
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean)
}

const buildMimeMessage = ({ from, to = [], cc = [], bcc = [], subject, html, text }) => {
  const boundary = `----=_WeeklyReport_${Date.now().toString(16)}`
  const headers = [
    `From: ${from}`,
    to.length ? `To: ${to.join(', ')}` : '',
    cc.length ? `Cc: ${cc.join(', ')}` : '',
    bcc.length ? `Bcc: ${bcc.join(', ')}` : '',
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean)

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(html),
    `--${boundary}--`,
    ''
  ].join('\r\n')
}

const normalizeDraftMailboxCandidates = (preferredMailbox) => {
  return [
    preferredMailbox,
    'Drafts',
    '草稿箱',
    'INBOX.Drafts',
    '草稿邮件'
  ].filter(Boolean).filter((mailbox, index, arr) => arr.indexOf(mailbox) === index)
}

const appendDraftMessage = async (config, message) => {
  const client = new ImapFlow({
    host: config.imapHost,
    port: Number(config.imapPort),
    secure: config.secure !== false,
    auth: {
      user: config.account,
      pass: config.password
    },
    logger: false
  })

  try {
    await client.connect()

    const mailboxes = normalizeDraftMailboxCandidates(config.draftsMailbox)
    let lastError = null

    for (const mailbox of mailboxes) {
      try {
        await client.append(mailbox, message, ['\\Draft'])
        return { mailbox }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error('无法写入草稿箱')
  } finally {
    await client.logout().catch(() => {})
  }
}

const createMailDraft = async ({ config, subject, html, text }) => {
  if (!config.account || !config.imapHost || !config.imapPort || !config.password) {
    throw new Error('企业邮箱配置不完整，请先在设置中补全邮箱账号、IMAP 地址、端口和安全密码')
  }

  const to = splitAddresses(config.defaultTo)
  const cc = splitAddresses(config.defaultCc)
  const bcc = splitAddresses(config.defaultBcc)

  if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
    throw new Error('请先配置默认收件人、抄送或密送')
  }

  const message = buildMimeMessage({
    from: config.account,
    to,
    cc,
    bcc,
    subject,
    html,
    text
  })

  return await appendDraftMessage(config, message)
}

export {
  createMailDraft
}
