import express from 'express'
const app = express()
app.use(express.json())

const router = express.Router()
router.post('/', (req, res) => {
  console.log('POST hit!')
  res.json({ ok: true })
})
router.get('/', (req, res) => {
  console.log('GET hit!')
  res.json({ ok: true })
})
app.use('/api/test', router)

app.listen(3005, () => console.log('on 3005'))
