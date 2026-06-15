import type { Directive, App } from 'vue'
import { useUserStore } from '../stores/user'

/**
 * v-permission 指令：根据菜单权限控制元素可见性
 * 用法：v-permission="'/users'" 或 v-permission="['/users', '/roles']"
 */
export const permissionDirective: Directive = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const { menus, userInfo } = userStore

    // admin 拥有所有权限
    if (userInfo?.role === 'admin') return

    const requiredPaths = Array.isArray(binding.value) ? binding.value : [binding.value]
    const menuPaths = menus.map(m => m.path).filter(Boolean)
    const hasPermission = requiredPaths.some(p => menuPaths.includes(p))

    if (!hasPermission) {
      el.parentNode?.removeChild(el)
    }
  },
}

/**
 * 检查用户是否有指定路径的权限
 */
export function hasPermission(path: string | string[]): boolean {
  const userStore = useUserStore()
  if (userStore.userInfo?.role === 'admin') return true

  const paths = Array.isArray(path) ? path : [path]
  const menuPaths = userStore.menus.map(m => m.path).filter(Boolean)
  return paths.some(p => menuPaths.includes(p))
}

export function setupPermission(app: App) {
  app.directive('permission', permissionDirective)
}
