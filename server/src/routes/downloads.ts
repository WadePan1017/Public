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
    file_size = 0, file_path = '', quality = '', status = 'done',
  } = req.body

  if (!title || !source) {
    res.status(400).json({ success: false, message: 'title 和 source 不能为空' })
    return
  }

  const db = getDb()
  db.run(
    `INSERT INTO downloads
      (title, source, media_type, video_id, download_url, page_url, thumbnail_url,
       author, width, height, duration, file_size, file_path, quality, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, source, media_type, video_id, download_url, page_url, thumbnail_url,
     author, width, height, duration, file_size, file_path, quality, status]
  )
  saveDb()

  res.json({ success: true, message: '记录已保存' })
})

// GET /api/downloads — 下载列表（需要登录）
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { keyword = '', source = '', media_type = '', page = '1', pageSize = '10' } = req.query as Record<string, string>
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

  const countResult = db.exec(`SELECT COUNT(*) as total FROM downloads ${where}`, params)
  const total = countResult[0]?.values[0]?.[0] as number || 0

  const offset = (pageNum - 1) * size
  const dataResult = db.exec(
    `SELECT * FROM downloads ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  const list = dataResult.length > 0
    ? dataResult[0].values.map(row => rowToObject(dataResult[0].columns, row))
    : []

  res.json({ success: true, data: { list, total, page: pageNum, pageSize: size } })
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

// GET /api/downloads/stats — 下载统计（需要登录）
router.get('/stats', authMiddleware, (_req: AuthRequest, res: Response) => {
  const db = getDb()

  const totalResult = db.exec('SELECT COUNT(*) FROM downloads')
  const totalCount = totalResult[0]?.values[0]?.[0] as number || 0

  const videoResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'video'")
  const videoCount = videoResult[0]?.values[0]?.[0] as number || 0

  const imageResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'image'")
  const imageCount = imageResult[0]?.values[0]?.[0] as number || 0

  // 本周下载数
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

  // 最近7天每天下载数（趋势）
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

  res.json({
    success: true,
    data: {
      totalCount,
      videoCount,
      imageCount,
      weekCount,
      sourceStats,
      trend,
    },
  })
})

export default router
