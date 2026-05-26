import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getDb, saveDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

// GET /api/users
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { keyword = '', role = '', page = '1', pageSize = '10' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page) || 1)
  const size = Math.max(1, Math.min(100, parseInt(pageSize) || 10))

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (keyword) {
    where += ' AND (name LIKE ? OR email LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  if (role) {
    where += ' AND role = ?'
    params.push(role)
  }

  const countResult = db.exec(`SELECT COUNT(*) as total FROM users ${where}`, params)
  const total = countResult[0]?.values[0]?.[0] as number || 0

  const offset = (pageNum - 1) * size
  const dataResult = db.exec(
    `SELECT id, username, name, email, phone, role, status, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  const list = dataResult.length > 0
    ? dataResult[0].values.map(row => rowToObject(dataResult[0].columns, row))
    : []

  res.json({ success: true, data: { list, total, page: pageNum, pageSize: size } })
})

// POST /api/users
router.post('/', (req: AuthRequest, res: Response) => {
  const { username, password, name, email = '', phone = '', role = 'user', status = 1 } = req.body

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: '用户名、密码和姓名不能为空' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE username = ?', [username])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(400).json({ success: false, message: '用户名已存在' })
  }

  const hash = bcrypt.hashSync(password, 10)
  db.run(
    'INSERT INTO users (username, password, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, hash, name, email, phone, role, status]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid() as id')
  const newId = result[0].values[0][0]

  const userResult = db.exec(
    'SELECT id, username, name, email, phone, role, status, created_at FROM users WHERE id = ?',
    [newId]
  )
  const user = rowToObject(userResult[0].columns, userResult[0].values[0])

  res.json({ success: true, data: { user } })
})

// PUT /api/users/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { name, email, phone, role, status } = req.body

  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE id = ?', [parseInt(id)])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '用户不存在' })
  }

  db.run(
    'UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
    [name, email || '', phone || '', role || 'user', status ?? 1, parseInt(id)]
  )
  saveDb()

  const result = db.exec(
    'SELECT id, username, name, email, phone, role, status, created_at FROM users WHERE id = ?',
    [parseInt(id)]
  )
  const user = rowToObject(result[0].columns, result[0].values[0])

  res.json({ success: true, data: { user } })
})

// DELETE /api/users/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }

  const db = getDb()
  const existing = db.exec('SELECT id, role FROM users WHERE id = ?', [parseInt(id)])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '用户不存在' })
  }

  const role = existing[0].values[0][1]
  if (role === 'admin') {
    const adminCount = db.exec('SELECT COUNT(*) FROM users WHERE role = ?', ['admin'])
    if ((adminCount[0]?.values[0]?.[0] as number) <= 1) {
      return res.status(400).json({ success: false, message: '不能删除最后一个管理员' })
    }
  }

  db.run('DELETE FROM users WHERE id = ?', [parseInt(id)])
  saveDb()

  res.json({ success: true, message: '删除成功' })
})

export default router
