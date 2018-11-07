import app from './app'
import { Feed } from './entities/Feed';
import { Room } from './entities/Room';
// import { RoomFeeds } from './entities/RoomFeeds';

import rooms from './rooms.json'
import rsschannels from './rss_channels.json';

app.on('started', async () => {
  await Promise.all(rsschannels.map(rssChannel => {
    const item = rssChannel.items[0]
    const feed = Feed.create({
      source: rssChannel.src,
      title: rssChannel.title,
      frequency: rssChannel.frequency,
      global: rssChannel.global,
      lastUpdated: rssChannel.lastUpdated.$date,
      lastItem: {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        isoDate: item.isoDate.$date,
        content: item.content,
      }
    })
    return feed.save()
  }))
  return rooms.map(room => {
    const r = Room.create({
      id: room.id,
      type: room.type as 'user' | 'room' | 'group',
    })
    return r.save()
  })
})
