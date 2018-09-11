import { Schema, model, Document } from 'mongoose'

type RoomFeedsSchema = {
  channelId: Schema.Types.ObjectId,
  filters: Array<string>,
}

type RoomSchema = {
  id: string,
  type: 'user' | 'group' | 'room',
  feeds: Array<RoomFeedsSchema>,
}

const RoomFeedsSchema = new Schema({
  channelId: Schema.Types.ObjectId,
  filters: [String],
})

const RoomSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['user', 'group', 'room'],
  },
  feeds: {
    type: [RoomFeedsSchema],
    default: [],
  },
})

export type RoomDocument = Document & RoomSchema

const room = model<RoomDocument>('room', RoomSchema)
export default room
