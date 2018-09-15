import { MessageEvent, FollowEvent, UnfollowEvent, JoinEvent, LeaveEvent } from '@line/bot-sdk';

import Room from '../models/Room'
import { getChatRoom } from './lineSDK'
const {
  addSource,
  addSourceToRoom,
  editSource,
  listSources,
  listRoomFeeds,
  addFilter,
  removeFilter,
} = require('./commands')

const handleMessage = async (event: MessageEvent) => {
  if (event.message.type !== 'text') {
    console.debug('Received unhandled message type:', event.message.type)
    return Promise.resolve()
  }

  const addSourceRegex = /^\/add-source (\S+)(\s+\S+)?(\s+(?!--)\S+)?(\s+--global)?/
  const addToRoomRegex = /^\/add (\S+)(\s*--filters="(.+)")?/
  const editSourceRegex = /^\/edit (\S+)(\s+\S+)?(\s+\S+)?/
  const listGlobalsRegex = /^\/list-global\s*/
  const listRoomFeedsRegex = /^\/list\s*/
  const addFilterRegex = /^\/add-filter (\S+)(\s*filters="(.+)")?/
  const removeFilterRegex = /^\/remove-filter (\S+)(\s*filters="(.+)")?/

  const { text } = event.message

  console.log({ text })

  if (addSourceRegex.test(text)) {
    const [, src, title, frequency, globalFlag] = addSourceRegex.exec(text)
    return addSource(event, { src, title, frequency, isPrivate: !!globalFlag })
  }

  if (addToRoomRegex.test(text)) {
    const [, title,, filters] = addToRoomRegex.exec(text)
    // escape commas and split args
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addSourceToRoom(event, title, filtersArray)
  }

  if (editSourceRegex.test(text)) {
    const [, title, property, newVal] = editSourceRegex.exec(text)
    return editSource(event, title, property, newVal)
  }

  if (listGlobalsRegex.test(text)) {
    return listSources(event)
  }

  if (listRoomFeedsRegex.test(text)) {
    return listRoomFeeds(event)
  }

  if (addFilterRegex.test(text)) {
    const [, title,, filters] = addFilterRegex.exec(text)
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return addFilter(event, title, filtersArray)
  }

  if (removeFilterRegex.test(text)) {
    const [, title,, filters] = removeFilterRegex.exec(text)
    const filtersArray = filters ? filters.replace('\\,', ',').split(',') : []
    return removeFilter(event, title, filtersArray)
  }
}

const handleFollow = async (event: FollowEvent) => {
  const room = await Room.create({
    id: event.source.userId,
    type: 'user',
  })
  console.log('Followd room:', room)
  return Promise.resolve()
}

const handleUnfollow = async (event: UnfollowEvent) => {
  const room = await Room.deleteOne({
    id: event.source.userId,
  })
  console.log('Unfollowd room:', room)
  return Promise.resolve()
}

const handleJoin = async (event: JoinEvent) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.create({
    id: chatId,
    type: event.source.type,
  })
  console.log('Joined room:', room)
  return Promise.resolve()
}

const handleLeave = async (event: LeaveEvent) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.deleteOne({
    id: chatId,
  })
  console.log('Left room:', room)
  return Promise.resolve()
}

module.exports = {
  handleMessage,
  handleFollow,
  handleUnfollow,
  handleJoin,
  handleLeave,
}