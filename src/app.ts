import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express'
import morgan from 'morgan'
import { middleware } from '@line/bot-sdk'
import { createConnection } from 'typeorm'
import path from 'path'

import { LINE_CONFIG, DATABASE_URL, DATABASE_LOGGING, PORT } from './config'
import { webhook } from './controllers/lineController'
import { refresh } from './controllers/feedsController'

createConnection({
  type: 'postgres',
  url: DATABASE_URL,
  logging: DATABASE_LOGGING,
  extra: {
    ssl: true,
  },
  synchronize: true,
  entities: [path.join(__dirname, '/entities/**/*.js')],
  migrations: [path.join(__dirname  + '/migrations/**/*.js')],
}).then(() => {
    app.emit('db:connected')
    console.log('DB connected')
  })
  .catch(error => {
    console.error('DB connection error:', error)
    process.exitCode = 1
  })

const app = express()

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

app.on('db:connected', listen)

export default app
