#!/usr/bin/env node

/**
 * 代码模式检测脚本
 *
 * 功能：自动检测代码中的反模式和规范违规
 *
 * 检测模式：
 * 1. 表情符号使用（正则）
 * 2. 原生弹窗使用（正则）
 * 3. 响应式对象直接保存（AST）
 * 4. 硬删除操作（AST）
 * 5. API 响应格式（AST）
 * 6. 路由定义顺序（AST）
 * 7. Z-index 硬编码（正则）
 *
 * 使用方式：
 * node scripts/hooks/detect-patterns.js
 * node scripts/hooks/detect-patterns.js --file src/views/TestView.vue
 * node scripts/hooks/detect-patterns.js --auto
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { parse } from '@babel/parser'
import { spawn } from 'child_process'

// 使用 createRequire 导入 CommonJS 模块
const require = createRequire(import.meta.url)
const traverse = require('@babel/traverse').default || require('@babel/traverse')

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const ISSUES_FILE = join(PROJECT_ROOT, '.claude/issues.json')

// ============ 配置 ============

const CONFIG = {
  // 需要检测的目录
  checkDirs: ['src', 'server'],
  // 排除的目录
  excludeDirs: ['node_modules', 'dist', '.git', 'tests'],
  // 需要检测的文件扩展名
  extensions: ['.js', '.vue', '.cjs'],
  // 是否自动记录问题到 issues.json
  autoRecord: true
}

// ============ 检测器定义 ============

/**
 * 1. 表情符号检测（正则）
 */
function detectEmojiInTemplate(content, filePath) {
  // 只检测 Vue 文件的 template 部分
  if (!filePath.endsWith('.vue')) return []

  const violations = []
  const lines = content.split('\n')
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu

  let inTemplate = false
  let templateStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 检测 template 标签
    if (trimmed.includes('<template')) {
      inTemplate = true
      templateStart = i
    } else if (trimmed.includes('</template>')) {
      inTemplate = false
    }

    // 在 template 中检测表情符号
    if (inTemplate) {
      // 跳过注释行
      if (trimmed.startsWith('//')) continue

      const matches = Array.from(line.matchAll(emojiRegex))
      if (matches.length > 0) {
        violations.push({
          file: filePath,
          line: i + 1,
          column: matches[0].index + 1,
          pattern: '在 UI 中使用表情符号',
          severity: 'warning',
          suggestion: '使用 SVG 图标代替表情符号',
          example: line.trim()
        })
      }
    }
  }

  return violations
}

/**
 * 2. 原生弹窗检测（正则）
 */
function detectNativeAlerts(content, filePath) {
  const violations = []
  const lines = content.split('\n')

  // 检测 alert(, confirm(, prompt(
  // 排除 dialogStore 的情况
  const alertRegex = /(?<!dialogStore|\.)\b(alert|confirm|prompt)\s*\(/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 跳过注释
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue

    const matches = Array.from(line.matchAll(alertRegex))
    if (matches.length > 0) {
      matches.forEach(match => {
        violations.push({
          file: filePath,
          line: i + 1,
          column: match.index + 1,
          pattern: `使用原生 ${match[1]}()`,
          severity: 'error',
          suggestion: '使用自定义组件 ConfirmDialog/PromptDialog',
          example: line.trim()
        })
      })
    }
  }

  return violations
}

/**
 * 3. 响应式对象直接保存检测（AST）
 */
function detectReactiveObjectSave(content, filePath) {
  // 只检测 stores 目录
  if (!filePath.includes('stores/')) return []

  const violations = []

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    })

    traverse(ast, {
      CallExpression(path) {
        // 检测 saveToStorage 或 localStorage.setItem 调用
        const callee = path.node.callee

        if (callee.type === 'Identifier' &&
            (callee.name === 'saveToStorage' || callee.name === 'setItem')) {

          const args = path.node.arguments
          if (args.length >= 2) {
            const secondArg = args[1]

            // 检查是否是 .value 访问且没有包裹 JSON.parse(JSON.stringify())
            if (secondArg.type === 'MemberExpression' &&
                secondArg.property.name === 'value') {

              // 检查外层是否有 JSON.parse(JSON.stringify())
              let hasJsonParseWrapper = false
              let parent = path.parent

              while (parent) {
                if (parent.type === 'CallExpression') {
                  const parentCallee = parent.node.callee
                  if (parentCallee.type === 'Identifier' &&
                      parentCallee.name === 'JSON') {
                    // 检查是否是 JSON.parse(...)
                    const grandParent = parent.parent
                    if (grandParent && grandParent.type === 'MemberExpression' &&
                        grandParent.property.name === 'stringify') {
                      hasJsonParseWrapper = true
                      break
                    }
                  }
                }
                parent = parent.parent
              }

              if (!hasJsonParseWrapper) {
                violations.push({
                  file: filePath,
                  line: secondArg.loc.start.line,
                  column: secondArg.loc.start.column + 1,
                  pattern: '直接保存响应式对象',
                  severity: 'error',
                  suggestion: '使用 JSON.parse(JSON.stringify(data)) 净化',
                  example: content.split('\n')[secondArg.loc.start.line - 1].trim()
                })
              }
            }
          }
        }
      }
    })
  } catch (error) {
    // 解析失败，跳过此文件
    console.warn(`⚠️  无法解析 ${filePath}：${error.message}`)
  }

  return violations
}

/**
 * 4. 硬删除操作检测（AST）
 */
function detectHardDelete(content, filePath) {
  // 只检测 server/api.js
  if (!filePath.endsWith('server/api.js')) return []

  const violations = []

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    })

    // 收集所有路由定义
    const routes = []

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee

        // 检测 app.delete() 或 app.put() 等路由定义
        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'app' &&
            (callee.property.name === 'delete' || callee.property.name === 'put')) {

          const args = path.node.arguments
          if (args.length > 0 && args[0].type === 'StringLiteral') {
            const routePath = args[0].value
            routes.push({
              path: routePath,
              line: path.node.loc.start.line
            })
          }
        }
      }
    })

    // 检测 SQL 语句中的 DELETE FROM
    const lines = content.split('\n')
    const sqlDeleteRegex = /DELETE\s+FROM\s+(\w+)/gi

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // 跳过注释
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue

      const matches = Array.from(line.matchAll(sqlDeleteRegex))
      if (matches.length > 0) {
        matches.forEach(match => {
          const tableName = match[1]

          // 检查是否是永久删除端点（/:id/permanent）
          const isPermanentRoute = routes.some(r =>
            r.path.includes('/:id/permanent') ||
            r.path.includes('/:id/permanent')
          )

          // 检查是否有 WHERE deleted = 0 子句（软删除）
          const hasSoftDelete = lines
            .slice(i, Math.min(i + 5, lines.length))
            .join('\n')
            .includes('WHERE deleted = 0')

          // 如果不是永久删除端点且没有软删除子句，报告违规
          if (!isPermanentRoute && !hasSoftDelete) {
            violations.push({
              file: filePath,
              line: i + 1,
              column: match.index + 1,
              pattern: `硬删除操作：DELETE FROM ${tableName}`,
              severity: 'error',
              suggestion: '使用软删除：UPDATE ... SET deleted = 1 或添加 WHERE deleted = 0',
              example: line.trim()
            })
          }
        })
      }
    }
  } catch (error) {
    console.warn(`⚠️  无法解析 ${filePath}：${error.message}`)
  }

  return violations
}

/**
 * 5. API 响应格式检测（AST）
 */
function detectApiResponseFormat(content, filePath) {
  // 只检测 server/api.js
  if (!filePath.endsWith('server/api.js')) return []

  const violations = []

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    })

    traverse(ast, {
      CallExpression(path) {
        // 检测 res.json() 调用
        const callee = path.node.callee

        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'res' &&
            callee.property.name === 'json') {

          const args = path.node.arguments
          if (args.length > 0) {
            const firstArg = args[0]

            // 检查是否是对象表达式
            if (firstArg.type === 'ObjectExpression') {
              const hasSuccess = firstArg.properties.some(prop =>
                prop.key && prop.key.name === 'success'
              )

              if (!hasSuccess) {
                violations.push({
                  file: filePath,
                  line: path.node.loc.start.line,
                  column: path.node.loc.start.column + 1,
                  pattern: 'API 响应缺少 success 字段',
                  severity: 'warning',
                  suggestion: '使用 { success: true, data: ... } 或 { success: false, error: ... }',
                  example: content.split('\n')[path.node.loc.start.line - 1].trim()
                })
              }
            }
          }
        }
      }
    })
  } catch (error) {
    console.warn(`⚠️  无法解析 ${filePath}：${error.message}`)
  }

  return violations
}

/**
 * 6. 路由定义顺序检测（AST）
 */
function detectRouteOrder(content, filePath) {
  // 只检测 server/api.js
  if (!filePath.endsWith('server/api.js')) return []

  const violations = []

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    })

    // 收集所有路由定义
    const routes = []

    traverse(ast, {
      ExpressionStatement(path) {
        const expr = path.node.expression

        // 检测 app.METHOD(path, ...) 调用
        if (expr.type === 'CallExpression' &&
            expr.callee.type === 'MemberExpression' &&
            expr.callee.object.type === 'Identifier' &&
            expr.callee.object.name === 'app' &&
            ['get', 'post', 'put', 'delete', 'patch'].includes(expr.callee.property.name)) {

          const args = expr.arguments
          if (args.length > 0 && args[0].type === 'StringLiteral') {
            routes.push({
              method: expr.callee.property.name,
              path: args[0].value,
              line: expr.loc.start.line
            })
          }
        }
      }
    })

    // 检测路由顺序
    for (let i = 0; i < routes.length; i++) {
      const current = routes[i]

      // 检查是否有参数路由（如 /:id）在具体路由（如 /batch）之前
      if (current.path.includes('/:')) {
        for (let j = i + 1; j < routes.length; j++) {
          const next = routes[j]

          // 如果后续路由是具体路由且包含当前参数路由的前缀
          if (!next.path.includes('/:') && next.path.includes(current.path.split('/:')[0])) {
            violations.push({
              file: filePath,
              line: current.line,
              pattern: `路由定义顺序错误：${current.method.toUpperCase()} ${current.path} 在 ${next.method.toUpperCase()} ${next.path} 之前`,
              severity: 'error',
              suggestion: `将具体路由 ${next.path} 移到参数路由 ${current.path} 之前`,
              example: `// 当前：${current.path} (行 ${current.line}) 在 ${next.path} (行 ${next.line}) 之前`
            })
            break
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  无法解析 ${filePath}：${error.message}`)
  }

  return violations
}

/**
 * 7. Z-index 硬编码检测（正则）
 */
function detectHardcodedZIndex(content, filePath) {
  const violations = []
  const lines = content.split('\n')

  // 检测 z-index: 1040-1070 范围的硬编码值
  const zIndexRegex = /z-index:\s*(104[0-9]|105[0-9]|106[0-9]|107[0-9])/gi

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 跳过注释和 SCSS 变量引用
    if (trimmed.startsWith('//') || trimmed.startsWith('*') ||
        trimmed.includes('$z-')) continue

    const matches = Array.from(line.matchAll(zIndexRegex))
    if (matches.length > 0) {
      matches.forEach(match => {
        const zIndexValue = match[1]

        violations.push({
          file: filePath,
          line: i + 1,
          column: match.index + 1,
          pattern: `硬编码 z-index: ${zIndexValue}`,
          severity: 'warning',
          suggestion: '使用 SCSS 变量：$z-modal-backdrop, $z-modal, $z-popover, $z-tooltip',
          example: line.trim()
        })
      })
    }
  }

  return violations
}

// ============ 文件遍历 ============

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList

  const files = readdirSync(dir)

  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.some(excluded => filePath.includes(excluded))) {
        getAllFiles(filePath, fileList)
      }
    } else {
      if (CONFIG.extensions.some(ext => file.endsWith(ext))) {
        fileList.push(filePath)
      }
    }
  }

  return fileList
}

/**
 * 运行所有检测器
 */
function runAllDetectors(filePath, content) {
  const violations = []

  violations.push(...detectEmojiInTemplate(content, filePath))
  violations.push(...detectNativeAlerts(content, filePath))
  violations.push(...detectReactiveObjectSave(content, filePath))
  violations.push(...detectHardDelete(content, filePath))
  violations.push(...detectApiResponseFormat(content, filePath))
  violations.push(...detectRouteOrder(content, filePath))
  violations.push(...detectHardcodedZIndex(content, filePath))

  return violations
}

// ============ 主函数 ============

async function main() {
  try {
    console.log('🔍 开始检测代码模式...\n')

    // 获取要检测的文件
    let filesToCheck = []

    const args = process.argv.slice(2)
    let specificFile = null

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--file' && args[i + 1]) {
        specificFile = args[++i]
        break
      }
    }

    if (specificFile) {
      filesToCheck = [join(PROJECT_ROOT, specificFile)]
      console.log(`📁 检测文件: ${specificFile}\n`)
    } else {
      for (const dir of CONFIG.checkDirs) {
        const dirPath = join(PROJECT_ROOT, dir)
        if (existsSync(dirPath)) {
          const files = getAllFiles(dirPath)
          filesToCheck.push(...files)
        }
      }
      console.log(`📁 检测 ${filesToCheck.length} 个文件\n`)
    }

    // 运行检测
    const allViolations = []

    for (const filePath of filesToCheck) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const violations = runAllDetectors(filePath, content)

        if (violations.length > 0) {
          allViolations.push(...violations)
        }
      } catch (error) {
        console.warn(`⚠️  无法检测 ${filePath}：${error.message}`)
      }
    }

    // 显示结果
    if (allViolations.length === 0) {
      console.log('✅ 未发现代码模式违规')
      console.log('\n所有检测通过！')
      process.exit(0)
    }

    // 按严重程度分类
    const errors = allViolations.filter(v => v.severity === 'error')
    const warnings = allViolations.filter(v => v.severity === 'warning')

    console.log(`❌ 发现 ${allViolations.length} 个违规项：\n`)
    console.log(`   🔴 错误: ${errors.length}`)
    console.log(`   ⚠️  警告: ${warnings.length}\n`)

    // 按文件分组显示
    const byFile = {}
    allViolations.forEach(v => {
      if (!byFile[v.file]) {
        byFile[v.file] = []
      }
      byFile[v.file].push(v)
    })

    for (const [file, violations] of Object.entries(byFile)) {
      const relativePath = relative(PROJECT_ROOT, file)
      console.log(`📄 ${relativePath}`)

      violations.forEach(v => {
        const icon = v.severity === 'error' ? '🔴' : '⚠️ '
        console.log(`   ${icon} 行 ${v.line}: ${v.pattern}`)
        console.log(`      建议: ${v.suggestion}`)
      })
      console.log()
    }

    // 自动记录到 issues.json
    if (CONFIG.autoRecord && errors.length > 0) {
      console.log('💡 正在记录问题到 issues.json...\n')

      // 为每个唯一的错误类型创建一个问题记录
      const uniquePatterns = [...new Set(errors.map(e => e.pattern))]

      for (const pattern of uniquePatterns) {
        const example = errors.find(e => e.pattern === pattern && e.example)

        const args = [
          '--pattern', pattern,
          '--severity', 'error',
          '--type', 'code-review'
        ]

        if (example && example.file) {
          args.push('--file', example.file)
          args.push('--line', example.line.toString())
        }

        // 调用 collect-issues.js
        const collectProcess = spawn('node', ['scripts/hooks/collect-issues.js', ...args], {
          cwd: PROJECT_ROOT,
          stdio: 'inherit'
        })

        await new Promise((resolve, reject) => {
          collectProcess.on('close', resolve)
          collectProcess.on('error', reject)
        })
      }

      console.log('✅ 问题已记录到 issues.json')
    }

    console.log(`\n📖 相关规范请参考: CLAUDE.md`)

    // 如果有错误，返回非零退出码
    process.exit(errors.length > 0 ? 1 : 0)

  } catch (error) {
    console.error('❌ 检测失败：', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
