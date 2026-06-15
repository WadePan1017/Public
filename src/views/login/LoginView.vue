<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const mode = ref<'login' | 'register'>('login')

const loginForm = reactive({
  username: '',
  password: '',
  name: '',
})

const rules = computed<FormRules>(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' },
  ],
  name: mode.value === 'register' ? [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ] : [],
}))

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  loginForm.name = ''
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

function fillDemo() {
  loginForm.username = 'admin'
  loginForm.password = '123456'
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (mode.value === 'login') {
        const success = await userStore.login(loginForm.username, loginForm.password)
        if (success) {
          ElMessage.success('登录成功')
          router.push('/dashboard')
        } else {
          ElMessage.error('用户名或密码错误')
        }
      } else {
        const result = await userStore.register(loginForm.username, loginForm.password, loginForm.name)
        if (result.success) {
          ElMessage.success('注册成功')
          router.push('/dashboard')
        } else {
          ElMessage.error(result.message || '注册失败')
        }
      }
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <div class="login-page">
    <!-- 左侧装饰区 -->
    <div class="login-left">
      <div class="login-left-content">
        <div class="brand-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="white" fill-opacity="0.15"/>
            <path d="M14 24L22 32L34 16" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="brand-title">Admin Pro</h1>
        <p class="brand-desc">现代化后台管理系统</p>
        <div class="brand-features">
          <div class="feature-item">
            <el-icon><Lock /></el-icon>
            <span>菜单权限管理</span>
          </div>
          <div class="feature-item">
            <el-icon><UserFilled /></el-icon>
            <span>角色权限分配</span>
          </div>
          <div class="feature-item">
            <el-icon><DataBoard /></el-icon>
            <span>数据可视化</span>
          </div>
        </div>
      </div>
      <div class="login-left-bg"></div>
    </div>

    <!-- 右侧表单区 -->
    <div class="login-right">
      <div class="login-card">
        <div class="login-header">
          <h2>{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          <p>{{ mode === 'login' ? '请输入账号密码登录系统' : '填写信息完成注册' }}</p>
        </div>

        <el-form
          ref="formRef"
          :model="loginForm"
          :rules="rules"
          label-position="top"
          size="large"
          @keyup.enter="handleSubmit"
        >
          <el-form-item v-show="mode === 'register'" label="姓名" prop="name">
            <el-input
              v-model="loginForm.name"
              placeholder="请输入姓名"
              prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              class="login-btn"
              @click="handleSubmit"
            >
              {{ mode === 'login' ? '登 录' : '注 册' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <el-link type="primary" @click="toggleMode" :underline="false">
            {{ mode === 'login' ? '没有账号？立即注册' : '已有账号？去登录' }}
          </el-link>
        </div>

        <div v-if="mode === 'login'" class="demo-section">
          <el-divider>
            <span class="demo-label">演示账号</span>
          </el-divider>
          <div class="demo-account" @click="fillDemo">
            <div class="demo-avatar">
              <el-icon :size="20"><UserFilled /></el-icon>
            </div>
            <div class="demo-info">
              <span class="demo-name">管理员</span>
              <span class="demo-cred">admin / 123456</span>
            </div>
            <el-icon class="demo-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

/* 左侧 */
.login-left {
  flex: 0 0 45%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-left-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
  z-index: 0;
}

.login-left-bg::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 30px 30px;
}

.login-left-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  padding: 40px;
}

.brand-icon {
  margin-bottom: 24px;
}

.brand-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.brand-desc {
  font-size: 16px;
  opacity: 0.8;
  margin-bottom: 48px;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 240px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  font-size: 15px;
  transition: background 0.2s;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* 右侧 */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-header {
  margin-bottom: 36px;
}

.login-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.login-header p {
  font-size: 15px;
  color: var(--text-secondary);
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px !important;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}

/* 演示账号 */
.demo-section {
  margin-top: 16px;
}

.demo-label {
  font-size: 12px;
  color: var(--text-muted);
}

.demo-account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--primary-bg);
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-account:hover {
  background: #e0e7ff;
  border-color: var(--primary-light);
}

.demo-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.demo-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.demo-cred {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.demo-arrow {
  color: var(--text-muted);
}

/* 响应式 */
@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  .login-right {
    padding: 24px;
  }
}
</style>
