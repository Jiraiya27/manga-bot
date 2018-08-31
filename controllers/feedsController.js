const Parser = require('rss-parser')
const moment = require('moment')

const RssChannel = require('../models/RssChannel')
const Room = require('../models/Room')

const parser = new Parser()

const { client } = require('../services/lineSDK')

const updateAll = async (req, res) => {
  try {
    console.log('Update all!')
    // Find all channels that last updated time has passed
    // longer than its defined refresh frequency
    // const channels = await mongoose.connection
    //   .collection('rss_channels')
    //   .find({
    //     $where: "this.lastUpdated > new Date(new Date().getTime() - this.frequency * 6000000)"
    //   })
    let channels = await RssChannel.find()
    console.log({ channels })
    channels = channels.filter(channel => moment(channel.lastUpdated).add(channel.frequency, 'minutes').isSameOrBefore(moment(), 'minute'))
    console.log({ channels })

    // Loop all channels
    /* eslint-disable no-param-reassign */
    await Promise.all(channels.map(async channel => {
      console.log({ channel })
      const feed = await parser.parseURL(channel.src)
      const lastUpdatedMoment = moment(channel.lastUpdated)

      // Filter out new items
      let newItems = []
      // ms doesn't use 24 Hr format and doesn't tell AM/PM
      if (feed.title === 'MangaStream Releases') {
        const lastItem = channel.items[0]
        for (let i = 0; i < feed.items.length; i++) {
          const item = feed.items[i];
          if (item.title === lastItem.title) break;
          newItems.push(item)
        }
      } else {
        newItems = feed.items.filter(item => moment(item.isoDate).isAfter(lastUpdatedMoment))
      }

      console.log({ newItems })

      // Update subscribed rooms based on channels
      const rooms = await Room.find({ 'feeds.channelId': channel._id })

      console.log({ rooms })

      await Promise.all(rooms.map(async room => {
        // Get room's filters for this feed
        const roomFilters = room.feeds.find(f => f.channelId.toString() === channel._id.toString()).filters
        console.log({ roomFilters })
        // Update only items that passes room's filter for that feed
        const filteredItems = roomFilters.length > 0
          ? newItems.filter(item => roomFilters.filter(filter => new RegExp(filter, 'i').test(item.title)).length > 0)
          : newItems
        // Send message to update room
        await Promise.all(filteredItems.map(newItem => client.pushMessage(room.id, { type: 'text', text: `${newItem.title} : ${newItem.link}` })))
      }))

      // Update channel time and items
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
    return res.status(500).send('Failed')
  }
}

module.exports = {
  updateAll,
}

// Update all

// get all channels + their roomIds, global and private, that has passed last updated
// normalize source and add roomNo as a big object { [src]: [roomIds]}
// loop normalized source and fetch new items
// loop through source's subscribed rooms and their respective filters, send any updates
// update source items and lastUpdated time


// Add src

// All src will be private, except admin can add global
// If admin add global src will need to migrate room's data a bit (remove their private to use global's src and name)
// will check is url, is rss, is not a repeat after checking normalized src, is not a repeat in name for the room and also all global sources (for name and normalized src, must used addToRoom instead)
// Can edit private src/name/frequency not faster than 30 mins for now?
// Add filter later from different command


// Add to room

// add same way from global src
// private src auto added
// can add/edit/remove filters as needed
