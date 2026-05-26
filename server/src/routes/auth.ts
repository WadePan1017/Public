import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb, JWT_SECRET, saveDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

function signToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
}

// POST /api/auth/register
router.post('/register', (req, res: Response) => {
  const { username, password, name } = req.body

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: '用户名、密码和姓名不能为空' })
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, message: '用户名长度需在 3-20 个字符' })
  }

  if (password.length < 6 || password.length > 20) {
    return res.status(400).json({ success: false, message: '密码长度需在 6-20 个字符' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE username = ?', [username])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(400).json({ success: false, message: '用户名已存在' })
  }

  const hash = bcrypt.hashSync(password, 10)
  db.run(
    'INSERT INTO users (username, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
    [username, hash, name, 'user', 1]
  )
  saveDb()

  const result = db.exec('SELECT id, username, name, role, status, created_at FROM users WHERE username = ?', [username])
  const row = result[0].values[0]
  const user = { id: row[0], username: row[1], name: row[2], role: row[3], status: row[4], created_at: row[5] }
  const token = signToken({ id: user.id as number, username: user.username as string, role: user.role as string })

  res.json({ success: true, data: { token, user } })
})

// POST /api/auth/login
router.post('/login', (req, res: Response) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' })
  }

  const db = getDb()
  const result = db.exec('SELECT * FROM users WHERE username = ?', [username])
  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' })
  }

  const cols = result[0].columns
  const row = result[0].values[0]
  const user: Record<string, unknown> = {}
  cols.forEach((col, i) => { user[col] = row[i] })

  if (!bcrypt.compareSync(password, user.password as string)) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' })
  }

  if (user.status === 0) {
    return res.status(403).json({ success: false, message: '账号已被禁用' })
  }

  const token = signToken({ id: user.id as number, username: user.username as string, role: user.role as string })

  const { password: _, ...safeUser } = user
  res.json({ success: true, data: { token, user: safeUser } })
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const result = db.exec(
    'SELECT id, username, name, email, phone, role, status, created_at FROM users WHERE id = ?',
    [req.user!.id]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '用户不存在' })
  }

  const cols = result[0].columns
  const row = result[0].values[0]
  const user: Record<string, unknown> = {}
  cols.forEach((col, i) => { user[col] = row[i] })

  res.json({ success: true, data: { user } })
})

export default router
