<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'

interface Menu {
  id: number
  parent_id: number
  name: string
  path: string
  icon: string
  sort_order: number
  visible: number
  children?: Menu[]
}

const menuList = ref<Menu[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const stats = computed(() => ({
  total: menuList.value.length,
  directories: menuList.value.filter(m => m.parent_id === 0 && !m.path).length,
  pages: menuList.value.filter(m => m.path).length,
  hidden: menuList.value.filter(m => !m.visible).length,
}))

const defaultForm = {
  id: 0,
  parent_id: 0,
  name: '',
  path: '',
  icon: '',
  sort_order: 0,
  visible: 1,
}
const form = ref({ ...defaultForm })

// 常用图标列表
const iconOptions = [
  'DataBoard', 'Setting', 'User', 'UserFilled', 'Menu', 'Document',
  'Download', 'Finished', 'Notebook', 'Folder', 'Home', 'Dashboard',
  'List', 'Edit', 'Delete', 'Search', 'Plus', 'Upload',
  'Lock', 'Unlock', 'Bell', 'Message', 'Star', 'Calendar',
  'Clock', 'Picture', 'VideoCamera', 'Headset', 'Monitor', 'Phone',
  'Location', 'Goods', 'ShoppingCart', 'Money', 'TrendCharts', 'PieChart',
  'Histogram', 'DataLine', 'Connection', 'SetUp', 'Tools', 'Cog',
]

const parentOptions = computed(() => {
  const options: { id: number; name: string }[] = [{ id: 0, name: '顶级菜单' }]
  menuList.value.forEach(m => {
    if (m.parent_id === 0) {
      options.push({ id: m.id, name: m.name })
    }
  })
  return options
})

// 构建树结构
function buildTree(list: Menu[]): Menu[] {
  const map = new Map<number, Menu>()
  const roots: Menu[] = []
  list.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })
  map.forEach(item => {
    if (item.parent_id === 0) {
      roots.push(item)
    } else {
      const parent = map.get(item.parent_id)
      if (parent) {
        parent.children!.push(item)
      }
    }
  })
  return roots
}

const treeData = computed(() => buildTree(menuList.value))

async function fetchMenus() {
  loading.value = true
  try {
    const res: any = await request.get('/menus')
    if (res.success) {
      menuList.value = res.data.list
    }
  } finally {
    loading.value = false
  }
}

function handleAdd(parentId = 0) {
  isEdit.value = false
  form.value = { ...defaultForm, parent_id: parentId }
  dialogVisible.value = true
}

function handleEdit(row: Menu) {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning('请输入菜单名称')
    return
  }
  try {
    if (isEdit.value) {
      await request.put(`/menus/${form.value.id}`, form.value)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/menus', form.value)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchMenus()
  } catch {
    // error handled by interceptor
  }
}

async function handleDelete(row: Menu) {
  try {
    await ElMessageBox.confirm(`确定删除菜单「${row.name}」吗？子菜单也会一并删除。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await request.delete(`/menus/${row.id}`)
    ElMessage.success('删除成功')
    fetchMenus()
  } catch {
    // cancelled
  }
}

onMounted(fetchMenus)
</script>

<template>
  <div class="menus-page">
    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card stat-blue">
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">菜单总数</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Menu /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-purple">
          <div class="stat-info">
            <div class="stat-value">{{ stats.directories }}</div>
            <div class="stat-label">目录</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Folder /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-green">
          <div class="stat-info">
            <div class="stat-value">{{ stats.pages }}</div>
            <div class="stat-label">页面菜单</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Document /></el-icon>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-gray">
          <div class="stat-info">
            <div class="stat-value">{{ stats.hidden }}</div>
            <div class="stat-label">已隐藏</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Hide /></el-icon>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>菜单管理</span>
          <el-button type="primary" @click="handleAdd(0)">
            <el-icon><Plus /></el-icon>
            新增菜单
          </el-button>
        </div>
      </template>

      <el-table :data="treeData" v-loading="loading" row-key="id" default-expand-all border stripe>
        <el-table-column prop="name" label="菜单名称" min-width="180">
          <template #default="{ row }">
            <div class="menu-name">
              <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" min-width="160">
          <template #default="{ row }">
            <el-tag v-if="row.path" type="info" size="small">{{ row.path }}</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="18"><component :is="row.icon" /></el-icon>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column prop="visible" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">
              {{ row.visible ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.parent_id === 0" type="primary" link size="small" @click="handleAdd(row.id)">
              添加子菜单
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="isEdit ? '编辑菜单' : '新增菜单'" v-model="dialogVisible" width="520px" destroy-on-close>
      <el-form :model="form" label-width="90px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parent_id" style="width: 100%">
            <el-option v-for="opt in parentOptions" :key="opt.id" :label="opt.name" :value="opt.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称">
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由路径">
          <el-input v-model="form.path" placeholder="如 /dashboard（目录类型可留空）" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" placeholder="选择图标" clearable filterable style="width: 100%">
            <el-option
              v-for="icon in iconOptions"
              :key="icon"
              :label="icon"
              :value="icon"
            >
              <div class="icon-option">
                <el-icon :size="16"><component :is="icon" /></el-icon>
                <span>{{ icon }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch v-model="form.visible" :active-value="1" :inactive-value="0" />
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
.stat-gray { border-left: 4px solid #94a3b8; }

.stat-blue .stat-icon { color: #4f46e5; opacity: 0.2; }
.stat-purple .stat-icon { color: #7c3aed; opacity: 0.2; }
.stat-green .stat-icon { color: #10b981; opacity: 0.2; }
.stat-gray .stat-icon { color: #94a3b8; opacity: 0.2; }

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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.menu-name {
  display: flex;
  align-items: center;
  gap: 6px;
}
.text-muted {
  color: #c0c4cc;
}

.icon-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
