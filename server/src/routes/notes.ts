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

// GET /api/notes
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb()
  const result = db.exec(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
    [req.user!.id]
  )
  const list = result.length > 0
    ? result[0].values.map(row => rowToObject(result[0].columns, row))
    : []
  res.json({ success: true, data: { list } })
})

// POST /api/notes
router.post('/', (req: AuthRequest, res: Response) => {
  const { title = '无标题', content = '' } = req.body

  const db = getDb()
  db.run('INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)', [title, content, req.user!.id])
  saveDb()

  const result = db.exec('SELECT last_insert_rowid() as id')
  const newId = result[0].values[0][0]
  const note = db.exec('SELECT * FROM notes WHERE id = ?', [newId])
  const item = rowToObject(note[0].columns, note[0].values[0])

  res.json({ success: true, data: { note: item } })
})

// PUT /api/notes/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const { title, content } = req.body

  const db = getDb()
  const existing = db.exec('SELECT * FROM notes WHERE id = ? AND user_id = ?', [parseInt(id), req.user!.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    res.status(404).json({ success: false, message: '笔记不存在' })
    return
  }

  if (title !== undefined) {
    db.run('UPDATE notes SET title = ? WHERE id = ?', [title, parseInt(id)])
  }
  if (content !== undefined) {
    db.run('UPDATE notes SET content = ? WHERE id = ?', [content, parseInt(id)])
  }
  db.run("UPDATE notes SET updated_at = datetime('now', 'localtime') WHERE id = ?", [parseInt(id)])
  saveDb()

  const result = db.exec('SELECT * FROM notes WHERE id = ?', [parseInt(id)])
  const note = rowToObject(result[0].columns, result[0].values[0])
  res.json({ success: true, data: { note } })
})

// DELETE /api/notes/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string }
  const db = getDb()
  const existing = db.exec('SELECT * FROM notes WHERE id = ? AND user_id = ?', [parseInt(id), req.user!.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    res.status(404).json({ success: false, message: '笔记不存在' })
    return
  }

  db.run('DELETE FROM notes WHERE id = ?', [parseInt(id)])
  saveDb()
  res.json({ success: true, message: '删除成功' })
})

export default router
