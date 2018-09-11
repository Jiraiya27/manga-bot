declare module 'rss-parser' {
  interface RssItem {
    title?: string,
    link?: string,
    pubDate?: string,
    isoDate?: Date,
    author?: string,
    content?: string,
    contentSnippet?: string,
    id?: string,
  }

  interface RssFeed {
    link?: string,
    feedUrl?: string,
    title?: string,
    lastBuildDate?: string,
    items: Array<RssItem>,
  }
  export default class RSSParser {
    parseURL(feedURL: string, callback?: (result: RssFeed) => any, redirectCount?: Number): RssFeed
  }
}