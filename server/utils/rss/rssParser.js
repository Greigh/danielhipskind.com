import RssParser from 'rss-parser';
import { format } from 'date-fns';
import NodeCache from 'node-cache';

const parser = new RssParser();
const cache = new NodeCache({ stdTTL: 600 });

export async function fetchAndParseRSS(url) {
  const cachedFeed = cache.get(url);
  if (cachedFeed) return cachedFeed;

  const feed = await parser.parseURL(url);
  const enrichedItems = feed.items.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.pubDate), 'MMM d, yyyy'),
    domain: new URL(item.link).hostname,
  }));

  cache.set(url, enrichedItems);
  return enrichedItems;
}
