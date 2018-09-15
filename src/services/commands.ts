import normalizer from 'normalize-url'
import _ from 'lodash'

import RssChannel from '../models/RssChannel'
import Room from '../models/Room'
import { getChatRoom, replyMessage, isAdmin } from './lineSDK'
import { parse } from './RSSParser'
import { ReplyableEvent } from '@line/bot-sdk';

const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/m

type AddSourceOptions = {
  src: string,
  title: string,
  frequency: number,
  global: boolean,
}

// Returns a list of all commands
export const help = () => {

}

// Adds rss feed to db
// TODO: remove admin/global add, can just manual add from db
export const addSource = async (event: ReplyableEvent, { src, title, frequency = 30, global = false }: AddSourceOptions) => {
  if (!urlRegex.test(src)) {
    return replyMessage(event, `Source '${src}' isn't a url`)
  }
  const normalizedSrc = normalizer(src)
  const feed = await parse(normalizedSrc).catch(error => {
    return replyMessage(event, error.message)
  })

  const channelTitle = title || feed.title

  // Can't duplicate with global source
  const globalChannels = await RssChannel.findOne({
    global: true,
    $or: [
      { src: normalizedSrc },
      { title: channelTitle },
    ],
  })
  if (globalChannels) {
    if (src === normalizedSrc) return replyMessage(event, 'Global channel with same src exists')
    return replyMessage(event, 'Global channel with same title exists')
  }

  if (Number.isNaN(Number(frequency))) {
    return replyMessage(event, `Frequency ${frequency} isn't a number`)
  }

  if (global && !isAdmin(event)) {
    return replyMessage(event, 'You cannot add a global source')
  }

  const { chatId } = getChatRoom(event)
  if (!global) {
    // Reject if room contains duplicate src/title
    const room = await Room.findOne({ id: chatId }).populate({ path: 'feeds.channelId', model: 'rss_channel' })

    for (let i = 0; i < room.feeds.length; i++) {
      const f = room.feeds[i];
      if (f.channelId.title === channelTitle) {
        return replyMessage(event, 'Your room already has an rss feed with the same title')
      }
      if (f.channelId.src === normalizedSrc) {
        return replyMessage(event, 'Your room already has an rss feed with the same source')
      }
    }
    try {
      // Add private source
      const channel = await RssChannel.create({
        src: normalizedSrc,
        title: channelTitle,
        items: feed.items,
        frequency: Number(frequency),
        global: false,
        roomIds: [room._id],
        lastUpdated: new Date(),
      })
      // Add source to room
      await room.feeds.push({
        channelId: channel._id,
        filters: [],
      })
      return replyMessage(event, [
        'Added',
        `rss feed src: ${src}`,
        `title: ${channelTitle}`,
        `refresh frequency: ${frequency} mins`,
      ].join('\n'))
    } catch (error) {
      console.error('Create private RssChannel error:', error)
      return replyMessage(event, 'Add source error')
    }
  } else {
    const privateChannels = await RssChannel.findOne({
      global: false,
      $or: [
        { src: normalizedSrc },
        { title: channelTitle },
      ],
    })
    if (privateChannels) {
      return replyMessage(event, 'Conflict with an existing private feed. Go use a migration script.')
    }
    // Add source to room
    try {
      await RssChannel.create({
        src: normalizedSrc,
        title: channelTitle,
        items: feed.items,
        frequency: Number(frequency),
        global: true,
        roomIds: [],
        lastUpdated: new Date(),
      })
      return replyMessage(event, [
        'Added Global Feed',
        `rss feed src: ${src}`,
        `title: ${channelTitle}`,
        `refresh frequency: ${frequency} mins`,
      ].join('\n'))
    } catch (error) {
      console.error('Create global RssChannel error:', error)
      return replyMessage(event, 'Add source error')
    }
  }
}

// Adds rss feed from global sources based on name to room
export const addSourceToRoom = async (event: ReplyableEvent, title: string, filters: string[]) => {
  if (!title) {
    return replyMessage(event, "Feed's title can't be empty")
  }

  const channel = await RssChannel.findOne({ title: new RegExp(title, 'i') })
  if (!channel) {
    return replyMessage(event, `Rss Feed with title: ${title} not found`)
  }

  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId })

  if (channel.roomIds.includes(room._id.toString())) {
    return replyMessage(event, `This room is already subscribed to channel: ${channel.title}`)
  }

  const existingFeed = room.feeds.find(f => f.channelId.toString() === channel._id.toString())

  if (existingFeed) {
    existingFeed.filters = [...new Set([...existingFeed.filters, ...filters])]
  } else {
    room.feeds.push({ channelId: channel._id, filters })
    channel.roomIds.push(room._id)
    await channel.save()
  }

  await room.save()
  const message = filters.length > 0
    ? existingFeed
      ? `Update feed ${channel.title}'s filters to be ${existingFeed.filters.join(', ')}`
      : `Added feed ${channel.title} with filters as ${filters}`
    : `Added feed ${channel.title} without any filter`
  return replyMessage(event, message)
}

// Update src/title/frequency
export const editSource = async (event: ReplyableEvent, title: string, property: string, newVal: string) => {
  const channel = await RssChannel.findOne({ title: new RegExp(title, 'i') }).populate('roomIds')
  if (!channel) {
    return replyMessage(event, 'RssChannel not found')
  }

  const { chatId } = getChatRoom(event)
  const stringifiedIds = channel.roomIds.map(id => id.toString())
  if (!stringifiedIds.includes(chatId)) {
    return replyMessage(event, `This rooms is not subscribed to feed ${title}`)
  }

  if (channel.global) {
    return replyMessage(event, 'Cannot edit global source')
  }

  if (!['src', 'title', 'frequency'].includes(property)) {
    return replyMessage(event, 'Can edit only src, title, and frequency')
  }

  if (!newVal) {
    return replyMessage(event, 'New value cannot be empty')
  }

  // TODO: validate each property from model itself
  channel[property] = newVal
  await channel.save()

  // TODO: model static function to print details
  return replyMessage(event, `Updated ${property} to ${newVal}`)
}

// list global sources
export const listSources = async (event: ReplyableEvent) => {
  const channels = await RssChannel.find({ global: true })
  const messages = channels.map((channel, i) => {
    return [
      `${i + 1}. ${channel.title}`,
      `Src - ${channel.src}`,
      `Refresh - ${channel.frequency} mins`,
    ].join('\n')
  })
  if (messages.length === 0) return replyMessage(event, 'There are no global feeds. Admin go do your job.')
  return replyMessage(event, messages.join('\n'))
}

// list feeds subscribed by room
export const listRoomFeeds = async (event: ReplyableEvent) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId }).populate({ path: 'feeds.channelId', model: 'rss_channel' })
  const messages = room.feeds.map((feed, i) => {
    const message = [
      `${i + 1}. ${feed.channelId.title}`,
      `Src - ${feed.channelId.src}`,
      `Refresh - ${feed.channelId.frequency} mins`,
    ]
    if (feed.filters.length > 0) message.push(`Filters - ${feed.filters}`)
    return message.join('\n')
  })
  if (messages.length === 0) {
    return replyMessage(
      event,
      'This room is not subscribed to any feed. '
      + 'Quick add from the global feed to get started.',
    )
  }
  return replyMessage(event, messages.join('\n'))
}

export const addFilter = async (event: ReplyableEvent, title: string, filters: string[]) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId }).populate({ path: 'feeds.channelId', model: 'rss_channel' })

  const feed = room.feeds.find(f => f.channelId.title.toLowerCase().trim() === title.toLowerCase().trim())
  if (!feed) {
    return replyMessage(event, 'RssChannel not found in this room')
  }

  const prevFilters = [...feed.filters]

  feed.filters = [...new Set([...feed.filters, ...filters])]

  await room.save()

  return replyMessage(event, `Update filter for ${title} from "${prevFilters.join(', ')}" to "${feed.filters.join(', ')}"`)
}

export const removeFilter = async (event: ReplyableEvent, title: string, filters: string[]) => {
  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId }).populate({ path: 'feeds.channelId', model: 'rss_channel' })

  const feed = room.feeds.find(f => f.channelId.title.toLowerCase().trim() === title.toLowerCase().trim())
  if (!feed) {
    return replyMessage(event, 'RssChannel not found in this room')
  }

  const prevFilters = [...feed.filters]

  feed.filters = _.difference(prevFilters, filters)

  await room.save()

  return replyMessage(event, `Update filter for ${title} from "${prevFilters.join(', ')}" to "${feed.filters.join(', ')}"`)
}
