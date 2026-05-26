import { defineStore } from 'pinia'
import { ref } from 'vue'

interface UserInfo {
  id: string
  username: string
  name: string
  avatar?: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)

  function login(username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 模拟登录验证
      if (username === 'admin' && password === '123456') {
        const mockToken = 'mock-token-' + Date.now()
        token.value = mockToken
        userInfo.value = {
          id: '1',
          username: 'admin',
          name: '管理员',
          role: 'admin',
        }
        localStorage.setItem('token', mockToken)
        resolve(true)
      } else {
        resolve(false)
      }
    })
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
    logout,
    isLoggedIn,
  }
})
