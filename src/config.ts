import { config } from 'dotenv'
import { MiddlewareConfig } from '@line/bot-sdk'

config()

export const LINE_CONFIG: MiddlewareConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret:<string>process.env.CHANNEL_SECRET,
}
export const ADMIN_ID = process.env.ADMIN_ID

export const PORT = process.env.PORT || 3000
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manga-bot'

export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * *'
