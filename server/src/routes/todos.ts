import { Router, Response } from 'express'
import { getDb, saveDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

// GET /api/todos
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb()
  const result = db.exec(
    'SELECT * FROM todos WHERE user_id = ? ORDER BY completed ASC, id DESC',
    [req.user!.id]
  )
  const list = result.length > 0
    ? result[0].values.map(row => rowToObject(result[0].columns, row))
    : []
  res.json({ success: true, data: { list } })
})

// POST /api/todos
router.post('/', (req: AuthRequest, res: Response) => {
  const { title } = req.body
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: '标题不能为空' })
    return
  }

  const db = getDb()
  db.run('INSERT INTO todos (title, user_id) VALUES (?, ?)', [title.trim(), req.user!.id])
  saveDb()

  const result = db.exec('SELECT last_insert_rowid() as id')
  const newId = result[0].values[0][0]
  const todo = db.exec('SELECT * FROM todos WHERE id = ?', [newId])
  const item = rowToObject(todo[0].columns, todo[0].values[0])

  res.json({ success: true, data: { todo: item } })
})

// PUT /api/todos/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { title, completed } = req.body

  const db = getDb()
  const existing = db.exec('SELECT * FROM todos WHERE id = ? AND user_id = ?', [parseInt(id), req.user!.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    res.status(404).json({ success: false, message: '待办不存在' })
    return
  }

  if (title !== undefined) {
    db.run('UPDATE todos SET title = ? WHERE id = ?', [title.trim(), parseInt(id)])
  }
  if (completed !== undefined) {
    db.run('UPDATE todos SET completed = ? WHERE id = ?', [completed ? 1 : 0, parseInt(id)])
  }
  saveDb()

  const result = db.exec('SELECT * FROM todos WHERE id = ?', [parseInt(id)])
  const todo = rowToObject(result[0].columns, result[0].values[0])
  res.json({ success: true, data: { todo } })
})

// DELETE /api/todos/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const db = getDb()
  const existing = db.exec('SELECT * FROM todos WHERE id = ? AND user_id = ?', [parseInt(id), req.user!.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    res.status(404).json({ success: false, message: '待办不存在' })
    return
  }

  db.run('DELETE FROM todos WHERE id = ?', [parseInt(id)])
  saveDb()
  res.json({ success: true, message: '删除成功' })
})

export default router
