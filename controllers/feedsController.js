const moment = require('moment')

const RssChannel = require('../models/RssChannel')

const { client } = require('../services/lineSDK')
const { parse } = require('../services/RSSParser')

// skips querying for rooms again
const refresh = async (req, res) => {
  try {
    const channels = await RssChannel.find({
      $where: 'this.lastUpdated < new Date(new Date().getTime() - this.frequency * 60000)',
    }).populate('roomIds')

    const cache = {}

    await Promise.all(channels.map(async channel => {
      const feed = cache[channel.src] || await parse(channel.src)
      const lastUpdatedMoment = moment(channel.lastUpdated)

      // Filter out new items
      let newItems = []
      // ms doesn't use 24 Hr format and doesn't tell AM/PM
      // niceoppai uses GMT +7
      if (feed.title === 'MangaStream Releases' || feed.title === 'Niceoppai Recent Updates') {
        const lastItem = channel.items[0]
        for (let i = 0; i < feed.items.length; i++) {
          const item = feed.items[i];
          if (item.title === lastItem.title) break;
          newItems.push(item)
        }
      } else {
        newItems = feed.items.filter(item => moment(item.isoDate).isAfter(lastUpdatedMoment))
      }

      console.log({ title: channel.title, newItems })

      // Cache response, might not work if requests are in parallel anyway
      cache[channel.src] = feed

      // Update subscribed rooms based on channels
      const rooms = channel.roomIds

      console.log({ channel, rooms })

      await Promise.all(rooms.map(async room => {
        // Get room's filters for this feed
        const { filters } = room.feeds.find(f => f.channelId.toString() === channel._id.toString())
        console.log({ filters })
        // Update only items that passes room's filter for that feed
        const filteredItems = filters.length > 0
          ? newItems.filter(item => filters.filter(filter => new RegExp(filter, 'i').test(item.title)).length > 0)
          : newItems
        // Send message to update room
        await Promise.all(filteredItems.map(newItem => {
          return client.pushMessage(room.id, {
            type: 'text',
            text: `${newItem.title} : ${newItem.link}`,
          })
        }))
      }))

      // Update channel time and items
      /* eslint-disable no-param-reassign */
      channel.items = feed.items
      channel.lastUpdated = new Date()
      await channel.save()
    }))

    return res.send('Success')
  } catch (error) {
    if (error.originalError) {
      console.error(error.originalError.response)
    } else {
      console.error(error)
    }
    return res.send('Failed')
  }
}

module.exports = {
  refresh,
}
