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

// GET /api/menus — 获取完整菜单树
router.get('/', (_req: AuthRequest, res: Response) => {
  const db = getDb()
  const result = db.exec('SELECT * FROM menus ORDER BY sort_order ASC')
  const list = result.length > 0
    ? result[0].values.map(row => rowToObject(result[0].columns, row))
    : []
  res.json({ success: true, data: { list } })
})

// POST /api/menus — 新增菜单
router.post('/', (req: AuthRequest, res: Response) => {
  const { parent_id = 0, name, path = '', icon = '', sort_order = 0, visible = 1 } = req.body
  if (!name) return res.status(400).json({ success: false, message: '菜单名称不能为空' })

  const db = getDb()
  db.run(
    'INSERT INTO menus (parent_id, name, path, icon, sort_order, visible) VALUES (?, ?, ?, ?, ?, ?)',
    [parent_id, name, path, icon, sort_order, visible]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid() as id')
  const newId = result[0].values[0][0]
  const menu = db.exec('SELECT * FROM menus WHERE id = ?', [newId])
  res.json({ success: true, data: { menu: rowToObject(menu[0].columns, menu[0].values[0]) } })
})

// PUT /api/menus/:id — 编辑菜单
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { parent_id, name, path, icon, sort_order, visible } = req.body

  const db = getDb()
  const existing = db.exec('SELECT id FROM menus WHERE id = ?', [parseInt(id)])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ success: false, message: '菜单不存在' })
  }

  db.run(
    'UPDATE menus SET parent_id = ?, name = ?, path = ?, icon = ?, sort_order = ?, visible = ? WHERE id = ?',
    [parent_id ?? 0, name, path ?? '', icon ?? '', sort_order ?? 0, visible ?? 1, parseInt(id)]
  )
  saveDb()

  const menu = db.exec('SELECT * FROM menus WHERE id = ?', [parseInt(id)])
  res.json({ success: true, data: { menu: rowToObject(menu[0].columns, menu[0].values[0]) } })
})

// DELETE /api/menus/:id — 删除菜单（同时删除子菜单和角色关联）
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const db = getDb()

  // 删除子菜单
  db.run('DELETE FROM menus WHERE parent_id = ?', [parseInt(id)])
  // 删除角色关联
  db.run('DELETE FROM role_menus WHERE menu_id = ?', [parseInt(id)])
  // 删除自身
  db.run('DELETE FROM menus WHERE id = ?', [parseInt(id)])
  saveDb()

  res.json({ success: true, message: '删除成功' })
})

export default router
