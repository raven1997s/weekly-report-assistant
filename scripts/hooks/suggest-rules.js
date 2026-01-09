#!/usr/bin/env node

/**
 * 智能建议脚本
 *
 * 功能：分析多个相关问题，建议合并为更通用的规则，提供规范优化建议
 *
 * 使用方式：
 * node scripts/hooks/suggest-rules.js
 * node scripts/hooks/suggest-rules.js --category ui
 * node scripts/hooks/suggest-rules.js --threshold 3
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 配置 ============

const CONFIG = {
  // 相似度阈值
  similarityThreshold: 0.5,
  // 最小合并问题数
  minMergeCount: 2,
  // 默认阈值
  defaultThreshold: 3
}

// ============ 相似度计算 ============

/**
 * 计算两个字符串的相似度
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 1

  // 完全包含
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // 单词相似度
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)

  const common = words1.filter(w => words2.includes(w))

  if (common.length === 0) return 0

  return (common.length * 2) / (words1.length + words2.length)
}

/**
 * 计算关键词重叠度
 */
function calculateKeywordOverlap(str1, str2) {
  const extractKeywords = (str) => {
    // 提取中文关键词（2-4个字符）
    const chineseRegex = /[\u4e00-\u9fa5]{2,4}/g
    const keywords = str.match(chineseRegex) || []

    // 提取英文单词
    const englishRegex = /[a-zA-Z]{3,}/g
    const englishWords = str.match(englishRegex) || []

    return [...new Set([...keywords, ...englishWords])]
  }

  const keywords1 = extractKeywords(str1)
  const keywords2 = extractKeywords(str2)

  if (keywords1.length === 0 || keywords2.length === 0) return 0

  const common = keywords1.filter(k => keywords2.includes(k))

  return common.length / Math.max(keywords1.length, keywords2.length)
}

/**
 * 综合相似度计算
 */
function calculateOverallSimilarity(issue1, issue2) {
  // 模式相似度
  const patternSimilarity = calculateSimilarity(issue1.pattern, issue2.pattern)

  // 关键词重叠度
  const keywordOverlap = calculateKeywordOverlap(issue1.pattern, issue2.pattern)

  // 分类相同
  const categoryMatch = issue1.category === issue2.category ? 0.2 : 0

  // 文件相关性
  const fileRelevance = calculateFileRelevance(issue1, issue2)

  // 综合计算
  const weights = {
    pattern: 0.5,
    keyword: 0.2,
    category: 0.15,
    file: 0.15
  }

  return (
    patternSimilarity * weights.pattern +
    keywordOverlap * weights.keyword +
    categoryMatch * weights.category +
    fileRelevance * weights.file
  )
}

/**
 * 计算文件相关性
 */
function calculateFileRelevance(issue1, issue2) {
  if (!issue1.file || !issue2.file) return 0

  const file1 = issue1.file
  const file2 = issue2.file

  // 完全相同
  if (file1 === file2) return 1

  // 同目录
  const dir1 = file1.split('/').slice(0, -1).join('/')
  const dir2 = file2.split('/').slice(0, -1).join('/')
  if (dir1 === dir2) return 0.5

  // 同类型（文件扩展名相同）
  const ext1 = file1.split('.').pop()
  const ext2 = file2.split('.').pop()
  if (ext1 === ext2) return 0.3

  return 0
}

// ============ 分组分析 ============

/**
 * 查找相似问题组
 */
function findSimilarIssueGroups(issues, threshold = CONFIG.defaultThreshold) {
  const qualifiedIssues = issues.issues.filter(
    issue => issue.occurrence >= threshold && issue.status !== 'rejected'
  )

  const groups = []
  const used = new Set()

  for (let i = 0; i < qualifiedIssues.length; i++) {
    if (used.has(i)) continue

    const group = {
      leader: qualifiedIssues[i],
      members: [qualifiedIssues[i]],
      similarities: []
    }

    used.add(i)

    for (let j = i + 1; j < qualifiedIssues.length; j++) {
      if (used.has(j)) continue

      const similarity = calculateOverallSimilarity(
        qualifiedIssues[i],
        qualifiedIssues[j]
      )

      if (similarity >= CONFIG.similarityThreshold) {
        group.members.push(qualifiedIssues[j])
        group.similarities.push({
          issue: qualifiedIssues[j],
          similarity: similarity.toFixed(2)
        })
        used.add(j)
      }
    }

    if (group.members.length >= CONFIG.minMergeCount) {
      groups.push(group)
    }
  }

  return groups
}

/**
 * 生成合并建议
 */
function generateMergeSuggestion(group) {
  const patterns = group.members.map(m => m.pattern)

  // 分析共同模式
  const commonPatterns = findCommonPatterns(patterns)

  // 生成通用规则标题
  const suggestedTitle = generateGeneralTitle(group.members, commonPatterns)

  // 生成合并的规则内容
  const suggestedRule = generateMergedRule(group.members, commonPatterns)

  return {
    members: group.members,
    commonPatterns,
    suggestedTitle,
    suggestedRule,
    totalOccurrences: group.members.reduce((sum, m) => sum + m.occurrence, 0),
    categories: [...new Set(group.members.map(m => m.category).filter(Boolean))]
  }
}

/**
 * 查找共同模式
 */
function findCommonPatterns(patterns) {
  const common = []

  // 关键词分析
  const keywordCounts = {}

  for (const pattern of patterns) {
    const keywords = pattern.match(/[\u4e00-\u9fa5]{2,}/g) || []

    for (const keyword of keywords) {
      if (!keywordCounts[keyword]) {
        keywordCounts[keyword] = 0
      }
      keywordCounts[keyword]++
    }
  }

  // 找出出现多次的关键词
  for (const [keyword, count] of Object.entries(keywordCounts)) {
    if (count >= 2) {
      common.push(keyword)
    }
  }

  return common
}

/**
 * 生成通用标题
 */
function generateGeneralTitle(members, commonPatterns) {
  // 如果有共同关键词，使用它们生成标题
  if (commonPatterns.length > 0) {
    return `禁止${commonPatterns.join('、')}等不规范做法`
  }

  // 分析第一个问题的模式
  const firstPattern = members[0].pattern

  // 根据模式类型生成标题
  if (firstPattern.includes('使用')) {
    return firstPattern.replace('使用', '不当使用')
  } else if (firstPattern.includes('缺少')) {
    return `规范${firstPattern.replace('缺少', '')}处理`
  } else if (firstPattern.includes('直接')) {
    return `避免${firstPattern}`
  } else {
    return `规范${firstPattern}`
  }
}

/**
 * 生成合并的规则内容
 */
function generateMergedRule(members, commonPatterns) {
  const exampleCount = Math.min(members.length, 3)

  return {
    problemDescription: `检测到 ${members.length} 个相关问题的重复出现：\n${members.slice(0, exampleCount).map(m => `• ${m.pattern}`).join('\n')}`,
    badExample: members[0]?.example || '详见各个问题的具体示例',
    goodExample: '参考 CLAUDE.md 中相关规范的最佳实践',
    applicableScope: members.map(m => m.file).filter(Boolean).slice(0, 3).join(', ') || '相关代码',
    reason: `这些问题会导致代码质量下降、维护困难，应遵循统一的规范。`,
    benefits: `• 统一代码风格\n• 减少重复错误\n• 提高可维护性\n• 改善代码质量`
  }
}

// ============ 优化建议 ============

/**
 * 生成规范优化建议
 */
function generateOptimizationSuggestions(issues) {
  const suggestions = []

  // 1. 分类分析
  const categoryStats = {}
  for (const issue of issues.issues) {
    if (issue.category) {
      if (!categoryStats[issue.category]) {
        categoryStats[issue.category] = { count: 0, occurrences: 0 }
      }
      categoryStats[issue.category].count++
      categoryStats[issue.category].occurrences += issue.occurrence
    }
  }

  // 找出问题最多的分类
  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].occurrences - a[1].occurrences)
    .slice(0, 3)

  if (topCategories.length > 0) {
    suggestions.push({
      type: 'category-analysis',
      title: '重点关注分类',
      description: `以下分类的问题出现频率最高，建议优先处理：`,
      items: topCategories.map(([cat, stats]) => ({
        category: cat,
        count: stats.count,
        occurrences: stats.occurrences,
        suggestion: getCategorySuggestion(cat)
      }))
    })
  }

  // 2. 严重程度分析
  const severityStats = {
    error: issues.issues.filter(i => i.severity === 'error').length,
    warning: issues.issues.filter(i => i.severity === 'warning').length,
    info: issues.issues.filter(i => i.severity === 'info').length
  }

  if (severityStats.error > 0) {
    suggestions.push({
      type: 'severity-analysis',
      title: '严重问题优先处理',
      description: `发现 ${severityStats.error} 个错误级别的问题，应该优先解决：`,
      items: issues.issues
        .filter(i => i.severity === 'error')
        .slice(0, 5)
        .map(i => ({
          pattern: i.pattern,
          occurrence: i.occurrence,
          file: i.file
        }))
    })
  }

  // 3. 文件热点分析
  const fileStats = {}
  for (const issue of issues.issues) {
    if (issue.file) {
      if (!fileStats[issue.file]) {
        fileStats[issue.file] = { count: 0, issues: [] }
      }
      fileStats[issue.file].count++
      fileStats[issue.file].issues.push(issue)
    }
  }

  const hotFiles = Object.entries(fileStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  if (hotFiles.length > 0 && hotFiles[0][1].count >= 2) {
    suggestions.push({
      type: 'file-hotspot',
      title: '问题热点文件',
      description: `以下文件存在问题较多，建议重点审查或重构：`,
      items: hotFiles.map(([file, stats]) => ({
        file,
        count: stats.count,
        issues: stats.issues.map(i => i.pattern),
        suggestion: getFileSuggestion(file, stats.count)
      }))
    })
  }

  return suggestions
}

/**
 * 获取分类建议
 */
function getCategorySuggestion(category) {
  const suggestions = {
    ui: '• 统一使用 /ui-ux-pro-max skill 设计组件\n• 检查所有 UI 组件的表情符号使用\n• 确保响应式样式一致',
    api: '• 统一 API 响应格式\n• 添加 API 响应格式测试\n• 检查所有路由定义顺序',
    database: '• 确保使用软删除\n• 检查 SQL 语句安全性\n• 添加数据库操作日志',
    store: '• 统一 Store 结构规范\n• 检查数据持久化逻辑\n• 验证响应式对象处理',
    utils: '• 添加工具函数单元测试\n• 统一错误处理方式\n• 完善函数文档注释'
  }

  return suggestions[category] || '• 代码审查时重点关注\n• 添加相关测试\n• 遵循团队规范'
}

/**
 * 获取文件建议
 */
function getFileSuggestion(file, count) {
  if (count >= 5) {
    return `强烈建议重构此文件，问题过多`
  } else if (count >= 3) {
    return `建议重点审查此文件`
  } else {
    return `需要修复相关问题`
  }
}

// ============ 输出格式化 ============

/**
 * 格式化合并建议
 */
function formatMergeSuggestion(suggestion, index) {
  let output = `\n${'='.repeat(70)}\n`
  output += `💡 合并建议 ${index + 1}\n`
  output += `${'='.repeat(70)}\n`

  output += `\n📊 包含 ${suggestion.members.length} 个相关问题：\n`
  suggestion.members.forEach((member, i) => {
    output += `   ${i + 1}. ${member.pattern} (出现 ${member.occurrence} 次)\n`
    if (member.file) {
      output += `      文件: ${member.file}\n`
    }
  })

  output += `\n🎯 建议的通用规则：\n`
  output += `   标题: ${suggestion.suggestedTitle}\n`

  output += `\n📝 问题描述：\n`
  output += `   ${suggestion.suggestedRule.problemDescription.replace(/\n/g, '\n   ')}\n`

  output += `\n✅ 正确做法：\n`
  output += `   ${suggestion.suggestedRule.goodExample}\n`

  output += `\n📊 统计信息：\n`
  output += `   总出现次数: ${suggestion.totalOccurrences}\n`
  if (suggestion.categories.length > 0) {
    output += `   涉及分类: ${suggestion.categories.join(', ')}\n`
  }

  return output
}

/**
 * 格式化优化建议
 */
function formatOptimizationSuggestion(suggestion) {
  let output = `\n${'─'.repeat(70)}\n`
  output += `📌 ${suggestion.title}\n`
  output += `${'─'.repeat(70)}\n`

  output += `\n${suggestion.description}\n\n`

  if (suggestion.type === 'category-analysis') {
    suggestion.items.forEach(item => {
      output += `   ${item.category}:\n`
      output += `   • 问题数: ${item.count}\n`
      output += `   • 总次数: ${item.occurrences}\n`
      output += `   • 建议:\n${item.suggestion.split('\n').map(l => '     ' + l).join('\n')}\n\n`
    })
  } else if (suggestion.type === 'severity-analysis') {
    suggestion.items.forEach(item => {
      output += `   • ${item.pattern}\n`
      output += `     出现次数: ${item.occurrence}\n`
      if (item.file) {
        output += `     位置: ${item.file}\n`
      }
      output += `\n`
    })
  } else if (suggestion.type === 'file-hotspot') {
    suggestion.items.forEach(item => {
      output += `   📄 ${item.file}\n`
      output += `   • 问题数: ${item.count}\n`
      output += `   • 涉及问题: ${item.issues.slice(0, 3).join(', ')}\n`
      output += `   • 建议: ${item.suggestion}\n\n`
    })
  }

  return output
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🧠 智能规则建议工具\n')
    console.log('='.repeat(70))

    if (!existsSync(ISSUES_FILE)) {
      console.error('❌ issues.json 不存在，请先运行检测脚本收集问题')
      process.exit(1)
    }

    // 解析参数
    const args = process.argv.slice(2)
    let filterCategory = null
    let threshold = CONFIG.defaultThreshold

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--category' && args[i + 1]) {
        filterCategory = args[++i]
      } else if (args[i] === '--threshold' && args[i + 1]) {
        threshold = parseInt(args[++i])
      }
    }

    // 加载问题数据
    const content = readFileSync(ISSUES_FILE, 'utf-8')
    const issues = JSON.parse(content)

    console.log(`\n📊 问题总数: ${issues.issues.length}`)
    console.log(`   分析阈值: ${threshold} 次`)

    if (filterCategory) {
      console.log(`   筛选分类: ${filterCategory}`)
      issues.issues = issues.issues.filter(i => i.category === filterCategory)
    }

    // 1. 查找相似问题组
    console.log(`\n🔍 分析相似问题...`)
    const groups = findSimilarIssueGroups(issues, threshold)

    if (groups.length > 0) {
      console.log(`✅ 发现 ${groups.length} 个可合并的问题组\n`)

      const mergeSuggestions = groups.map(generateMergeSuggestion)

      for (let i = 0; i < mergeSuggestions.length; i++) {
        console.log(formatMergeSuggestion(mergeSuggestions[i], i))
      }

      console.log(`\n💡 使用建议：`)
      console.log(`   1. 审查上述合并建议`)
      console.log(`   2. 如同意合并，运行: node scripts/hooks/generate-rule.js --all`)
      console.log(`   3. 手动编辑生成的规则，使用更通用的标题和描述`)
    } else {
      console.log(`✅ 没有发现需要合并的相似问题`)
    }

    // 2. 生成优化建议
    console.log(`\n🎯 生成优化建议...`)
    const optimizations = generateOptimizationSuggestions(issues)

    if (optimizations.length > 0) {
      console.log(`✅ 生成 ${optimizations.length} 类优化建议\n`)

      for (const opt of optimizations) {
        console.log(formatOptimizationSuggestion(opt))
      }
    }

    // 总结
    console.log('='.repeat(70))
    console.log(`\n📋 总结:`)
    console.log(`   合并建议: ${groups.length} 个`)
    console.log(`   优化建议: ${optimizations.length} 个`)

    if (groups.length > 0 || optimizations.length > 0) {
      console.log(`\n💡 后续步骤:`)

      if (groups.length > 0) {
        console.log(`   1. 根据合并建议创建通用规则`)
        console.log(`   2. 运行: node scripts/hooks/generate-rule.js --all`)
      }

      if (optimizations.length > 0) {
        console.log(`   ${groups.length > 0 ? '3' : '1'}. 优先处理出现频率高的问题`)
        console.log(`   ${groups.length > 0 ? '4' : '2'}. 对热点文件进行重构或重点审查`)
      }

      console.log(`   最后运行: node scripts/hooks/update-claude-md.js 更新文档`)
    } else {
      console.log(`\n✅ 当前问题分布合理，无需特别优化`)
    }

    console.log(`\n📖 相关规范请参考: CLAUDE.md`)

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 分析失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
