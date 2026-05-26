<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '../../api/request'

// --- 文件上传 ---
const uploadDialogVisible = ref(false)
const uploadFiles = ref<File[]>([])
const uploadProgress = ref(0)
const uploading = ref(false)
const dragOver = ref(false)
const uploadCategory = ref('')
const uploadTags = ref('')

function openUpload() {
  uploadFiles.value = []
  uploadProgress.value = 0
  uploadCategory.value = ''
  uploadTags.value = ''
  uploadDialogVisible.value = true
}

function handleDragOver(e: DragEvent) { e.preventDefault(); dragOver.value = true }
function handleDragLeave() { dragOver.value = false }
function handleDrop(e: DragEvent) {
  e.preventDefault(); dragOver.value = false
  const files = e.dataTransfer?.files
  if (files) addFiles(Array.from(files))
}
function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
  input.value = ''
}
function addFiles(newFiles: File[]) {
  const allowed = /\.(mp4|avi|mov|mkv|webm|flv|wmv|mp3|wav|jpg|jpeg|png|gif|webp|bmp|svg)$/i
  for (const f of newFiles) {
    if (allowed.test(f.name)) uploadFiles.value.push(f)
  }
}
function removeUploadFile(index: number) { uploadFiles.value.splice(index, 1) }

async function submitUpload() {
  if (uploadFiles.value.length === 0) return
  uploading.value = true
  uploadProgress.value = 0

  for (let i = 0; i < uploadFiles.value.length; i++) {
    const formData = new FormData()
    formData.append('file', uploadFiles.value[i])
    if (uploadCategory.value) formData.append('category', uploadCategory.value)
    if (uploadTags.value) formData.append('tags', uploadTags.value)

    try {
      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.open('POST', '/api/uploads')
        const token = localStorage.getItem('token')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const fileProgress = e.loaded / e.total
            uploadProgress.value = Math.round(((i + fileProgress) / uploadFiles.value.length) * 100)
          }
        }
        xhr.onload = () => { resolve() }
        xhr.onerror = () => { reject(new Error('upload failed')) }
        xhr.send(formData)
      })
    } catch {
      ElMessage.error(`「${uploadFiles.value[i].name}」上传失败`)
    }
  }

  uploading.value = false
  uploadProgress.value = 100
  ElMessage.success(`已上传 ${uploadFiles.value.length} 个文件`)
  uploadDialogVisible.value = false
  fetchDownloads()
}

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
  tags: string
  category: string
  resolution: string
  error_message: string
  thumbnail_url: string
  file_path: string
  created_at: string
}

const searchForm = reactive({
  keyword: '',
  source: '',
  media_type: '',
  status: '',
  category: '',
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
})

const downloadList = ref<Download[]>([])
const loading = ref(false)
const selectedRows = ref<Download[]>([])

// --- helpers ---
function getStatusTag(status: string) {
  const map: Record<string, string> = { pending: 'info', downloading: 'warning', completed: 'success', failed: 'danger', queued: '' }
  return map[status] || 'info'
}
function getStatusLabel(status: string) {
  const map: Record<string, string> = { pending: '待处理', downloading: '下载中', completed: '已完成', failed: '失败', queued: '排队中' }
  return map[status] || status
}
function getSourceTag(source: string) {
  const map: Record<string, string> = { pexels: '', pixabay: 'success', ytdlp: 'warning', bilibili: 'danger', other: 'info' }
  return map[source] || 'info'
}
function getSourceLabel(source: string) {
  const map: Record<string, string> = { pexels: 'Pexels', pixabay: 'Pixabay', ytdlp: 'YouTube', bilibili: 'Bilibili', other: '其他' }
  return map[source] || source
}
function parseTags(tags: string): string[] {
  return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
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

// --- fetch ---
async function fetchDownloads() {
  loading.value = true
  try {
    const res: any = await request.get('/downloads', {
      params: {
        keyword: searchForm.keyword,
        source: searchForm.source,
        media_type: searchForm.media_type,
        status: searchForm.status,
        category: searchForm.category,
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

function handleSearch() { pagination.currentPage = 1; fetchDownloads() }
function handleReset() {
  searchForm.keyword = ''; searchForm.source = ''; searchForm.media_type = ''
  searchForm.status = ''; searchForm.category = ''
  pagination.currentPage = 1; fetchDownloads()
}
function handlePageChange(page: number) { pagination.currentPage = page; fetchDownloads() }
function handleSizeChange(size: number) { pagination.pageSize = size; pagination.currentPage = 1; fetchDownloads() }
function handleSelectionChange(rows: Download[]) { selectedRows.value = rows }

// --- dialog (add/edit) ---
const dialogVisible = ref(false)
const dialogTitle = ref('新增下载记录')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const editForm = reactive({
  title: '', source: 'bilibili', media_type: 'video', author: '', page_url: '',
  status: 'completed', category: '', tagsList: [] as string[],
  resolution: '', width: 0, height: 0, duration: 0, file_size: 0, quality: '1080p',
})
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref()

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
}

function resetForm() {
  editForm.title = ''; editForm.source = 'bilibili'; editForm.media_type = 'video'
  editForm.author = ''; editForm.page_url = ''; editForm.status = 'completed'
  editForm.category = ''; editForm.tagsList = []; editForm.resolution = ''
  editForm.width = 0; editForm.height = 0; editForm.duration = 0; editForm.file_size = 0; editForm.quality = '1080p'
}

function handleAdd() {
  resetForm(); editingId.value = null; dialogTitle.value = '新增下载记录'; dialogVisible.value = true
}

function handleEdit(row: Download) {
  editingId.value = row.id; dialogTitle.value = '编辑下载记录'
  editForm.title = row.title; editForm.source = row.source; editForm.media_type = row.media_type
  editForm.author = row.author; editForm.page_url = ''; editForm.status = row.status
  editForm.category = row.category; editForm.tagsList = parseTags(row.tags)
  editForm.resolution = row.resolution; editForm.width = row.width; editForm.height = row.height
  editForm.duration = row.duration; editForm.file_size = row.file_size; editForm.quality = row.quality || '1080p'
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    const payload = {
      title: editForm.title, source: editForm.source, media_type: editForm.media_type,
      author: editForm.author, page_url: editForm.page_url, status: editForm.status,
      category: editForm.category, tags: editForm.tagsList.join(','),
      resolution: editForm.resolution, width: editForm.width, height: editForm.height,
      duration: editForm.duration, file_size: editForm.file_size, quality: editForm.quality,
    }
    try {
      if (editingId.value) {
        const res: any = await request.put(`/downloads/${editingId.value}`, payload)
        if (res.success) { ElMessage.success('已更新'); dialogVisible.value = false; fetchDownloads() }
      } else {
        const res: any = await request.post('/downloads', payload)
        if (res.success) { ElMessage.success('添加成功'); dialogVisible.value = false; fetchDownloads() }
      }
    } catch { /* handled by interceptor */ }
  })
}

function showTagInput() { tagInputVisible.value = true; nextTick(() => tagInputRef.value?.focus()) }
function addTag() {
  const val = tagInputValue.value.trim()
  if (val && !editForm.tagsList.includes(val)) editForm.tagsList.push(val)
  tagInputVisible.value = false; tagInputValue.value = ''
}
function removeTag(tag: string) { editForm.tagsList = editForm.tagsList.filter(t => t !== tag) }

async function handleDelete(row: Download) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', { type: 'warning' })
    const res: any = await request.delete(`/downloads/${row.id}`)
    if (res.success) { ElMessage.success('已删除'); fetchDownloads() }
  } catch { /* cancelled */ }
}

// --- batch operations ---
async function handleBatchDelete() {
  const ids = selectedRows.value.map(r => r.id)
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条记录？`, '批量删除', { type: 'warning' })
    const res: any = await request.put('/downloads/batch/delete', { ids })
    if (res.success) { ElMessage.success(res.message); selectedRows.value = []; fetchDownloads() }
  } catch { /* cancelled */ }
}

const batchStatusVisible = ref(false)
const batchStatusValue = ref('completed')
async function openBatchStatus() { batchStatusValue.value = 'completed'; batchStatusVisible.value = true }
async function confirmBatchStatus() {
  const ids = selectedRows.value.map(r => r.id)
  const res: any = await request.put('/downloads/batch/status', { ids, status: batchStatusValue.value })
  if (res.success) { ElMessage.success(res.message); batchStatusVisible.value = false; selectedRows.value = []; fetchDownloads() }
}

const batchCategoryVisible = ref(false)
const batchCategoryValue = ref('')
async function openBatchCategory() { batchCategoryValue.value = ''; batchCategoryVisible.value = true }
async function confirmBatchCategory() {
  const ids = selectedRows.value.map(r => r.id)
  const res: any = await request.put('/downloads/batch/category', { ids, category: batchCategoryValue.value })
  if (res.success) { ElMessage.success(res.message); batchCategoryVisible.value = false; selectedRows.value = []; fetchDownloads() }
}

onMounted(() => { fetchDownloads() })
</script>

<template>
  <div class="downloads-view">
    <!-- 搜索区 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="搜索标题/作者" clearable @keyup.enter="handleSearch" />
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
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="下载中" value="downloading" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="排队中" value="queued" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable>
            <el-option v-for="c in ['风景','人物','产品','教程','动画','音乐','游戏','生活']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon> 搜索</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon> 重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>下载记录</span>
          <div class="header-actions">
            <template v-if="selectedRows.length > 0">

              <span class="selected-info">已选 {{ selectedRows.length }} 项</span>
              <el-button size="small" @click="openBatchStatus">批量改状态</el-button>
              <el-button size="small" @click="openBatchCategory">批量分类</el-button>
              <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
            </template>
            <el-button type="success" @click="openUpload"><el-icon><UploadFilled /></el-icon> 上传文件</el-button>
            <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon> 新增</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="downloadList" stripe border style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="65" align="center" />
        <el-table-column label="" width="70" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.thumbnail_url"
              :src="row.thumbnail_url"
              :preview-src-list="[row.thumbnail_url]"
              fit="cover"
              style="width: 48px; height: 36px; border-radius: 4px"
            />
            <el-icon v-else :size="24" color="#dcdfe6">
              <component :is="row.media_type === 'video' ? 'VideoCamera' : 'Picture'" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSourceTag(row.source)" size="small">{{ getSourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="media_type" label="类型" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.media_type === 'video' ? '' : 'success'" size="small">{{ row.media_type === 'video' ? '视频' : '图片' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
            <el-tooltip v-if="row.status === 'failed' && row.error_message" :content="row.error_message" placement="top">
              <el-icon color="#f56c6c" style="margin-left:4px;vertical-align:middle"><WarningFilled /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="80" align="center">
          <template #default="{ row }">{{ row.category || '-' }}</template>
        </el-table-column>
        <el-table-column label="标签" width="150">
          <template #default="{ row }">
            <template v-if="row.tags">
              <el-tag v-for="tag in parseTags(row.tags)" :key="tag" size="small" type="info" class="tag-item">{{ tag }}</el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="分辨率" width="100" align="center">
          <template #default="{ row }">{{ row.resolution || (row.width && row.height ? `${row.width}x${row.height}` : '-') }}</template>
        </el-table-column>
        <el-table-column label="时长" width="70" align="center">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="大小" width="90" align="center">
          <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="100" show-overflow-tooltip />
        <el-table-column prop="created_at" label="下载时间" width="160" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="editForm.title" placeholder="视频/图片标题" />
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-select v-model="editForm.source">
            <el-option label="Bilibili" value="bilibili" />
            <el-option label="YouTube" value="ytdlp" />
            <el-option label="Pexels" value="pexels" />
            <el-option label="Pixabay" value="pixabay" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editForm.media_type">
            <el-option label="视频" value="video" />
            <el-option label="图片" value="image" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status">
            <el-option label="待处理" value="pending" />
            <el-option label="下载中" value="downloading" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="排队中" value="queued" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" placeholder="选择分类" clearable>
            <el-option v-for="c in ['风景','人物','产品','教程','动画','音乐','游戏','生活']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <div class="tags-input-area">
            <el-tag v-for="tag in editForm.tagsList" :key="tag" closable @close="removeTag(tag)">{{ tag }}</el-tag>
            <el-input v-if="tagInputVisible" ref="tagInputRef" v-model="tagInputValue" size="small" style="width: 100px" @keyup.enter="addTag" @blur="addTag" />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </div>
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="editForm.author" placeholder="作者名（可选）" />
        </el-form-item>
        <el-form-item label="分辨率">
          <el-select v-model="editForm.resolution" placeholder="选择" clearable>
            <el-option label="2160p (4K)" value="2160p" />
            <el-option label="1440p (2K)" value="1440p" />
            <el-option label="1080p" value="1080p" />
            <el-option label="720p" value="720p" />
            <el-option label="480p" value="480p" />
          </el-select>
        </el-form-item>
        <el-form-item label="画质">
          <el-select v-model="editForm.quality">
            <el-option label="4K" value="4K" />
            <el-option label="1080p" value="1080p" />
            <el-option label="720p" value="720p" />
            <el-option label="480p" value="480p" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量改状态弹窗 -->
    <el-dialog v-model="batchStatusVisible" title="批量修改状态" width="400px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="状态">
          <el-select v-model="batchStatusValue">
            <el-option label="待处理" value="pending" />
            <el-option label="下载中" value="downloading" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="排队中" value="queued" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchStatusVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchStatus">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量分类弹窗 -->
    <el-dialog v-model="batchCategoryVisible" title="批量修改分类" width="400px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="分类">
          <el-select v-model="batchCategoryValue" placeholder="选择分类" clearable>
            <el-option v-for="c in ['风景','人物','产品','教程','动画','音乐','游戏','生活']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchCategoryVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 上传文件弹窗 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文件" width="560px" destroy-on-close>
      <div
        class="upload-zone"
        :class="{ 'upload-zone-active': dragOver }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <el-icon :size="48" color="#c0c4cc"><UploadFilled /></el-icon>
        <p>将文件拖拽到此处，或 <span class="upload-link">点击选择</span></p>
        <p class="upload-hint">支持 mp4 / avi / mov / mkv / jpg / png / gif 等格式，单文件最大 500MB</p>
        <input ref="fileInput" type="file" multiple accept="video/*,image/*" style="display:none" @change="handleFileSelect" />
      </div>

      <div v-if="uploadFiles.length > 0" class="upload-file-list">
        <div v-for="(file, i) in uploadFiles" :key="i" class="upload-file-item">
          <span class="upload-file-name">{{ file.name }}</span>
          <span class="upload-file-size">{{ formatFileSize(file.size) }}</span>
          <el-button type="danger" link @click="removeUploadFile(i)"><el-icon><Delete /></el-icon></el-button>
        </div>
      </div>

      <el-form v-if="uploadFiles.length > 0" label-width="60px" style="margin-top: 16px">
        <el-form-item label="分类">
          <el-select v-model="uploadCategory" placeholder="选择分类" clearable>
            <el-option v-for="c in ['风景','人物','产品','教程','动画','音乐','游戏','生活']" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="uploadTags" placeholder="多个标签用逗号分隔" />
        </el-form-item>
      </el-form>

      <el-progress v-if="uploading" :percentage="uploadProgress" :stroke-width="8" style="margin-top: 12px" />

      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="uploadFiles.length === 0 || uploading" :loading="uploading" @click="submitUpload">
          {{ uploading ? '上传中...' : '开始上传' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.downloads-view { padding: 0; }
.search-card { margin-bottom: 16px; }
.table-header {
  display: flex; align-items: center; justify-content: space-between;
}
.header-actions {
  display: flex; align-items: center; gap: 8px;
}
.selected-info {
  font-size: 13px; color: #909399;
}
.pagination-wrapper {
  margin-top: 20px; display: flex; justify-content: flex-end;
}
.tag-item { margin-right: 4px; }
.tags-input-area {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
}
.upload-zone {
  border: 2px dashed #dcdfe6; border-radius: 8px; padding: 40px 20px;
  text-align: center; cursor: pointer; transition: all 0.2s;
}
.upload-zone:hover, .upload-zone-active {
  border-color: #409eff; background: #ecf5ff;
}
.upload-link { color: #409eff; font-weight: 500; }
.upload-hint { font-size: 12px; color: #909399; margin-top: 8px; }
.upload-file-list { margin-top: 16px; max-height: 200px; overflow-y: auto; }
.upload-file-item {
  display: flex; align-items: center; gap: 12px; padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.upload-file-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-file-size { font-size: 12px; color: #909399; white-space: nowrap; }
</style>
