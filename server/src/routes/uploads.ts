import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { execSync } from 'child_process'
import { getDb, saveDb } from '../database'
import { authMiddleware } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'

const router = Router()

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbs')

// Ensure directories exist
import fs from 'fs'
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp4|avi|mov|mkv|webm|flv|wmv|mp3|wav|jpg|jpeg|png|gif|webp|bmp|svg)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式'))
    }
  },
})

function isVideo(filename: string): boolean {
  return /\.(mp4|avi|mov|mkv|webm|flv|wmv)$/i.test(filename)
}

function isImage(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename)
}

function getVideoMetadata(filePath: string): { width: number; height: number; duration: number } {
  try {
    const result = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${filePath}"`,
      { timeout: 10000, encoding: 'utf-8' }
    )
    const info = JSON.parse(result)
    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video')
    if (!videoStream) return { width: 0, height: 0, duration: 0 }
    return {
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      duration: Math.round(parseFloat(info.format?.duration || '0')),
    }
  } catch {
    return { width: 0, height: 0, duration: 0 }
  }
}

function generateThumbnail(filePath: string, filename: string): string {
  if (!isVideo(filename)) return ''
  const thumbName = `thumb_${filename.replace(/\.[^.]+$/, '.jpg')}`
  const thumbPath = path.join(THUMB_DIR, thumbName)
  try {
    execSync(
      `ffmpeg -y -i "${filePath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbPath}"`,
      { timeout: 15000, stdio: 'ignore' }
    )
    return `/uploads/thumbs/${thumbName}`
  } catch {
    return ''
  }
}

function getImageDimensions(filePath: string): { width: number; height: number } {
  try {
    const result = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${filePath}"`,
      { timeout: 5000, encoding: 'utf-8' }
    )
    const info = JSON.parse(result)
    const stream = info.streams?.[0]
    return { width: stream?.width || 0, height: stream?.height || 0 }
  } catch {
    return { width: 0, height: 0 }
  }
}

function formatResolution(w: number, h: number): string {
  if (h >= 2160) return '2160p'
  if (h >= 1440) return '1440p'
  if (h >= 1080) return '1080p'
  if (h >= 720) return '720p'
  if (h >= 480) return '480p'
  if (w && h) return `${w}x${h}`
  return ''
}

// POST /api/uploads — 上传文件
router.post('/', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: '请选择文件' })
    return
  }

  const file = req.file
  const isVid = isVideo(file.originalname)
  const isImg = isImage(file.originalname)
  const mediaType = isVid ? 'video' : 'image'

  // Extract metadata
  let width = 0, height = 0, duration = 0
  const filePath = file.path

  if (isVid) {
    const meta = getVideoMetadata(filePath)
    width = meta.width; height = meta.height; duration = meta.duration
  } else if (isImg) {
    const dim = getImageDimensions(filePath)
    width = dim.width; height = dim.height
  }

  const resolution = formatResolution(width, height)
  const thumbnail = generateThumbnail(filePath, file.originalname)
  const title = path.basename(file.originalname, path.extname(file.originalname))

  // Determine source
  const source = (req.body.source as string) || 'upload'

  // Insert record
  const db = getDb()
  db.run(
    `INSERT INTO downloads
      (title, source, media_type, author, width, height, duration,
       file_size, file_path, quality, status, tags, category, resolution, thumbnail_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, source, mediaType, req.user?.username || '',
      width, height, duration, file.size, `/uploads/${file.filename}`,
      resolution, 'completed', req.body.tags || '', req.body.category || '',
      resolution, thumbnail,
    ]
  )
  saveDb()

  res.json({
    success: true,
    message: '上传成功',
    data: {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mediaType,
      width, height, duration, resolution, thumbnail,
    },
  })
})

// POST /api/uploads/batch — 批量上传
router.post('/batch', authMiddleware, upload.array('files', 20), (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, message: '请选择文件' })
    return
  }

  const db = getDb()
  const results: any[] = []

  for (const file of files) {
    const isVid = isVideo(file.originalname)
    const isImg = isImage(file.originalname)
    const mediaType = isVid ? 'video' : 'image'

    let width = 0, height = 0, duration = 0
    if (isVid) {
      const meta = getVideoMetadata(file.path)
      width = meta.width; height = meta.height; duration = meta.duration
    } else if (isImg) {
      const dim = getImageDimensions(file.path)
      width = dim.width; height = dim.height
    }

    const resolution = formatResolution(width, height)
    const thumbnail = generateThumbnail(file.path, file.originalname)
    const title = path.basename(file.originalname, path.extname(file.originalname))

    db.run(
      `INSERT INTO downloads
        (title, source, media_type, author, width, height, duration,
         file_size, file_path, quality, status, tags, category, resolution, thumbnail_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, 'upload', mediaType, req.user?.username || '',
        width, height, duration, file.size, `/uploads/${file.filename}`,
        resolution, 'completed', '', '', resolution, thumbnail,
      ]
    )

    results.push({ filename: file.filename, originalname: file.originalname, size: file.size, mediaType })
  }

  saveDb()

  res.json({
    success: true,
    message: `已上传 ${files.length} 个文件`,
    data: { count: files.length, files: results },
  })
})

export default router
