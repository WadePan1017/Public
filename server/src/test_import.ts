import express from 'express'
import testRoute from './routes/test_route'
const app = express()
app.use(express.json())
app.use('/api/test', testRoute)
app.listen(3007, () => console.log('on 3007'))
