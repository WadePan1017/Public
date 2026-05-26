<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

async function fetchTodos() {
  loading.value = true
  try {
    const res: any = await request.get('/todos')
    if (res.success) {
      todoList.value = res.data.list
    }
  } finally {
    loading.value = false
  }
}

async function addTodo() {
  const title = newTodo.value.trim()
  if (!title) return

  try {
    const res: any = await request.post('/todos', { title })
    if (res.success) {
      todoList.value.unshift(res.data.todo)
      newTodo.value = ''
    }
  } catch {
    // handled by interceptor
  }
}

async function toggleTodo(todo: Todo) {
  try {
    const res: any = await request.put(`/todos/${todo.id}`, {
      completed: todo.completed === 0 ? 1 : 0,
    })
    if (res.success) {
      todo.completed = res.data.todo.completed
      todoList.value.sort((a, b) => a.completed - b.completed || b.id - a.id)
    }
  } catch {
    // handled by interceptor
  }
}

function startEdit(todo: Todo) {
  editingId.value = todo.id
  editingTitle.value = todo.title
}

async function saveEdit(todo: Todo) {
  const title = editingTitle.value.trim()
  if (!title) return

  try {
    const res: any = await request.put(`/todos/${todo.id}`, { title })
    if (res.success) {
      todo.title = res.data.todo.title
      editingId.value = null
    }
  } catch {
    // handled by interceptor
  }
}

async function deleteTodo(todo: Todo) {
  try {
    const res: any = await request.delete(`/todos/${todo.id}`)
    if (res.success) {
      todoList.value = todoList.value.filter(t => t.id !== todo.id)
      ElMessage.success('已删除')
    }
  } catch {
    // handled by interceptor
  }
}

const completedCount = ref(0)
const totalCount = ref(0)

function updateCounts() {
  totalCount.value = todoList.value.length
  completedCount.value = todoList.value.filter(t => t.completed === 1).length
}

import { watch } from 'vue'
watch(todoList, updateCounts, { deep: true })

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="todos-view">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <span>待办事项</span>
          <span class="count">{{ completedCount }} / {{ totalCount }} 已完成</span>
        </div>
      </template>

      <div class="add-row">
        <el-input
          v-model="newTodo"
          placeholder="添加新的待办事项..."
          clearable
          @keyup.enter="addTodo"
        >
          <template #append>
            <el-button type="primary" @click="addTodo">
              <el-icon><Plus /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>

      <div v-loading="loading" class="todo-list">
        <div v-if="todoList.length === 0 && !loading" class="empty">
          暂无待办事项，添加一个吧
        </div>

        <div
          v-for="todo in todoList"
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
          <span v-else class="todo-title" @dblclick="startEdit(todo)">
            {{ todo.title }}
          </span>

          <div class="todo-actions">
            <el-button
              v-if="editingId !== todo.id"
              type="primary"
              link
              size="small"
              @click="startEdit(todo)"
            >
              编辑
            </el-button>
            <el-button
              v-if="editingId === todo.id"
              type="success"
              link
              size="small"
              @click="saveEdit(todo)"
            >
              保存
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="deleteTodo(todo)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.todos-view {
  padding: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  font-size: 13px;
  color: #909399;
}

.add-row {
  margin-bottom: 20px;
}

.todo-list {
  min-height: 100px;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #909399;
  font-size: 14px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
  transition: opacity 0.2s;
}

.todo-item.done {
  opacity: 0.5;
}

.todo-item.done .todo-title {
  text-decoration: line-through;
}

.todo-title {
  flex: 1;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.edit-input {
  flex: 1;
}

.todo-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-item:hover .todo-actions {
  opacity: 1;
}
</style>
