const mongoose = require('mongoose')

const RssItemSchema = new mongoose.Schema({
  title: String,
  link: String,
  pubDate: String,
  content: String,
  guid: String,
  isoDate: Date,
})

const RssChannelSchema = new mongoose.Schema({
  src: String,
  title: String,
  items: [RssItemSchema],
  frequency: {
    type: Number,
    default: 30,
  },
  global: {
    type: Boolean,
    default: false,
  },
  roomIds: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  lastUpdated: Date,
})

const RssChannel = mongoose.model('rss_channel', RssChannelSchema)

module.exports = RssChannel
