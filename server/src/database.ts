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

  const result = db.exec('SELECT COUNT(*) as count FROM users WHERE username = ?', ['admin'])
  const count = result[0]?.values[0]?.[0] as number

  if (count === 0) {
    const hash = bcrypt.hashSync('123456', 10)
    db.run(
      'INSERT INTO users (username, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
      ['admin', hash, '管理员', 'admin', 1]
    )
    saveDb()
    console.log('已创建默认管理员账号: admin / 123456')
  }

  console.log('数据库初始化完成')
}
