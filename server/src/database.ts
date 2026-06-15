import initSqlJs, { Database } from 'sql.js'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.db')
export const JWT_SECRET = process.env.JWT_SECRET || 'admin-dashboard-secret-key-dev'

let db: Database

export function getDb(): Database {
  return db
}

export function saveDb() {
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function tryAddColumn(table: string, column: string, type: string, def: string) {
  try {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} NOT NULL DEFAULT ${def}`)
  } catch {
    // column already exists
  }
}

function seedDownloads() {
  const countResult = db.exec('SELECT COUNT(*) FROM downloads')
  const count = countResult[0]?.values[0]?.[0] as number
  if (count > 0) return

  const titles = [
    '城市夜景延时摄影', '产品展示动画模板', '自然风光4K素材', '美食制作教程片段',
    '科技感片头动画', '海边日落慢动作', '人物访谈录制', '商业广告视频素材',
    '航拍城市全景', '婚礼现场跟拍', '美食摄影图片', '产品白底图拍摄',
    '健身教学视频', '旅行Vlog素材', '音乐MV片段', '游戏精彩集锦',
    '教学课件录屏', '宠物日常记录', '婚礼花絮视频', '汽车展示广告',
    '咖啡店宣传短片', '瑜伽教学视频', '时尚穿搭展示', '咖啡拉花特写',
    '手工艺制作过程', '音乐节现场记录', '瑜伽教学演示', '美食探店Vlog',
    '数码产品评测', '街头艺术涂鸦', '健身房宣传视频', '花艺设计展示',
    '户外露营记录', '亲子互动视频', '烘焙教程完整版', '宠物训练日记',
    '汽车改装过程', '科技产品开箱', '街头篮球集锦', '水彩画教学',
    '风景延时合集', '人物肖像摄影', '美食甜点制作', '产品宣传动画',
    '旅行风景记录', '舞蹈表演视频', '音乐创作花絮', '游戏攻略解说',
    '书法练习过程', '摄影技巧分享', '手工皮具制作', '民谣吉他弹唱',
    '城市街头速写', '茶艺表演记录', '陶艺制作过程', '古典舞教学',
    '民族乐器演奏', '水墨画创作过程', '花鸟摄影合集', '美食街拍合集',
  ]

  const sources = ['pexels', 'pexels', 'pexels', 'pixabay', 'pixabay', 'ytdlp', 'ytdlp', 'ytdlp', 'bilibili', 'bilibili']
  const categories = ['风景', '人物', '产品', '教程', '动画', '音乐', '游戏', '生活']
  const tagPool = ['4K', '高清', '免费商用', '热门', '精选', '新发布', '推荐', '模板', '素材', '背景']
  const statusPool = [
    { status: 'completed', weight: 70 },
    { status: 'failed', weight: 10 },
    { status: 'pending', weight: 10 },
    { status: 'downloading', weight: 5 },
    { status: 'queued', weight: 5 },
  ]
  const errorMessages = ['网络超时', '链接已失效', '需要登录验证', '文件不存在', '服务器拒绝访问', '文件大小超限']
  const resolutions = [
    { w: 3840, h: 2160, label: '2160p' },
    { w: 1920, h: 1080, label: '1080p' },
    { w: 1280, h: 720, label: '720p' },
    { w: 1080, h: 1920, label: '1080p竖版' },
    { w: 1024, h: 768, label: '768p' },
    { w: 2560, h: 1440, label: '1440p' },
  ]
  const qualities = ['4K', '1080p', '720p', '480p']
  const authors = ['张三', '李四', '王五', '摄影师小王', '素材库官方', '创作达人', '视觉中国', '东方IC', '站酷素材', '']

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function pickWeightedStatus(): string {
    const r = Math.random() * 100
    let cum = 0
    for (const s of statusPool) {
      cum += s.weight
      if (r < cum) return s.status
    }
    return 'completed'
  }

  function randomTags(): string {
    const count = Math.floor(Math.random() * 4)
    const shuffled = [...tagPool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count).join(',')
  }

  function randomDate(daysAgo: number): string {
    const now = Date.now()
    const offset = Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000)
    const d = new Date(now - offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const sec = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${sec}`
  }

  const records: any[][] = []

  for (let i = 0; i < 60; i++) {
    const isVideo = Math.random() > 0.3
    const res = pick(resolutions)
    const status = pickWeightedStatus()
    const fileSize = isVideo
      ? Math.floor(Math.random() * 495000000) + 5000000
      : Math.floor(Math.random() * 14800000) + 200000
    const duration = isVideo ? Math.floor(Math.random() * 600) + 5 : 0

    let daysAgo: number
    if (i < 30) daysAgo = Math.floor(Math.random() * 7)
    else if (i < 45) daysAgo = Math.floor(Math.random() * 7) + 7
    else daysAgo = Math.floor(Math.random() * 16) + 15

    records.push([
      pick(titles),
      pick(sources),
      isVideo ? 'video' : 'image',
      '',
      '',
      '',
      '',
      pick(authors),
      res.w,
      res.h,
      duration,
      fileSize,
      '',
      pick(qualities),
      status,
      randomDate(daysAgo),
      randomTags(),
      pick(categories),
      res.label,
      status === 'failed' ? pick(errorMessages) : '',
    ])
  }

  const stmt = db.prepare(`
    INSERT INTO downloads
      (title, source, media_type, video_id, download_url, page_url, thumbnail_url,
       author, width, height, duration, file_size, file_path, quality, status,
       created_at, tags, category, resolution, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const r of records) {
    stmt.run(r)
  }
  stmt.free()

  saveDb()
  console.log('已生成 60 条种子下载数据')
}

export async function initDatabase() {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      role       TEXT NOT NULL DEFAULT 'user',
      status     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS downloads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      source        TEXT NOT NULL,
      media_type    TEXT NOT NULL DEFAULT 'video',
      video_id      TEXT NOT NULL DEFAULT '',
      download_url  TEXT NOT NULL DEFAULT '',
      page_url      TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      author        TEXT NOT NULL DEFAULT '',
      width         INTEGER NOT NULL DEFAULT 0,
      height        INTEGER NOT NULL DEFAULT 0,
      duration      INTEGER NOT NULL DEFAULT 0,
      file_size     INTEGER NOT NULL DEFAULT 0,
      file_path     TEXT NOT NULL DEFAULT '',
      quality       TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'done',
      created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 0,
      user_id    INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      user_id    INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  // Schema migration: add new columns to downloads table
  tryAddColumn('downloads', 'tags', 'TEXT', "''")
  tryAddColumn('downloads', 'category', 'TEXT', "''")
  tryAddColumn('downloads', 'resolution', 'TEXT', "''")
  tryAddColumn('downloads', 'error_message', 'TEXT', "''")
  tryAddColumn('downloads', 'thumbnail_url', 'TEXT', "''")

  // Migrate old 'done' status to 'completed'
  db.run("UPDATE downloads SET status = 'completed' WHERE status = 'done'")

  // ---- 菜单权限表 ----
  db.run(`
    CREATE TABLE IF NOT EXISTS menus (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER NOT NULL DEFAULT 0,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL DEFAULT '',
      icon       TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      visible    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      label      TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS role_menus (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      UNIQUE(role_id, menu_id)
    )
  `)

  // ---- 种子数据：菜单 ----
  const menuCount = db.exec('SELECT COUNT(*) FROM menus')[0]?.values[0]?.[0] as number
  if (menuCount === 0) {
    const menuData = [
      { id: 1, parent_id: 0, name: '数据概览', path: '/dashboard', icon: 'DataBoard', sort: 1 },
      { id: 2, parent_id: 0, name: '系统管理', path: '', icon: 'Setting', sort: 2 },
      { id: 3, parent_id: 2, name: '用户管理', path: '/users', icon: 'User', sort: 1 },
      { id: 4, parent_id: 2, name: '角色管理', path: '/roles', icon: 'UserFilled', sort: 2 },
      { id: 5, parent_id: 2, name: '菜单管理', path: '/menus', icon: 'Menu', sort: 3 },
      { id: 6, parent_id: 0, name: '内容管理', path: '', icon: 'Document', sort: 3 },
      { id: 7, parent_id: 6, name: '下载记录', path: '/downloads', icon: 'Download', sort: 1 },
      { id: 8, parent_id: 6, name: '待办事项', path: '/todos', icon: 'Finished', sort: 2 },
      { id: 9, parent_id: 6, name: '记事本', path: '/notes', icon: 'Notebook', sort: 3 },
    ]
    for (const m of menuData) {
      db.run(
        'INSERT INTO menus (id, parent_id, name, path, icon, sort_order, visible) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [m.id, m.parent_id, m.name, m.path, m.icon, m.sort]
      )
    }
    console.log('已初始化菜单数据')
  }

  // ---- 种子数据：角色 ----
  const roleCount = db.exec('SELECT COUNT(*) FROM roles')[0]?.values[0]?.[0] as number
  if (roleCount === 0) {
    db.run("INSERT INTO roles (id, name, label, description) VALUES (1, 'admin', '管理员', '拥有所有权限')")
    db.run("INSERT INTO roles (id, name, label, description) VALUES (2, 'user', '普通用户', '基础权限')")
    db.run("INSERT INTO roles (id, name, label, description) VALUES (3, 'editor', '编辑员', '内容管理权限')")
    console.log('已初始化角色数据')
  }

  // ---- 种子数据：角色-菜单关联 ----
  const rmCount = db.exec('SELECT COUNT(*) FROM role_menus')[0]?.values[0]?.[0] as number
  if (rmCount === 0) {
    // admin 拥有所有菜单
    for (let menuId = 1; menuId <= 9; menuId++) {
      db.run('INSERT INTO role_menus (role_id, menu_id) VALUES (1, ?)', [menuId])
    }
    // user 只有数据概览 + 内容管理
    for (const menuId of [1, 6, 7, 8, 9]) {
      db.run('INSERT INTO role_menus (role_id, menu_id) VALUES (2, ?)', [menuId])
    }
    // editor 有数据概览 + 内容管理
    for (const menuId of [1, 6, 7, 8, 9]) {
      db.run('INSERT INTO role_menus (role_id, menu_id) VALUES (3, ?)', [menuId])
    }
    console.log('已初始化角色菜单关联')
  }

  // Seed admin user
  const userResult = db.exec('SELECT COUNT(*) FROM users WHERE username = ?', ['admin'])
  const userCount = userResult[0]?.values[0]?.[0] as number

  if (userCount === 0) {
    const hash = bcrypt.hashSync('123456', 10)
    db.run(
      'INSERT INTO users (username, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
      ['admin', hash, '管理员', 'admin', 1]
    )
    saveDb()
    console.log('已创建默认管理员账号: admin / 123456')
  }

  // Seed download data
  seedDownloads()

  console.log('数据库初始化完成')
}
