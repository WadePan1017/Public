<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '../../api/request'

interface Download {
  id: number
  title: string
  source: string
  media_type: string
  author: string
  width: number
  height: number
  duration: number
  file_size: number
  quality: string
  status: string
  created_at: string
}

const searchForm = reactive({
  keyword: '',
  source: '',
  media_type: '',
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const downloadList = ref<Download[]>([])
const loading = ref(false)

async function fetchDownloads() {
  loading.value = true
  try {
    const res: any = await request.get('/downloads', {
      params: {
        keyword: searchForm.keyword,
        source: searchForm.source,
        media_type: searchForm.media_type,
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
      },
    })
    if (res.success) {
      downloadList.value = res.data.list
      pagination.total = res.data.total
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.currentPage = 1
  fetchDownloads()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.source = ''
  searchForm.media_type = ''
  pagination.currentPage = 1
  fetchDownloads()
}

function handlePageChange(page: number) {
  pagination.currentPage = page
  fetchDownloads()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchDownloads()
}

// 新增对话框
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const addForm = reactive({
  title: '',
  source: 'bilibili',
  media_type: 'video',
  author: '',
  page_url: '',
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
}

function handleAdd() {
  addForm.title = ''
  addForm.source = 'bilibili'
  addForm.media_type = 'video'
  addForm.author = ''
  addForm.page_url = ''
  dialogVisible.value = true
}

async function submitAdd() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const res: any = await request.post('/downloads', {
        title: addForm.title,
        source: addForm.source,
        media_type: addForm.media_type,
        author: addForm.author,
        page_url: addForm.page_url,
        status: 'done',
      })
      if (res.success) {
        ElMessage.success('添加成功')
        dialogVisible.value = false
        fetchDownloads()
      }
    } catch {
      // handled by interceptor
    }
  })
}

async function handleDelete(row: Download) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res: any = await request.delete(`/downloads/${row.id}`)
    if (res.success) {
      ElMessage.success('已删除')
      fetchDownloads()
    }
  } catch {
    // cancelled
  }
}

function getSourceTag(source: string) {
  const map: Record<string, string> = {
    pexels: '',
    pixabay: 'success',
    ytdlp: 'warning',
    bilibili: 'danger',
    other: 'info',
  }
  return map[source] || 'info'
}

function getSourceLabel(source: string) {
  const map: Record<string, string> = {
    pexels: 'Pexels',
    pixabay: 'Pixabay',
    ytdlp: 'YouTube',
    bilibili: 'Bilibili',
    other: '其他',
  }
  return map[source] || source
}

function formatDuration(seconds: number) {
  if (!seconds) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

onMounted(() => {
  fetchDownloads()
})
</script>

<template>
  <div class="downloads-view">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索标题/作者"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="searchForm.source" placeholder="全部" clearable>
            <el-option label="Pexels" value="pexels" />
            <el-option label="Pixabay" value="pixabay" />
            <el-option label="YouTube" value="ytdlp" />
            <el-option label="Bilibili" value="bilibili" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.media_type" placeholder="全部" clearable>
            <el-option label="视频" value="video" />
            <el-option label="图片" value="image" />
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

    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>下载记录</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增记录
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="downloadList" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getSourceTag(row.source)" size="small">
              {{ getSourceLabel(row.source) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="media_type" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.media_type === 'video' ? '' : 'success'" size="small">
              {{ row.media_type === 'video' ? '视频' : '图片' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分辨率" width="120" align="center">
          <template #default="{ row }">
            {{ row.width && row.height ? `${row.width}x${row.height}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="时长" width="80" align="center">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.file_size) }}
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="120" show-overflow-tooltip />
        <el-table-column prop="created_at" label="下载时间" width="180" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 新增对话框 -->
    <el-dialog v-model="dialogVisible" title="新增下载记录" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="addForm" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="addForm.title" placeholder="视频/图片标题" />
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-select v-model="addForm.source">
            <el-option label="Bilibili" value="bilibili" />
            <el-option label="YouTube" value="ytdlp" />
            <el-option label="Pexels" value="pexels" />
            <el-option label="Pixabay" value="pixabay" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="addForm.media_type">
            <el-option label="视频" value="video" />
            <el-option label="图片" value="image" />
          </el-select>
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="addForm.author" placeholder="作者名（可选）" />
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="addForm.page_url" placeholder="原始页面链接（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.downloads-view {
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
