import axios from "axios";
import * as http from "http";
import * as https from "https";

/**
 * Reddit Video Scraper Service - OPTIMIZED FOR SPEED
 * Fetches video posts from Reddit's JSON API with aggressive caching and parallel requests
 */

// Cache to store Reddit responses and avoid rate limiting
const cache = new Map<string, { data: RedditVideo[], timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds (reduced from 60 for fresher content)

// Tunables via env
const TIMEOUT_MS = Number(process.env.REDDIT_TIMEOUT_MS || 20000);
const MAX_ERRORS_BEFORE_COOLDOWN = Number(process.env.REDDIT_MAX_ERRORS || 3);
const COOLDOWN_MS = Number(process.env.REDDIT_COOLDOWN_MS || 15 * 60 * 1000);
const BASE_DELAY_MS = Number(process.env.REDDIT_BASE_DELAY_MS || 250);

// OAuth credentials (script app)
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || "ShortFormFlux/1.0 (contact: you@example.com)";

let consecutiveErrors = 0;
let cooldownUntil = 0;
let nextAllowedAt = 0; // dynamic throttle timestamp

const oauthTokenCache: { token: string; expiresAt: number } = {
  token: "",
  expiresAt: 0,
};

// Axios instance factory (supports env proxy)
function createAxiosInstance() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const baseConfig: any = {
    timeout: TIMEOUT_MS,
    maxRedirects: 3,
    headers: {
      // Provide a compliant UA string per Reddit guidelines
      "User-Agent": REDDIT_USER_AGENT,
    },
  };

  if (proxyUrl) {
    try {
      const u = new URL(proxyUrl);
      baseConfig.proxy = {
        host: u.hostname,
        port: Number(u.port || (u.protocol === 'https:' ? 443 : 80)),
        protocol: u.protocol.replace(':', ''),
      };
    } catch {
      // Fallback to direct agents if proxy URL invalid
      baseConfig.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
      baseConfig.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
    }
  } else {
    // Keep-alive for connection reuse
    baseConfig.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
    baseConfig.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
  }

  return axios.create(baseConfig);
}

const axiosInstance = createAxiosInstance();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOAuthToken(debug: boolean = false): Promise<string> {
  if (oauthTokenCache.token && Date.now() < oauthTokenCache.expiresAt) {
    if (debug) {
      console.log("🔄 Using cached Reddit OAuth token");
    }
    return oauthTokenCache.token;
  }

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    throw new Error("Missing Reddit OAuth credentials. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in environment variables.");
  }

  try {
    if (debug) {
      console.log("🔐 Fetching new Reddit OAuth token...");
    }

    const params = new URLSearchParams({
      grant_type: "password",
      username: REDDIT_USERNAME,
      password: REDDIT_PASSWORD,
      scope: "read identity",
    });

    const response = await axios.post("https://www.reddit.com/api/v1/access_token", params.toString(), {
      timeout: TIMEOUT_MS,
      auth: {
        username: REDDIT_CLIENT_ID,
        password: REDDIT_CLIENT_SECRET,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": REDDIT_USER_AGENT,
      },
    });

    const accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;

    oauthTokenCache.token = accessToken;
    oauthTokenCache.expiresAt = Date.now() + (expiresIn - 60) * 1000; // refresh 1 min early

    if (debug) {
      console.log(`✅ Reddit OAuth token obtained (expires in ${expiresIn}s)`);
    }

    return accessToken;
  } catch (error) {
    console.error("❌ Failed to obtain Reddit OAuth token:", error);
    throw error;
  }
}

export interface RedditVideo {
  id: string;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  score: number;
  created: number;
}

/**
 * Fetches videos from a specific subreddit with pagination support
 * @param subreddit - Name of the subreddit (default: 'funnyvideos')
 * @param limit - Number of posts to fetch (default: 25)
 * @param sort - Sort order: 'new', 'hot', 'top', 'rising' (default: 'hot')
 * @param after - Pagination cursor from Reddit (optional)
 * @returns Array of Reddit video posts and next page cursor
 */
export async function fetchRedditVideos(
  subreddit: string = "funnyvideos",
  limit: number = 25,
  sort: string = "hot",
  after?: string
): Promise<{ videos: RedditVideo[]; after: string | null }> {
  // Allow disabling Reddit entirely (for incidents)
  if (process.env.REDDIT_DISABLE === 'true') {
    return { videos: [], after: null };
  }

  const cacheKey = `${subreddit}-${limit}-${sort}-${after || 'first'}`;
  
  // Check cache first (shorter cache for pagination)
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Using cached data for r/${subreddit} page ${after || 'first'} (${cached.data.length} videos)`);
    return { videos: cached.data, after: null }; // Return cached data without pagination
  }

  // Global cool-down window after repeated errors
  if (Date.now() < cooldownUntil) {
    console.log(`⏳ Reddit cooldown active for ${Math.round((cooldownUntil - Date.now()) / 1000)}s`);
    if (cached) return { videos: cached.data, after: null };
    return { videos: [], after: null };
  }
  
  try {
    const debug = process.env.REDDIT_DEBUG === 'true';
    // Dynamic throttling: wait until nextAllowedAt
    const now = Date.now();
    if (now < nextAllowedAt) {
      const wait = nextAllowedAt - now;
      if (debug) console.log(`🧰 Throttling Reddit request for ${wait}ms`);
      await delay(wait);
    }
    const accessToken = await getOAuthToken(debug);

    // Build URL with pagination support
    let url = `https://oauth.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}&raw_json=1&include_over_18=on`;
    if (after) {
      url += `&after=${after}`;
    }
    
    // Use optimized axios instance with connection pooling
    const response = await axiosInstance.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": REDDIT_USER_AGENT,
      },
    });

    // Update dynamic throttle from rate headers
    const remHeader = (response.headers?.['x-ratelimit-remaining'] ?? response.headers?.['X-Ratelimit-Remaining']) as any;
    const resetHeader = (response.headers?.['x-ratelimit-reset'] ?? response.headers?.['X-Ratelimit-Reset']) as any;
    const remaining = Number(remHeader);
    const resetSec = Number(resetHeader);
    if (!Number.isNaN(remaining) && !Number.isNaN(resetSec) && resetSec > 0) {
      const perReqMs = Math.ceil((resetSec * 1000) / Math.max(1, remaining));
      nextAllowedAt = Date.now() + perReqMs;
      if (debug) console.log(`⏱️ Rate headers -> remaining=${remaining}, reset=${resetSec}s, perReqDelay=${perReqMs}ms`);
    } else {
      nextAllowedAt = Date.now() + BASE_DELAY_MS;
    }

    if (!response.data?.data?.children) {
      console.error("Invalid Reddit API response");
      return { videos: [], after: null };
    }

    const posts = response.data.data.children;
    const afterCursor = response.data.data.after || null; // Get pagination cursor
    const videos: RedditVideo[] = [];

    for (const post of posts) {
      const data = post.data;

      let videoUrl = "";

      // Priority 1: Direct external video links only (safe + playable)
      const url = data.url || "";
      if (url.endsWith(".mp4") || url.endsWith(".webm")) {
        videoUrl = url;
      } else if (url.includes('.gifv')) {
        // Imgur .gifv -> .mp4
        videoUrl = url.replace('.gifv', '.mp4');
      }

      // Priority 2: Reddit native video
      if (!videoUrl) {
        const hasVideo = data.is_video || 
                        data.secure_media?.reddit_video ||
                        data.media?.reddit_video;
        
        if (!hasVideo) continue;

        if (data.secure_media?.reddit_video?.fallback_url) {
          videoUrl = data.secure_media.reddit_video.fallback_url;
        } else if (data.media?.reddit_video?.fallback_url) {
          videoUrl = data.media.reddit_video.fallback_url;
        }
      }

      // Skip if no valid video URL
      if (!videoUrl) continue;
      
      // Validate it's a video format (restrict to mp4/webm for HTML5)
      if (!videoUrl.match(/\.(mp4|webm)$/i) && !videoUrl.includes('v.redd.it')) {
        continue;
      }

      // Extract thumbnail
      let thumbnail = data.thumbnail;
      if (!thumbnail || thumbnail === "default" || thumbnail === "self") {
        thumbnail = data.preview?.images?.[0]?.source?.url || "";
      }

      videos.push({
        id: data.id,
        title: data.title,
        author: data.author,
        url: videoUrl, // keep query params (some hosts require them)
        thumbnail: thumbnail.replace(/&amp;/g, "&"), // Decode HTML entities
        score: data.score,
        created: data.created_utc,
      });
    }

    // Store in cache
    cache.set(cacheKey, {
      data: videos,
      timestamp: Date.now()
    });

    console.log(`✅ Fetched ${videos.length} videos from r/${subreddit} page ${after || 'first'} (cached for 30s, next: ${afterCursor})`);
    // Reset error counter on success
    consecutiveErrors = 0;
    return { videos, after: afterCursor };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ Reddit API Error for r/${subreddit}: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        
        // If rate limited, return cached data even if stale
        if (error.response.status === 429) {
          console.log(`⚠️  Rate limited! Returning stale cache for r/${subreddit}`);
          const staleCache = cache.get(cacheKey);
          if (staleCache) {
            return { videos: staleCache.data, after: null };
          }
          consecutiveErrors++;
          // push next allowed request out a bit
          nextAllowedAt = Date.now() + Math.max(COOLDOWN_MS / 10, 30_000);
        }
      }
      if (error.code === 'ECONNABORTED') {
        consecutiveErrors++;
        nextAllowedAt = Date.now() + BASE_DELAY_MS * 4;
      }
    } else {
      console.error("❌ Unexpected error:", error);
    }
    
    if (consecutiveErrors >= MAX_ERRORS_BEFORE_COOLDOWN) {
      cooldownUntil = Date.now() + COOLDOWN_MS;
      console.log(`🧊 Entering Reddit cooldown for ${Math.round(COOLDOWN_MS / 60000)}m`);
    }

    // Return stale cache as fallback
    const fallbackCache = cache.get(cacheKey);
    if (fallbackCache) {
      console.log(`⚠️  Using stale cache as fallback for r/${subreddit}`);
      return { videos: fallbackCache.data, after: null };
    }
    
    return { videos: [], after: null };
  }
}

/**
 * Fetches videos from multiple subreddits
 * @param subreddits - Array of subreddit names
 * @param limitPerSub - Posts to fetch per subreddit
 * @param sort - Sort order for fetching
 * @returns Combined array of videos from all subreddits
 */
export async function fetchMultipleSubreddits(
  subreddits: string[] = ["funnyvideos", "videos", "unexpected"],
  limitPerSub: number = 10,
  sort: string = "hot",
  afterCursors?: Map<string, string>
): Promise<RedditVideo[]> {
  console.time(`Fetching from ${subreddits.length} subreddits`);
  
  // Parallel fetch with Promise.all for maximum speed
  const promises = subreddits.map(sub => 
    fetchRedditVideos(sub, limitPerSub, sort, afterCursors?.get(sub))
      .catch(err => {
        console.warn(`Failed to fetch from r/${sub}:`, err.message);
        return { videos: [], after: null }; // Return empty on error, don't fail entire batch
      })
  );
  
  const results = await Promise.all(promises);
  
  // Extract all videos from successful fetches
  const allVideos = results.flatMap(result => result.videos);
  
  console.timeEnd(`Fetching from ${subreddits.length} subreddits`);
  console.log(`📦 Got ${allVideos.length} total videos from ${subreddits.length} subreddits`);
  
  // Sort by score (popularity) for better content
  return allVideos.sort((a, b) => b.score - a.score);
}
