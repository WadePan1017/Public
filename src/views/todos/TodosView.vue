<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

interface Todo {
  id: number
  title: string
  completed: number
  created_at: string
}

const todoList = ref<Todo[]>([])
const newTodo = ref('')
const loading = ref(false)
const editingId = ref<number | null>(null)
const editingTitle = ref('')
const filter = ref<'all' | 'active' | 'done'>('all')

const filteredTodos = computed(() => {
  if (filter.value === 'active') return todoList.value.filter(t => t.completed === 0)
  if (filter.value === 'done') return todoList.value.filter(t => t.completed === 1)
  return todoList.value
})

const totalCount = computed(() => todoList.value.length)
const completedCount = computed(() => todoList.value.filter(t => t.completed === 1).length)
const activeCount = computed(() => totalCount.value - completedCount.value)
const progress = computed(() => totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100))

async function fetchTodos() {
  loading.value = true
  try {
    const res: any = await request.get('/todos')
    if (res.success) todoList.value = res.data.list
  } finally { loading.value = false }
}

async function addTodo() {
  const title = newTodo.value.trim()
  if (!title) return
  try {
    const res: any = await request.post('/todos', { title })
    if (res.success) { todoList.value.unshift(res.data.todo); newTodo.value = '' }
  } catch { /* handled */ }
}

async function toggleTodo(todo: Todo) {
  try {
    const res: any = await request.put(`/todos/${todo.id}`, { completed: todo.completed === 0 ? 1 : 0 })
    if (res.success) {
      todo.completed = res.data.todo.completed
      todoList.value.sort((a, b) => a.completed - b.completed || b.id - a.id)
    }
  } catch { /* handled */ }
}

function startEdit(todo: Todo) { editingId.value = todo.id; editingTitle.value = todo.title }

async function saveEdit(todo: Todo) {
  const title = editingTitle.value.trim()
  if (!title) return
  try {
    const res: any = await request.put(`/todos/${todo.id}`, { title })
    if (res.success) { todo.title = res.data.todo.title; editingId.value = null }
  } catch { /* handled */ }
}

async function deleteTodo(todo: Todo) {
  try {
    const res: any = await request.delete(`/todos/${todo.id}`)
    if (res.success) { todoList.value = todoList.value.filter(t => t.id !== todo.id); ElMessage.success('已删除') }
  } catch { /* handled */ }
}

onMounted(fetchTodos)
</script>

<template>
  <div class="todos-page">
    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-blue">
          <div class="stat-info">
            <div class="stat-value">{{ totalCount }}</div>
            <div class="stat-label">全部待办</div>
          </div>
          <el-icon :size="36" class="stat-icon"><List /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-orange">
          <div class="stat-info">
            <div class="stat-value">{{ activeCount }}</div>
            <div class="stat-label">进行中</div>
          </div>
          <el-icon :size="36" class="stat-icon"><Clock /></el-icon>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card stat-green">
          <div class="stat-info">
            <div class="stat-value">{{ completedCount }}</div>
            <div class="stat-label">已完成</div>
          </div>
          <el-icon :size="36" class="stat-icon"><CircleCheck /></el-icon>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>待办事项</span>
          <div class="header-right">
            <el-progress
              :percentage="progress"
              :stroke-width="6"
              :show-text="false"
              style="width: 100px"
            />
            <span class="progress-text">{{ progress }}%</span>
          </div>
        </div>
      </template>

      <!-- 添加 -->
      <div class="add-row">
        <el-input
          v-model="newTodo"
          placeholder="添加新的待办事项..."
          size="large"
          clearable
          @keyup.enter="addTodo"
        >
          <template #prefix>
            <el-icon><Plus /></el-icon>
          </template>
          <template #append>
            <el-button type="primary" @click="addTodo">添加</el-button>
          </template>
        </el-input>
      </div>

      <!-- 筛选 -->
      <div class="filter-bar">
        <el-radio-group v-model="filter" size="small">
          <el-radio-button value="all">全部 ({{ totalCount }})</el-radio-button>
          <el-radio-button value="active">进行中 ({{ activeCount }})</el-radio-button>
          <el-radio-button value="done">已完成 ({{ completedCount }})</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 列表 -->
      <div v-loading="loading" class="todo-list">
        <el-empty v-if="filteredTodos.length === 0 && !loading" description="暂无待办事项" />

        <TransitionGroup name="list" tag="div">
          <div
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="todo-item"
            :class="{ done: todo.completed === 1 }"
          >
            <el-checkbox
              :model-value="todo.completed === 1"
              @change="toggleTodo(todo)"
            />

            <div v-if="editingId === todo.id" class="edit-input">
              <el-input
                v-model="editingTitle"
                size="small"
                @keyup.enter="saveEdit(todo)"
                @keyup.escape="editingId = null"
                autofocus
              />
            </div>
            <div v-else class="todo-content">
              <span class="todo-title" @dblclick="startEdit(todo)">{{ todo.title }}</span>
              <span class="todo-date">{{ todo.created_at?.slice(0, 10) }}</span>
            </div>

            <div class="todo-actions">
              <el-button
                v-if="editingId !== todo.id"
                type="primary" link size="small"
                @click="startEdit(todo)"
              >编辑</el-button>
              <el-button
                v-if="editingId === todo.id"
                type="success" link size="small"
                @click="saveEdit(todo)"
              >保存</el-button>
              <el-button type="danger" link size="small" @click="deleteTodo(todo)">删除</el-button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.todos-page { padding: 0; }

.stats-row { margin-bottom: 16px; }

.stat-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px; border-radius: var(--radius-lg);
  background: var(--bg-card); border: 1px solid var(--border);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.stat-blue { border-left: 4px solid #4f46e5; }
.stat-orange { border-left: 4px solid #f59e0b; }
.stat-green { border-left: 4px solid #10b981; }

.stat-blue .stat-icon { color: #4f46e5; opacity: 0.2; }
.stat-orange .stat-icon { color: #f59e0b; opacity: 0.2; }
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

.card-header {
  display: flex; align-items: center; justify-content: space-between;
}
.header-right {
  display: flex; align-items: center; gap: 8px;
}
.progress-text {
  font-size: 13px; font-weight: 600; color: var(--primary);
}

.add-row { margin-bottom: 16px; }

.filter-bar { margin-bottom: 16px; }

.todo-list { min-height: 100px; }

.todo-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 12px; border-radius: var(--radius);
  border: 1px solid transparent; margin-bottom: 4px;
  transition: all 0.2s;
}
.todo-item:hover {
  background: #f8fafc; border-color: var(--border);
}
.todo-item.done { opacity: 0.6; }
.todo-item.done .todo-title { text-decoration: line-through; color: var(--text-muted); }

.todo-content { flex: 1; display: flex; align-items: center; justify-content: space-between; }
.todo-title { font-size: 14px; cursor: pointer; user-select: none; }
.todo-date { font-size: 12px; color: var(--text-muted); }
.edit-input { flex: 1; }

.todo-actions {
  display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
}
.todo-item:hover .todo-actions { opacity: 1; }

/* 列表动画 */
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from { opacity: 0; transform: translateX(-20px); }
.list-leave-to { opacity: 0; transform: translateX(20px); }
.list-move { transition: transform 0.3s ease; }
</style>
