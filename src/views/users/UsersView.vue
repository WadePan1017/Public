<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  status: boolean
  createTime: string
}

// 搜索表单
const searchForm = reactive({
  keyword: '',
  role: '',
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

// 模拟用户数据
const allUsers = ref<User[]>([
  { id: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138001', role: 'admin', status: true, createTime: '2024-01-15' },
  { id: 2, name: '李四', email: 'lisi@example.com', phone: '13800138002', role: 'user', status: true, createTime: '2024-02-20' },
  { id: 3, name: '王五', email: 'wangwu@example.com', phone: '13800138003', role: 'user', status: false, createTime: '2024-03-10' },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com', phone: '13800138004', role: 'editor', status: true, createTime: '2024-04-05' },
  { id: 5, name: '孙七', email: 'sunqi@example.com', phone: '13800138005', role: 'user', status: true, createTime: '2024-05-12' },
  { id: 6, name: '周八', email: 'zhouba@example.com', phone: '13800138006', role: 'user', status: true, createTime: '2024-06-18' },
  { id: 7, name: '吴九', email: 'wujiu@example.com', phone: '13800138007', role: 'editor', status: false, createTime: '2024-07-22' },
  { id: 8, name: '郑十', email: 'zhengshi@example.com', phone: '13800138008', role: 'user', status: true, createTime: '2024-08-30' },
])

// 过滤后的用户列表
const filteredUsers = computed(() => {
  let users = [...allUsers.value]

  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    users = users.filter(
      (u) => u.name.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword)
    )
  }

  if (searchForm.role) {
    users = users.filter((u) => u.role === searchForm.role)
  }

  pagination.total = users.length

  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return users.slice(start, end)
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref<FormInstance>()
const userForm = reactive<Omit<User, 'id' | 'createTime'>>({
  name: '',
  email: '',
  phone: '',
  role: 'user',
  status: true,
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
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

// 当前编辑的用户ID
let editingUserId: number | null = null

function handleSearch() {
  pagination.currentPage = 1
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.role = ''
  pagination.currentPage = 1
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
  }).then(() => {
    allUsers.value = allUsers.value.filter((u) => u.id !== user.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (!valid) return

    if (editingUserId) {
      // 编辑
      const index = allUsers.value.findIndex((u) => u.id === editingUserId)
      if (index !== -1) {
        allUsers.value[index] = {
          ...allUsers.value[index],
          ...userForm,
        }
      }
      ElMessage.success('编辑成功')
    } else {
      // 新增
      const newUser: User = {
        id: Date.now(),
        ...userForm,
        createTime: new Date().toISOString().split('T')[0],
      }
      allUsers.value.unshift(newUser)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
  })
}

function resetForm() {
  userForm.name = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.role = 'user'
  userForm.status = true
}

function handlePageChange(page: number) {
  pagination.currentPage = page
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.currentPage = 1
}

function getRoleTag(role: string) {
  const map: Record<string, string> = {
    admin: 'danger',
    editor: 'warning',
    user: '',
  }
  return map[role] || ''
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    admin: '管理员',
    editor: '编辑',
    user: '普通用户',
  }
  return map[role] || role
}
</script>

<template>
  <div class="users-view">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户名/邮箱"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="全部" clearable>
            <el-option label="管理员" value="admin" />
            <el-option label="编辑" value="editor" />
            <el-option label="普通用户" value="user" />
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
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="filteredUsers" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="用户名" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="role" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role)">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'info'">
              {{ row.status ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
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
        <el-form-item label="用户名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="编辑" value="editor" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="userForm.status" />
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
