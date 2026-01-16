// ========================================
// 智能周报助手 - 后端 API 调用工具
// ========================================

const API_BASE = import.meta.env.VITE_API_URL || '/api'

/**
 * 通用请求封装
 * @param {string} endpoint - API 端点
 * @param {Object} options - fetch 选项
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '请求失败')
    }

    return result.data
  } catch (error) {
    console.error(`[API] 请求失败 (${endpoint}):`, error)
    throw error
  }
}

// ============================================
// 工作记录 API
// ============================================

/**
 * 获取所有工作记录
 * @returns {Promise<Array>}
 */
export async function getRecords() {
  return await request('/records')
}

/**
 * 添加工作记录
 * @param {Object} record - 记录对象
 * @returns {Promise<Object>}
 */
export async function addRecord(record) {
  return await request('/records', {
    method: 'POST',
    body: JSON.stringify(record)
  })
}

/**
 * 更新工作记录
 * @param {string} id - 记录 ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateRecord(id, data) {
  return await request(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * 删除工作记录
 * @param {string} id - 记录 ID
 * @returns {Promise<void>}
 */
export async function deleteRecord(id) {
  return await request(`/records/${id}`, {
    method: 'DELETE'
  })
}

/**
 * 批量保存工作记录（使用单个 CRUD 操作）
 * 注意：此函数已弃用，批量替换接口（PUT /api/records/batch）已删除
 * 建议使用单个记录操作：addRecord, updateRecord, deleteRecord
 * @param {Array} records - 记录数组
 * @returns {Promise<Object>}
 * @deprecated 使用 addRecord/addRecord/updateRecord/deleteRecord 代替
 */
export async function saveRecords(records) {
  // 批量替换接口已删除，此函数不再使用
  throw new Error('saveRecords 已弃用，请使用单个记录操作（addRecord/updateRecord/deleteRecord）')
}

// ============================================
// 周报归档 API
// ============================================

/**
 * 获取周报数据（包含归档、下周计划、本周总结）
 * @returns {Promise<Object>}
 */
export async function getReports() {
  return await request('/reports')
}

/**
 * 保存周报数据
 * @param {Object} data - 包含 reports, currentPlans, currentReflections
 * @returns {Promise<void>}
 */
export async function saveReports(data) {
  return await request('/reports', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// ============================================
// 应用设置 API
// ============================================

/**
 * 获取所有设置
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  return await request('/settings')
}

/**
 * 保存所有设置
 * @param {Object} settings - 设置对象
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  return await request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
}

// ============================================
// 兼容旧接口（保持与 database.js 一致的函数名）
// ============================================

/**
 * 保存数据（兼容旧接口）
 * 注意：此函数仅用于 settings，records 和 reports 使用专用接口
 * @param {string} key - 存储键
 * @param {any} data - 数据
 * @returns {Promise<number>}
 * @throws {Error} 当 API 调用失败时抛出错误
 */
export async function saveToStorage(key, data) {
  const isRecords = key === 'records' || key === 'weekly_report_records'
  const isReports = key === 'reports' || key === 'weekly_reports'
  const isSettings = key === 'settings' || key === 'weekly_report_settings'

  if (isRecords) {
    // records 使用单个 CRUD 操作，不支持批量保存
    throw new Error('saveToStorage 不支持保存 records 数据，请使用 addRecord/updateRecord')
  } else if (isReports) {
    // PUT /api/reports 接口已删除，使用 saveCurrentState 保存编辑状态
    throw new Error('saveToStorage 不支持保存 reports 数据，请使用专用接口')
  } else if (isSettings) {
    await saveSettings(data)
    return Object.keys(data).length
  }
}

/**
 * 加载数据（兼容旧接口）
 * @param {string} key - 存储键
 * @returns {Promise<any>}
 */
export async function loadFromStorage(key) {
  const isRecords = key === 'records' || key === 'weekly_report_records'
  const isReports = key === 'reports' || key === 'weekly_reports'
  const isSettings = key === 'settings' || key === 'weekly_report_settings'

  if (isRecords) {
    return await getRecords()
  } else if (isReports) {
    return await getReports()
  } else if (isSettings) {
    return await getSettings()
  }
}

/**
 * 删除数据（兼容旧接口）
 * 注意：此函数已弃用，批量操作不再支持
 * @param {string} key - 存储键
 * @returns {Promise<void>}
 * @deprecated 不再支持批量删除，请逐条使用 deleteRecord/deleteReport
 */
export async function removeFromStorage(key) {
  // 批量删除不再支持
  throw new Error('removeFromStorage 已弃用，请使用单个删除操作')
}

// ============================================
// 数据导出和导入
// ============================================

/**
 * 导出所有数据
 * @returns {Promise<string>} JSON 字符串
 */
export async function exportAllData() {
  try {
    const [records, reports, settings] = await Promise.all([
      getRecords(),
      getReports(),
      getSettings()
    ])

    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        records,
        reports,
        settings
      }
    }, null, 2)
  } catch (error) {
    console.error('[API] 导出数据失败:', error)
    throw error
  }
}

/**
 * 导入所有数据
 * 注意：records 批量导入已弃用，需要逐条导入
 * @param {string} jsonData - JSON 字符串
 * @returns {Promise<boolean>}
 */
export async function importAllData(jsonData) {
  try {
    const imported = JSON.parse(jsonData)

    // 验证数据格式
    if (!imported.data || typeof imported.data !== 'object') {
      throw new Error('无效的数据格式')
    }

    const { records, reports, settings } = imported.data

    // 逐条导入 records
    if (records && Array.isArray(records)) {
      for (const record of records) {
        await addRecord(record)
      }
    }

    // 导入 reports（如果有）
    if (reports) {
      // reports 数据结构复杂，暂时跳过
      console.warn('[API] reports 导入暂不支持')
    }

    // 导入 settings
    if (settings) {
      await saveSettings(settings || {})
    }

    return true
  } catch (error) {
    console.error('[API] 导入数据失败:', error)
    return false
  }
}

/**
 * 保存当前编辑状态（本周总结）
 * 注意：下周计划已迁移到独立的 /api/plans 接口管理
 * @param {Object} currentReflections - 本周总结对象 { gains, losses }
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function saveCurrentState(currentReflections) {
  try {
    const response = await fetch(`${API_BASE}/current-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentReflections })
    })

    const result = await response.json()

    if (result.success) {
      console.log('[API] ✅ 当前编辑状态已保存到数据库')
      return { success: true, message: result.message }
    } else {
      console.error('[API] ❌ 保存当前编辑状态失败:', result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('[API] ❌ 保存当前编辑状态网络错误:', error)
    return { success: false, error: error.message }
  }
}
