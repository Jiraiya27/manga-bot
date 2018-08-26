const { Client } = require('@line/bot-sdk')
const lineConfig = require('../configs/lineConfig')

const client = new Client(lineConfig)

/**
 * @typedef Profile
 * @type {object}
 * @property {string} displayName
 * @property {string} userId
 * @property {string} pictureUrl
 * @property {string} statusMessage
 */

const getChatRoom = event => {
  const { type } = event.source
  const chatId = event.source[`${type}Id`]
  const userId = event.source.userId
  return { type, chatId, userId } 
}


/**
 * @param {object} event
 * @returns {Promise<Profile>} 
 */
const getSenderProfile = async event => {
  const { type, chatId, userId } = getChatRoom(event)
  let profile
  try {
    if (type === 'user') {
      profile = await client.getProfile(userId)
    } else if (type === 'group') {
      const chatId = event.source[`${type}Id`]
      profile = await client.getGroupMemberProfile(chatId, userId)
    } else if (type === 'room') {
      profile = await client.getRoomMemberProfile(chatId, userId)      
    }
  } catch (error) {
    console.error('Get profile error:', error.originalError.response)
    profile = { dispayName: 'MG ', userId: '', pictureUrl: '', statusMessage: '' }
  }
  console.log('Profile:', profile)
  return Promise.resolve(profile)
}

const getMemberIds = async event => {
  const { type, chatId, userId } = getChatRoom(event)
  let ids = []
  try {
    if (type === 'user') {
      ids = [userId]
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

const getMemberProfiles = async event => {
  const memberIds = await getMemberIds(event)
  return memberIds.map(id => {
    if (event.source.type === 'user') return client.getProfile(id)
    if (event.source.type === 'group') return client.getGroupMemberProfile(event.source.groupId, id)
    if (event.source.type === 'room') return client.getRoomMemberProfile(event.source.roomId, id)
  })
}

const sendMessage = async (event, message) => {
  const { chatId } = getChatRoom(event)
  if (typeof message === 'string') {
    return client.pushMessage(chatId, {
      type: 'text',
      text: message,
    })
  }
  if (Array.isArray(message)) {
    const messages = message.map(text => ({ type: 'text', text }))
    return client.pushMessage(chatId, messages)
  }
}

module.exports = {
  client,
  getChatRoom,
  getSenderProfile,
  getMemberIds,
  getMemberProfiles,
  sendMessage,
}
