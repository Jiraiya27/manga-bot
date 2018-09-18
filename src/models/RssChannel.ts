import { Schema, model, Document } from 'mongoose'
import { RoomDocument } from './Room'

export type RssItemSchema = {
  title: string,
  link: string,
  pubDate: string,
  content: string,
  guid: string,
  isoDate: Date,
}

export type RssChannelSchema = {
  src: string,
  title: string,
  items: RssItemSchema[],
  frequency: number,
  global: boolean,
  roomIds: Schema.Types.ObjectId[] | RoomDocument[],
  lastUpdated: Date,
}

const RssItemSchema = new Schema({
  title: String,
  link: String,
  pubDate: String,
  content: String,
  guid: String,
  isoDate: Date,
})

const RssChannelSchema = new Schema({
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
    type: [Schema.Types.ObjectId],
    default: [],
  },
  lastUpdated: Date,
})

export type RssChannelDocument = Document & RssChannelSchema

const RssChannel = model<RssChannelDocument>('rss_channel', RssChannelSchema)

export default RssChannel

export type EditableRssChannelProperties = 'src' | 'title' | 'frequency'
