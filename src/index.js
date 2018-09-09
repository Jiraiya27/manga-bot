const cron = require('node-cron')
const axios = require('axios')

const app = require('./app')

const BASE_URL = process.env.BASE_URL || `'http://localhost:${app.get('port')}`
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * *'

const pingUpdateAll = () => {
  axios.get(`${BASE_URL}/updateAll`)
}

const cronUpdateAll = () => {
  cron.schedule(CRON_SCHEDULE, pingUpdateAll)
}

app.on('started', cronUpdateAll)
