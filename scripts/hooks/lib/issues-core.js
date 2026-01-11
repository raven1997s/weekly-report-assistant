/**
 * 问题收集核心模块
 *
 * 提供：
 * - 生成唯一 ID
 * - 相似度计算
 * - 查找相似问题
 * - 分类推断
 * - 规则建议生成
 * - 读取/保存 issues.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 导出常量 ============

export const SIMILARITY_THRESHOLD = 0.7
export const DEFAULT_THRESHOLD = 3

// ============ 工具函数 ============

/**
 * 生成唯一 ID
 */
export function generateId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `issue-${timestamp}-${random}`
}

/**
 * 获取今天的日期字符串
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 计算相似度（简单版本）
 */
export function calculateSimilarity(str1, str2) {
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
export function findSimilarIssue(issues, newIssue, threshold = SIMILARITY_THRESHOLD) {
  for (const issue of issues) {
    if (issue.status === 'rejected') continue // 跳过已拒绝的问题

    const patternSimilarity = calculateSimilarity(issue.pattern, newIssue.pattern)

    // 如果模式描述相似度超过阈值，返回该问题
    if (patternSimilarity >= threshold) {
      return { issue, similarity: patternSimilarity }
    }

    // 如果文件路径相同且问题描述相关
    if (issue.file === newIssue.file && issue.category === newIssue.category) {
      const combinedSimilarity = (patternSimilarity + 0.5) / 2
      if (combinedSimilarity >= threshold) {
        return { issue, similarity: combinedSimilarity }
      }
    }
  }

  return null
}

/**
 * 推断问题分类
 */
export function inferCategory(file, pattern) {
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
export function inferSuggestedRule(pattern, category) {
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

// ============ 数据操作函数 ============

/**
 * 读取 issues.json
 */
export function loadIssues() {
  const defaultData = {
    issues: [],
    stats: {
      totalIssues: 0,
      resolvedIssues: 0,
      pendingIssues: 0,
      categories: {}
    },
    settings: {
      occurrenceThreshold: DEFAULT_THRESHOLD,
      autoSuggest: true,
      lastAnalysis: null
    }
  }

  if (!existsSync(ISSUES_FILE)) {
    return defaultData
  }

  try {
    const content = readFileSync(ISSUES_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('⚠️  无法读取 issues.json，使用默认配置')
    return defaultData
  }
}

/**
 * 保存 issues.json
 */
export function saveIssues(issuesData) {
  // 更新统计信息
  issuesData.stats.totalIssues = issuesData.issues.length
  issuesData.stats.pendingIssues = issuesData.issues.filter(i => i.status === 'detected').length
  issuesData.stats.resolvedIssues = issuesData.issues.filter(i => i.status === 'approved').length

  // 更新分类统计
  issuesData.stats.categories = {}
  for (const issue of issuesData.issues) {
    const cat = issue.category || 'other'
    issuesData.stats.categories[cat] = (issuesData.stats.categories[cat] || 0) + 1
  }

  writeFileSync(ISSUES_FILE, JSON.stringify(issuesData, null, 2), 'utf-8')
}

/**
 * 添加或更新问题
 *
 * @param {Object} issueData - 问题数据
 * @param {string} issueData.pattern - 问题描述（必填）
 * @param {string} issueData.file - 文件路径
 * @param {number} issueData.line - 行号
 * @param {string} issueData.severity - 严重程度 (error|warning|info)
 * @param {string} issueData.type - 问题类型 (code-review|test-error|lint-error|manual|git-pattern|auto-detect)
 * @param {string} issueData.category - 分类 (ui|api|database|store|utils|other)
 * @param {string} issueData.example - 代码示例
 * @returns {Object} 返回操作结果 { created, updated, issue, reachedThreshold }
 */
export function addOrUpdateIssue(issueData) {
  const issuesData = loadIssues()
  const threshold = issuesData.settings.occurrenceThreshold || DEFAULT_THRESHOLD

  // 推断缺失的字段
  if (!issueData.type) issueData.type = 'auto-detect'
  if (!issueData.severity) issueData.severity = 'warning'
  if (!issueData.category) {
    issueData.category = inferCategory(issueData.file, issueData.pattern)
  }
  if (!issueData.suggestedRule) {
    issueData.suggestedRule = inferSuggestedRule(issueData.pattern, issueData.category)
  }

  // 查找相似问题
  const similar = findSimilarIssue(issuesData.issues, issueData)

  let result

  if (similar) {
    // 更新现有问题
    const existingIssue = similar.issue

    existingIssue.occurrence = (existingIssue.occurrence || 1) + 1
    existingIssue.lastSeen = getTodayDate()
    existingIssue.status = 'detected'

    // 更新文件列表（如果不同）
    if (issueData.file && issueData.file !== existingIssue.file) {
      if (!existingIssue.relatedFiles) {
        existingIssue.relatedFiles = []
      }
      if (!existingIssue.relatedFiles.includes(issueData.file)) {
        existingIssue.relatedFiles.push(issueData.file)
      }
    }

    result = {
      created: false,
      updated: true,
      issue: existingIssue,
      similarity: similar.similarity,
      reachedThreshold: existingIssue.occurrence >= threshold
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

    result = {
      created: true,
      updated: false,
      issue: newIssue,
      reachedThreshold: false
    }
  }

  // 保存到文件
  saveIssues(issuesData)

  return result
}

/**
 * 批量添加问题
 *
 * @param {Array} issues - 问题数组
 * @returns {Object} 返回统计结果 { created, updated, reachedThreshold }
 */
export function addIssues(issues) {
  let created = 0
  let updated = 0
  const thresholdIssues = []

  for (const issueData of issues) {
    const result = addOrUpdateIssue(issueData)

    if (result.created) created++
    if (result.updated) updated++
    if (result.reachedThreshold) {
      thresholdIssues.push(result.issue)
    }
  }

  return {
    created,
    updated,
    thresholdIssues,
    total: created + updated
  }
}
