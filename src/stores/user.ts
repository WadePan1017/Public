import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

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

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const res: any = await request.post('/auth/login', { username, password })
      if (res.success) {
        token.value = res.data.token
        userInfo.value = res.data.user
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
      }
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  function isLoggedIn() {
    return !!token.value
  }

  return {
    token,
    userInfo,
    login,
    register,
    fetchUserInfo,
    logout,
    isLoggedIn,
  }
})
