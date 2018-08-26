const Room = require('../models/Room')
const { addSource, addSourceToRoom, listSources } = require('./commands')

const handleMessage = async event => {
  const { text, type } = event.message
  if (type !== 'text') {
    console.debug('Received unhandled message type:', type)
    return Promise.resolve()
  }

  const addSourceRegex = /^\/addSource (\S+)(\s\S+)?(\s\S+)?/
  const addToRoomRegex = /^\/add (\S+)/
  const listSourcesRegex = /^\/listSources/

  console.log({ text })

  if (addSourceRegex.test(text)) {
    const [, src, title, frequency] = addSourceRegex.exec(text)
    return addSource(event, { src, title, frequency })
  }

  if (addToRoomRegex.test(text)) {
    const [, title] = addToRoomRegex.exec(text)
    return addSourceToRoom(event, title)
  }

  if (listSourcesRegex.test(text)) {
    return listSources(event)
  }

}

const handleFollow = async event => {
  const room = await Room.create({
    id: event.source.userId,
    type: 'user',
  })
  console.log('Followd room:', room)
  return Promise.resolve()
}

const handleUnfollow = async event => {
  const room = await Room.deleteOne({
    id: event.source.userId,
  })
  console.log('Unfollowd room:', room)
  return Promise.resolve()
}

const handleJoin = async event => {
  const room = await Room.create({
    id: event.source[`${event.source.type}Id`],
    type: event.source.type,
  })
  console.log('Joined room:', room)
  return Promise.resolve()
}

const handleLeave = async event => {
  const room = await Room.deleteOne({
    id: event.source[`${event.source.type}Id`],
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
