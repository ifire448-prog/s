import 'dotenv/config';
import { storage } from './storage';
import { fetchMultipleSubreddits, type RedditVideo } from './reddit-scraper';
import { fetchTrendingRedgifs, fetchRedgifsByTags, type RedGifsMedia } from './redgifs-scraper';
import cron from 'node-cron';

function proxify(u: string) {
  if (!u) return u;
  return u.startsWith('/uploads') ? u : `/api/proxy?url=${encodeURIComponent(u)}`;
}

function unwrapProxy(u: string) {
  try {
    if (!u) return '';
    if (!u.startsWith('/api/proxy?')) return u;
    const qs = u.split('?')[1] || '';
    const sp = new URLSearchParams(qs);
    return sp.get('url') || u;
  } catch {
    return u;
  }
}

function normalizeMediaKey(raw: string) {
  try {
    let u = unwrapProxy(raw);
    const p = new URL(u);
    const host = p.hostname.toLowerCase();
    let path = p.pathname.toLowerCase();
    if (host.endsWith('v.redd.it')) {
      const seg = path.split('/').filter(Boolean)[0] || '';
      path = `/${seg}`;
    }
    // Normalize gifv to mp4
    if (path.endsWith('.gifv')) path = path.replace('.gifv', '.mp4');
    return `${host}${path}`;
  } catch {
    return raw || '';
  }
}

async function scrapeReddit(subreddits: string[], limitPerSub: number, sort: string) {
  const existing = await storage.getAllVideos();
  const seen = new Set(existing.map(v => normalizeMediaKey(v.videoUrl)));

  const videos: RedditVideo[] = await fetchMultipleSubreddits(subreddits, limitPerSub, sort);
  let added = 0;

  for (const rv of videos) {
    const key = normalizeMediaKey(rv.url);
    if (!key || seen.has(key)) continue;

    await storage.createVideo({
      videoUrl: proxify(rv.url),
      thumbnailUrl: rv.thumbnail || null,
      title: rv.title || null,
      description: rv.title || null,
      username: rv.author || 'reddit_user',
      uploaderIp: 'scraper',
      // @ts-ignore
      source: 'reddit',
    });
    seen.add(key);
    added++;
  }

  return added;
}

async function scrapeRedgifs(limit: number, tags?: string[]) {
  const existing = await storage.getAllVideos();
  const seen = new Set(existing.map(v => normalizeMediaKey(v.videoUrl)));

  const items: RedGifsMedia[] = tags && tags.length > 0
    ? await fetchRedgifsByTags(tags, limit, false)
    : await fetchTrendingRedgifs(limit, false);

  let added = 0;
  for (const item of items) {
    const key = normalizeMediaKey(item.url);
    if (!key || seen.has(key)) continue;

    await storage.createVideo({
      videoUrl: proxify(item.url),
      thumbnailUrl: item.thumbnailUrl || null,
      title: item.title || null,
      description: item.tags?.join(', ') || null,
      username: item.userName || 'redgifs_user',
      uploaderIp: 'scraper',
      // @ts-ignore
      source: 'redgifs',
    });
    seen.add(key);
    added++;
  }
  return added;
}

async function scrapeOnce() {
  const subList = (process.env.SCRAPER_SUBREDDITS || 'funnyvideos,videos,unexpected,PublicFreakout,ContagiousLaughter')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const limit = Number(process.env.SCRAPER_LIMIT || 20);
  const sort = process.env.SCRAPER_SORT || 'hot';
  const redgifsLimit = Number(process.env.SCRAPER_REDGIFS_LIMIT || 40);
  const redgifsTags = (process.env.SCRAPER_REDGIFS_TAGS || '').split(',').map(s => s.trim()).filter(Boolean);

  console.log('🧹 Scrape start');
  const rAdded = await scrapeReddit(subList, limit, sort).catch(() => 0);
  const gAdded = await scrapeRedgifs(redgifsLimit, redgifsTags).catch(() => 0);
  console.log(`✅ Scrape complete: +${rAdded} from Reddit, +${gAdded} from RedGIFs`);
}

async function main() {
  const schedule = process.argv.includes('--schedule');
  await scrapeOnce();
  if (schedule) {
    const cronSpec = process.env.SCRAPER_CRON || '0 */4 * * *'; // every 4 hours
    console.log(`⏲️  Scheduling scraper with cron '${cronSpec}'`);
    cron.schedule(cronSpec, () => {
      scrapeOnce().catch(err => console.error('Scrape run failed:', err));
    });
  }
}

main().catch((e) => {
  console.error('Scraper failed to start:', e);
  process.exit(1);
});
