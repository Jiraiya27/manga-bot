import { MessageEvent, FollowEvent, UnfollowEvent, JoinEvent, LeaveEvent } from '@line/bot-sdk'

import { Room } from '../entities/Room'
import { getChatRoom } from '../services/lineSDK'
import {
  addFilter,
  addSource,
  addSourceToRoom,
  editSource,
  help,
  listRoomFeeds,
  listSources,
  removeFilter,
} from '../services/commands'

export const handleMessage = async (event: MessageEvent) => {
  if (event.message.type !== 'text') {
    console.debug('Received unhandled message type:', event.message.type)
    return Promise.resolve()
  }

  const addFilterRegex = /^\/add-filter (\S+)(\s*filters="(.+)")?/
  const addSourceRegex = /^\/add-source (\S+)(\s+\S+)?(\s+(?!--)\S+)?(\s+--global)?/
  const addToRoomRegex = /^\/add (\S+)(\s*--filters="(.+)")?/
  const editSourceRegex = /^\/edit (\S+)(\s+\S+)?(\s+\S+)?/
  const helpRegex = /^\/help/
  const listGlobalsRegex = /^\/list-global\s*/
  const listRoomFeedsRegex = /^\/list\s*/
  const removeFilterRegex = /^\/remove-filter (\S+)(\s*filters="(.+)")?/

  const { text } = event.message

  console.log({ text })

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
