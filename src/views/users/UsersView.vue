<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '../../api/request'

interface User {
  id: number
  username: string
  name: string
  email: string
  phone: string
  role: string
  status: number
  created_at: string
}

interface Role {
  id: number
  name: string
  label: string
}

const searchForm = reactive({
  keyword: '',
  role: '',
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const userList = ref<User[]>([])
const roleList = ref<Role[]>([])
const loading = ref(false)

// 统计数据
const stats = reactive({
  total: 0,
  adminCount: 0,
  activeCount: 0,
  todayCount: 0,
})

function updateStats() {
  stats.total = pagination.total
  stats.adminCount = userList.value.filter(u => u.role === 'admin').length
  stats.activeCount = userList.value.filter(u => u.status === 1).length
  const today = new Date().toISOString().slice(0, 10)
  stats.todayCount = userList.value.filter(u => u.created_at?.startsWith(today)).length
}

// 从 API 加载角色列表
async function fetchRoles() {
  try {
    const res: any = await request.get('/roles')
    if (res.success) {
      roleList.value = res.data.list
    }
  } catch {
    // fallback
  }
}

function getRoleLabel(roleName: string): string {
  const role = roleList.value.find(r => r.name === roleName)
  return role?.label || roleName
}

function getRoleTag(roleName: string): string {
  const map: Record<string, string> = {
    admin: 'danger',
    editor: 'warning',
    user: '',
  }
  return map[roleName] || 'info'
}

async function fetchUsers() {
  loading.value = true
  try {
    const res: any = await request.get('/users', {
      params: {
        keyword: searchForm.keyword,
        role: searchForm.role,
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
      },
    })
    if (res.success) {
      userList.value = res.data.list
      pagination.total = res.data.total
      updateStats()
    }
  } finally {
    loading.value = false
  }
}

const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref<FormInstance>()
const userForm = reactive({
  username: '',
  password: '',
  name: '',
  email: '',
  phone: '',
  role: 'user',
  status: 1,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

let editingUserId: number | null = null

function handleSearch() {
  pagination.currentPage = 1
  fetchUsers()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.role = ''
  pagination.currentPage = 1
  fetchUsers()
}

function handleAdd() {
  dialogTitle.value = '新增用户'
  editingUserId = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(user: User) {
  dialogTitle.value = '编辑用户'
  editingUserId = user.id
  Object.assign(userForm, {
    username: user.username,
    password: '',
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  })
  dialogVisible.value = true
}

function handleDelete(user: User) {
  ElMessageBox.confirm(`确定要删除用户 "${user.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const res: any = await request.delete(`/users/${user.id}`)
      if (res.success) {
        ElMessage.success('删除成功')
        fetchUsers()
      }
    } catch {
      // error handled by interceptor
    }
  }).catch(() => {})
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (editingUserId) {
        const res: any = await request.put(`/users/${editingUserId}`, {
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          status: userForm.status,
        })
        if (res.success) {
          ElMessage.success('编辑成功')
          dialogVisible.value = false
          fetchUsers()
        }
      } else {
        const res: any = await request.post('/users', {
          username: userForm.username,
          password: userForm.password,
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          status: userForm.status,
        })
        if (res.success) {
          ElMessage.success('新增成功')
          dialogVisible.value = false
          fetchUsers()
        }
      }
    } catch {
      // error handled by interceptor
    }
  })
}

function resetForm() {
  userForm.username = ''
  userForm.password = ''
  userForm.name = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.role = 'user'
  userForm.status = 1
}

function handlePageChange(page: number) {
  pagination.currentPage = page
  fetchUsers()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchUsers()
}

onMounted(() => {
  fetchRoles()
  fetchUsers()
})
</script>

<template>
  <div class="users-view">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-blue">
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">用户总数</div>
          </div>
          <el-icon :size="36" class="stat-icon"><User /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-purple">
          <div class="stat-info">
            <div class="stat-value">{{ stats.adminCount }}</div>
            <div class="stat-label">管理员</div>
          </div>
          <el-icon :size="36" class="stat-icon"><UserFilled /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-green">
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeCount }}</div>
            <div class="stat-label">已启用</div>
          </div>
          <el-icon :size="36" class="stat-icon"><CircleCheck /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card stat-orange">
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayCount }}</div>
            <div class="stat-label">今日新增</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Plus /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索姓名/邮箱"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="全部" clearable>
            <el-option
              v-for="role in roleList"
              :key="role.name"
              :label="role.label"
              :value="role.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <span>用户列表</span>
          <el-button type="primary" @click="handleAdd" v-permission="'/users'">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="userList" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="role" label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role)">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[5, 10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="userForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item v-if="!editingUserId" label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!editingUserId" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option
              v-for="role in roleList"
              :key="role.name"
              :label="role.label"
              :value="role.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="userForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-view {
  padding: 0;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-blue { border-left: 4px solid #4f46e5; }
.stat-purple { border-left: 4px solid #7c3aed; }
.stat-green { border-left: 4px solid #10b981; }
.stat-orange { border-left: 4px solid #f59e0b; }

.stat-blue .stat-icon { color: #4f46e5; opacity: 0.2; }
.stat-purple .stat-icon { color: #7c3aed; opacity: 0.2; }
.stat-green .stat-icon { color: #10b981; opacity: 0.2; }
.stat-orange .stat-icon { color: #f59e0b; opacity: 0.2; }

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .stat-card { padding: 14px; }
  .stat-value { font-size: 22px; }
  .stat-icon { display: none; }
}

.search-card {
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
