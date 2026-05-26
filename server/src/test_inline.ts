import express from 'express'
import cors from 'cors'
import { initDatabase, getDb, saveDb } from './database'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ success: true })
})

app.post('/api/downloads', (req, res) => {
  console.log('POST /api/downloads hit')
  res.json({ success: true })
})

app.get('/api/downloads', (req, res) => {
  console.log('GET /api/downloads hit')
  res.json({ success: true })
})

async function start() {
  await initDatabase()
  app.listen(3006, () => console.log('on 3006'))
}
start()
