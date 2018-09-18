import { Schema, model, Document } from 'mongoose'
import { RssChannelSchema } from './RssChannel'

type RoomFeedsSchema = {
  channelId: Schema.Types.ObjectId,
  filters: string[],
}

type RoomFeedsSchemaPopulated = {
  channelId: RssChannelSchema,
  filters: string[],
}

type RoomSchema = {
  id: string,
  type: 'user' | 'group' | 'room',
  feeds: RoomFeedsSchema[] | RoomFeedsSchemaPopulated[],
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

export function isFeedsPopulated(feeds: any | RoomFeedsSchemaPopulated[]): feeds is RoomFeedsSchemaPopulated[] {
  return feeds[0].channelId.src !== undefined
}