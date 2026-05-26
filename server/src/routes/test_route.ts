import { Router } from 'express'
const router = Router()
router.post('/', (req, res) => {
  console.log('test POST hit')
  res.json({ ok: true })
})
export default router
