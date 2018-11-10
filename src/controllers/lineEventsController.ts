import { MessageEvent, FollowEvent, UnfollowEvent, JoinEvent, LeaveEvent, PostbackEvent } from '@line/bot-sdk'

import { Room } from '../entities/Room'
import { getChatRoom, replyMessage } from '../services/lineSDK'
import {
  addFilter,
  addSource,
  addSourceToRoom,
  editSource,
  help,
  listRoomFeeds,
  listSources,
  removeFilter,
  removeSourceFromRoom,
} from '../services/commands'

const addFilterRegex = /^\/add-filter\s+(\S+)(\s*filters="(.+)")?/
const addFilterPostbackRegex = /^\/add-filter\s+(\S+)/
const addSourceRegex = /^\/add-source\s+(\S+)(\s+\S+)?(\s+(?!--)\S+)?(\s+--global)?/
const addToRoomRegex = /^\/add\s+(\S+)(\s*--filters="(.+)")?/
const editSourceRegex = /^\/edit\s+(\S+)(\s+\S+)?(\s+\S+)?/
const helpRegex = /^\/help/
const listGlobalsRegex = /^\/list-global/
const listRoomFeedsRegex = /^\/list/
const removeFilterRegex = /^\/remove-filter\s+(\S+)(\s*filters="(.+)")?/
const removeSourceFromRoomRegex = /^\/remove-source\s+(\S+)/

export const handleMessage = async (event: MessageEvent) => {
  if (event.message.type !== 'text') {
    console.debug('Received unhandled message type:', event.message.type)
    return Promise.resolve()
  }

  // Handle postback if room previously has one
  // otherwise continue as normal
  const postbackResponse = await handlePostbackResponse(event)
  if (postbackResponse !== false) return;

  const { text } = event.message

  console.log({ text })

  /**
   * Help
   */
  if (helpRegex.test(text)) {
    return help(event)
  }

  /**
   * Source
   */
  if (addSourceRegex.test(text)) {
    const [, src, title, frequency, globalFlag] = <RegExpExecArray>addSourceRegex.exec(text)
    return addSource(event, { src, title, frequency: Number(frequency), global: !!globalFlag })
  }

  if (addToRoomRegex.test(text)) {
    const [, title,, filters] = <RegExpExecArray>addToRoomRegex.exec(text)
    // escape commas and split args
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addSourceToRoom(event, title, filtersArray)
  }

  if (editSourceRegex.test(text)) {
    const [, title, property, newVal] = <RegExpExecArray>editSourceRegex.exec(text)
    return editSource(event, title, property, newVal)
  }

  if (listGlobalsRegex.test(text)) {
    return listSources(event)
  }

  if (listRoomFeedsRegex.test(text)) {
    return listRoomFeeds(event)
  }

  if (removeSourceFromRoomRegex.test(text)) {
    const [, title] = <RegExpExecArray>removeSourceFromRoomRegex.exec(text)
    return removeSourceFromRoom(event, title)
  }

  /**
   * Filter
   */
  if (addFilterRegex.test(text)) {
    const [, title,, filters] = <RegExpExecArray>addFilterRegex.exec(text)
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addFilter(event, title, filtersArray)
  }

  if (removeFilterRegex.test(text)) {
    const [, title,, filters] = <RegExpExecArray>removeFilterRegex.exec(text)
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return removeFilter(event, title, filtersArray)
  }
}

export const handleFollow = async (event: FollowEvent) => {
  const { chatId, type } = getChatRoom(event)
  const room = Room.create({
    id: chatId,
    type,
  })
  await room.save()
  console.log('Followed room:', room)
}

export const handleUnfollow = async (event: UnfollowEvent) => {
  const { chatId } = getChatRoom(event)
  Room.delete({ })
  const room = await Room.delete({
    id: chatId,
  })
  console.log('Unfollowed room:', room)
}

export const handleJoin = async (event: JoinEvent) => {
  const { chatId, type } = getChatRoom(event)
  const room = Room.create({
    id: chatId,
    type,
  })
  await room.save()
  console.log('Joined room:', room)
}

export const handleLeave = async (event: LeaveEvent) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.delete({
    id: chatId,
  })
  console.log('Left room:', room)
}

// Forwards postback data to get handled like a normal message
// Saves data for next incomming message to continue the process
export const handlePostback = async (event: PostbackEvent) => {
  const { chatId } = getChatRoom(event)

  const text = event.postback.data

  // Postbacks that can be processed right away
  if (listGlobalsRegex.test(text)) {
    return listSources(event)
  }

  if (listRoomFeedsRegex.test(text)) {
    return listRoomFeeds(event)
  }

  // Postbacks that require more data
  if (addFilterPostbackRegex.test(text)) {
    const [, title] = <RegExpExecArray>addFilterPostbackRegex.exec(text)
    await replyMessage(event, `Enter the filter to be applied for ${title}`)
  }

  await Room.update({ id: chatId }, { lastPostback: event.postback.data })
}

/**
 * Check if message was sent after/during a postback event.
 * Continues handling the post if can
 * Else removes postback and back to handling it as a normal message
 */
async function handlePostbackResponse (event: MessageEvent) {
  const { chatId } = getChatRoom(event)

  const room = await Room.findOne({ id: chatId })
  if (!room || !room.lastPostback) return Promise.resolve(false)

  if (addFilterPostbackRegex.test(room.lastPostback)) {
    const [, title] = <RegExpExecArray>addFilterPostbackRegex.exec(room.lastPostback)

    if (event.message.type !== 'text') return replyMessage(event, `${event.message.type} cannot be a filter`)

    await addFilter(event, title, [event.message.text])
    room.lastPostback = ''
    return room.save()
  }

  // Other case returns false and deletes postback
  room.lastPostback = ''
  await room.save()
  return Promise.resolve(false)
}
