import {
  MessageEvent,
  FollowEvent,
  UnfollowEvent,
  JoinEvent,
  LeaveEvent,
  PostbackEvent,
  TemplateColumn,
} from '@line/bot-sdk'

import { Room } from '../entities/Room'
import { RoomFeeds } from '../entities/RoomFeeds'
import { getChatRoom, replyMessage, replyTemplateCarousel } from '../services/lineSDK'
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
  validateRssSource,
} from '../services/commands'

const addFilterRegex = /^\/add-filter\s+(\S+)(\s*filters="(.+)")?/
const addFilterPostbackRegex = /^\/add-filter\s+(\S+)/
const addSourceRegex = /^\/add-source\s+(\S+)(\s+\S+)?(\s+(?!--)\S+)?(\s+--global)?/
const addSourcePostbackRegex = /^\/add-source/
const addSourcePostbackRegexSource = /^\/add-source/
const addSourcePostbackRegexTitle = /^\/add-source\s+(\S+)/
const addToRoomRegex = /^\/add\s+(\S+)(\s*--filters="(.+)")?/
const editSourceRegex = /^\/edit\s+(\S+)(\s+\S+)?(\s+\S+)?/
const helpRegex = /^\/help/
const listGlobalsRegex = /^\/list-global/
const listRoomFeedsRegex = /^\/list/
const removeFilterRegex = /^\/remove-filter\s+(\S+)(\s*filters="(.+)")?/
const removeFilterPostbackRegex = /^\/remove-filter\s+(\S+)/
const removeFilterSelectedPostbackRegex = /^\/remove-filter\s+(\S+)(\s*filters="(.+)")/
const removeSourceFromRoomRegex = /^\/remove-source\s+(\S+)/

export const handleMessage = async (event: MessageEvent) => {
  if (event.message.type !== 'text') {
    console.debug('Received unhandled message type:', event.message.type)
    return Promise.resolve()
  }

  // Handle postback if room previously has one
  // otherwise continue as normal
  const postbackResponse = await handlePostbackResponse(event)
  if (postbackResponse !== false) return

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
    const [, src, title, frequency, globalFlag] = addSourceRegex.exec(text) as RegExpExecArray
    return addSource(event, { src, title, frequency: Number(frequency), global: !!globalFlag })
  }

  if (addSourcePostbackRegex.test(text)) {
    const { chatId } = getChatRoom(event)
    await Room.update({ id: chatId }, { lastPostback: '/add-source' })

    return replyMessage(event, "Enter the rss feed's url")
  }

  if (addToRoomRegex.test(text)) {
    const [, title, , filters] = addToRoomRegex.exec(text) as RegExpExecArray
    // escape commas and split args
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addSourceToRoom(event, title, filtersArray)
  }

  if (editSourceRegex.test(text)) {
    const [, title, property, newVal] = editSourceRegex.exec(text) as RegExpExecArray
    return editSource(event, title, property, newVal)
  }

  if (listGlobalsRegex.test(text)) {
    return listSources(event)
  }

  if (listRoomFeedsRegex.test(text)) {
    return listRoomFeeds(event)
  }

  if (removeSourceFromRoomRegex.test(text)) {
    const [, title] = removeSourceFromRoomRegex.exec(text) as RegExpExecArray
    return removeSourceFromRoom(event, title)
  }

  /**
   * Filter
   */
  if (addFilterRegex.test(text)) {
    const [, title, , filters] = addFilterRegex.exec(text) as RegExpExecArray
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addFilter(event, title, filtersArray)
  }

  if (removeFilterRegex.test(text)) {
    const [, title, , filters] = removeFilterRegex.exec(text) as RegExpExecArray
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

  console.log({ text })

  // Postbacks that can be processed right away
  if (listGlobalsRegex.test(text)) {
    return listSources(event)
  }

  if (listRoomFeedsRegex.test(text)) {
    return listRoomFeeds(event)
  }

  if (addToRoomRegex.test(text)) {
    const [, title, , filters] = addToRoomRegex.exec(text) as RegExpExecArray
    // escape commas and split args
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addSourceToRoom(event, title, filtersArray)
  }

  if (removeSourceFromRoomRegex.test(text)) {
    const [, title] = removeSourceFromRoomRegex.exec(text) as RegExpExecArray
    return removeSourceFromRoom(event, title)
  }

  // Postbacks that require more actions
  if (addFilterPostbackRegex.test(text)) {
    const [, title] = addFilterPostbackRegex.exec(text) as RegExpExecArray
    await replyMessage(event, `Enter the filter to be applied for ${title}`)
  }

  if (removeFilterSelectedPostbackRegex.test(text)) {
    const [, title, , filters] = removeFilterSelectedPostbackRegex.exec(text) as RegExpExecArray
    return removeFilter(event, title, [filters])
  }

  if (removeFilterPostbackRegex.test(text)) {
    const [, title] = removeFilterPostbackRegex.exec(text) as RegExpExecArray

    const roomFeed = await RoomFeeds.createQueryBuilder('roomFeed')
      .innerJoinAndMapOne('roomFeed.room', 'roomFeed.room', 'room', 'room.id = :id', { id: chatId })
      .innerJoinAndMapOne('roomFeed.feed', 'roomFeed.feed', 'feed', 'feed.title = :title', { title })
      .getOne()

    if (!roomFeed || !roomFeed.filters.length) return replyMessage(event, 'No filter to remove')

    const altTexts = [`${roomFeed.feed.title} filters - `]
    const columns: TemplateColumn[] = roomFeed.filters.map(filter => {
      altTexts.push(filter)
      return {
        text: filter,
        actions: [
          {
            type: 'postback' as 'postback',
            label: 'Remove',
            data: `/remove-filter ${roomFeed.feed.title} filters="${filter}"`,
          },
        ],
      }
    })

    const altText = altTexts.join('\n')

    return replyTemplateCarousel(event, altText, columns)
  }

  await Room.update({ id: chatId }, { lastPostback: event.postback.data })
}

/**
 * Check if message was sent after/during a postback event.
 * Continues handling the post if can
 * Else removes postback and back to handling it as a normal message
 */
async function handlePostbackResponse(event: MessageEvent) {
  const { chatId } = getChatRoom(event)

  const room = await Room.findOne({ id: chatId })
  if (!room || !room.lastPostback) return Promise.resolve(false)

  // Add Filter
  if (addFilterPostbackRegex.test(room.lastPostback)) {
    if (event.message.type !== 'text') return replyMessage(event, `${event.message.type} cannot be a filter`)

    const [, title] = addFilterPostbackRegex.exec(room.lastPostback) as RegExpExecArray

    await addFilter(event, title, [event.message.text])
    room.lastPostback = ''
    return room.save()
  }

  // Remove Filter
  if (removeFilterPostbackRegex.test(room.lastPostback)) {
    if (event.message.type !== 'text') return replyMessage(event, `${event.message.type} cannot be a filter`)

    const [, title] = removeFilterPostbackRegex.exec(room.lastPostback) as RegExpExecArray

    await removeFilter(event, title, [event.message.text])
    room.lastPostback = ''
    return room.save()
  }

  // Add Source
  if (addSourcePostbackRegexTitle.test(room.lastPostback)) {
    if (event.message.type !== 'text') return replyMessage(event, `${event.message.type} cannot be a title`)

    const text = `${room.lastPostback} ${event.message.text} 30`
    const [, src, title, frequency, globalFlag] = addSourceRegex.exec(text) as RegExpExecArray
    await addSource(event, { src, title, frequency: Number(frequency), global: !!globalFlag })

    room.lastPostback = ''
    return room.save()
  }

  if (addSourcePostbackRegexSource.test(room.lastPostback)) {
    if (event.message.type !== 'text') return replyMessage(event, `${event.message.type} cannot be a url`)

    try {
      await validateRssSource(event.message.text)
    } catch (error) {
      room.lastPostback = ''
      await room.save()
      return replyMessage(event, error.message)
    }

    room.lastPostback = `${room.lastPostback} ${event.message.text}`
    await room.save()

    return replyMessage(event, 'Enter a title for the feed')
  }

  // Other case returns false and deletes postback
  room.lastPostback = ''
  await room.save()
  return Promise.resolve(false)
}
