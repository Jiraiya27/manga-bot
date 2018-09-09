const mongoose = require('mongoose')

const RoomFeedsSchema = new mongoose.Schema({
  channelId: mongoose.Schema.Types.ObjectId,
  filters: [String],
})

const RoomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'group', 'room'],
  },
  feeds: {
    type: [RoomFeedsSchema],
    default: [],
  },
})

const Room = mongoose.model('room', RoomSchema)

module.exports = Room
