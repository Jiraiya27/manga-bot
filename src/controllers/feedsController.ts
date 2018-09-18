import { Request, Response } from 'express'
import moment from 'moment'

import RssChannel, { RssChannelDocument } from '../models/RssChannel'
import { isFeedsPopulated } from '../models/Room'

import { client } from '../services/lineSDK'
import { parse } from '../services/RSSParser'
import { RssFeed, RssItem } from 'rss-parser'
import { RoomDocument } from '../models/Room'

// skips querying for rooms again
export const refresh = async (req: Request, res: Response) => {
  try {
    const channels = await RssChannel.find({
      $where: 'this.lastUpdated < new Date(new Date().getTime() - this.frequency * 60000)',
    }).populate({ path: 'roomIds', model: 'room' })

    const cache: { [key: string]: RssFeed } = {}

    await Promise.all(channels.map(async channel => {
      const feed = cache[channel.src] || await parse(channel.src)
      const lastUpdatedMoment = moment(channel.lastUpdated)

      // Filter out new items
      let newItems: RssItem[] = []
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
      const rooms = <RoomDocument[]>channel.roomIds
      await Promise.all(rooms.map(async room => {
        if (isFeedsPopulated(room.feeds)) return Promise.reject('Room should not be populated')
        // Get room's filters for this feed
        const feed = room.feeds.find(f => f.channelId.toString() === channel._id.toString())
        if (feed === undefined) {
          return console.error(`Room id: ${room.id} doesn't match with channel id: ${channel._id}`)
        }
        // Update only items that passes room's filter for that feed
        // FIX null/undefined check in typescript
        // What's the point of handling it above if it's still undefined
        const filteredItems = feed && feed.filters.length > 0
          // TODO: Fix parser types to not be optional?
          // Might need to force some required types to be non-optional and provide js checks before save/ is required in model
          ? newItems.filter(item => feed.filters.filter(filter => new RegExp(filter, 'i').test(item.title || '')).length > 0)
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
      // TODO: consolidate parser items with actual stored item
      // Difference in presence here
      channel.items = <RssChannelDocument['items']>feed.items
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
