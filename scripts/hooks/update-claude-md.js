#!/usr/bin/env node

/**
 * 文档更新脚本
 *
 * 功能：将生成的规范草稿自动添加到 CLAUDE.md
 *
 * 使用方式：
 * node scripts/hooks/update-claude-md.js --issue issue-xxx
 * node scripts/hooks/update-claude-md.js --file .claude/generated-rules/all-rules.md
 * node scripts/hooks/update-claude-md.js --confirm
 * node scripts/hooks/update-claude-md.js --dry-run
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, renameSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import { spawn } from 'child_process'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')
const CLAUDE_MD_FILE = join(PROJECT_ROOT, 'CLAUDE.md')
const RULES_DIR = join(PROJECT_ROOT, '.claude/generated-rules')
const BACKUP_DIR = join(PROJECT_ROOT, '.claude/backups')

// ============ 配置 ============

const CONFIG = {
  // 是否自动备份
  autoBackup: true,
  // 备份保留数量
  backupCount: 5,
  // 默认版本号
  defaultVersion: '2.6'
}

// ============ 辅助函数 ============

/**
 * 读取 CLAUDE.md
 */
function loadClaudeMd() {
  if (!existsSync(CLAUDE_MD_FILE)) {
    throw new Error('CLAUDE.md 文件不存在')
  }

  return readFileSync(CLAUDE_MD_FILE, 'utf-8')
}

/**
 * 备份 CLAUDE.md
 */
function backupClaudeMd() {
  if (!CONFIG.autoBackup) return null

  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupFile = join(BACKUP_DIR, `CLAUDE.md.${timestamp}.bak`)

  copyFileSync(CLAUDE_MD_FILE, backupFile)

  // 清理旧备份
  const backups = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('CLAUDE.md.') && f.endsWith('.bak'))
    .sort()
    .reverse()

  while (backups.length > CONFIG.backupCount) {
    const oldBackup = backups.pop()
    unlinkSync(join(BACKUP_DIR, oldBackup))
  }

  return backupFile
}

/**
 * 查找插入位置
 */
function findInsertPosition(content) {
  // 在"核心开发规范（必须遵守）"之后插入
  const coreSectionHeader = /##\s+核心开发规范（必须遵守）/
  const coreSectionMatch = content.match(coreSectionHeader)

  if (!coreSectionMatch) {
    throw new Error('无法找到"核心开发规范"章节')
  }

  // 找到该章节后的第一个规则
  const afterCoreSection = content.slice(coreSectionMatch.index + coreSectionMatch[0].length)

  // 查找第一个规则 (### X. 标题)
  const firstRuleMatch = afterCoreSection.match(/\n###\s+\d+\./)

  if (firstRuleMatch) {
    return {
      index: coreSectionMatch.index + coreSectionMatch[0].length + firstRuleMatch.index,
      type: 'before-first-rule'
    }
  }

  // 如果没有找到规则，在该章节的最后插入
  const nextSectionMatch = afterCoreSection.match(/\n##\s+/)

  if (nextSectionMatch) {
    return {
      index: coreSectionMatch.index + coreSectionMatch[0].length + nextSectionMatch.index,
      type: 'before-next-section'
    }
  }

  // 在文件末尾插入
  return {
    index: content.length,
    type: 'end-of-file'
  }
}

/**
 * 更新版本号和日期
 */
function updateVersionInfo(content, newRules) {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  // 查找"最后更新"部分
  const lastUpdateRegex = /##\s+最后更新\n([\s\S]*?)(?=\n##\s+|\n*$)/
  const lastUpdateMatch = content.match(lastUpdateRegex)

  let currentVersion = CONFIG.defaultVersion
  let currentMajor = 2
  let currentMinor = 5

  if (lastUpdateMatch) {
    const versionMatch = lastUpdateMatch[1].match(/\*\*版本\**:\s*(\d+)\.(\d+)/)
    if (versionMatch) {
      currentMajor = parseInt(versionMatch[1])
      currentMinor = parseInt(versionMatch[2])
      currentVersion = `${currentMajor}.${currentMinor}`
    }
  }

  // 新增规则，次版本号+1
  const newVersion = `${currentMajor}.${currentMinor + 1}`

  const newLastUpdate = `## 最后更新

- **日期**: ${dateStr}
- **版本**: ${newVersion}
- **主要更新**:
${newRules.map(rule => `  - 新增规则 #${rule.ruleNumber}：${rule.title}`).join('\n')}
`

  if (lastUpdateMatch) {
    return content.replace(lastUpdateRegex, newLastUpdate)
  } else {
    // 在文件末尾添加
    return content + '\n\n' + newLastUpdate
  }
}

/**
 * 解析生成的规则文件
 */
function parseGeneratedRules(content) {
  const rules = []
  const ruleRegex = /###\s+(\d+)\.\s+(.+?)\n\n([\s\S]+?)(?=\n###\s+\d+\.|\n---\n\n|$)/g
  let match

  while ((match = ruleRegex.exec(content)) !== null) {
    rules.push({
      ruleNumber: match[1],
      title: match[2].trim(),
      content: match[0].trim()
    })
  }

  return rules
}

/**
 * 读取生成的规则
 */
function loadGeneratedRules(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`规则文件不存在: ${filePath}`)
  }

  const content = readFileSync(filePath, 'utf-8')
  return parseGeneratedRules(content)
}

/**
 * 插入规则到 CLAUDE.md
 */
function insertRules(content, rules, insertPosition) {
  const before = content.slice(0, insertPosition.index)
  const after = content.slice(insertPosition.index)

  // 添加适当的换行
  const separator = insertPosition.type === 'end-of-file' ? '\n\n' : '\n\n'

  const newRulesContent = rules.map(r => r.content).join('\n\n---\n\n')

  return before + separator + newRulesContent + separator + after
}

/**
 * 验证更新后的内容
 */
function validateUpdatedContent(content) {
  // 检查是否包含所有必需的章节
  const requiredSections = [
    '## 项目概述',
    '## 核心开发规范',
    '## 最后更新'
  ]

  const missing = requiredSections.filter(section => !content.includes(section))

  if (missing.length > 0) {
    throw new Error(`更新后缺少必需的章节: ${missing.join(', ')}`)
  }

  return true
}

/**
 * 保存更新后的 CLAUDE.md
 */
function saveUpdatedContent(content) {
  writeFileSync(CLAUDE_MD_FILE, content, 'utf-8')
  console.log(`✅ 已更新: ${CLAUDE_MD_FILE}`)
}

/**
 * 预览更新内容
 */
function previewUpdate(content, rules, insertPosition) {
  console.log('\n' + '='.repeat(70))
  console.log('📄 更新预览')
  console.log('='.repeat(70))

  console.log(`\n插入位置: ${insertPosition.type}`)
  console.log(`插入行号: ${content.slice(0, insertPosition.index).split('\n').length}`)

  console.log(`\n将要添加 ${rules.length} 条新规则:\n`)

  rules.forEach((rule, index) => {
    console.log(`${index + 1}. 规则 ${rule.ruleNumber}: ${rule.title}`)
  })

  console.log('\n' + '='.repeat(70))
}

/**
 * 用户确认
 */
function async confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('📝 CLAUDE.md 更新工具\n')
    console.log('='.repeat(70))

    // 解析参数
    const args = process.argv.slice(2)
    let specificIssueId = null
    let ruleFilePath = null
    let useAllRules = false
    let dryRun = false
    let needConfirm = false

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--issue' && args[i + 1]) {
        specificIssueId = args[++i]
      } else if (args[i] === '--file' && args[i + 1]) {
        ruleFilePath = args[++i]
      } else if (args[i] === '--confirm') {
        needConfirm = true
      } else if (args[i] === '--dry-run') {
        dryRun = true
      }
    }

    // 默认使用 all-rules.md
    if (!specificIssueId && !ruleFilePath) {
      ruleFilePath = join(RULES_DIR, 'all-rules.md')
      useAllRules = true
    }

    // 加载规则
    let rules = []

    if (specificIssueId) {
      // 从 issues.json 加载特定问题
      const issuesContent = readFileSync(ISSUES_FILE, 'utf-8')
      const issues = JSON.parse(issuesContent)
      const issue = issues.issues.find(i => i.id === specificIssueId)

      if (!issue) {
        console.error(`\n❌ 未找到问题: ${specificIssueId}`)
        process.exit(1)
      }

      // 生成规则
      const generateProcess = spawn('node', [
        'scripts/hooks/generate-rule.js',
        '--issue', specificIssueId,
        '--file-only'
      ], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit'
      })

      await new Promise((resolve, reject) => {
        generateProcess.on('close', resolve)
        generateProcess.on('error', reject)
      })

      // 加载生成的规则
      const ruleFileName = `rule-*-${issue.pattern.replace(/\s+/g, '-')}.md`
      const ruleFiles = glob.sync(join(RULES_DIR, ruleFileName))

      if (ruleFiles.length > 0) {
        rules = loadGeneratedRules(ruleFiles[0])
      }
    } else if (ruleFilePath) {
      rules = loadGeneratedRules(ruleFilePath)
    }

    if (rules.length === 0) {
      console.log('\n✅ 没有需要添加的规则')
      process.exit(0)
    }

    console.log(`\n📊 找到 ${rules.length} 条规则`)

    // 加载 CLAUDE.md
    console.log('\n📖 读取 CLAUDE.md...')
    const content = loadClaudeMd()

    // 查找插入位置
    const insertPosition = findInsertPosition(content)
    console.log(`✅ 插入位置: ${insertPosition.type}`)

    // 生成新内容
    let updatedContent = insertRules(content, rules, insertPosition)
    updatedContent = updateVersionInfo(updatedContent, rules)

    // 预览
    previewUpdate(content, rules, insertPosition)

    // 确认
    if (needConfirm || dryRun) {
      const confirmed = await confirm('\n是否确认更新 CLAUDE.md？')

      if (!confirmed) {
        console.log('\n❌ 已取消更新')
        process.exit(0)
      }
    }

    if (dryRun) {
      console.log('\n✅ 预览完成（未实际修改文件）')
      process.exit(0)
    }

    // 备份
    console.log('\n💾 备份原文件...')
    const backupFile = backupClaudeMd()
    if (backupFile) {
      console.log(`✅ 备份已保存: ${backupFile}`)
    }

    // 验证
    console.log('\n🔍 验证更新后的内容...')
    validateUpdatedContent(updatedContent)
    console.log('✅ 验证通过')

    // 保存
    console.log('\n💾 保存更新...')
    saveUpdatedContent(updatedContent)

    console.log('\n' + '='.repeat(70))
    console.log('✅ CLAUDE.md 更新完成！')
    console.log('='.repeat(70))

    console.log('\n📋 后续步骤:')
    console.log('   1. 检查更新后的 CLAUDE.md')
    console.log('   2. 运行 git add CLAUDE.md')
    console.log('   3. 提交变更: git commit -m "docs: 更新 CLAUDE.md"')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 更新失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
