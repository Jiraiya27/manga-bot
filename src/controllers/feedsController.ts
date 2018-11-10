import { Request, Response } from 'express'
import moment from 'moment'

import { client } from '../services/lineSDK'
import parseRss from '../services/RSSParser'
import { RssFeed, RssItem } from 'rss-parser'
import { Feed } from '../entities/Feed'

// skips querying for rooms again
export const refresh = async (req: Request, res: Response) => {
  try {
    const feeds = await Feed.findPastUpdate()

    // Feed cache for repeating sources
    const cache: { [key: string]: RssFeed } = {}

    await Promise.all(feeds.map(async (feed, index) => {
      const rss = cache[feed.source] || await parseRss(feed.source)
      const lastUpdatedMoment = moment(feed.lastUpdated)

      let newItems: RssItem[] = []
      // ms doesn't use 24 Hr format and doesn't tell AM/PM
      // niceoppai uses GMT +7
      if (feed.title === 'MangaStream Releases' || feed.title === 'Niceoppai Recent Updates') {
        for (let i = 0; i < rss.items.length; i++) {
          const item = rss.items[i];
          // Assuming that order remains the same, get new items until last known item
          if (item.title === feed.lastItem.title) break;
          newItems.push(item)
        }
      } else {
        // get new items based on last updated time
        newItems = rss.items.filter(item => moment(item.isoDate).isAfter(lastUpdatedMoment))
      }

      // Cache rss response, probably won't work since requests are parallel?
      cache[feed.source] = rss

      // Update subscribed rooms
      await Promise.all(feed.roomFeeds.map(async roomFeed => {
        // Apply filters to title
        const filteredItems = roomFeed.filters.length > 0
          ? newItems.filter(item => roomFeed.filters.filter(filter => new RegExp(filter, 'i').test(item.title || '')).length > 0)
          : newItems

        // Send message to update room
        await Promise.all(filteredItems.map(newItem => {
          return client.pushMessage(roomFeed.room.id, {
            type: 'text',
            text: `${newItem.title} : ${newItem.link}`,
          })
        }))
      }))

      // Update channel time and items
      feed.lastItem = rss.items[0]
      feed.lastUpdated = new Date()
      delete feed.roomFeeds // Need to delete otherwise it gets updated twice and causes error
      await feed.save()
    }))

    return res.send('Success')
  } catch (error) {
    // Error from @lineSDK
    if (error.originalError) {
      console.error(error.originalError.response)
    } else {
      console.error(error)
    }
    return res.send('Failed')
  }
}
