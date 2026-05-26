import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/DashboardView.vue'),
        meta: { title: '数据概览', icon: 'DataBoard' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/users/UsersView.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['admin'] },
      },
      {
        path: 'downloads',
        name: 'Downloads',
        component: () => import('../views/downloads/DownloadsView.vue'),
        meta: { title: '下载记录', icon: 'Download', roles: ['admin'] },
      },
      {
        path: 'todos',
        name: 'Todos',
        component: () => import('../views/todos/TodosView.vue'),
        meta: { title: '待办事项', icon: 'Finished' },
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('../views/notes/NotesView.vue'),
        meta: { title: '记事本', icon: 'Notebook' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else if (to.meta.roles) {
    const userStore = useUserStore()
    const userRole = userStore.userInfo?.role || 'user'
    if ((to.meta.roles as string[]).includes(userRole)) {
      next()
    } else {
      next('/dashboard')
    }
  } else {
    next()
  }
})

export default router
