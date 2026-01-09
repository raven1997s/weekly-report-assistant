// ========================================
// 智能周报助手 - 软删除功能数据库迁移
// ========================================
//
// 功能：为 records、reports、scheduled_tasks 表添加软删除字段
// 运行方式：node server/migrations/add_soft_delete.js
// ========================================

const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '../../data/app.db')
const db = new sqlite3.Database(dbPath)

console.log('🚀 开始数据库迁移：添加软删除字段...')
console.log(`📁 数据库路径: ${dbPath}`)
console.log('')

const migrations = [
  // records 表迁移
  'ALTER TABLE records ADD COLUMN deleted INTEGER DEFAULT 0',
  'ALTER TABLE records ADD COLUMN deletedAt TEXT',
  'CREATE INDEX IF NOT EXISTS idx_records_deleted ON records(deleted)',

  // reports 表迁移
  'ALTER TABLE reports ADD COLUMN deleted INTEGER DEFAULT 0',
  'ALTER TABLE reports ADD COLUMN deletedAt TEXT',
  'CREATE INDEX IF NOT EXISTS idx_reports_deleted ON reports(deleted)',

  // scheduled_tasks 表迁移
  'ALTER TABLE scheduled_tasks ADD COLUMN deleted INTEGER DEFAULT 0',
  'ALTER TABLE scheduled_tasks ADD COLUMN deletedAt TEXT',
  'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_deleted ON scheduled_tasks(deleted)',
]

let successCount = 0
let skippedCount = 0

db.serialize(() => {
  migrations.forEach((sql, index) => {
    db.run(sql, function(err) {
      const migrationNum = index + 1

      if (err) {
        // 忽略"列已存在"错误
        if (err.message.includes('duplicate column name')) {
          console.log(`⏭️  迁移 ${migrationNum}: 列已存在，跳过`)
          skippedCount++
        } else {
          console.error(`❌ 迁移 ${migrationNum} 失败:`, err.message)
        }
      } else {
        const preview = sql.length > 50 ? sql.substring(0, 50) + '...' : sql
        console.log(`✅ 迁移 ${migrationNum} 成功: ${preview}`)
        successCount++
      }

      // 最后一个迁移完成后关闭数据库
      if (index === migrations.length - 1) {
        db.close((err) => {
          if (err) {
            console.error('❌ 关闭数据库失败:', err.message)
          } else {
            console.log('')
            console.log('🎉 数据库迁移完成！')
            console.log(`   成功: ${successCount} 项`)
            console.log(`   跳过: ${skippedCount} 项`)
            console.log('')
            console.log('📝 下一步：')
            console.log('   1. 重启后端服务')
            console.log('   2. 运行前端应用')
            console.log('   3. 测试软删除功能')
          }
        })
      }
    })
  })
})
