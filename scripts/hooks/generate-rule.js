#!/usr/bin/env node

/**
 * 规范生成脚本
 *
 * 功能：根据 issues.json 中的问题记录，自动生成规范草稿
 *
 * 使用方式：
 * node scripts/hooks/generate-rule.js --issue issue-xxx
 * node scripts/hooks/generate-rule.js --all
 * node scripts/hooks/generate-rule.js --threshold 3
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')
const CLAUDE_MD_FILE = join(PROJECT_ROOT, 'CLAUDE.md')
const TEMPLATES_DIR = join(PROJECT_ROOT, '.claude/templates')
const OUTPUT_DIR = join(PROJECT_ROOT, '.claude/generated-rules')

// ============ 配置 ============

const CONFIG = {
  // 默认阈值
  defaultThreshold: 3,
  // 输出格式
  outputFormat: 'markdown', // markdown, console, file
  // 是否包含统计信息
  includeStats: true
}

// ============ 模板映射 ============

/**
 * 根据问题类型选择模板
 */
function selectTemplate(issue) {
  const templateMap = {
    // 反模式类型
    'code-review': 'anti-pattern.md',
    'manual': 'anti-pattern.md',

    // 最佳实践类型
    'best-practice': 'best-practice.md',

    // 常见错误类型
    'test-error': 'common-mistake.md',
    'lint-error': 'common-mistake.md'
  }

  const templateFile = templateMap[issue.type] || 'anti-pattern.md'
  const templatePath = join(TEMPLATES_DIR, templateFile)

  if (!existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`)
  }

  return {
    file: templatePath,
    content: readFileSync(templatePath, 'utf-8')
  }
}

/**
 * 填充模板变量
 */
function fillTemplate(template, issue, ruleNumber) {
  let content = template.content

  // 基本变量
  const replacements = {
    '${ruleNumber}': ruleNumber,
    '${ruleTitle}': issue.suggestedRule || issue.pattern,
    '${problemDescription}': generateProblemDescription(issue),
    '${badExample}': generateBadExample(issue),
    '${goodExample}': generateGoodExample(issue),
    '${applicableScope}': generateApplicableScope(issue),
    '${reason}': generateReason(issue),
    '${benefits}': generateBenefits(issue),
    '${solution}': generateSolution(issue),
    '${prevention}': generatePrevention(issue),
    '${language}': detectLanguage(issue.file),
    '${firstSeen}': issue.firstSeen,
    '${occurrence}': issue.occurrence,
    '${lastSeen}': issue.lastSeen,
    '${sources}': generateSources(issue)
  }

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value)
  }

  return content
}

// ============ 内容生成函数 ============

/**
 * 生成问题描述
 */
function generateProblemDescription(issue) {
  const descriptions = {
    '在 UI 中使用表情符号': '在 Vue 组件模板（<template>）中使用 Unicode 表情符号（如 🏖️、⚠️）会导致跨平台显示不一致，影响用户体验。',
    '直接保存响应式对象': '直接将 Vue 3 的 Proxy 对象保存到 localStorage 或数据库会导致循环引用错误，序列化失败。',
    '使用原生弹窗': '使用 alert()、confirm()、prompt() 等原生弹窗会阻塞主线程，样式无法自定义，移动端体验差。',
    'API 响应缺少 success 字段': 'API 响应缺少统一的 success 字段，导致前端无法统一处理错误，增加开发复杂度。',
    '硬删除操作': '直接使用 DELETE FROM 删除数据会导致数据永久丢失，无法恢复，误操作后果严重。',
    '路由定义顺序错误': '参数路由（如 /:id）定义在具体路由（如 /batch）之前，会导致具体路由被错误匹配。',
    '硬编码 z-index': '硬编码 z-index 值（1040-1070）会导致层叠上下文混乱，难以维护，应该使用 SCSS 变量。'
  }

  return descriptions[issue.pattern] || `${issue.pattern} 是一个常见的开发问题，需要遵循统一的规范来避免。`
}

/**
 * 生成错误示例
 */
function generateBadExample(issue) {
  const examples = {
    '在 UI 中使用表情符号': '<span>🏖️ 假期提醒</span>',
    '直接保存响应式对象': 'await saveToStorage(key, records.value)',
    '使用原生弹窗': 'if (!confirm("确定删除吗？")) return',
    'API 响应缺少 success 字段': 'res.json({ data: records })',
    '硬删除操作': 'DELETE FROM records WHERE id = ?',
    '路由定义顺序错误': 'app.put("/api/records/:id", ...)\napp.put("/api/records/batch", ...)',
    '硬编码 z-index': '.modal { z-index: 1050; }'
  }

  return examples[issue.pattern] || issue.example || '// 错误示例未提供'
}

/**
 * 生成正确示例
 */
function generateGoodExample(issue) {
  const examples = {
    '在 UI 中使用表情符号': '<svg><!-- Heroicons 图标 --></svg>\n<span>假期提醒</span>',
    '直接保存响应式对象': 'const cleanData = JSON.parse(JSON.stringify(records.value))\nawait saveToStorage(key, cleanData)',
    '使用原生弹窗': 'const confirmed = await useConfirm().confirm({ message: "确定删除吗？" })\nif (!confirmed) return',
    'API 响应缺少 success 字段': 'res.json({ success: true, data: records })',
    '硬删除操作': 'UPDATE records SET deleted = 1, deletedAt = ? WHERE id = ?',
    '路由定义顺序错误': 'app.put("/api/records/batch", ...)\napp.put("/api/records/:id", ...)',
    '硬编码 z-index': '.modal { z-index: $z-modal; }'
  }

  return examples[issue.pattern] || '// 正确做法请参考 CLAUDE.md 规范'
}

/**
 * 生成适用范围
 */
function generateApplicableScope(issue) {
  const scopes = {
    '在 UI 中使用表情符号': '所有 Vue 组件的 <template> 部分',
    '直接保存响应式对象': '所有 Pinia Store 的数据持久化操作',
    '使用原生弹窗': '所有需要用户确认或输入的场景',
    'API 响应缺少 success 字段': 'server/api.js 中的所有 API 路由',
    '硬删除操作': '所有数据库删除操作（除永久删除端点外）',
    '路由定义顺序错误': 'server/api.js 中的 Express 路由定义',
    '硬编码 z-index': '所有 .vue、.scss 文件中的样式定义'
  }

  return scopes[issue.pattern] || `适用于 ${issue.category || '所有'} 相关代码`
}

/**
 * 生成原因说明
 */
function generateReason(issue) {
  const reasons = {
    '在 UI 中使用表情符号': '表情符号在不同操作系统（Windows/macOS/Android）上显示效果不同，无法自定义样式，影响品牌形象和用户体验一致性。',
    '直接保存响应式对象': 'Vue 3 使用 Proxy 实现响应式，包含循环引用和内部属性，直接序列化会导致错误或存储冗余数据。',
    '使用原生弹窗': '原生弹窗阻塞主线程，无法自定义样式与应用主题一致，移动端显示效果差，不支持复杂交互。',
    'API 响应缺少 success 字段': '统一的响应格式让前端可以统一处理成功和失败情况，降低代码复杂度，便于错误追踪和日志记录。',
    '硬删除操作': '软删除提供"后悔药"，避免误操作导致数据永久丢失，支持数据审计和恢复，提升用户体验。',
    '路由定义顺序错误': 'Express 按定义顺序匹配路由，参数路由会匹配所有路径，导致具体路由无法访问，引发难以排查的 Bug。',
    '硬编码 z-index': '使用 SCSS 变量集中管理 z-index，便于维护和调整层叠上下文，避免数值冲突。'
  }

  return reasons[issue.pattern] || '遵循此规范可以提高代码质量和可维护性，减少重复错误。'
}

/**
 * 生成预期收益
 */
function generateBenefits(issue) {
  const benefits = {
    '在 UI 中使用表情符号': '• 跨平台显示一致\n• 可自定义颜色和大小\n• 提升专业度和品牌形象\n• 更好的可访问性',
    '直接保存响应式对象': '• 避免序列化错误\n• 数据更轻量\n• 跨环境传递一致',
    '使用原生弹窗': '• 非阻塞式交互\n• 样式与应用主题统一\n• 支持复杂交互\n• 更好的移动端体验',
    'API 响应缺少 success 字段': '• 统一的错误处理\n• 便于日志记录\n• API 行为可预测',
    '硬删除操作': '• 提供数据恢复能力\n• 支持数据审计\n• 减少误操作损失',
    '路由定义顺序错误': '• 避免路由匹配错误\n• 减少难以排查的 Bug',
    '硬编码 z-index': '• 集中管理层叠关系\n• 便于维护调整\n• 避免数值冲突'
  }

  return benefits[issue.pattern] || '• 提高代码质量\n• 减少重复错误\n• 改善可维护性'
}

/**
 * 生成解决方案
 */
function generateSolution(issue) {
  return generateGoodExample(issue)
}

/**
 * 生成预防措施
 */
function generatePrevention(issue) {
  const preventions = {
    '在 UI 中使用表情符号': '• 使用 ESLint 规则检测表情符号\n• 代码审查时检查 UI 组件\n• 使用 SVG 图标库（如 Heroicons）',
    '直接保存响应式对象': '• 在 Store 中统一使用 JSON.parse(JSON.stringify())\n• 添加数据持久化前的检查\n• 编写单元测试验证序列化',
    '使用原生弹窗': '• 使用 ESLint 禁止 alert/confirm/prompt\n• 代码审查时检查弹窗调用\n• 使用自定义组件（ConfirmDialog/PromptDialog）',
    'API 响应缺少 success 字段': '• 使用统一的响应包装函数\n• API 开发检查清单包含 success 字段\n• 添加 API 响应格式测试',
    '硬删除操作': '• 使用软删除模式（deleted 字段）\n• 提供恢复和永久删除接口\n• 代码审查时检查删除操作',
    '路由定义顺序错误': '• 遵循"具体路由在前，参数路由在后"原则\n• 使用 ESLint 插件检测路由顺序\n• 添加路由匹配测试',
    '硬编码 z-index': '• 使用 SCSS 变量定义 z-index\n• 禁止在代码中硬编码 1040-1070 范围的值\n• 代码审查时检查 z-index 定义'
  }

  return preventions[issue.pattern] || '• 代码审查时检查\n• 添加相关测试\n• 遵循团队规范'
}

/**
 * 检测编程语言
 */
function detectLanguage(filePath) {
  if (!filePath) return 'javascript'

  const ext = filePath.split('.').pop()
  const langMap = {
    'vue': 'vue',
    'js': 'javascript',
    'cjs': 'javascript',
    'mjs': 'javascript',
    'ts': 'typescript',
    'scss': 'scss',
    'css': 'css',
    'json': 'json'
  }

  return langMap[ext] || 'javascript'
}

/**
 * 生成来源信息
 */
function generateSources(issue) {
  const sources = []

  if (issue.relatedFiles && issue.relatedFiles.length > 0) {
    sources.push(...issue.relatedFiles)
  }

  if (issue.file) {
    sources.push(issue.file)
  }

  const sourceMap = {
    'code-review': '代码审查',
    'test-error': '测试失败',
    'lint-error': 'Lint 检查',
    'manual': '手动记录',
    'git-pattern': 'Git 历史'
  }

  const typeDesc = sourceMap[issue.type] || issue.type

  if (sources.length === 0) {
    return typeDesc
  }

  return `${typeDesc} (${sources.slice(0, 3).join(', ')})`
}

/**
 * 获取下一个规则编号
 */
function getNextRuleNumber() {
  if (!existsSync(CLAUDE_MD_FILE)) {
    return '1'
  }

  const content = readFileSync(CLAUDE_MD_FILE, 'utf-8')

  // 查找现有的规则编号
  const ruleNumbers = []
  const regex = /###\s+(\d+)\.\s+/g
  let match

  while ((match = regex.exec(content)) !== null) {
    ruleNumbers.push(parseInt(match[1]))
  }

  if (ruleNumbers.length === 0) {
    return '1'
  }

  const maxNumber = Math.max(...ruleNumbers)
  return (maxNumber + 1).toString()
}

// ============ 主要功能 ============

/**
 * 加载 issues.json
 */
function loadIssues() {
  if (!existsSync(ISSUES_FILE)) {
    console.error('❌ issues.json 不存在，请先运行检测脚本收集问题')
    process.exit(1)
  }

  const content = readFileSync(ISSUES_FILE, 'utf-8')
  return JSON.parse(content)
}

/**
 * 生成单个问题的规范
 */
function generateRuleForIssue(issue, ruleNumber) {
  console.log(`\n📝 生成规范: ${issue.pattern}`)
  console.log(`   问题ID: ${issue.id}`)
  console.log(`   出现次数: ${issue.occurrence}`)
  console.log(`   分类: ${issue.category || '未分类'}`)

  try {
    const template = selectTemplate(issue)
    const content = fillTemplate(template, issue, ruleNumber)

    return {
      issueId: issue.id,
      pattern: issue.pattern,
      ruleNumber,
      content,
      success: true
    }
  } catch (error) {
    console.error(`   ❌ 生成失败: ${error.message}`)
    return {
      issueId: issue.id,
      pattern: issue.pattern,
      error: error.message,
      success: false
    }
  }
}

/**
 * 生成所有达到阈值的问题的规范
 */
function generateAllRules(issues, threshold, nextRuleNumber) {
  const qualifiedIssues = issues.issues.filter(
    issue => issue.occurrence >= threshold && issue.status !== 'rejected'
  )

  if (qualifiedIssues.length === 0) {
    console.log(`\n✅ 没有达到阈值（${threshold} 次）的问题`)
    return []
  }

  console.log(`\n📊 找到 ${qualifiedIssues.length} 个达到阈值的问题:`)

  const results = []
  let currentNumber = parseInt(nextRuleNumber)

  for (const issue of qualifiedIssues) {
    const result = generateRuleForIssue(issue, currentNumber.toString())
    results.push(result)
    if (result.success) {
      currentNumber++
    }
  }

  return results
}

/**
 * 输出到控制台
 */
function outputToConsole(results) {
  console.log('\n' + '='.repeat(70))
  console.log('📄 生成的规范草稿')
  console.log('='.repeat(70) + '\n')

  for (const result of results) {
    if (!result.success) continue

    console.log(`规则 ${result.ruleNumber}: ${result.pattern}`)
    console.log('-'.repeat(70))
    console.log(result.content)
    console.log('\n' + '='.repeat(70) + '\n')
  }
}

/**
 * 输出到文件
 */
function outputToFile(results) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const result of results) {
    if (!result.success) continue

    const fileName = `rule-${result.ruleNumber}-${result.pattern.replace(/\s+/g, '-')}.md`
    const filePath = join(OUTPUT_DIR, fileName)

    writeFileSync(filePath, result.content, 'utf-8')
    console.log(`✅ 已保存: ${fileName}`)
  }

  console.log(`\n📁 所有规范已保存到: ${OUTPUT_DIR}`)
}

/**
 * 生成合并文档
 */
function generateCombinedDocument(results) {
  const content = results
    .filter(r => r.success)
    .map(r => r.content)
    .join('\n\n---\n\n')

  const filePath = join(OUTPUT_DIR, 'all-rules.md')
  writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ 合并文档已保存: all-rules.md`)
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🔧 规范生成工具\n')
    console.log('='.repeat(70))

    // 解析参数
    const args = process.argv.slice(2)
    let specificIssueId = null
    let generateAll = false
    let threshold = CONFIG.defaultThreshold
    let outputFile = false
    let outputConsole = true

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--issue' && args[i + 1]) {
        specificIssueId = args[++i]
      } else if (args[i] === '--all') {
        generateAll = true
      } else if (args[i] === '--threshold' && args[i + 1]) {
        threshold = parseInt(args[++i])
      } else if (args[i] === '--output') {
        outputFile = true
      } else if (args[i] === '--console') {
        outputConsole = true
      } else if (args[i] === '--file-only') {
        outputFile = true
        outputConsole = false
      }
    }

    // 加载问题数据
    const issues = loadIssues()

    console.log(`\n📊 当前问题总数: ${issues.issues.length}`)
    console.log(`   阈值: ${threshold} 次`)
    console.log(`   下一个规则编号: ${getNextRuleNumber()}`)

    let results = []

    // 生成规范
    if (specificIssueId) {
      const issue = issues.issues.find(i => i.id === specificIssueId)
      if (!issue) {
        console.error(`\n❌ 未找到问题: ${specificIssueId}`)
        process.exit(1)
      }

      const nextNumber = getNextRuleNumber()
      results.push(generateRuleForIssue(issue, nextNumber))
    } else if (generateAll) {
      const nextNumber = getNextRuleNumber()
      results = generateAllRules(issues, threshold, nextNumber)
    } else {
      console.error('\n❌ 请指定 --issue <id> 或 --all')
      console.error('示例:')
      console.error('  node scripts/hooks/generate-rule.js --issue issue-xxx')
      console.error('  node scripts/hooks/generate-rule.js --all')
      console.error('  node scripts/hooks/generate-rule.js --all --threshold 5')
      process.exit(1)
    }

    if (results.length === 0) {
      console.log('\n✅ 没有需要生成规范的问题')
      process.exit(0)
    }

    // 输出结果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log('\n' + '='.repeat(70))
    console.log(`\n✅ 成功生成: ${successCount} 个规范`)
    if (failCount > 0) {
      console.log(`❌ 生成失败: ${failCount} 个规范`)
    }

    if (outputConsole) {
      outputToConsole(results)
    }

    if (outputFile) {
      outputToFile(results)
      generateCombinedDocument(results)
    }

    console.log(`\n📖 下一步: 运行 node scripts/hooks/update-claude-md.js 将规范添加到 CLAUDE.md`)

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 生成失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
