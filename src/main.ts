import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import { useUserStore } from './stores/user'
import { setupPermission } from './utils/permission'
import './style.css'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
setupPermission(app)

// 启动时恢复登录状态
const userStore = useUserStore()
if (userStore.isLoggedIn()) {
  userStore.fetchUserInfo()
}

app.mount('#app')
