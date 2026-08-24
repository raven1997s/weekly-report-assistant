import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = process.cwd()
const read = path => readFileSync(resolve(projectRoot, path), 'utf8')

describe('数据库管理功能移除', () => {
  it('不再注册前端路由和侧边栏入口', () => {
    expect(read('src/router/index.js')).not.toContain("path: '/database'")
    expect(read('src/components/layout/AppSidebar.vue')).not.toContain('数据库管理')
  })

  it('不再注册数据库管理接口', () => {
    const apiSource = read('server/api.js')

    expect(apiSource).not.toContain("app.get('/api/database/tables'")
    expect(apiSource).not.toContain("app.get('/api/database/table/:tableName'")
  })

  it('删除数据库管理专用页面和组件', () => {
    const files = [
      'src/views/DatabaseView.vue',
      'src/components/CellContent.vue',
      'src/components/DataTable.vue',
      'src/components/FilterPanel.vue',
      'src/components/JsonNode.vue',
      'src/components/JsonViewer.vue'
    ]

    files.forEach(file => {
      expect(existsSync(resolve(projectRoot, file))).toBe(false)
    })
  })
})
