import express from 'express'
import cors from 'cors'
import { initDatabase } from './database'
import downloadRoutes from './routes/downloads'
const app = express()
app.use(cors())
app.use(express.json())
console.log('downloadRoutes:', typeof downloadRoutes, downloadRoutes)
app.use('/api/downloads', downloadRoutes)
app.get('/api/health', (_req, res) => res.json({ok:true}))
async function start() {
  await initDatabase()
  app.listen(3008, () => console.log('on 3008'))
}
start()
