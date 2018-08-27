const cron = require('node-cron')
const axios = require('axios')

const app = require('./app')

const BASE_URL = `http://localhost:${app.get('port')}`

const pingUpdateAll = () => {
  axios.get(`${BASE_URL}/updateAll`)
}

const cronUpdateAll = () => {
  cron.schedule('* * * * *', pingUpdateAll)
}

app.on('started', cronUpdateAll)
