// ========================================
// 智能周报助手 - SQLite 数据库初始化
// ========================================

import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 数据库文件路径（存储在项目 data 目录下）
const DB_DIR = join(__dirname, '../data')
const DB_PATH = join(DB_DIR, 'app.db')

// 确保 data 目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
  console.log(`[DB] 创建数据目录: ${DB_DIR}`)
}

/**
 * 创建数据库连接
 * @returns {Promise<sqlite3.Database>}
 */
export function createDbConnection() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[DB] 连接失败:', err.message)
        reject(err)
      } else {
        console.log(`[DB] 已连接: ${DB_PATH}`)
        resolve(db)
      }
    })
  })
}

/**
 * 初始化数据库表结构
 */
export async function initDatabase() {
  const db = await createDbConnection()

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 工作记录表（含软删除字段）
      db.run(`
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          project TEXT,
          workType TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          deleted INTEGER DEFAULT 0,
          deletedAt TEXT
        )
      `, (err) => {
        if (err) console.error('[DB] 创建 records 表失败:', err)
        else console.log('[DB] records 表已就绪')
      })

      // 为 records 表创建软删除索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_records_deleted ON records(deleted)`, (err) => {
        if (err) console.error('[DB] 创建 records deleted 索引失败:', err)
      })

      // 周报归档表（含软删除字段）
      db.run(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          weekStart TEXT NOT NULL,
          weekEnd TEXT NOT NULL,
          weekLabel TEXT NOT NULL,
          markdown TEXT NOT NULL,
          plainText TEXT NOT NULL,
          content TEXT NOT NULL,
          records TEXT NOT NULL,
          plans TEXT NOT NULL,
          reflections TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          deleted INTEGER DEFAULT 0,
          deletedAt TEXT
        )
      `, (err) => {
        if (err) console.error('[DB] 创建 reports 表失败:', err)
        else console.log('[DB] reports 表已就绪')
      })

      // 为 reports 表创建软删除索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_reports_deleted ON reports(deleted)`, (err) => {
        if (err) console.error('[DB] 创建 reports deleted 索引失败:', err)
      })

      // 定时推送配置表（含软删除字段）
      db.run(`
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          day_of_week TEXT NOT NULL,
          type TEXT DEFAULT 'report',
          enabled INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted INTEGER DEFAULT 0,
          deletedAt TEXT,
          isSystemTask INTEGER DEFAULT 0
        )
      `, (err) => {
        if (err) console.error('[DB] 创建 scheduled_tasks 表失败:', err)
        else {
          console.log('[DB] scheduled_tasks 表已就绪')
          // 为 scheduled_tasks 表创建软删除索引
          db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_deleted ON scheduled_tasks(deleted)`, (err) => {
            if (err) console.error('[DB] 创建 scheduled_tasks deleted 索引失败:', err)
          })
          // 检查并添加 type 字段（兼容旧数据库）
          db.run(`ALTER TABLE scheduled_tasks ADD COLUMN type TEXT DEFAULT 'report'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('[DB] 添加 type 字段失败:', err)
            }
          })
          // 检查并添加 isSystemTask 字段（兼容旧数据库）
          db.run(`ALTER TABLE scheduled_tasks ADD COLUMN isSystemTask INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('[DB] 添加 isSystemTask 字段失败:', err)
            } else {
              // 更新 new_workweek_plan_convert 为系统任务
              db.run(`UPDATE scheduled_tasks SET isSystemTask = 1 WHERE id = 'new_workweek_plan_convert'`, (err) => {
                if (err) console.error('[DB] 更新系统任务标识失败:', err)
              })
            }
          })
        }
      })

      // 应用设置表（键值对）
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('[DB] 创建 settings 表失败:', err)
          reject(err)
        } else {
          console.log('[DB] settings 表已就绪')

          // 检查是否是首次运行（没有设置数据）
          db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
            if (err) {
              console.error('[DB] 检查设置失败:', err)
              resolve(db)
            } else if (row.count === 0) {
              // 首次运行，插入默认设置
              console.log('[DB] 首次运行，初始化默认设置...')
              initDefaultSettings(db).then(() => {
                console.log('[DB] ✅ 数据库初始化完成')
                resolve(db)
              }).catch((err) => {
                console.error('[DB] 初始化默认设置失败:', err)
                resolve(db) // 即使失败也继续，因为表已创建
              })
            } else {
              console.log('[DB] ✅ 数据库初始化完成')
              resolve(db)
            }
          })
        }
      })
    })
  })
}

/**
 * 初始化默认设置
 * @param {sqlite3.Database} db
 */
async function initDefaultSettings(db) {
  const defaultSettings = {
    projects: JSON.stringify([
      { id: '1', name: 'WMS', keywords: ['wms', '仓储', '库存', '出库', '入库'] },
      { id: '2', name: '支付中心', keywords: ['支付', 'pay', '微信支付', '支付宝', '银联'] },
      { id: '3', name: '用户中心', keywords: ['用户', 'user', '登录', '注册', '权限'] }
    ]),
    workTypes: JSON.stringify([
      { id: '1', name: '优化', keywords: ['优化', '改进', '提升', '重构'] },
      { id: '2', name: '支持', keywords: ['支持', '协助', '帮助', '处理'] },
      { id: '3', name: '协同', keywords: ['协同', '配合', '沟通', '对接'] },
      { id: '4', name: '创新', keywords: ['创新', '新功能', '探索'] },
      { id: '5', name: '学习', keywords: ['学习', '研究', '阅读', '培训'] },
      { id: '6', name: 'Bug修复', keywords: ['bug', '修复', '问题', 'fix'] },
      { id: '7', name: '需求开发', keywords: ['需求', '开发', '功能', '实现'] },
      { id: '8', name: '技术调研', keywords: ['调研', '技术', '方案', '评估'] },
      { id: '9', name: '文档编写', keywords: ['文档', '记录', 'doc'] }
    ]),
    theme: 'dark',
    dingtalk_webhookUrl: '',
    dingtalk_secret: '',
    dingtalk_enabled: 'false'
  }

  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')

    stmt.run(['projects', defaultSettings.projects], (err) => {
      if (err) console.error('[DB] 插入默认项目失败:', err)
    })

    stmt.run(['workTypes', defaultSettings.workTypes], (err) => {
      if (err) console.error('[DB] 插入默认工作类型失败:', err)
    })

    stmt.run(['theme', defaultSettings.theme], (err) => {
      if (err) console.error('[DB] 插入默认主题失败:', err)
    })

    stmt.run(['dingtalk_webhookUrl', defaultSettings.dingtalk_webhookUrl])
    stmt.run(['dingtalk_secret', defaultSettings.dingtalk_secret])
    stmt.run(['dingtalk_enabled', defaultSettings.dingtalk_enabled])

    stmt.finalize((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

/**
 * 执行查询（返回多条记录）
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数
 * @returns {Promise<Array>}
 */
export function queryAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

/**
 * 执行查询（返回单条记录）
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数
 * @returns {Promise<Object>}
 */
export function queryGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

/**
 * 执行更新/插入/删除
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数
 * @returns {Promise<Object>} { lastID, changes }
 */
export function queryRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

export { DB_PATH }
