import cron from 'node-cron'
import axios from 'axios'

import app from './app'
import { BASE_URL, CRON_SCHEDULE } from './config'

const pingUpdateAll = () => axios.get(`${BASE_URL}/refresh`)

const cronUpdateAll = () => cron.schedule(CRON_SCHEDULE, pingUpdateAll)

app.on('started', cronUpdateAll)
