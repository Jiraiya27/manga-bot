const {
  handleMessage,
  handleFollow,
  handleUnfollow,
  handleJoin,
  handleLeave,
} = require('../services/lineEvents')

const webhook = async (req, res) => {
  await Promise.all(req.body.events.map(handleEvent))
  return res.status(200).json({
    message: 'OK'
  })
}

const handleEvent = async event => {
  console.debug('Event:', event)

  switch (event.type) {
    case 'message':
      return handleMessage(event)
    case 'follow':
      return handleFollow(event)
    case 'unfollow':
      return handleUnfollow(event)
    case 'join':
      return handleJoin(event)
    case 'leave':
      return handleLeave(event)
    default:
      return Promise.resolve()
  }
}

module.exports = {
  webhook,
}