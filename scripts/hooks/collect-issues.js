#!/usr/bin/env node

/**
 * 问题收集 Hook
 *
 * 功能：
 * - 从命令行参数或 stdin 接收问题信息
 * - 记录到 .claude/issues.json
 * - 更新问题出现次数
 * - 自动识别相似问题并合并
 *
 * 使用方式：
 * node scripts/hooks/collect-issues.js --type "code-review" --pattern "在 UI 中使用表情符号" --file "src/views/TestView.vue" --line "10" --severity "warning"
 *
 * 或通过管道输入：
 * echo '{"type":"code-review","pattern":"在 UI 中使用表情符号","file":"src/views/TestView.vue","line":10}' | node scripts/hooks/collect-issues.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 工具函数 ============

/**
 * 生成唯一 ID
 */
function generateId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `issue-${timestamp}-${random}`
}

/**
 * 获取今天的日期字符串
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 计算相似度（简单版本）
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 1
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // 简单的词汇相似度
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  const common = words1.filter(w => words2.includes(w))
  const similarity = (common.length * 2) / (words1.length + words2.length)

  return similarity
}

/**
 * 查找相似的问题
 */
function findSimilarIssue(issues, newIssue) {
  const SIMILARITY_THRESHOLD = 0.7

  for (const issue of issues) {
    if (issue.status === 'rejected') continue // 跳过已拒绝的问题

    const patternSimilarity = calculateSimilarity(issue.pattern, newIssue.pattern)

    // 如果模式描述相似度超过阈值，返回该问题
    if (patternSimilarity >= SIMILARITY_THRESHOLD) {
      return { issue, similarity: patternSimilarity }
    }

    // 如果文件路径相同且问题描述相关
    if (issue.file === newIssue.file && issue.category === newIssue.category) {
      const combinedSimilarity = (patternSimilarity + 0.5) / 2
      if (combinedSimilarity >= SIMILARITY_THRESHOLD) {
        return { issue, similarity: combinedSimilarity }
      }
    }
  }

  return null
}

/**
 * 推断问题分类
 */
function inferCategory(file, pattern) {
  if (!file) return 'other'

  if (file.includes('views/') || file.includes('components/')) return 'ui'
  if (file.includes('server/api.js')) return 'api'
  if (file.includes('server/db.js')) return 'database'
  if (file.includes('stores/')) return 'store'
  if (file.includes('utils/') || file.includes('composables/')) return 'utils'

  return 'other'
}

/**
 * 推断建议的规则名称
 */
function inferSuggestedRule(pattern, category) {
  const categoryMap = {
    'ui': 'UI 一致性规范',
    'api': 'API 设计规范',
    'database': '数据库操作规范',
    'store': '状态管理规范',
    'utils': '工具函数规范'
  }

  const categoryRule = categoryMap[category] || '代码规范'

  // 简化描述
  const shortPattern = pattern
    .replace(/在.*?中/g, '')
    .replace(/使用/g, '使用')
    .replace(/禁止/g, '禁止')
    .substring(0, 20)

  return `${categoryRule}：${shortPattern}`
}

// ============ 主函数 ============

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2)

    let issueData = {}

    // 从命令行参数解析
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      if (arg === '--type' && args[i + 1]) {
        issueData.type = args[++i]
      } else if (arg === '--pattern' && args[i + 1]) {
        issueData.pattern = args[++i]
      } else if (arg === '--file' && args[i + 1]) {
        issueData.file = args[++i]
      } else if (arg === '--line' && args[i + 1]) {
        issueData.line = parseInt(args[++i])
      } else if (arg === '--severity' && args[i + 1]) {
        issueData.severity = args[++i]
      } else if (arg === '--example' && args[i + 1]) {
        issueData.example = args[++i]
      } else if (arg === '--category' && args[i + 1]) {
        issueData.category = args[++i]
      }
    }

    // 验证必要参数
    if (!issueData.pattern) {
      console.error('❌ 错误：缺少必要参数 --pattern')
      console.error('\n使用方式：')
      console.error('  node scripts/hooks/collect-issues.js --pattern "问题描述" [其他选项]')
      console.error('\n选项：')
      console.error('  --type        问题类型 (code-review|test-error|lint-error|manual|git-pattern)')
      console.error('  --pattern     问题描述 (必填)')
      console.error('  --file        文件路径')
      console.error('  --line        行号')
      console.error('  --severity    严重程度 (error|warning|info)')
      console.error('  --example     代码示例')
      console.error('  --category    分类 (ui|api|database|store|utils)')
      process.exit(1)
    }

    // 读取现有问题数据
    let issuesData = { issues: [], stats: { totalIssues: 0, resolvedIssues: 0, pendingIssues: 0, categories: {} }, settings: { occurrenceThreshold: 3 } }

    if (existsSync(ISSUES_FILE)) {
      try {
        const content = readFileSync(ISSUES_FILE, 'utf-8')
        issuesData = JSON.parse(content)
      } catch (error) {
        console.warn('⚠️  无法读取 issues.json，使用默认配置')
      }
    }

    // 推断缺失的字段
    if (!issueData.type) issueData.type = 'manual'
    if (!issueData.severity) issueData.severity = 'warning'
    if (!issueData.category) {
      issueData.category = inferCategory(issueData.file, issueData.pattern)
    }
    if (!issueData.suggestedRule) {
      issueData.suggestedRule = inferSuggestedRule(issueData.pattern, issueData.category)
    }

    // 查找相似问题
    const similar = findSimilarIssue(issuesData.issues, issueData)

    if (similar) {
      // 更新现有问题
      const existingIssue = similar.issue

      existingIssue.occurrence = (existingIssue.occurrence || 1) + 1
      existingIssue.lastSeen = getTodayDate()
      existingIssue.status = 'detected'

      // 合并示例
      if (issueData.example && !existingIssue.example) {
        existingIssue.example = issueData.example
      }

      // 更新文件列表（如果不同）
      if (issueData.file && issueData.file !== existingIssue.file) {
        if (!existingIssue.relatedFiles) {
          existingIssue.relatedFiles = []
        }
        if (!existingIssue.relatedFiles.includes(issueData.file)) {
          existingIssue.relatedFiles.push(issueData.file)
        }
      }

      console.log(`📝 更新现有问题：${existingIssue.pattern}`)
      console.log(`   出现次数：${existingIssue.occurrence} 次`)
      console.log(`   相似度：${(similar.similarity * 100).toFixed(0)}%`)

      // 如果达到阈值，提示用户
      const threshold = issuesData.settings.occurrenceThreshold || 3
      if (existingIssue.occurrence >= threshold) {
        console.log(`\n💡 这个问题已出现 ${existingIssue.occurrence} 次，建议添加为 CLAUDE.md 规范`)
        console.log(`   建议规则：${existingIssue.suggestedRule}`)
      }

    } else {
      // 创建新问题
      const newIssue = {
        id: generateId(),
        type: issueData.type,
        pattern: issueData.pattern,
        category: issueData.category,
        file: issueData.file || null,
        line: issueData.line || null,
        severity: issueData.severity,
        example: issueData.example || null,
        occurrence: 1,
        firstSeen: getTodayDate(),
        lastSeen: getTodayDate(),
        suggestedRule: issueData.suggestedRule,
        status: 'detected',
        relatedFiles: [],
        relatedIssues: []
      }

      issuesData.issues.push(newIssue)

      console.log(`✅ 记录新问题：${newIssue.pattern}`)
      console.log(`   ID: ${newIssue.id}`)
      console.log(`   分类: ${newIssue.category}`)
      console.log(`   严重程度: ${newIssue.severity}`)
    }

    // 更新统计信息
    issuesData.stats.totalIssues = issuesData.issues.length
    issuesData.stats.pendingIssues = issuesData.issues.filter(i => i.status === 'detected').length
    issuesData.stats.resolvedIssues = issuesData.issues.filter(i => i.status === 'approved').length

    // 更新分类统计
    for (const issue of issuesData.issues) {
      const cat = issue.category || 'other'
      issuesData.stats.categories[cat] = (issuesData.stats.categories[cat] || 0) + 1
    }

    // 保存到文件
    writeFileSync(ISSUES_FILE, JSON.stringify(issuesData, null, 2), 'utf-8')

    console.log(`\n📊 统计信息：`)
    console.log(`   总问题数：${issuesData.stats.totalIssues}`)
    console.log(`   待处理：${issuesData.stats.pendingIssues}`)
    console.log(`   已解决：${issuesData.stats.resolvedIssues}`)

    process.exit(0)

  } catch (error) {
    console.error('❌ 收集问题时出错：', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
