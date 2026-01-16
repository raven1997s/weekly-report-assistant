// ========================================
// 智能周报助手 - 路由配置
// ========================================

import { createRouter, createWebHistory } from 'vue-router'

// 视图组件懒加载
const HomeView = () => import('../views/HomeView.vue')
const ReportView = () => import('../views/ReportView.vue')
const HistoryView = () => import('../views/HistoryView.vue')
const DatabaseView = () => import('../views/DatabaseView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const RecycleBinView = () => import('../views/RecycleBinView.vue')

// 路由配置
const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
        meta: {
            title: '工作记录'
        }
    },
    {
        path: '/report',
        name: 'report',
        component: ReportView,
        meta: {
            title: '生成周报'
        }
    },
    {
        path: '/history',
        name: 'history',
        component: HistoryView,
        meta: {
            title: '历史周报'
        }
    },
    {
        path: '/database',
        name: 'database',
        component: DatabaseView,
        meta: {
            title: '数据库管理'
        }
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsView,
        meta: {
            title: '设置'
        }
    },
    {
        path: '/recycle-bin',
        name: 'recycle-bin',
        component: RecycleBinView,
        meta: {
            title: '回收站'
        }
    }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// 路由守卫 - 更新页面标题
router.beforeEach((to, from, next) => {
    document.title = `${to.meta.title || '智能周报助手'} - 智能周报助手`
    next()
})

export default router
