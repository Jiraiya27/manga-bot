require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB')
  app.emit('mongo:open')
})
mongoose.connection.on('error', error => {
  console.log('MongoDB connection failed with error:', error)
  console.log('Terminating process with status 1')
  process.exit(1)
})

const { webhook } = require('./controllers/lineController')
const { updateAll } = require('./controllers/feedsController')
const { middleware } = require('@line/bot-sdk')
const lineConfig = require('./configs/lineConfig')

const app = module.exports = express()
app.set('port', process.env.PORT || 3000)

app.use(morgan('[:date[iso]] :method :url :status :response-time ms'))

app.post('/webhook', middleware(lineConfig), webhook)

app.get('/updateAll', updateAll)

app.use((err, req, res, next) => {
  console.error(err)
  return res.status(500).json({ error: err.message })
})

const listen = () => app.listen(app.get('port'), () => {
  console.log('Application is listening on port:', app.get('port'))
  app.emit('started')
})

app.on('mongo:open', listen)

