const Parser = require('rss-parser')
const moment = require('moment')
const mongoose = require('mongoose')

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
    channels = channels.filter(channel => {
      return moment(channel.lastUpdated).add(channel.frequency, 'minutes').isBefore(moment())
    })
    console.log({ channels })
    
    // Loop all channels
    await Promise.all(channels.map(async channel => {
      console.log({ channel })
      const feed = await parser.parseURL(channel.src)
      const lastUpdatedMoment = moment(channel.lastUpdated)
      // Filter out new items
      const newItems = feed.items.filter(item => {
        return moment(item.isoDate).isAfter(lastUpdatedMoment)
      })

      console.log({ newItems })

      // Update subscribed rooms based on channels
      const rooms = await Room.find({ 'feeds.channelId': channel._id })

      console.log({ rooms })

      await Promise.all(rooms.map(async room => {
        await Promise.all(newItems.map(newItem => {
          return client.pushMessage(room.id, `${newItem.title} : ${newItem.link}`)
        }))
      }))

      // Update channel time and items
      channel.items = feed.items
      channel.lastUpdated = new Date()
      await channel.save()
    }))

    return res.send('Success') 
  } catch (error) {
    console.error(error)
    return res.status(500).send('Failed')
  }
}

module.exports = {
  updateAll,
}
