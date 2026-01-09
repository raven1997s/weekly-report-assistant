#!/usr/bin/env node

/**
 * 模式检查 Hook
 *
 * 功能：
 * - 分析 .claude/issues.json
 * - 识别重复出现的问题（occurrence >= threshold）
 * - 提示用户是否添加为规范
 * - 显示详细的问题统计和建议
 *
 * 触发时机：保存 .claude/issues.json 时
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')
const CLAUDE_MD_FILE = join(PROJECT_ROOT, 'CLAUDE.md')

// ============ 工具函数 ============

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 获取严重程度的图标
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case 'error': return '🔴'
    case 'warning': return '⚠️ '
    case 'info': return 'ℹ️ '
    default: return '⚪'
  }
}

/**
 * 显示问题详情
 */
function displayIssue(issue, index) {
  const lines = []

  lines.push(`\n${index + 1}. ${issue.pattern}`)
  lines.push(`   ${getSeverityIcon(issue.severity)} 严重程度: ${issue.severity}`)
  lines.push(`   📁 文件: ${issue.file || '未指定'}`)
  if (issue.line) lines.push(`   📍 行号: ${issue.line}`)
  lines.push(`   🔄 出现次数: ${issue.occurrence} 次`)
  lines.push(`   📅 首次: ${formatDate(issue.firstSeen)} | 最近: ${formatDate(issue.lastSeen)}`)
  lines.push(`   💡 建议规则: ${issue.suggestedRule}`)

  if (issue.example) {
    lines.push(`   📝 示例:`)
    lines.push(`   ${issue.example.substring(0, 50)}${issue.example.length > 50 ? '...' : ''}`)
  }

  return lines.join('\n')
}

/**
 * 分析相关问题，建议合并
 */
function findRelatedIssues(issues) {
  const groups = []

  for (const issue of issues) {
    if (issue.status === 'rejected') continue

    // 查找相同分类的问题
    const sameCategory = issues.filter(i =>
      i.category === issue.category &&
      i.id !== issue.id &&
      i.status !== 'rejected'
    )

    if (sameCategory.length > 0) {
      groups.push({
        main: issue,
        related: sameCategory
      })
    }
  }

  return groups
}

/**
 * 显示合并建议
 */
function displayMergeSuggestion(groups) {
  if (groups.length === 0) return ''

  const lines = []

  lines.push('\n💡 发现可以合并的相关问题：\n')

  for (const group of groups.slice(0, 3)) { // 最多显示3组
    lines.push(`${group.main.pattern}`)
    lines.push(`  相关问题：`)
    for (const related of group.related.slice(0, 3)) {
      lines.push(`  - ${related.pattern}`)
    }
    lines.push(`  建议：可以合并为"${group.main.category}"分类的通用规则\n`)
  }

  return lines.join('\n')
}

/**
 * 读取 CLAUDE.md 的当前规则
 */
function getCurrentRules() {
  if (!existsSync(CLAUDE_MD_FILE)) {
    return []
  }

  const content = readFileSync(CLAUDE_MD_FILE, 'utf-8')
  const matches = content.matchAll(/### \d+\. (.+?)\n/g)

  return Array.from(matches).map(m => m[1])
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🔍 检查问题模式...\n')

    // 检查文件是否存在
    if (!existsSync(ISSUES_FILE)) {
      console.log('ℹ️  issues.json 不存在，暂无问题记录')
      process.exit(0)
    }

    // 读取问题数据
    const content = readFileSync(ISSUES_FILE, 'utf-8')
    const data = JSON.parse(content)

    const { issues, stats, settings } = data
    const threshold = settings?.occurrenceThreshold || 3

    if (issues.length === 0) {
      console.log('✅ 暂无问题记录')
      process.exit(0)
    }

    console.log(`📊 问题统计：`)
    console.log(`   总数: ${stats.totalIssues}`)
    console.log(`   待处理: ${stats.pendingIssues}`)
    console.log(`   已解决: ${stats.resolvedIssues}`)
    console.log(`   分类统计: ${Object.entries(stats.categories || {}).map(([k, v]) => `${k}(${v})`).join(', ')}`)
    console.log(`   提醒阈值: ${threshold} 次\n`)

    // 筛选达到阈值的问题
    const frequentIssues = issues.filter(i => i.occurrence >= threshold && i.status !== 'rejected')

    if (frequentIssues.length === 0) {
      console.log(`✅ 尚无问题达到阈值（${threshold} 次），继续观察...`)

      // 显示最接近阈值的问题
      const closeIssues = issues
        .filter(i => i.status !== 'rejected')
        .sort((a, b) => b.occurrence - a.occurrence)
        .slice(0, 3)

      if (closeIssues.length > 0 && closeIssues[0].occurrence > 0) {
        console.log(`\n⚠️  接近阈值的问题：`)
        for (const issue of closeIssues) {
          console.log(`   - ${issue.pattern} (${issue.occurrence}/${threshold} 次)`)
        }
      }

      process.exit(0)
    }

    console.log(`💡 发现 ${frequentIssues.length} 个重复出现的问题：`)

    for (let i = 0; i < frequentIssues.length; i++) {
      console.log(displayIssue(frequentIssues[i], i))
    }

    // 显示合并建议
    const relatedGroups = findRelatedIssues(issues)
    if (relatedGroups.length > 0) {
      console.log(displayMergeSuggestion(relatedGroups))
    }

    // 检查是否已有类似规则
    const currentRules = getCurrentRules()
    const newIssues = frequentIssues.filter(issue => {
      return !currentRules.some(rule =>
        rule.includes(issue.pattern.substring(0, 10))
      )
    })

    if (newIssues.length < frequentIssues.length) {
      console.log(`ℹ️  注：${frequentIssues.length - newIssues.length} 个问题可能在 CLAUDE.md 中已有类似规则`)
    }

    // 交互式提示（在终端中）
    if (process.stdout.isTTY) {
      console.log('\n─────────────────────────────────────────────────────────────')
      console.log('💡 建议操作：')
      console.log('  [y] 是，生成规范草稿')
      console.log('  [n] 否，暂不处理')
      console.log('  [s] 跳过这些问题，以后不再提示')
      console.log('  [v] 查看完整问题列表')
      console.log('─────────────────────────────────────────────────────────────\n')

      // 注意：这里无法真正交互，只是提示
      console.log('💡 提示：运行以下命令生成规范草稿')
      console.log(`   node scripts/hooks/generate-rule.js --issue ${frequentIssues[0].id}`)
    }

    // 返回状态码（0 表示有问题但非阻塞）
    process.exit(0)

  } catch (error) {
    console.error('❌ 检查问题时出错：', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
