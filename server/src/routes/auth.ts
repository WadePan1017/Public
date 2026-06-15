import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb, JWT_SECRET, saveDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

function signToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
}

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

// 获取角色对应的菜单列表
function getMenusByRole(roleName: string) {
  const db = getDb()
  // 先查角色 id
  const roleResult = db.exec('SELECT id FROM roles WHERE name = ?', [roleName])
  if (roleResult.length === 0 || roleResult[0].values.length === 0) {
    // 兜底：返回所有可见菜单
    const all = db.exec('SELECT * FROM menus WHERE visible = 1 ORDER BY sort_order ASC')
    return all.length > 0 ? all[0].values.map(row => rowToObject(all[0].columns, row)) : []
  }
  const roleId = roleResult[0].values[0][0]
  const result = db.exec(
    `SELECT m.* FROM menus m
     INNER JOIN role_menus rm ON rm.menu_id = m.id
     WHERE rm.role_id = ? AND m.visible = 1
     ORDER BY m.sort_order ASC`,
    [roleId]
  )
  return result.length > 0 ? result[0].values.map(row => rowToObject(result[0].columns, row)) : []
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
  const menus = getMenusByRole(user.role as string)
  res.json({ success: true, data: { token, user: safeUser, menus } })
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

  const menus = getMenusByRole(user.role as string)
  res.json({ success: true, data: { user, menus } })
})

// PUT /api/auth/password — 修改密码
router.put('/password', authMiddleware, (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '请输入原密码和新密码' })
  }

  if (newPassword.length < 6 || newPassword.length > 20) {
    return res.status(400).json({ success: false, message: '新密码长度需在 6-20 个字符' })
  }

  const db = getDb()
  const result = db.exec('SELECT password FROM users WHERE id = ?', [req.user!.id])
  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '用户不存在' })
  }

  const currentPassword = result[0].values[0][0] as string
  if (!bcrypt.compareSync(oldPassword, currentPassword)) {
    return res.status(400).json({ success: false, message: '原密码错误' })
  }

  const hash = bcrypt.hashSync(newPassword, 10)
  db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user!.id])
  saveDb()

  res.json({ success: true, message: '密码修改成功' })
})

export default router
