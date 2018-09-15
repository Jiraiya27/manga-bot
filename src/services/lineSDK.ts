import { Client, ClientConfig, MessageEvent, EventBase, Profile, ReplyableEvent, TextMessage } from '@line/bot-sdk'
import { LINE_CONFIG, ADMIN_ID } from '../config'

const client = new Client(LINE_CONFIG as ClientConfig)

const getChatRoom = (event: MessageEvent) => {
  const { type, userId } = event.source
  const chatId = 'roomId' in event.source ? event.source.roomId
    : 'groupId' in event.source ? event.source.groupId
    : event.source.userId 
  return { type, userId, chatId }
}

const getSenderProfile = async (event: MessageEvent) => {
  const { type, chatId, userId } = getChatRoom(event)
  let profile: Profile | null = null
  try {
    if (!userId) {
      profile = null
    } else if (type === 'user') {
      profile = await client.getProfile(userId)
    } else if (type === 'group') {
      profile = await client.getGroupMemberProfile(chatId, userId)
    } else if (type === 'room') {
      profile = await client.getRoomMemberProfile(chatId, userId)
    }
  } catch (error) {
    console.error('Get profile error:', error.originalError.response)
  }
  console.log('Profile:', profile)
  return Promise.resolve(profile)
}

const getMemberIds = async (event: MessageEvent) => {
  const { type, chatId } = getChatRoom(event)
  let ids: string[] = []
  try {
    if (type === 'user') {
      ids = [chatId]
    } else if (type === 'group') {
      ids = await client.getGroupMemberIds(chatId)
    } else if (type === 'room') {
      ids = await client.getRoomMemberIds(chatId)
    }
  } catch (error) {
    console.error('Get MemberId error:', error.originalError.response)
  }
  console.log('IDs:', ids)
  return Promise.resolve(ids)
}

const getMemberProfiles = async (event: MessageEvent) => {
  const memberIds = await getMemberIds(event)
  return memberIds.map(id => {
    if (event.source.type === 'group') return client.getGroupMemberProfile(event.source.groupId, id)
    if (event.source.type === 'room') return client.getRoomMemberProfile(event.source.roomId, id)
    if (event.source.type === 'user') return client.getProfile(id)
  })
}

const sendMessage = async (event: MessageEvent, message: string | string[]) => {
  const { chatId } = getChatRoom(event)
  if (typeof message === 'string') {
    return client.pushMessage(chatId, {
      type: 'text',
      text: message,
    })
  }
  if (Array.isArray(message)) {
    const messages = message.map((text: string): TextMessage => ({ type: 'text', text }))
    return client.pushMessage(chatId, messages)
  }
}

const replyMessage = async (event: ReplyableEvent, message: string | string[]) => {
  if (typeof message === 'string') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: message,
    })
  }
  if (Array.isArray(message)) {
    const messages = message.map((text: string): TextMessage => ({ type: 'text', text }))
    return client.replyMessage(event.replyToken, messages)
  }
}

const isAdmin = (event: EventBase) => typeof ADMIN_ID === 'string' && ADMIN_ID === event.source.userId

module.exports = {
  client,
  getChatRoom,
  getSenderProfile,
  getMemberIds,
  getMemberProfiles,
  sendMessage,
  replyMessage,
  isAdmin,
}
