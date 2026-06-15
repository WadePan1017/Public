import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

export interface MenuItem {
  id: number
  parent_id: number
  name: string
  path: string
  icon: string
  sort_order: number
  visible: number
  children?: MenuItem[]
}

interface UserInfo {
  id: number
  username: string
  name: string
  email?: string
  phone?: string
  role: string
  status?: number
  created_at?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)
  const menus = ref<MenuItem[]>([])

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const res: any = await request.post('/auth/login', { username, password })
      if (res.success) {
        token.value = res.data.token
        userInfo.value = res.data.user
        menus.value = res.data.menus || []
        localStorage.setItem('token', res.data.token)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async function register(username: string, password: string, name: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res: any = await request.post('/auth/register', { username, password, name })
      if (res.success) {
        token.value = res.data.token
        userInfo.value = res.data.user
        menus.value = res.data.menus || []
        localStorage.setItem('token', res.data.token)
        return { success: true }
      }
      return { success: false, message: '注册失败' }
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || '注册失败' }
    }
  }

  async function fetchUserInfo() {
    try {
      const res: any = await request.get('/auth/me')
      if (res.success) {
        userInfo.value = res.data.user
        menus.value = res.data.menus || []
      }
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    menus.value = []
    localStorage.removeItem('token')
  }

  function isLoggedIn() {
    return !!token.value
  }

  return {
    token,
    userInfo,
    menus,
    login,
    register,
    fetchUserInfo,
    logout,
    isLoggedIn,
  }
})
