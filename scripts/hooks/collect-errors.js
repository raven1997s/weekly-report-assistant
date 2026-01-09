#!/usr/bin/env node

/**
 * 测试错误收集脚本
 *
 * 功能：解析 Vitest 测试报告，自动提取失败测试的错误信息并记录到 issues.json
 *
 * 使用方式：
 * npm test -- --reporter=json > test-results.json
 * node scripts/hooks/collect-errors.js --input test-results.json
 * node scripts/hooks/collect-errors.js --auto
 */

import { readFileSync, existsSync, writeFile } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')
const COLLECT_ISSUES_SCRIPT = join(PROJECT_ROOT, 'scripts/hooks/collect-issues.js')

// ============ 配置 ============

const CONFIG = {
  // 测试报告文件路径
  testResultsFile: 'test-results.json',
  // 是否自动运行测试
  autoRunTests: false,
  // 错误出现次数阈值
  occurrenceThreshold: 3
}

// ============ 辅助函数 ============

/**
 * 读取 issues.json
 */
function loadIssues() {
  if (!existsSync(ISSUES_FILE)) {
    return {
      issues: [],
      stats: {
        totalIssues: 0,
        resolvedIssues: 0,
        pendingIssues: 0,
        categories: {
          ui: 0,
          api: 0,
          database: 0,
          store: 0,
          utils: 0
        }
      },
      settings: {
        occurrenceThreshold: 3,
        autoSuggest: true,
        lastAnalysis: null
      }
    }
  }

  const content = readFileSync(ISSUES_FILE, 'utf-8')
  return JSON.parse(content)
}

/**
 * 保存 issues.json
 */
function saveIssues(issues) {
  writeFile(ISSUES_FILE, JSON.stringify(issues, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error('❌ 保存 issues.json 失败:', err.message)
    }
  })
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
 * 从测试文件路径推断源文件路径
 */
function getSourceFilePath(testFilePath) {
  // src/views/TestView.spec.js -> src/views/TestView.vue
  return testFilePath
    .replace('.spec.js', '.vue')
    .replace('.test.js', '.js')
    .replace('/__tests__/', '/')
}

/**
 * 提取错误模式描述
 */
function extractErrorPattern(errorMessage) {
  // 常见错误模式提取
  const patterns = [
    // TypeError 模式
    {
      regex: /Cannot read properties of (undefined|null)/,
      template: '读取空值属性'
    },
    {
      regex: /(\w+) is not defined/,
      template: (match) => `变量 ${match[1]} 未定义`
    },
    {
      regex: /(\w+)\.(\w+) is not a function/,
      template: (match) => `方法 ${match[1]}.${match[2]} 不存在`
    },

    // AssertionError 模式
    {
      regex: /expected (\d+) but got (\d+)/,
      template: (match) => `数值断言失败：期望 ${match[1]}，实际 ${match[2]}`
    },
    {
      regex: /expected '([^']+)' but got '([^']+)'/,
      template: (match) => `字符串断言失败：期望 "${match[1]}", 实际 "${match[2]}"`
    },

    // Vue 特定错误
    {
      regex: /Failed to mount component: (.+)/,
      template: (match) => `组件挂载失败：${match[1]}`
    },
    {
      regex: /Cannot find module '([^']+)'/,
      template: (match) => `模块未找到：${match[1]}`
    },

    // 网络错误
    {
      regex: /Network Error|fetch failed/i,
      template: '网络请求失败'
    },

    // 异步错误
    {
      regex: /timeout|timed out/i,
      template: '异步操作超时'
    }
  ]

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern.regex)
    if (match) {
      if (typeof pattern.template === 'function') {
        return pattern.template(match)
      }
      return pattern.template
    }
  }

  // 如果没有匹配到已知模式，返回错误消息的前100个字符
  return errorMessage.length > 100
    ? errorMessage.substring(0, 100) + '...'
    : errorMessage
}

/**
 * 调用 collect-issues.js 记录问题
 */
function recordIssue(pattern, details) {
  const args = [
    '--pattern', pattern,
    '--type', 'test-error',
    '--severity', 'error'
  ]

  if (details.file) {
    args.push('--file', details.file)
  }
  if (details.line) {
    args.push('--line', details.line.toString())
  }
  if (details.example) {
    args.push('--example', details.example)
  }

  return new Promise((resolve, reject) => {
    const process = spawn('node', [COLLECT_ISSUES_SCRIPT, ...args], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`collect-issues.js 退出码: ${code}`))
      }
    })

    process.on('error', reject)
  })
}

// ============ Vitest 报告解析 ============

/**
 * 解析 Vitest JSON 报告
 */
function parseVitestReport(reportPath) {
  if (!existsSync(reportPath)) {
    console.error(`❌ 测试报告文件不存在: ${reportPath}`)
    return []
  }

  let report
  try {
    const content = readFileSync(reportPath, 'utf-8')
    report = JSON.parse(content)
  } catch (error) {
    console.error('❌ 解析测试报告失败:', error.message)
    return []
  }

  const failures = []

  // Vitest JSON 格式：{ testResults: [ { name, result: { errors } } ] }
  if (report.testResults && Array.isArray(report.testResults)) {
    for (const testFile of report.testResults) {
      const filePath = testFile.name || testFile.filepath

      if (testFile.result && testFile.result.errors) {
        for (const error of testFile.result.errors) {
          failures.push({
            file: filePath,
            test: error.name || testFile.name,
            message: error.message || error.stack || '未知错误',
            stack: error.stack
          })
        }
      }
    }
  }

  // Vitest 另一种格式：直接在根级别包含 errors
  if (report.errors && Array.isArray(report.errors)) {
    for (const error of report.errors) {
      failures.push({
        file: error.file || '未知文件',
        test: error.name || '未知测试',
        message: error.message || error.stack || '未知错误',
        stack: error.stack
      })
    }
  }

  return failures
}

/**
 * 从错误堆栈中提取文件和行号
 */
function parseErrorStack(stack) {
  if (!stack) return null

  // 匹配类似 "at Function.src/components/TestView.vue:10:15" 的行
  const lines = stack.split('\n')
  for (const line of lines) {
    const match = line.match(/at\s+.+\(([^:]+):(\d+):(\d+)\)|at\s+([^:]+):(\d+):(\d+)/)
    if (match) {
      const file = match[1] || match[4]
      const lineNum = match[2] || match[5]
      // 只关心项目内的文件
      if (file && (file.startsWith('src/') || file.startsWith('server/'))) {
        return { file, line: parseInt(lineNum) }
      }
    }
  }

  return null
}

/**
 * 分析失败测试并记录问题
 */
async function analyzeFailures(failures) {
  console.log(`\n📊 分析 ${failures.length} 个失败测试...\n`)

  // 按错误模式分组
  const patterns = {}
  for (const failure of failures) {
    const pattern = extractErrorPattern(failure.message)

    if (!patterns[pattern]) {
      patterns[pattern] = {
        pattern,
        files: [],
        count: 0,
        examples: []
      }
    }

    patterns[pattern].count++

    const location = parseErrorStack(failure.stack)
    const sourceFile = location ? location.file : getSourceFilePath(failure.file)

    if (!patterns[pattern].files.includes(sourceFile)) {
      patterns[pattern].files.push(sourceFile)
    }

    if (patterns[pattern].examples.length < 3) {
      patterns[pattern].examples.push({
        file: sourceFile,
        line: location?.line,
        test: failure.test,
        message: failure.message
      })
    }
  }

  // 记录问题
  let recordedCount = 0
  for (const [patternName, data] of Object.entries(patterns)) {
    console.log(`\n📝 记录问题: ${patternName}`)
    console.log(`   出现次数: ${data.count}`)
    console.log(`   影响文件: ${data.files.join(', ')}`)

    try {
      await recordIssue(patternName, {
        file: data.files[0],
        line: data.examples[0]?.line,
        example: data.examples[0]?.message
      })
      recordedCount++
    } catch (error) {
      console.error(`   ⚠️  记录失败: ${error.message}`)
    }
  }

  console.log(`\n✅ 已记录 ${recordedCount} 个问题到 issues.json`)

  return recordedCount
}

/**
 * 自动运行测试
 */
function runTests() {
  return new Promise((resolve, reject) => {
    console.log('🧪 运行测试...\n')

    const testProcess = spawn('npm', ['test', '--', '--reporter=json', '--outputFile=test-results.json'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    })

    testProcess.on('close', (code) => {
      if (code === 0 || code === 1) {
        // 0 = 所有测试通过，1 = 有测试失败
        resolve()
      } else {
        reject(new Error(`测试退出码: ${code}`))
      }
    })

    testProcess.on('error', reject)
  })
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🔍 测试错误收集工具\n')
    console.log('='.repeat(50))

    const args = process.argv.slice(2)
    let inputPath = null
    let shouldRunTests = false

    // 解析参数
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--input' && args[i + 1]) {
        inputPath = args[++i]
      } else if (args[i] === '--auto') {
        shouldRunTests = true
      }
    }

    // 如果指定了 --auto，先运行测试
    if (shouldRunTests) {
      await runTests()
      inputPath = join(PROJECT_ROOT, CONFIG.testResultsFile)
    }

    // 如果没有指定输入文件，尝试默认路径
    if (!inputPath) {
      inputPath = join(PROJECT_ROOT, CONFIG.testResultsFile)
    }

    // 解析测试报告
    const failures = parseVitestReport(inputPath)

    if (failures.length === 0) {
      console.log('\n✅ 没有发现测试失败')
      console.log('\n所有测试通过！')
      process.exit(0)
    }

    console.log(`\n❌ 发现 ${failures.length} 个失败测试`)

    // 显示失败列表
    console.log('\n失败列表:')
    failures.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.test}`)
      console.log(`      ${f.message.substring(0, 80)}...`)
      console.log(`      位置: ${f.file}`)
    })

    // 分析并记录问题
    const recordedCount = await analyzeFailures(failures)

    console.log('\n' + '='.repeat(50))
    console.log(`\n📊 统计信息:`)
    console.log(`   失败测试数: ${failures.length}`)
    console.log(`   记录问题数: ${recordedCount}`)

    // 检查是否有重复出现的问题
    const issues = loadIssues()
    const repeatedIssues = issues.issues.filter(
      issue => issue.type === 'test-error' && issue.occurrence >= CONFIG.occurrenceThreshold
    )

    if (repeatedIssues.length > 0) {
      console.log(`\n💡 检测到 ${repeatedIssues.length} 个重复出现的测试错误:`)
      repeatedIssues.forEach(issue => {
        console.log(`   - ${issue.pattern} (出现 ${issue.occurrence} 次)`)
      })
      console.log('\n建议：运行 node scripts/hooks/check-patterns.js 查看详细建议')
    }

    console.log(`\n📖 相关规范请参考: CLAUDE.md`)

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 收集失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
