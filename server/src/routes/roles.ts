import { Router, Response } from 'express'
import { getDb, saveDb } from '../database'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware, adminMiddleware)

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

// GET /api/roles — 获取角色列表（含用户数）
router.get('/', (_req: AuthRequest, res: Response) => {
  const db = getDb()
  const result = db.exec(`
    SELECT r.*,
      (SELECT COUNT(*) FROM users u WHERE u.role = r.name) as user_count
    FROM roles r ORDER BY r.id ASC
  `)
  const list = result.length > 0
    ? result[0].values.map(row => rowToObject(result[0].columns, row))
    : []
  res.json({ success: true, data: { list } })
})

// GET /api/roles/:id/menus — 获取角色的菜单权限
router.get('/:id/menus', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const db = getDb()
  const result = db.exec(
    'SELECT menu_id FROM role_menus WHERE role_id = ?',
    [parseInt(id)]
  )
  const menuIds = result.length > 0
    ? result[0].values.map(row => row[0])
    : []
  res.json({ success: true, data: { menuIds } })
})

// POST /api/roles — 新增角色
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, label, description = '' } = req.body
  if (!name || !label) return res.status(400).json({ success: false, message: '角色标识和名称不能为空' })

  const db = getDb()
  const existing = db.exec('SELECT id FROM roles WHERE name = ?', [name])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(400).json({ success: false, message: '角色标识已存在' })
  }

  db.run(
    'INSERT INTO roles (name, label, description) VALUES (?, ?, ?)',
    [name, label, description]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid() as id')
  const newId = result[0].values[0][0]
  const role = db.exec('SELECT * FROM roles WHERE id = ?', [newId])
  res.json({ success: true, data: { role: rowToObject(role[0].columns, role[0].values[0]) } })
})

// PUT /api/roles/:id — 编辑角色
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { label, description } = req.body

  const db = getDb()
  const existing = db.exec('SELECT id FROM roles WHERE id = ?', [parseInt(id)])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '角色不存在' })
  }

  db.run(
    'UPDATE roles SET label = ?, description = ? WHERE id = ?',
    [label, description ?? '', parseInt(id)]
  )
  saveDb()

  const role = db.exec('SELECT * FROM roles WHERE id = ?', [parseInt(id)])
  res.json({ success: true, data: { role: rowToObject(role[0].columns, role[0].values[0]) } })
})

// PUT /api/roles/:id/permissions — 分配菜单权限
router.put('/:id/permissions', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { menuIds } = req.body as { menuIds: number[] }

  if (!Array.isArray(menuIds)) {
    return res.status(400).json({ success: false, message: 'menuIds 必须是数组' })
  }

  const db = getDb()
  // 清空旧权限
  db.run('DELETE FROM role_menus WHERE role_id = ?', [parseInt(id)])
  // 插入新权限
  for (const menuId of menuIds) {
    db.run('INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)', [parseInt(id), menuId])
  }
  saveDb()

  res.json({ success: true, message: '权限分配成功' })
})

// DELETE /api/roles/:id — 删除角色
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const db = getDb()

  const existing = db.exec('SELECT name FROM roles WHERE id = ?', [parseInt(id)])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '角色不存在' })
  }

  const roleName = existing[0].values[0][0]
  // 不允许删除 admin 和 user 基础角色
  if (roleName === 'admin' || roleName === 'user') {
    return res.status(400).json({ success: false, message: '不能删除基础角色' })
  }

  db.run('DELETE FROM role_menus WHERE role_id = ?', [parseInt(id)])
  db.run('DELETE FROM roles WHERE id = ?', [parseInt(id)])
  saveDb()

  res.json({ success: true, message: '删除成功' })
})

export default router
