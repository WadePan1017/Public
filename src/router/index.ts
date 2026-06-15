import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/error/403.vue'),
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
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('../views/roles/RolesView.vue'),
        meta: { title: '角色管理', icon: 'UserFilled' },
      },
      {
        path: 'menus',
        name: 'Menus',
        component: () => import('../views/menus/MenusView.vue'),
        meta: { title: '菜单管理', icon: 'Menu' },
      },
      {
        path: 'downloads',
        name: 'Downloads',
        component: () => import('../views/downloads/DownloadsView.vue'),
        meta: { title: '下载记录', icon: 'Download' },
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
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/error/404.vue'),
    meta: { requiresAuth: false },
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
  } else {
    next()
  }
})

export default router
