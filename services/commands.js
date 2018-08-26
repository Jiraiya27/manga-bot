const Parser = require('rss-parser')

const RssChannel = require('../models/RssChannel')
const Room = require('../models/Room')
const { getChatRoom, sendMessage } = require('./lineSDK')

const parser = new Parser();

const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/m
const dupKeyContentRegex = /dup\ key\:\ \{\ \:\ \"(\S*)\"\ \}/

// Returns a list of all commands
function help() {

}

// Adds rss feed to db
const addSource = async (event, { src, title, frequency = 30 }) => {
  if (!urlRegex.test(src)) {
    return sendMessage(event, `Source '${src}' isn't a url`)
  }

  const feed = await parser.parseURL(src)
  const channelTitle = title || feed.title

  try {
    await RssChannel.create({ src, title: channelTitle, items: feed.items, frequency, lastUpdated: new Date() })
    return sendMessage(event, ['Added', `rss feed src: ${src}`, `title: ${channelTitle}`, `refresh frequency: ${frequency} mins`].join('\n'))
  } catch (error) {
    console.error(error)
    if (error.code === 11000) {
      const dup = dupKeyContentRegex.exec(error.errmsg)
      return sendMessage(event, `Duplicate at value: ${dup}`)
    }
    return sendMessage(event, 'Add source error')
  }
}

// Adds rss feed based on name to room
const addSourceToRoom = async (event, title, filters) => {
  if (!title) {
    return sendMessage(event, "Feed's title can't be empty")
  }

  const channel = await RssChannel.findOne({ title: new RegExp(title, 'i') })
  if (!channel) {
    return sendMessage(event, `Rss Feed with title: ${title} not found`)
  }

  const { chatId } = getChatRoom(event)
  const room = await Room.findOne({ id: chatId })
  room.feeds.push({ channelId: channel.id, filters })
  await room.save()
  const message = filters
    ? `Added feed ${channel.title} with filters as ${filters}`
    : `Added feed ${channel.title} without any filter`
  return sendMessage(event, message)
}

// Update src/title/frequency
function updateSource() {

}

// Updates feed
function refreshSource() {

}

const listSources = async event => {

}

function listRoomFeeds() {

}

module.exports = {
  help,

  addSource,
  addSourceToRoom,
  updateSource,
  refreshSource,
  listSources,
}
