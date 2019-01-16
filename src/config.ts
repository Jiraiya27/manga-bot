import { config } from 'dotenv'
import { MiddlewareConfig } from '@line/bot-sdk'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'

config()

function toLoggerOption(option?: string | boolean | string[]): LoggerOptions {
  if (option === 'true' || option === 'false') return option === 'true'
  if (option === 'all') return option
  if (Array.isArray(option)) {
    // : Exclude<LoggerOptions, boolean | string> <- adding that fails
    const options = ['query', 'schema', 'error', 'warn', 'info', 'log', 'migration']
    return option.reduce((acc, str) => acc && options.includes(str), true) ? (option as LoggerOptions) : false
  }
  return false
}

export const LINE_CONFIG: MiddlewareConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET!,
}
export const ADMIN_ID = process.env.ADMIN_ID

export const PORT = process.env.PORT || 3000
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
export const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/manga-bot'
export const DATABASE_LOGGING: LoggerOptions = toLoggerOption(process.env.DATABASE_LOGGING)

export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * *'
