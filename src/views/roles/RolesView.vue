<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CheckboxValueType } from 'element-plus'
import request from '../../api/request'

interface Role {
  id: number
  name: string
  label: string
  description: string
  created_at: string
}

interface Menu {
  id: number
  parent_id: number
  name: string
  path: string
  icon: string
  sort_order: number
  visible: number
}

const roleList = ref<Role[]>([])
const menuList = ref<Menu[]>([])
const loading = ref(false)

const stats = computed(() => ({
  total: roleList.value.length,
  menuTotal: menuList.value.filter(m => m.parent_id !== 0 || m.path).length,
}))

// 表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({ id: 0, name: '', label: '', description: '' })

// 权限分配
const permDialogVisible = ref(false)
const currentRole = ref<Role | null>(null)
const checkedMenuIds = ref<number[]>([])
const menuTreeData = ref<any[]>([])

async function fetchRoles() {
  loading.value = true
  try {
    const res: any = await request.get('/roles')
    if (res.success) {
      roleList.value = res.data.list
    }
  } finally {
    loading.value = false
  }
}

async function fetchMenus() {
  const res: any = await request.get('/menus')
  if (res.success) {
    menuList.value = res.data.list
    menuTreeData.value = buildMenuTree(res.data.list)
  }
}

function buildMenuTree(list: Menu[]): any[] {
  const roots: any[] = []
  list.forEach(item => {
    if (item.parent_id === 0) {
      roots.push({
        id: item.id,
        label: item.name,
        children: list
          .filter(child => child.parent_id === item.id)
          .map(child => ({ id: child.id, label: child.name })),
      })
    }
  })
  return roots
}

function handleAdd() {
  isEdit.value = false
  form.value = { id: 0, name: '', label: '', description: '' }
  dialogVisible.value = true
}

function handleEdit(row: Role) {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name || !form.value.label) {
    ElMessage.warning('请填写角色标识和名称')
    return
  }
  try {
    if (isEdit.value) {
      await request.put(`/roles/${form.value.id}`, form.value)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/roles', form.value)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchRoles()
  } catch {
    // handled
  }
}

async function handleDelete(row: Role) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.label}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await request.delete(`/roles/${row.id}`)
    ElMessage.success('删除成功')
    fetchRoles()
  } catch {
    // cancelled
  }
}

// ---- 权限分配 ----
const allMenuIds = ref<number[]>([])

async function handlePermission(row: Role) {
  currentRole.value = row
  // 获取该角色已有的菜单权限
  const res: any = await request.get(`/roles/${row.id}/menus`)
  checkedMenuIds.value = res.success ? res.data.menuIds : []
  // 计算所有菜单 id
  allMenuIds.value = menuList.value.map(m => m.id)
  permDialogVisible.value = true
}

const isAllChecked = computed(() => {
  return allMenuIds.value.length > 0 && allMenuIds.value.every(id => checkedMenuIds.value.includes(id))
})

const isAllIndeterminate = computed(() => {
  const checkedCount = allMenuIds.value.filter(id => checkedMenuIds.value.includes(id)).length
  return checkedCount > 0 && checkedCount < allMenuIds.value.length
})

function handleSelectAll(checked: boolean) {
  if (checked) {
    checkedMenuIds.value = [...allMenuIds.value]
  } else {
    checkedMenuIds.value = []
  }
}

const checkedCount = computed(() => checkedMenuIds.value.length)

function handleCheckAll(parentId: number, checked: boolean) {
  const parent = menuList.value.find(m => m.id === parentId)
  if (!parent) return
  const children = menuList.value.filter(m => m.parent_id === parentId)

  if (checked) {
    // 添加父级
    if (!checkedMenuIds.value.includes(parentId)) {
      checkedMenuIds.value.push(parentId)
    }
    // 添加子级
    children.forEach(child => {
      if (!checkedMenuIds.value.includes(child.id)) {
        checkedMenuIds.value.push(child.id)
      }
    })
  } else {
    // 移除父级
    checkedMenuIds.value = checkedMenuIds.value.filter(id => id !== parentId)
    // 移除子级
    children.forEach(child => {
      checkedMenuIds.value = checkedMenuIds.value.filter(id => id !== child.id)
    })
  }
}

function isParentChecked(parentId: number): boolean {
  const children = menuList.value.filter(m => m.parent_id === parentId)
  return children.length > 0 && children.every(c => checkedMenuIds.value.includes(c.id))
}

function isParentIndeterminate(parentId: number): boolean {
  const children = menuList.value.filter(m => m.parent_id === parentId)
  const checkedCount = children.filter(c => checkedMenuIds.value.includes(c.id)).length
  return checkedCount > 0 && checkedCount < children.length
}

function onChildCheck(parentId: number, checked: boolean) {
  if (checked) {
    if (!checkedMenuIds.value.includes(parentId)) {
      checkedMenuIds.value.push(parentId)
    }
  }
}

async function handlePermSubmit() {
  if (!currentRole.value) return
  try {
    await request.put(`/roles/${currentRole.value.id}/permissions`, {
      menuIds: checkedMenuIds.value,
    })
    ElMessage.success('权限分配成功')
    permDialogVisible.value = false
  } catch {
    // handled
  }
}

onMounted(() => {
  fetchRoles()
  fetchMenus()
})
</script>

<template>
  <div class="roles-page">
    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-blue">
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">角色总数</div>
          </div>
          <el-icon :size="36" class="stat-icon"><UserFilled /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-green">
          <div class="stat-info">
            <div class="stat-value">{{ stats.menuTotal }}</div>
            <div class="stat-label">可分配菜单</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Menu /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-purple">
          <div class="stat-info">
            <div class="stat-value">{{ menuList.filter(m => m.parent_id === 0).length }}</div>
            <div class="stat-label">菜单目录</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Folder /></el-icon>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增角色
          </el-button>
        </div>
      </template>

      <el-table :data="roleList" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="角色标识" width="140">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="角色名称" width="140" />
        <el-table-column prop="description" label="描述" min-width="160" />
        <el-table-column prop="user_count" label="用户数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small" round>{{ row.user_count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link size="small" @click="handlePermission(row)">
              <el-icon><Lock /></el-icon>
              分配权限
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.name !== 'admin' && row.name !== 'user'"
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑角色 -->
    <el-dialog :title="isEdit ? '编辑角色' : '新增角色'" v-model="dialogVisible" width="480px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="角色标识">
          <el-input v-model="form.name" placeholder="英文标识，如 editor" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="form.label" placeholder="中文名称，如 编辑员" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="角色描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配权限 -->
    <el-dialog
      :title="`分配权限 - ${currentRole?.label || ''}`"
      v-model="permDialogVisible"
      width="560px"
      destroy-on-close
    >
      <div class="perm-content">
        <div class="perm-header">
          <el-checkbox
            :model-value="isAllChecked"
            :indeterminate="isAllIndeterminate"
            @change="(val: CheckboxValueType) => handleSelectAll(val as boolean)"
          >
            <strong>全选/全不选</strong>
          </el-checkbox>
          <span class="perm-count">已选 {{ checkedCount }} / {{ allMenuIds.length }} 项</span>
        </div>
        <div v-for="parent in menuTreeData" :key="parent.id" class="perm-group">
          <div class="perm-parent">
            <el-checkbox
              :model-value="isParentChecked(parent.id)"
              :indeterminate="isParentIndeterminate(parent.id)"
              @change="(val: CheckboxValueType) => handleCheckAll(parent.id, val as boolean)"
            >
              <strong>{{ parent.label }}</strong>
            </el-checkbox>
          </div>
          <div class="perm-children" v-if="parent.children.length">
            <el-checkbox
              v-for="child in parent.children"
              :key="child.id"
              :model-value="checkedMenuIds.includes(child.id)"
              @change="(val: CheckboxValueType) => {
                if (val) {
                  checkedMenuIds.push(child.id)
                  onChildCheck(parent.id, true)
                } else {
                  checkedMenuIds = checkedMenuIds.filter(id => id !== child.id)
                }
              }"
            >
              {{ child.label }}
            </el-checkbox>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePermSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
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
.stat-green { border-left: 4px solid #10b981; }
.stat-purple { border-left: 4px solid #7c3aed; }

.stat-blue .stat-icon { color: #4f46e5; opacity: 0.2; }
.stat-green .stat-icon { color: #10b981; opacity: 0.2; }
.stat-purple .stat-icon { color: #7c3aed; opacity: 0.2; }

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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.perm-content {
  max-height: 400px;
  overflow-y: auto;
}
.perm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 6px;
  border: 1px solid #d9ecff;
}
.perm-count {
  font-size: 13px;
  color: #409eff;
}
.perm-group {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}
.perm-parent {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.perm-children {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-left: 8px;
}
</style>
