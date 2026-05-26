import { Router, Response } from 'express'
import { getDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

function fillDateRange(days: number, data: Record<string, number>): { day: string; count: number }[] {
  const result: { day: string; count: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const key = `${y}-${m}-${day}`
    result.push({ day: `${m}-${day}`, count: data[key] || 0 })
  }
  return result
}

// GET /api/dashboard/stats
router.get('/stats', (_req: AuthRequest, res: Response) => {
  const db = getDb()

  const userResult = db.exec('SELECT COUNT(*) FROM users')
  const userCount = userResult[0]?.values[0]?.[0] as number || 0

  const totalResult = db.exec('SELECT COUNT(*) FROM downloads')
  const downloadCount = totalResult[0]?.values[0]?.[0] as number || 0

  const videoResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'video'")
  const videoCount = videoResult[0]?.values[0]?.[0] as number || 0

  const imageResult = db.exec("SELECT COUNT(*) FROM downloads WHERE media_type = 'image'")
  const imageCount = imageResult[0]?.values[0]?.[0] as number || 0

  const weekResult = db.exec("SELECT COUNT(*) FROM downloads WHERE created_at >= datetime('now', '-7 days', 'localtime')")
  const weekCount = weekResult[0]?.values[0]?.[0] as number || 0

  // 成功率
  const completedResult = db.exec("SELECT COUNT(*) FROM downloads WHERE status = 'completed'")
  const completedCount = completedResult[0]?.values[0]?.[0] as number || 0
  const successRate = downloadCount > 0 ? Math.round((completedCount / downloadCount) * 1000) / 10 : 0

  // 总存储
  const storageResult = db.exec("SELECT COALESCE(SUM(file_size), 0) FROM downloads WHERE status = 'completed'")
  const totalFileSize = storageResult[0]?.values[0]?.[0] as number || 0

  // 最近30天趋势（补全空日期）
  const trendRawResult = db.exec(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM downloads
    WHERE created_at >= datetime('now', '-29 days', 'localtime')
    GROUP BY date(created_at)
    ORDER BY day
  `)
  const trendMap: Record<string, number> = {}
  if (trendRawResult.length > 0) {
    trendRawResult[0].values.forEach(row => {
      const raw = row[0] as string
      // 只取日期部分
      const dayKey = raw.length > 10 ? raw.substring(0, 10) : raw
      trendMap[dayKey] = row[1] as number
    })
  }
  const trend = fillDateRange(30, trendMap)

  // 各平台占比
  const sourceResult = db.exec('SELECT source, COUNT(*) as count FROM downloads GROUP BY source')
  const sourceStats: Record<string, number> = {}
  if (sourceResult.length > 0) {
    sourceResult[0].values.forEach(row => {
      sourceStats[row[0] as string] = row[1] as number
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

  // 状态分布
  const statusResult = db.exec('SELECT status, COUNT(*) FROM downloads GROUP BY status')
  const statusStats: Record<string, number> = {}
  if (statusResult.length > 0) {
    statusResult[0].values.forEach(row => {
      statusStats[row[0] as string] = row[1] as number
    })
  }

  res.json({
    success: true,
    data: {
      userCount,
      downloadCount,
      videoCount,
      imageCount,
      weekCount,
      successRate,
      totalFileSize,
      trend,
      sourceStats,
      categoryStats,
      statusStats,
    },
  })
})

// GET /api/dashboard/recent-activity
router.get('/recent-activity', (_req: AuthRequest, res: Response) => {
  const db = getDb()

  const result = db.exec(`
    SELECT id, title, source, media_type, status, category, created_at
    FROM downloads
    ORDER BY id DESC
    LIMIT 10
  `)

  const activities = result.length > 0
    ? result[0].values.map(row => {
        const obj: Record<string, unknown> = {}
        result[0].columns.forEach((col, i) => { obj[col] = row[i] })
        return obj
      })
    : []

  res.json({ success: true, data: { activities } })
})

// GET /api/dashboard/platform-growth
router.get('/platform-growth', (_req: AuthRequest, res: Response) => {
  const db = getDb()

  const result = db.exec(`
    SELECT source,
      SUM(CASE WHEN created_at >= datetime('now', '-7 days', 'localtime') THEN 1 ELSE 0 END) as week1,
      SUM(CASE WHEN created_at >= datetime('now', '-14 days', 'localtime') AND created_at < datetime('now', '-7 days', 'localtime') THEN 1 ELSE 0 END) as week2,
      SUM(CASE WHEN created_at >= datetime('now', '-21 days', 'localtime') AND created_at < datetime('now', '-14 days', 'localtime') THEN 1 ELSE 0 END) as week3,
      SUM(CASE WHEN created_at >= datetime('now', '-28 days', 'localtime') AND created_at < datetime('now', '-21 days', 'localtime') THEN 1 ELSE 0 END) as week4
    FROM downloads
    GROUP BY source
  `)

  const platforms = result.length > 0
    ? result[0].values.map(row => ({
        source: row[0],
        week1: row[1],
        week2: row[2],
        week3: row[3],
        week4: row[4],
      }))
    : []

  res.json({ success: true, data: { platforms } })
})

export default router
