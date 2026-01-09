#!/usr/bin/env node

/**
 * Git 历史分析脚本
 *
 * 功能：分析 Git commit 历史，识别重复修复的文件模式，检测"修复-再引入"循环
 *
 * 使用方式：
 * node scripts/hooks/analyze-git-history.js
 * node scripts/hooks/analyze-git-history.js --days 30
 * node scripts/hooks/analyze-git-history.js --file src/views/TestView.vue
 */

import { execSync, spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 配置 ============

const CONFIG = {
  // 分析时间范围（天）
  defaultDays: 90,
  // 文件修改次数阈值
  fileModificationThreshold: 5,
  // 修复关键词
  fixKeywords: ['fix', 'fixes', 'fixed', '修复', 'bug', 'issue', '错误'],
  // 忽略的文件路径
  ignorePaths: [
    'node_modules',
    'dist',
    '.git',
    'test-results.json',
    '.claude/issues.json'
  ]
}

// ============ Git 操作 ============

/**
 * 执行 Git 命令
 */
function git(cmd, options = {}) {
  try {
    return execSync(`git ${cmd}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      ...options
    })
  } catch (error) {
    // 某些 Git 命令失败时返回空字符串而不是抛出错误
    if (options.ignoreError) {
      return ''
    }
    throw error
  }
}

/**
 * 检查是否在 Git 仓库中
 */
function isGitRepo() {
  try {
    git('rev-parse --git-dir', { ignoreError: true })
    return true
  } catch {
    return false
  }
}

/**
 * 获取指定时间范围内的提交历史
 */
function getCommitHistory(days = CONFIG.defaultDays) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sinceStr = since.toISOString()

  const logFormat = '%H|%an|%ae|%ad|%s'
  const output = git(
    `log --since="${sinceStr}" --pretty=format:"${logFormat}" --date=iso`,
    { ignoreError: true }
  )

  if (!output.trim()) {
    return []
  }

  const commits = []
  const lines = output.trim().split('\n')

  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length >= 5) {
      commits.push({
        hash: parts[0],
        author: parts[1],
        email: parts[2],
        date: parts[3],
        message: parts.slice(4).join('|').trim()
      })
    }
  }

  return commits
}

/**
 * 获取提交中修改的文件
 */
function getChangedFiles(commitHash) {
  try {
    const output = git('diff-tree --no-commit-id --name-only -r ' + commitHash)
    return output.trim().split('\n').filter(f => f.trim())
  } catch {
    return []
  }
}

/**
 * 获取文件的完整修改历史
 */
function getFileHistory(filePath, days = CONFIG.defaultDays) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sinceStr = since.toISOString()

  const logFormat = '%H|%ad|%s'
  const output = git(
    `log --since="${sinceStr}" --pretty=format:"${logFormat}" --date=iso -- "${filePath}"`,
    { ignoreError: true }
  )

  if (!output.trim()) {
    return []
  }

  const commits = []
  const lines = output.trim().split('\n')

  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length >= 3) {
      commits.push({
        hash: parts[0],
        date: parts[1],
        message: parts.slice(2).join('|').trim()
      })
    }
  }

  return commits
}

/**
 * 判断是否是修复提交
 */
function isFixCommit(message) {
  const lowerMessage = message.toLowerCase()
  return CONFIG.fixKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * 过滤需要忽略的路径
 */
function shouldIgnorePath(filePath) {
  return CONFIG.ignorePaths.some(ignorePath => filePath.includes(ignorePath))
}

// ============ 分析函数 ============

/**
 * 分析文件修改频率
 */
function analyzeFileModifications(days) {
  console.log(`\n📊 分析文件修改频率 (最近 ${days} 天)...\n`)

  const commits = getCommitHistory(days)

  if (commits.length === 0) {
    console.log('⚠️  没有找到提交记录')
    console.log('提示：此项目可能只有初始提交，没有足够的 Git 历史')
    return []
  }

  // 统计每个文件的修改次数
  const fileStats = {}

  for (const commit of commits) {
    const files = getChangedFiles(commit.hash)

    for (const file of files) {
      if (shouldIgnorePath(file)) continue

      if (!fileStats[file]) {
        fileStats[file] = {
          path: file,
          count: 0,
          fixCount: 0,
          commits: []
        }
      }

      fileStats[file].count++

      if (isFixCommit(commit.message)) {
        fileStats[file].fixCount++
      }

      fileStats[file].commits.push({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        isFix: isFixCommit(commit.message)
      })
    }
  }

  // 转换为数组并排序
  const files = Object.values(fileStats)
    .filter(f => f.count >= CONFIG.fileModificationThreshold)
    .sort((a, b) => b.count - a.count)

  if (files.length === 0) {
    console.log('✅ 没有发现频繁修改的文件')
    return []
  }

  console.log(`发现 ${files.length} 个频繁修改的文件:\n`)

  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}`)
    console.log(`   修改次数: ${file.count}`)
    console.log(`   修复次数: ${file.fixCount}`)

    // 显示最近的修复提交
    const recentFixes = file.commits
      .filter(c => c.isFix)
      .slice(0, 3)

    if (recentFixes.length > 0) {
      console.log(`   最近修复:`)
      recentFixes.forEach(fix => {
        const date = new Date(fix.date).toLocaleDateString('zh-CN')
        console.log(`     - ${date}: ${fix.message.substring(0, 50)}...`)
      })
    }

    console.log()
  })

  return files
}

/**
 * 检测"修复-再引入"循环
 */
function detectFixRevertCycles(days) {
  console.log(`\n🔄 检测"修复-再引入"循环 (最近 ${days} 天)...\n`)

  const commits = getCommitHistory(days)

  if (commits.length < 10) {
    console.log('⚠️  提交记录太少，无法进行循环检测')
    console.log('提示：需要至少 10 个提交才能分析模式')
    return []
  }

  const cycles = []

  // 简单的循环检测：同一个文件在短时间内多次修复
  const fileFixHistory = {}

  for (const commit of commits) {
    if (!isFixCommit(commit.message)) continue

    const files = getChangedFiles(commit.hash)

    for (const file of files) {
      if (shouldIgnorePath(file)) continue

      if (!fileFixHistory[file]) {
        fileFixHistory[file] = []
      }

      fileFixHistory[file].push({
        hash: commit.hash,
        date: new Date(commit.date),
        message: commit.message
      })
    }
  }

  // 分析每个文件的修复历史
  for (const [file, fixes] of Object.entries(fileFixHistory)) {
    if (fixes.length < 2) continue

    // 检查是否有频繁修复
    for (let i = 0; i < fixes.length - 1; i++) {
      const current = fixes[i]
      const next = fixes[i + 1]
      const daysDiff = Math.abs((current.date - next.date) / (1000 * 60 * 60 * 24))

      // 如果 7 天内多次修复，可能是循环
      if (daysDiff <= 7) {
        cycles.push({
          file,
          fixes: [current, next],
          gap: Math.round(daysDiff * 10) / 10
        })
      }
    }
  }

  if (cycles.length === 0) {
    console.log('✅ 没有发现明显的"修复-再引入"循环')
    return []
  }

  console.log(`发现 ${cycles.length} 个潜在的循环:\n`)

  cycles.forEach((cycle, index) => {
    console.log(`${index + 1}. ${cycle.file}`)
    console.log(`   时间间隔: ${cycle.gap} 天`)

    cycle.fixes.forEach(fix => {
      const date = fix.date.toLocaleDateString('zh-CN')
      console.log(`   - ${date}: ${fix.message.substring(0, 50)}...`)
    })

    console.log()
  })

  return cycles
}

/**
 * 生成分析报告
 */
function generateReport(frequentFiles, cycles, days) {
  console.log('\n' + '='.repeat(60))
  console.log('📋 分析报告')
  console.log('='.repeat(60))

  console.log(`\n时间范围: 最近 ${days} 天`)

  // 频繁修改的文件
  if (frequentFiles.length > 0) {
    console.log(`\n📊 频繁修改的文件: ${frequentFiles.length} 个`)
    console.log(`   这些文件可能需要重构或更好的测试覆盖`)
  }

  // 修复循环
  if (cycles.length > 0) {
    console.log(`\n🔄 修复-再引入循环: ${cycles.length} 个`)
    console.log(`   这些文件存在重复修复的问题，建议:`)
    console.log(`   1. 检查是否需要添加自动化测试`)
    console.log(`   2. 考虑重构以降低复杂度`)
    console.log(`   3. 添加更严格的代码审查`)
  }

  // 建议记录到 issues.json
  const shouldRecord = frequentFiles.length > 0 || cycles.length > 0

  if (shouldRecord) {
    console.log(`\n💡 建议:`)
    console.log(`   将这些问题记录到 issues.json 以便跟踪`)

    const suggestions = []

    // 频繁修改文件的建议
    for (const file of frequentFiles.slice(0, 3)) {
      if (file.fixCount >= 3) {
        const category = inferCategory(file.path)
        const pattern = `${file.path} 频繁需要修复 (修复次数: ${file.fixCount})`

        suggestions.push({
          pattern,
          file: file.path,
          category,
          type: 'git-pattern',
          severity: 'warning'
        })
      }
    }

    // 修复循环的建议
    for (const cycle of cycles) {
      const category = inferCategory(cycle.file)
      const pattern = `${cycle.file} 存在"修复-再引入"循环 (${cycle.gap}天内多次修复)`

      suggestions.push({
        pattern,
        file: cycle.file,
        category,
        type: 'git-pattern',
        severity: 'error'
      })
    }

    return suggestions
  }

  console.log(`\n✅ 项目代码质量良好，没有发现明显问题`)

  return []
}

/**
 * 从文件路径推断分类
 */
function inferCategory(filePath) {
  if (filePath.includes('components/') || filePath.includes('views/')) return 'ui'
  if (filePath.includes('api.js') || filePath.includes('routes/')) return 'api'
  if (filePath.includes('db.js') || filePath.includes('migrations/')) return 'database'
  if (filePath.includes('stores/')) return 'store'
  if (filePath.includes('utils/') || filePath.includes('composables/')) return 'utils'
  return null
}

/**
 * 记录问题到 issues.json
 */
async function recordIssues(suggestions) {
  if (suggestions.length === 0) return

  const COLLECT_ISSUES_SCRIPT = join(PROJECT_ROOT, 'scripts/hooks/collect-issues.js')

  console.log(`\n📝 记录 ${suggestions.length} 个问题到 issues.json...\n`)

  for (const suggestion of suggestions) {
    const args = [
      '--pattern', suggestion.pattern,
      '--type', suggestion.type,
      '--severity', suggestion.severity,
      '--file', suggestion.file
    ]

    if (suggestion.category) {
      args.push('--category', suggestion.category)
    }

    try {
      await new Promise((resolve, reject) => {
        const process = spawn('node', [COLLECT_ISSUES_SCRIPT, ...args], {
          cwd: PROJECT_ROOT,
          stdio: 'inherit'
        })

        process.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`退出码: ${code}`))
          }
        })

        process.on('error', reject)
      })
    } catch (error) {
      console.error(`⚠️  记录失败: ${error.message}`)
    }
  }

  console.log('\n✅ 问题已记录到 issues.json')
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🔍 Git 历史分析工具\n')
    console.log('='.repeat(60))

    // 检查是否在 Git 仓库中
    if (!isGitRepo()) {
      console.error('❌ 错误: 当前目录不是 Git 仓库')
      console.error('提示: 请在 Git 仓库中运行此脚本')
      process.exit(1)
    }

    // 解析参数
    const args = process.argv.slice(2)
    let days = CONFIG.defaultDays
    let specificFile = null

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--days' && args[i + 1]) {
        days = parseInt(args[++i])
      } else if (args[i] === '--file' && args[i + 1]) {
        specificFile = args[++i]
      }
    }

    // 如果指定了特定文件，只分析该文件
    if (specificFile) {
      console.log(`\n📁 分析文件: ${specificFile}`)
      console.log(`   时间范围: 最近 ${days} 天\n`)

      const history = getFileHistory(specificFile, days)

      if (history.length === 0) {
        console.log('⚠️  该文件没有修改记录')
        process.exit(0)
      }

      console.log(`✅ 找到 ${history.length} 次修改:\n`)

      history.forEach((commit, index) => {
        const date = new Date(commit.date).toLocaleString('zh-CN')
        console.log(`${index + 1}. ${date}`)
        console.log(`   ${commit.message}`)
        console.log(`   提交: ${commit.hash}`)
        console.log()
      })

      // 分析是否频繁修复
      const fixCount = history.filter(h => isFixCommit(h.message)).length

      if (fixCount >= 3) {
        console.log(`💡 该文件有 ${fixCount} 次修复提交，可能需要关注`)
      }

      process.exit(0)
    }

    // 分析整个仓库
    const frequentFiles = analyzeFileModifications(days)
    const cycles = detectFixRevertCycles(days)
    const suggestions = generateReport(frequentFiles, cycles, days)

    // 记录问题
    if (suggestions.length > 0) {
      await recordIssues(suggestions)
    }

    console.log(`\n📖 相关规范请参考: CLAUDE.md`)

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 分析失败:', error.message)
    if (error.message.includes('not a git repository')) {
      console.error('提示: 请确保在 Git 仓库中运行此脚本')
    }
    process.exit(1)
  }
}

main()
