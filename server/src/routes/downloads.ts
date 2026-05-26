import { Router } from 'express'
import type { Response } from 'express'
import { getDb, saveDb } from '../database'
import { authMiddleware } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

const router = Router()

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

// POST /api/downloads — Python 端上报下载记录（不需要登录）
router.post('/', (req, res: Response) => {
  const {
    title, source, media_type = 'video', video_id = '',
    download_url = '', page_url = '', thumbnail_url = '',
    author = '', width = 0, height = 0, duration = 0,
    file_size = 0, file_path = '', quality = '', status = 'completed',
    tags = '', category = '', resolution = '', error_message = '',
  } = req.body

  if (!title || !source) {
    res.status(400).json({ success: false, message: 'title 和 source 不能为空' })
    return
  }

  const db = getDb()
  db.run(
    `INSERT INTO downloads
      (title, source, media_type, video_id, download_url, page_url, thumbnail_url,
       author, width, height, duration, file_size, file_path, quality, status,
       tags, category, resolution, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, source, media_type, video_id, download_url, page_url, thumbnail_url,
     author, width, height, duration, file_size, file_path, quality, status,
     tags, category, resolution, error_message]
  )
  saveDb()

  res.json({ success: true, message: '记录已保存' })
})

// GET /api/downloads — 下载列表（需要登录）
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const {
    keyword = '', source = '', media_type = '', status = '',
    tags = '', category = '', date_from = '', date_to = '',
    sort_by = 'id', sort_order = 'DESC',
    page = '1', pageSize = '10',
  } = req.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page) || 1)
  const size = Math.max(1, Math.min(100, parseInt(pageSize) || 10))

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (keyword) {
    where += ' AND (title LIKE ? OR author LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (source) {
    where += ' AND source = ?'
    params.push(source)
  }
  if (media_type) {
    where += ' AND media_type = ?'
    params.push(media_type)
  }
  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }
  if (tags) {
    where += ' AND tags LIKE ?'
    params.push(`%${tags}%`)
  }
  if (category) {
    where += ' AND category = ?'
    params.push(category)
  }
  if (date_from) {
    where += ' AND created_at >= ?'
    params.push(date_from)
  }
  if (date_to) {
    where += ' AND created_at <= ?'
    params.push(date_to + ' 23:59:59')
  }

  const allowedSorts = ['id', 'title', 'source', 'status', 'file_size', 'created_at']
  const sortField = allowedSorts.includes(sort_by) ? sort_by : 'id'
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  const countResult = db.exec(`SELECT COUNT(*) as total FROM downloads ${where}`, params)
  const total = countResult[0]?.values[0]?.[0] as number || 0

  const offset = (pageNum - 1) * size
  const dataResult = db.exec(
    `SELECT * FROM downloads ${where} ORDER BY ${sortField} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  const list = dataResult.length > 0
    ? dataResult[0].values.map(row => rowToObject(dataResult[0].columns, row))
    : []

  res.json({ success: true, data: { list, total, page: pageNum, pageSize: size } })
})

// PUT /api/downloads/batch/delete — 批量删除
router.put('/batch/delete', authMiddleware, (req: AuthRequest, res: Response) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, message: 'ids 不能为空' })
    return
  }

  const db = getDb()
  const placeholders = ids.map(() => '?').join(',')
  db.run(`DELETE FROM downloads WHERE id IN (${placeholders})`, ids)
  saveDb()

  res.json({ success: true, message: `已删除 ${ids.length} 条记录`, count: ids.length })
})

// PUT /api/downloads/batch/status — 批量改状态
router.put('/batch/status', authMiddleware, (req: AuthRequest, res: Response) => {
  const { ids, status } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, message: 'ids 不能为空' })
    return
  }
  const validStatuses = ['pending', 'downloading', 'completed', 'failed', 'queued']
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: '无效的状态值' })
    return
  }

  const db = getDb()
  const placeholders = ids.map(() => '?').join(',')
  db.run(`UPDATE downloads SET status = ? WHERE id IN (${placeholders})`, [status, ...ids])
  saveDb()

  res.json({ success: true, message: `已更新 ${ids.length} 条记录状态`, count: ids.length })
})

// PUT /api/downloads/batch/category — 批量分类
router.put('/batch/category', authMiddleware, (req: AuthRequest, res: Response) => {
  const { ids, category } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, message: 'ids 不能为空' })
    return
  }

  const db = getDb()
  const placeholders = ids.map(() => '?').join(',')
  db.run(`UPDATE downloads SET category = ? WHERE id IN (${placeholders})`, [category, ...ids])
  saveDb()

  res.json({ success: true, message: `已更新 ${ids.length} 条记录分类`, count: ids.length })
})

// DELETE /api/downloads/:id — 删除下载记录（需要登录）
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { id } = req.params as { id: string }

  const checkResult = db.exec('SELECT id FROM downloads WHERE id = ?', [id])
  if (!checkResult.length || !checkResult[0].values.length) {
    res.status(404).json({ success: false, message: '记录不存在' })
    return
  }

  db.run('DELETE FROM downloads WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, message: '已删除' })
})

// PUT /api/downloads/:id — 编辑下载记录
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { id } = req.params as { id: string }

  const checkResult = db.exec('SELECT id FROM downloads WHERE id = ?', [id])
  if (!checkResult.length || !checkResult[0].values.length) {
    res.status(404).json({ success: false, message: '记录不存在' })
    return
  }

  const {
    title, source, media_type, author, page_url, thumbnail_url,
    width, height, duration, file_size, file_path, quality,
    status, tags, category, resolution, error_message,
  } = req.body

  const fields: string[] = []
  const params: unknown[] = []

  const addField = (name: string, val: unknown) => {
    if (val !== undefined) {
      fields.push(`${name} = ?`)
      params.push(val)
    }
  }

  addField('title', title)
  addField('source', source)
  addField('media_type', media_type)
  addField('author', author)
  addField('page_url', page_url)
  addField('thumbnail_url', thumbnail_url)
  addField('width', width)
  addField('height', height)
  addField('duration', duration)
  addField('file_size', file_size)
  addField('file_path', file_path)
  addField('quality', quality)
  addField('status', status)
  addField('tags', tags)
  addField('category', category)
  addField('resolution', resolution)
  addField('error_message', error_message)

  if (fields.length === 0) {
    res.status(400).json({ success: false, message: '没有要更新的字段' })
    return
  }

  params.push(id)
  db.run(`UPDATE downloads SET ${fields.join(', ')} WHERE id = ?`, params)
  saveDb()

  const updated = db.exec('SELECT * FROM downloads WHERE id = ?', [id])
  const record = updated.length > 0 ? rowToObject(updated[0].columns, updated[0].values[0]) : null

  res.json({ success: true, message: '已更新', data: record })
})

// GET /api/downloads/stats — 下载统计（需要登录）
router.get('/stats', authMiddleware, (_req: AuthRequest, res: Response) => {
  const db = getDb()

  const totalResult = db.exec('SELECT COUNT(*) FROM downloads')
  const totalCount = totalResult[0]?.values[0]?.[0] as number || 0

  const videoResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'video'")
  const videoCount = videoResult[0]?.values[0]?.[0] as number || 0

  const imageResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'image'")
  const imageCount = imageResult[0]?.values[0]?.[0] as number || 0

  const weekResult = db.exec("SELECT COUNT(*) FROM downloads WHERE created_at >= datetime('now', '-7 days', 'localtime')")
  const weekCount = weekResult[0]?.values[0]?.[0] as number || 0

  // 各平台占比
  const sourceResult = db.exec('SELECT source, COUNT(*) as count FROM downloads GROUP BY source')
  const sourceStats: Record<string, number> = {}
  if (sourceResult.length > 0) {
    sourceResult[0].values.forEach(row => {
      sourceStats[row[0] as string] = row[1] as number
    })
  }

  // 最近7天趋势
  const trendResult = db.exec(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM downloads
    WHERE created_at >= datetime('now', '-6 days', 'localtime')
    GROUP BY date(created_at)
    ORDER BY day
  `)
  const trend: { day: string; count: number }[] = []
  if (trendResult.length > 0) {
    trendResult[0].values.forEach(row => {
      trend.push({ day: row[0] as string, count: row[1] as number })
    })
  }

  // 状态分布
  const statusResult = db.exec('SELECT status, COUNT(*) FROM downloads GROUP BY status')
  const statusStats: Record<string, number> = {}
  if (statusResult.length > 0) {
    statusResult[0].values.forEach(row => {
      statusStats[row[0] as string] = row[1] as number
    })
  }

  // 分类分布
  const categoryResult = db.exec("SELECT category, COUNT(*) FROM downloads WHERE category != '' GROUP BY category")
  const categoryStats: Record<string, number> = {}
  if (categoryResult.length > 0) {
    categoryResult[0].values.forEach(row => {
      categoryStats[row[0] as string] = row[1] as number
    })
  }

  res.json({
    success: true,
    data: {
      totalCount,
      videoCount,
      imageCount,
      weekCount,
      sourceStats,
      trend,
      statusStats,
      categoryStats,
    },
  })
})

export default router
