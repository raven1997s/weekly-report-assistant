#!/usr/bin/env node

/**
 * Hook 测试脚本
 * 每次 Stop hook 触发时记录时间戳
 */

const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = process.cwd()
const TEST_FILE = path.join(PROJECT_ROOT, '.claude/hook-test.log')

const timestamp = new Date().toISOString()
const message = `[${timestamp}] Hook was triggered!\n`

// 追加写入日志文件
fs.appendFileSync(TEST_FILE, message)

// 同时输出到控制台（虽然在 transcript 中可能看不到）
console.error('🔔 Hook triggered at:', timestamp)

process.exit(0)
