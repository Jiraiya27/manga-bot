const Parser = require('rss-parser');

const parser = new Parser()

async function parse(url) {
  try {
    const feed = await parser.parseURL(url)
    return feed
  } catch (error) {
    console.error('RSSParser.parse:', url, error)
    return Promise.reject(new Error(`Failed to parse url: ${url}`))
  }
}

module.exports = {
  parse,
}
