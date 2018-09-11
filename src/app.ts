import express, { Request, Response, NextFunction } from 'express'
import morgan from 'morgan'
import * as mongoose from 'mongoose'
import { middleware } from '@line/bot-sdk'

import { LINE_CONFIG, MONGODB_URI, PORT } from './config'
import { webhook } from './controllers/lineController'
import { refresh } from './controllers/feedsController'

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB')
  app.emit('mongo:open')
})
mongoose.connection.on('error', error => {
  console.log('MongoDB connection failed with error:', error)
  console.log('Terminating process with status 1')
  process.exit(1)
})

const app = module.exports = express()

app.use(morgan('[:date[iso]] :method :url :status :response-time ms'))

app.post('/webhook', middleware(LINE_CONFIG), webhook)

app.get('/refresh', refresh)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  return res.status(500).json({ error: err.message })
})

const listen = () => app.listen(PORT, () => {
  console.log('Application is listening on port:', PORT)
  app.emit('started')
})

app.on('mongo:open', listen)
