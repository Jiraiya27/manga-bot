import normalizeUrl from 'normalize-url';
import _ from 'lodash';

import { ReplyableEvent, TemplateColumn } from '@line/bot-sdk';
import { RssFeed } from 'rss-parser';
import { getChatRoom, replyMessage, replyTemplateCarousel, isAdmin } from './lineSDK';
import parse from './RSSParser';
import { Feed } from '../entities/Feed';
import { Room } from '../entities/Room';
import { RoomFeeds } from '../entities/RoomFeeds';

const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/m;

type AddSourceOptions = {
  src: string;
  title: string;
  frequency?: number;
  global?: boolean;
};

// Returns a list of all commands
export const help = async (event: ReplyableEvent) => {
  // const feed = Feed.create({
  //   src: 'src',
  //   title: 'csdcs',
  //   lastUpdate: new Date(),
  // })
  // await feed.save()
  // console.log({ feed })
  // const room = Room.create({
  //   id: 'csdcsdc',
  //   type: 'user',
  // })
  // await room.save()
  // const roomFeed = RoomFeeds.create({
  //   room,
  //   feed,
  // })
  // await roomFeed.save()
  // console.log({ roomFeed })
  const feeds = await Feed.findPastUpdate();
  feeds.map(feed => {
    console.log({ feed: feed.roomFeeds });
  });
  // console.log({ feeds })
};

export const validateRssSource = (url: string) => {
  if (!urlRegex.test(url)) throw new Error(`Source '${url}' isn't a url`);
  const normalizedUrl = normalizeUrl(url);
  return parse(normalizedUrl).catch(error => {
    console.error(error);
    throw new Error(`Could not parse ${url}`);
  });
};

// Adds rss feed to db
// TODO: remove admin/global add, can just manual add from db
export const addSource = async (event: ReplyableEvent, { src, title, frequency = 30, global = false }: AddSourceOptions) => {
  const feed: RssFeed = await validateRssSource(src).catch(error => {
    return replyMessage(event, error.message);
  });
  const normalizedSrc = normalizeUrl(src);

  if (Number.isNaN(Number(frequency))) {
    return replyMessage(event, `Frequency ${frequency} isn't a number`);
  }

  const channelTitle = title || feed.title;

  // Can't duplicate with global source
  const globalFeeds = await Feed.createQueryBuilder()
    .where('global = true')
    .getMany();

  if (globalFeeds.length) {
    // either repeat of global source/title exists
    if (globalFeeds.find(f => f.source === normalizedSrc)) {
      return replyMessage(event, 'Global channel with same source exists');
    }
    if (globalFeeds.find(f => f.title === title)) {
      return replyMessage(event, 'Global channel with same title exists');
    }
  }

  if (global && !isAdmin(event)) {
    return replyMessage(event, 'You cannot add a global source');
  }

  const { chatId } = getChatRoom(event);

  if (!global) {
    // Reject if room contains duplicate src/title
    const roomFeeds = await RoomFeeds.createQueryBuilder('roomFeed')
      .innerJoinAndMapOne('roomFeed.room', 'roomFeed.room', 'room', 'room.id = :id', { id: chatId })
      .innerJoinAndMapOne('roomFeed.feed', 'roomFeed.feed', 'feed')
      .getMany();

    if (!roomFeeds || !roomFeeds.length) return Promise.reject(new Error(`Room ${chatId} doesn't exist`));

    roomFeeds.forEach(roomFeed => {
      if (roomFeed.feed.title === channelTitle) {
        return replyMessage(event, 'Your room already has an rss feed with the same title');
      }
      if (roomFeed.feed.source === normalizedSrc) {
        return replyMessage(event, 'Your room already has an rss feed with the same source');
      }
    });

    try {
      // Add private source
      const newFeedData = Feed.create({
        source: normalizedSrc,
        title: channelTitle,
        lastItem: feed.items[0],
        frequency: Number(frequency),
        global: false,
        lastUpdated: new Date(),
      });
      const newFeed = await newFeedData.save();
      // Add source to room
      const newRoomFeed = RoomFeeds.create({
        roomId: chatId,
        feedId: newFeed.id,
        filters: [],
      });
      await newRoomFeed.save();
      return replyMessage(
        event,
        ['Added', `rss feed src: ${src}`, `title: ${channelTitle}`, `refresh frequency: ${frequency} mins`].join('\n'),
      );
    } catch (error) {
      console.error('Create private RssChannel error:', error);
      return replyMessage(event, 'Add source error');
    }
  } else {
    const privateFeed = await Feed.createQueryBuilder()
      .where('global = false')
      .orWhere('source = :source', { source: normalizedSrc })
      .orWhere('title = :title', { title: channelTitle })
      .getOne();

    if (privateFeed) {
      return replyMessage(event, 'Conflict with an existing private feed. Go use a migration script.');
    }

    // Add source to room
    try {
      const feedData = Feed.create({
        source: normalizedSrc,
        title: channelTitle,
        lastItem: feed.items[0],
        frequency: Number(frequency),
        global: true,
        lastUpdated: new Date(),
      });
      await feedData.save();
      return replyMessage(
        event,
        ['Added Global Feed', `rss feed src: ${src}`, `title: ${channelTitle}`, `refresh frequency: ${frequency} mins`].join(
          '\n',
        ),
      );
    } catch (error) {
      console.error('Create global RssChannel error:', error);
      return replyMessage(event, 'Add source error');
    }
  }
};

// Adds rss feed from global sources based on name to room
export const addSourceToRoom = async (event: ReplyableEvent, title: string, filters: string[]) => {
  title = title.toLowerCase().trim();
  if (!title) {
    return replyMessage(event, "Feed's title can't be empty");
  }

  const feed = await Feed.findOne({ where: { title } });
  if (!feed) {
    return replyMessage(event, `Feed with title: ${title} not found`);
  }

  const { chatId } = getChatRoom(event);
  const room = await Room.findOne({ where: { id: chatId }, relations: ['roomFeeds'] });

  if (!room) return Promise.reject(new Error(`Room ${chatId} doesn't exist`));

  const existingRoomFeed = room.roomFeeds.find(rf => rf.feedId === feed.id);
  const existingFilter = existingRoomFeed ? [...existingRoomFeed.filters] : undefined;

  // Add filter if already exists
  // Create new roomFeed if new
  let newFilter = [];
  if (existingRoomFeed) {
    newFilter = [...new Set([...existingRoomFeed.filters, ...filters])];
    existingRoomFeed.filters = newFilter;
    await existingRoomFeed.save();
  } else {
    newFilter = filters;
    const roomFeed = RoomFeeds.create({
      feedId: feed.id,
      roomId: room.id,
      filters: newFilter,
    });
    await roomFeed.save();
  }

  const message = existingRoomFeed && existingFilter
    ? `Update feed ${feed.title}'s filters from ${existingFilter.join(', ')} to be ${existingRoomFeed.filters.join(', ')}`
    : newFilter.length > 0
      ? `Added feed ${feed.title} with filter ${newFilter.join(', ')}`
      : `Added feed ${feed.title} without any filter`;
  return replyMessage(event, message);
};

// Update src/title/frequency
export const editSource = async (event: ReplyableEvent, title: string, property: string, newVal: string) => {
  newVal = newVal.toLowerCase().trim();
  const { chatId } = getChatRoom(event);

  const feed = await Feed.createQueryBuilder('feed')
    .where('feed.title = :title', { title: title.toLocaleLowerCase().trim() })
    .innerJoin('feed.roomFeeds', 'roomFeed', 'roomFeed.roomId = :chatId', { chatId })
    .getOne();

  if (!feed) return replyMessage(event, 'RssChannel not found');

  if (feed.global) {
    return replyMessage(event, 'Cannot edit global source');
  }

  if (property !== 'title' && property !== 'frequency') {
    return replyMessage(event, 'Can edit only source, title, and frequency');
  }

  if (!newVal) {
    return replyMessage(event, 'New value cannot be empty');
  }

  feed[property] = newVal;
  await feed.save();

  // TODO: model static function to print details
  return replyMessage(event, `Updated ${property} to ${newVal}`);
};

// list global sources
export const listSources = async (event: ReplyableEvent) => {
  const { chatId } = getChatRoom(event);
  const feeds = await Feed.createQueryBuilder('feed')
    .leftJoinAndSelect('feed.roomFeeds', 'roomFeed', 'roomFeed.roomId = :chatId', { chatId })
    .where('global = true')
    .getMany();
  if (!feeds.length) return replyMessage(event, 'There are no global feeds. Admin go do your job.');

  const altTexts: string[] = [];
  const columns: TemplateColumn[] = feeds.map((feed, i) => {
    const text = [`${i + 1}. ${feed.title}`, `Src - ${feed.source}`, `Refresh - ${feed.frequency} mins`].join('\n');
    altTexts.push(text);

    const label = feed.roomFeeds.length ? 'Remove' : 'Add';
    const data = feed.roomFeeds.length ? `/remove-source ${feed.title}` : `/add ${feed.title}`;
    return {
      text,
      actions: [
        {
          // string literal in array.map bug https://github.com/Microsoft/TypeScript/issues/11152
          // Need to explicitly cast as string literal again
          type: 'postback' as 'postback',
          label,
          data,
        },
      ],
    };
  });

  const altText = altTexts.join('\n');

  return replyTemplateCarousel(event, altText, columns);
};

// list feeds subscribed by room
export const listRoomFeeds = async (event: ReplyableEvent) => {
  const { chatId } = getChatRoom(event);
  const feeds = await Feed.createQueryBuilder('feed')
    .innerJoinAndSelect('feed.roomFeeds', 'roomFeed', 'roomFeed.roomId = :chatId', { chatId })
    .getMany();

  if (!feeds.length) {
    return replyMessage(
      event,
      'This room is not subscribed to any feed. '
        + "Select 'List All' to subscribe to an existing feed or "
        + "Select 'Add' to include your own feed",
    );
  }

  const altTexts: string[] = [];
  const columns: TemplateColumn[] = feeds.map((feed, i) => {
    const text = [
      `${i + 1}. ${feed.title}`,
      // `Src - ${feed.source}`, // Comment out because exceed char limit (120)
      `Refresh - ${feed.frequency} mins`,
    ];
    if (feed.roomFeeds[0].filters.length) {
      text.push(`Filters - ${feed.roomFeeds[0].filters}`);
    }
    altTexts.push(text.join('\n'));

    return {
      text: text.join('\n'),
      actions: [
        {
          type: 'postback' as 'postback',
          label: 'Remove',
          data: `/remove-source ${feed.title}`,
        },
        {
          type: 'postback' as 'postback',
          label: 'Add filter',
          data: `/add-filter ${feed.title}`,
        },
        {
          type: 'postback' as 'postback',
          label: 'Remove filter',
          data: `/remove-filter ${feed.title}`,
        },
      ],
    };
  });

  const altText = altTexts.join('\n');

  return replyTemplateCarousel(event, altText, columns);
};

export const removeSourceFromRoom = async (event: ReplyableEvent, title: string) => {
  const { chatId } = getChatRoom(event);
  title = title.toLocaleLowerCase().trim();

  const roomFeed = await RoomFeeds.createQueryBuilder('roomFeed')
    .innerJoin('roomFeed.room', 'room', 'room.id = :id', { id: chatId })
    .innerJoin('roomFeed.feed', 'feed', 'feed.title = :title', { title })
    .getOne();

  if (!roomFeed) return replyMessage(event, `${title} doesn't exist in this room`);

  await roomFeed.remove();
  return replyMessage(event, `Deleted ${title} from this room`);
};

export const addFilter = async (event: ReplyableEvent, title: string, filters: string[]) => {
  const { chatId } = getChatRoom(event);
  title = title.toLocaleLowerCase().trim();

  if (!filters.length) return replyMessage(event, 'No filters supplied');

  const roomFeed = await RoomFeeds.createQueryBuilder('roomFeed')
    .innerJoin('roomFeed.room', 'room', 'room.id = :id', { id: chatId })
    .innerJoin('roomFeed.feed', 'feed', 'feed.title = :title', { title })
    .getOne();

  if (!roomFeed) return replyMessage(event, `Feed ${title} not found in this room`);

  const prevFilters = roomFeed.filters;

  roomFeed.filters = [...new Set([...prevFilters, ...filters])];

  await roomFeed.save();

  return replyMessage(
    event,
    `Updated filter for ${title} from "${prevFilters.join(', ')}" to "${roomFeed.filters.join(', ')}"`,
  );
};

export const removeFilter = async (event: ReplyableEvent, title: string, filters: string[]) => {
  const { chatId } = getChatRoom(event);
  title = title.toLocaleLowerCase().trim();

  const roomFeed = await RoomFeeds.createQueryBuilder('roomFeed')
    .innerJoin('roomFeed.room', 'room', 'room.id = :id', { id: chatId })
    .innerJoin('roomFeed.feed', 'feed', 'feed.title = :title', { title })
    .getOne();

  console.log({ roomFeed });

  if (!roomFeed) return replyMessage(event, 'Feed not found in this room');

  const prevFilters = roomFeed.filters;

  // Remove all filters if not supplied
  roomFeed.filters = filters.length ? _.difference(prevFilters, filters) : [];

  await roomFeed.save();

  const message = filters.length
    ? `Update filter for ${title} from "${prevFilters.join(', ')}" to "${roomFeed.filters.join(', ')}"`
    : `Removed filters fro ${title}`;
  return replyMessage(event, message);
};
