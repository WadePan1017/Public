import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDatabase } from './database'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import dashboardRoutes from './routes/dashboard'
import downloadRoutes from './routes/downloads'
import todoRoutes from './routes/todos'
import noteRoutes from './routes/notes'
import uploadRoutes from './routes/uploads'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 静态文件：上传的文件
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/downloads', downloadRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/todos', todoRoutes)
app.use('/api/notes', noteRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

// 生产环境：提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'dist')
  app.use(express.static(clientDist))
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

async function start() {
  await initDatabase()
  app.listen(PORT, () => {
    console.log(`后端服务器已启动: http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('服务器启动失败:', err)
  process.exit(1)
})
