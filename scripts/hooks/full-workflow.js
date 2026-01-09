#!/usr/bin/env node

/**
 * 完整工作流程脚本
 *
 * 功能：整合所有阶段的功能，提供一键式规范生成流程
 *
 * 使用方式：
 * node scripts/hooks/full-workflow.js --auto           # 完整流程（检测+生成+更新）
 * node scripts/hooks/full-workflow.js --detect         # 只检测问题
 * node scripts/hooks/full-workflow.js --generate       # 检测+生成草稿（不更新）
 * node scripts/hooks/full-workflow.js --suggest        # 检测+分析建议
 * node scripts/hooks/full-workflow.js --test-errors    # 收集测试错误
 * node scripts/hooks/full-workflow.js --git-analysis   # Git 历史分析
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 配置 ============

const CONFIG = {
  // 检测阈值
  threshold: 3,
  // 是否自动确认
  autoConfirm: false,
  // 是否跳过建议
  skipSuggestions: false
}

// ============ 命令执行 ============

/**
 * 执行命令
 */
function executeCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    })

    let output = ''

    if (options.silent) {
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      process.stderr.on('data', (data) => {
        output += data.toString()
      })
    }

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`命令退出码: ${code}`))
      }
    })

    process.on('error', reject)
  })
}

/**
 * 执行检测
 */
async function runDetect() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 阶段 1: 检测代码模式')
  console.log('='.repeat(70))

  try {
    await executeCommand('node', ['scripts/hooks/detect-patterns.js'], { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  检测阶段出错:', error.message)
    return false
  }
}

/**
 * 执行测试错误收集
 */
async function runCollectTestErrors() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 阶段 1: 收集测试错误')
  console.log('='.repeat(70))

  try {
    await executeCommand('node', ['scripts/hooks/collect-errors.js'], { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  测试错误收集出错:', error.message)
    return false
  }
}

/**
 * 执行 Git 历史分析
 */
async function runGitAnalysis() {
  console.log('\n' + '='.repeat(70))
  console.log('📜 阶段 1: Git 历史分析')
  console.log('='.repeat(70))

  try {
    await executeCommand('node', ['scripts/hooks/analyze-git-history.js'], { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  Git 历史分析出错:', error.message)
    return false
  }
}

/**
 * 执行规范生成
 */
async function runGenerate() {
  console.log('\n' + '='.repeat(70))
  console.log('📝 阶段 2: 生成规范草稿')
  console.log('='.repeat(70))

  try {
    await executeCommand('node', [
      'scripts/hooks/generate-rule.js',
      '--all',
      '--threshold',
      CONFIG.threshold.toString(),
      '--output'
    ], { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  规范生成出错:', error.message)
    return false
  }
}

/**
 * 执行建议分析
 */
async function runSuggest() {
  console.log('\n' + '='.repeat(70))
  console.log('💡 阶段 2: 智能建议分析')
  console.log('='.repeat(70))

  try {
    await executeCommand('node', [
      'scripts/hooks/suggest-rules.js',
      '--threshold',
      CONFIG.threshold.toString()
    ], { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  建议分析出错:', error.message)
    return false
  }
}

/**
 * 执行文档更新
 */
async function runUpdate() {
  console.log('\n' + '='.repeat(70))
  console.log('📄 阶段 3: 更新 CLAUDE.md')
  console.log('='.repeat(70))

  try {
    const args = ['scripts/hooks/update-claude-md.js', '--file', '.claude/generated-rules/all-rules.md']

    if (CONFIG.autoConfirm) {
      args.push('--no-confirm')
    }

    await executeCommand('node', args, { silent: false })
    return true
  } catch (error) {
    console.error('⚠️  文档更新出错:', error.message)
    return false
  }
}

/**
 * 显示统计信息
 */
function showStats() {
  if (!existsSync(ISSUES_FILE)) {
    console.log('\n📊 暂无问题记录')
    return
  }

  const content = readFileSync(ISSUES_FILE, 'utf-8')
  const issues = JSON.parse(content)

  console.log('\n' + '='.repeat(70))
  console.log('📊 问题统计')
  console.log('='.repeat(70))

  console.log(`\n总问题数: ${issues.stats.totalIssues}`)
  console.log(`已解决: ${issues.stats.resolvedIssues}`)
  console.log(`待处理: ${issues.stats.pendingIssues}`)

  if (issues.issues.length > 0) {
    console.log(`\n按分类统计:`)
    for (const [category, count] of Object.entries(issues.stats.categories)) {
      if (count > 0) {
        console.log(`   ${category}: ${count}`)
      }
    }

    console.log(`\n按类型统计:`)
    const typeStats = {}
    for (const issue of issues.issues) {
      if (!typeStats[issue.type]) {
        typeStats[issue.type] = 0
      }
      typeStats[issue.type]++
    }

    for (const [type, count] of Object.entries(typeStats)) {
      console.log(`   ${type}: ${count}`)
    }

    // 达到阈值的问题
    const thresholdIssues = issues.issues.filter(i => i.occurrence >= CONFIG.threshold)
    if (thresholdIssues.length > 0) {
      console.log(`\n达到阈值 (${CONFIG.threshold} 次) 的问题: ${thresholdIssues.length}`)
      thresholdIssues.forEach(issue => {
        console.log(`   • ${issue.pattern} (${issue.occurrence} 次)`)
      })
    }
  }

  console.log('\n' + '='.repeat(70))
}

/**
 * 显示菜单
 */
function showMenu() {
  console.log('\n' + '='.repeat(70))
  console.log('🤖 智能学习型 Hooks 系统 - 完整工作流程')
  console.log('='.repeat(70))

  console.log(`
请选择工作流程:

  1. 完整流程 (检测 → 生成 → 更新)
  2. 只检测问题
  3. 检测 + 生成草稿
  4. 检测 + 智能建议
  5. 收集测试错误
  6. Git 历史分析
  7. 查看统计信息
  0. 退出

选项: `)
}

/**
 * 用户选择
 */
async function getUserChoice() {
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * 交互式流程
 */
async function interactiveWorkflow() {
  while (true) {
    showMenu()
    const choice = await getUserChoice()

    switch (choice) {
      case '1':
        await runDetect()
        if (!CONFIG.skipSuggestions) {
          await runSuggest()
        }
        await runGenerate()
        await runUpdate()
        showStats()
        break

      case '2':
        await runDetect()
        showStats()
        break

      case '3':
        await runDetect()
        await runGenerate()
        showStats()
        break

      case '4':
        await runDetect()
        await runSuggest()
        showStats()
        break

      case '5':
        await runCollectTestErrors()
        showStats()
        break

      case '6':
        await runGitAnalysis()
        showStats()
        break

      case '7':
        showStats()
        break

      case '0':
        console.log('\n👋 再见！')
        process.exit(0)

      default:
        console.log('\n❌ 无效选项，请重试')
    }

    // 询问是否继续
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const continueChoice = await new Promise((resolve) => {
      rl.question('\n是否继续？ [y/N] ', (answer) => {
        rl.close()
        resolve(answer.toLowerCase())
      })
    })

    if (continueChoice !== 'y' && continueChoice !== 'yes') {
      console.log('\n👋 再见！')
      process.exit(0)
    }
  }
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🚀 智能学习型 Hooks 系统')
    console.log('='.repeat(70))

    // 解析参数
    const args = process.argv.slice(2)
    let mode = null
    let isInteractive = false

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--auto') {
        mode = 'auto'
      } else if (args[i] === '--detect') {
        mode = 'detect'
      } else if (args[i] === '--generate') {
        mode = 'generate'
      } else if (args[i] === '--suggest') {
        mode = 'suggest'
      } else if (args[i] === '--test-errors') {
        mode = 'test-errors'
      } else if (args[i] === '--git-analysis') {
        mode = 'git-analysis'
      } else if (args[i] === '--interactive' || args[i] === '-i') {
        isInteractive = true
      } else if (args[i] === '--threshold' && args[i + 1]) {
        CONFIG.threshold = parseInt(args[++i])
      } else if (args[i] === '--auto-confirm') {
        CONFIG.autoConfirm = true
      } else if (args[i] === '--skip-suggestions') {
        CONFIG.skipSuggestions = true
      }
    }

    // 如果没有指定模式，进入交互模式
    if (!mode && !isInteractive && args.length === 0) {
      isInteractive = true
    }

    if (isInteractive) {
      await interactiveWorkflow()
      return
    }

    // 执行对应的工作流程
    switch (mode) {
      case 'auto':
        console.log('\n🔄 执行完整工作流程...\n')
        await runDetect()
        if (!CONFIG.skipSuggestions) {
          await runSuggest()
        }
        await runGenerate()
        await runUpdate()
        showStats()

        console.log('\n✅ 完整工作流程执行完成！')
        console.log('\n📋 后续步骤:')
        console.log('   1. 检查生成的规范: .claude/generated-rules/')
        console.log('   2. 检查更新的文档: CLAUDE.md')
        console.log('   3. 提交变更: git add . && git commit -m "docs: 更新规范"')
        break

      case 'detect':
        await runDetect()
        showStats()
        break

      case 'generate':
        await runDetect()
        await runGenerate()
        showStats()
        console.log('\n💡 下一步: 运行 node scripts/hooks/update-claude-md.js 更新文档')
        break

      case 'suggest':
        await runDetect()
        await runSuggest()
        showStats()
        break

      case 'test-errors':
        await runCollectTestErrors()
        showStats()
        break

      case 'git-analysis':
        await runGitAnalysis()
        showStats()
        break

      default:
        console.log('\n使用方式:')
        console.log('  node scripts/hooks/full-workflow.js --auto           # 完整流程')
        console.log('  node scripts/hooks/full-workflow.js --detect         # 只检测')
        console.log('  node scripts/hooks/full-workflow.js --generate       # 检测+生成')
        console.log('  node scripts/hooks/full-workflow.js --suggest        # 检测+建议')
        console.log('  node scripts/hooks/full-workflow.js --test-errors    # 测试错误')
        console.log('  node scripts/hooks/full-workflow.js --git-analysis   # Git分析')
        console.log('  node scripts/hooks/full-workflow.js --interactive    # 交互模式')
        console.log('\n选项:')
        console.log('  --threshold <n>       设置阈值 (默认: 3)')
        console.log('  --auto-confirm       自动确认所有提示')
        console.log('  --skip-suggestions   跳过建议分析')
        process.exit(1)
    }

    process.exit(0)

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
