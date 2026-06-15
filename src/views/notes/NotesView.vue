<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'

interface Note {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

const noteList = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const loading = ref(false)

async function fetchNotes() {
  loading.value = true
  try {
    const res: any = await request.get('/notes')
    if (res.success) {
      noteList.value = res.data.list
      if (noteList.value.length > 0 && !currentNote.value) {
        currentNote.value = noteList.value[0]
      }
    }
  } finally { loading.value = false }
}

async function createNote() {
  try {
    const res: any = await request.post('/notes', { title: '新笔记', content: '' })
    if (res.success) {
      noteList.value.unshift(res.data.note)
      currentNote.value = res.data.note
    }
  } catch { /* handled */ }
}

function selectNote(note: Note) { currentNote.value = note }

let saveTimer: ReturnType<typeof setTimeout> | null = null
function onContentChange() {
  if (!currentNote.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveNote(), 1000)
}

async function saveNote() {
  if (!currentNote.value) return
  try {
    const res: any = await request.put(`/notes/${currentNote.value.id}`, {
      title: currentNote.value.title,
      content: currentNote.value.content,
    })
    if (res.success) {
      const idx = noteList.value.findIndex(n => n.id === currentNote.value!.id)
      if (idx !== -1) noteList.value[idx] = res.data.note
    }
  } catch { /* handled */ }
}

async function deleteNote(note: Note) {
  try {
    await ElMessageBox.confirm('确定删除这条笔记？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    const res: any = await request.delete(`/notes/${note.id}`)
    if (res.success) {
      noteList.value = noteList.value.filter(n => n.id !== note.id)
      if (currentNote.value?.id === note.id) currentNote.value = noteList.value[0] || null
      ElMessage.success('已删除')
    }
  } catch { /* cancelled */ }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 16).replace('T', ' ')
}

function getContentPreview(content: string): string {
  if (!content) return '暂无内容'
  return content.slice(0, 60) + (content.length > 60 ? '...' : '')
}

onMounted(fetchNotes)
</script>

<template>
  <div class="notes-page">
    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-blue">
          <div class="stat-info">
            <div class="stat-value">{{ noteList.length }}</div>
            <div class="stat-label">笔记总数</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Notebook /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-purple">
          <div class="stat-info">
            <div class="stat-value">{{ noteList.filter(n => n.content && n.content.length > 0).length }}</div>
            <div class="stat-label">有内容</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Document /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-green">
          <div class="stat-info">
            <div class="stat-value">{{ noteList.filter(n => n.updated_at?.startsWith(new Date().toISOString().slice(0, 10))).length }}</div>
            <div class="stat-label">今日更新</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Edit /></el-icon>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never" class="notes-card">
      <div class="notes-layout">
        <!-- 左侧列表 -->
        <div class="note-sidebar">
          <div class="sidebar-header">
            <span>笔记列表</span>
            <el-button type="primary" size="small" @click="createNote">
              <el-icon><Plus /></el-icon> 新建
            </el-button>
          </div>

          <div v-loading="loading" class="note-list">
            <el-empty v-if="noteList.length === 0 && !loading" description="暂无笔记" :image-size="60" />
            <div
              v-for="note in noteList"
              :key="note.id"
              class="note-item"
              :class="{ active: currentNote?.id === note.id }"
              @click="selectNote(note)"
            >
              <div class="note-item-title">{{ note.title || '无标题' }}</div>
              <div class="note-item-preview">{{ getContentPreview(note.content) }}</div>
              <div class="note-item-date">{{ formatDate(note.updated_at) }}</div>
            </div>
          </div>
        </div>

        <!-- 右侧编辑 -->
        <div class="note-editor">
          <template v-if="currentNote">
            <div class="editor-header">
              <el-input
                v-model="currentNote.title"
                placeholder="笔记标题"
                class="title-input"
                @input="onContentChange"
              />
              <el-button type="danger" link @click="deleteNote(currentNote)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
            <el-input
              v-model="currentNote.content"
              type="textarea"
              placeholder="开始写笔记..."
              class="content-input"
              @input="onContentChange"
            />
            <div class="editor-footer">
              <span>最后更新：{{ formatDate(currentNote.updated_at) }}</span>
              <span class="save-hint">自动保存</span>
            </div>
          </template>
          <div v-else class="no-note">
            <el-icon :size="64" color="#e2e8f0"><Notebook /></el-icon>
            <p>选择或创建一条笔记</p>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.notes-page { padding: 0; }

.stats-row { margin-bottom: 16px; }

.stat-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px; border-radius: var(--radius-lg);
  background: var(--bg-card); border: 1px solid var(--border);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.stat-blue { border-left: 4px solid #4f46e5; }
.stat-purple { border-left: 4px solid #7c3aed; }
.stat-green { border-left: 4px solid #10b981; }

.stat-blue .stat-icon { color: #4f46e5; opacity: 0.2; }
.stat-purple .stat-icon { color: #7c3aed; opacity: 0.2; }
.stat-green .stat-icon { color: #10b981; opacity: 0.2; }

.stat-value {
  font-size: 28px; font-weight: 700; color: var(--text-primary);
  line-height: 1; margin-bottom: 4px;
}
.stat-label { font-size: 13px; color: var(--text-secondary); }

@media (max-width: 767px) {
  .stat-card { padding: 14px; }
  .stat-value { font-size: 22px; }
  .stat-icon { display: none; }
}

.notes-card { height: calc(100vh - 240px); }
.notes-card :deep(.el-card__body) { height: 100%; padding: 0; }

.notes-layout { display: flex; height: 100%; }

.note-sidebar {
  width: 280px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
}

.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid var(--border);
  font-weight: 600; font-size: 15px;
}

.note-list { flex: 1; overflow-y: auto; }

.note-item {
  padding: 14px 16px; cursor: pointer;
  border-bottom: 1px solid #f1f5f9; transition: all 0.15s;
}
.note-item:hover { background: #f8fafc; }
.note-item.active { background: var(--primary-bg); border-left: 3px solid var(--primary); }

.note-item-title {
  font-size: 14px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.note-item-preview {
  font-size: 12px; color: var(--text-muted); margin-top: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.note-item-date { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

.note-editor { flex: 1; display: flex; flex-direction: column; padding: 20px; }

.editor-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
}
.title-input { flex: 1; }

.content-input { flex: 1; }
.content-input :deep(.el-textarea__inner) { height: 100% !important; resize: none; font-size: 14px; line-height: 1.8; }

.editor-footer {
  margin-top: 12px; font-size: 12px; color: var(--text-muted);
  display: flex; justify-content: space-between;
}
.save-hint { color: var(--primary); }

.no-note {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: var(--text-muted);
}
.no-note p { margin-top: 16px; font-size: 15px; }
</style>
