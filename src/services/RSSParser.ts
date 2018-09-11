import Parser from 'rss-parser'

const parser = new Parser()

export async function parse(url: string) {
  try {
    const feed = await parser.parseURL(url)
    return feed
  } catch (error) {
    console.error('RSSParser.parse:', url, error)
    return Promise.reject(new Error(`Failed to parse url: ${url}`))
  }
}
