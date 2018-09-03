const normalizer = require('normalize-url')

const RssChannel = require('../models/RssChannel')
const Room = require('../models/Room')
const { getChatRoom, replyMessage, isAdmin } = require('./lineSDK')
const { parse } = require('./RSSParser')

const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/m

// Returns a list of all commands
function help() {

}

// Adds rss feed to db
const addSource = async (event, { src, title, frequency = 30, global = false }) => {
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
const addSourceToRoom = async (event, title, filters) => {
  if (!title) {
    return replyMessage(event, "Feed's title can't be empty")
  }

  const channel = await RssChannel.findOne({ title: new RegExp(title, 'i') })
  if (!channel) {
    return replyMessage(event, `Rss Feed with title: ${title} not found`)
  }

  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId })

  if (channel.roomIds.contains(room._id.toString())) {
    return replyMessage(event, `This room is already subscribed to channel: ${channel.title}`)
  }

  const existingFeed = room.feeds.find(f => f.channelId.toString() === channel._id.toString())

  if (existingFeed) {
    existingFeed.filters = new Set([...existingFeed.filters, ...filters])
  } else {
    room.feeds.push({ channelId: channel._id, filters })
  }

  await room.save()
  const message = filters.length > 0
    ? existingFeed
      ? `Update feed ${channel.title}'s filters ato be  ${existingFeed.filters}`
      : `Added feed ${channel.title} with filters as ${filters}`
    : `Added feed ${channel.title} without any filter`
  return replyMessage(event, message)
}

// Update src/title/frequency
function updateSource() {

}

// Updates feed
function refreshSource() {

}

// list global sources
const listSources = async event => {
  const channels = await RssChannel.find({ global: true })
  const messages = channels.map((channel, i) => {
    return `${i + 1}. ${channel.title} - ${channel.src} - ${channel.frequency} mins`
  })
  return replyMessage(event, messages.join('\n'))
}

// list feeds subscribed by room
const listRoomFeeds = async event => {
  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId }).populate({ path: 'feeds.channelId', model: 'rss_channel' })
  const messages = room.feeds.map((feed, i) => {
    return `${i + 1}. ${feed.channelId.title} - ${feed.channelId.src} - ${feed.channelId.frequency} mins - Filters=${feed.filters}`
  })
  return replyMessage(event, messages.join('\n'))
}

module.exports = {
  help,

  addSource,
  addSourceToRoom,
  updateSource,
  refreshSource,
  listSources,
  listRoomFeeds,
}
