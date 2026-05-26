import { Router, Response } from 'express'
import { getDb } from '../database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

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

  // 各平台占比
  const sourceResult = db.exec('SELECT source, COUNT(*) as count FROM downloads GROUP BY source')
  const sourceStats: Record<string, number> = {}
  if (sourceResult.length > 0) {
    sourceResult[0].values.forEach(row => {
      sourceStats[row[0] as string] = row[1] as number
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
      trend,
      sourceStats,
    },
  })
})

export default router
