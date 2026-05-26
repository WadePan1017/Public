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
  } finally {
    loading.value = false
  }
}

async function createNote() {
  try {
    const res: any = await request.post('/notes', { title: '新笔记', content: '' })
    if (res.success) {
      noteList.value.unshift(res.data.note)
      currentNote.value = res.data.note
    }
  } catch {
    // handled by interceptor
  }
}

function selectNote(note: Note) {
  currentNote.value = note
}

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
      if (idx !== -1) {
        noteList.value[idx] = res.data.note
      }
    }
  } catch {
    // handled by interceptor
  }
}

async function deleteNote(note: Note) {
  try {
    await ElMessageBox.confirm('确定删除这条笔记？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res: any = await request.delete(`/notes/${note.id}`)
    if (res.success) {
      noteList.value = noteList.value.filter(n => n.id !== note.id)
      if (currentNote.value?.id === note.id) {
        currentNote.value = noteList.value[0] || null
      }
      ElMessage.success('已删除')
    }
  } catch {
    // cancelled
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 16).replace('T', ' ')
}

onMounted(() => {
  fetchNotes()
})
</script>

<template>
  <div class="notes-view">
    <el-card shadow="never" class="notes-card">
      <div class="notes-layout">
        <!-- 左侧列表 -->
        <div class="note-sidebar">
          <div class="sidebar-header">
            <span>笔记列表</span>
            <el-button type="primary" link @click="createNote">
              <el-icon><Plus /></el-icon> 新建
            </el-button>
          </div>

          <div v-loading="loading" class="note-list">
            <div v-if="noteList.length === 0 && !loading" class="empty">
              暂无笔记
            </div>
            <div
              v-for="note in noteList"
              :key="note.id"
              class="note-item"
              :class="{ active: currentNote?.id === note.id }"
              @click="selectNote(note)"
            >
              <div class="note-item-title">{{ note.title || '无标题' }}</div>
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
              <el-button
                type="danger"
                link
                @click="deleteNote(currentNote)"
              >
                删除
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
              最后更新：{{ formatDate(currentNote.updated_at) }}
              <span class="save-hint">（自动保存）</span>
            </div>
          </template>
          <div v-else class="no-note">
            <el-icon :size="48" color="#dcdfe6"><Notebook /></el-icon>
            <p>选择或创建一条笔记</p>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.notes-view {
  padding: 0;
}

.notes-card {
  height: calc(100vh - 140px);
}

.notes-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.notes-layout {
  display: flex;
  height: 100%;
}

.note-sidebar {
  width: 260px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
}

.note-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  text-align: center;
  padding: 40px 16px;
  color: #909399;
  font-size: 14px;
}

.note-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
}

.note-item:hover {
  background: #f5f7fa;
}

.note-item.active {
  background: #ecf5ff;
}

.note-item-title {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-date {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title-input {
  flex: 1;
}

.content-input {
  flex: 1;
}

.content-input :deep(.el-textarea__inner) {
  height: 100% !important;
  resize: none;
}

.editor-footer {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.save-hint {
  color: #c0c4cc;
}

.no-note {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.no-note p {
  margin-top: 12px;
  font-size: 14px;
}
</style>
