import axios, { AxiosInstance } from "axios";

/**
 * RedGIFs Scraper Module - Professional media scraper for RedGIFs content
 * Optimized for social media feed integration
 */

// Configuration interface
export interface RedGifsScraperConfig {
  categories?: string[];
  mediaTypes?: ('gif' | 'video' | 'image')[];
  maxItems?: number;
  delayBetweenRequests?: number;
  proxy?: string;
  debug?: boolean;
}

// Media item interface
export interface RedGifsMedia {
  id: string;
  title: string;
  mediaType: 'gif' | 'video' | 'image';
  url: string;
  hdUrl?: string;
  thumbnailUrl: string;
  posterUrl?: string;
  views: number;
  duration: number;
  width: number;
  height: number;
  tags: string[];
  userName?: string;
  likes?: number;
  createdAt: string;
}

// API Response interfaces
interface RedGifsApiResponse {
  gifs?: RedGifsItem[];
  page?: number;
  pages?: number;
  total?: number;
  errorMessage?: string;
}

interface RedGifsItem {
  id: string;
  createDate: string;
  hasAudio: boolean;
  width: number;
  height: number;
  likes: number;
  tags: string[];
  verified: boolean;
  views: number;
  duration: number;
  published: boolean;
  urls: {
    sd?: string;
    hd?: string;
    poster?: string;
    thumbnail?: string;
    vthumbnail?: string;
  };
  userName: string;
  type: number;
  avgColor: string;
}

// Cache for auth tokens and requests
const tokenCache = {
  token: '',
  expiresAt: 0
};

const requestCache = new Map<string, { data: RedGifsMedia[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create axios instance with optimized settings
const createAxiosInstance = (proxy?: string): AxiosInstance => {
  const config: any = {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (proxy) {
    const proxyUrl = new URL(proxy);
    config.proxy = {
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port),
      protocol: proxyUrl.protocol.replace(':', ''),
    };
  }

  return axios.create(config);
};

/**
 * Get authentication token from RedGIFs API
 */
async function getAuthToken(axiosInstance: AxiosInstance, debug: boolean = false): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    if (debug) console.log('✅ Using cached auth token');
    return tokenCache.token;
  }

  try {
    if (debug) console.log('🔐 Fetching new auth token...');
    
    const response = await axiosInstance.get('https://api.redgifs.com/v2/auth/temporary');
    
    if (response.data && response.data.token) {
      tokenCache.token = response.data.token;
      // Token expires in 24 hours, but we'll refresh it in 23 hours to be safe
      tokenCache.expiresAt = Date.now() + (23 * 60 * 60 * 1000);
      
      if (debug) console.log('✅ Auth token obtained');
      return tokenCache.token;
    }
    
    throw new Error('Invalid auth response');
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
    throw error;
  }
}

/**
 * Delay function for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert RedGIFs API item to our media format
 */
function convertToMediaFormat(item: RedGifsItem): RedGifsMedia {
  // Determine media type
  let mediaType: 'gif' | 'video' | 'image' = 'video';
  if (item.type === 1 || !item.hasAudio) {
    mediaType = 'gif';
  }
  
  // Extract best quality URLs
  const url = item.urls.hd || item.urls.sd || '';
  const thumbnailUrl = item.urls.poster || item.urls.thumbnail || item.urls.vthumbnail || '';
  
  return {
    id: item.id,
    title: item.tags.join(' ') || `RedGIFs ${item.id}`,
    mediaType,
    url,
    hdUrl: item.urls.hd,
    thumbnailUrl,
    posterUrl: item.urls.poster,
    views: item.views || 0,
    duration: item.duration || 0,
    width: item.width || 0,
    height: item.height || 0,
    tags: item.tags || [],
    userName: item.userName,
    likes: item.likes || 0,
    createdAt: item.createDate || new Date().toISOString(),
  };
}

/**
 * Fetch media from a specific category or search term
 */
async function fetchFromCategory(
  category: string,
  axiosInstance: AxiosInstance,
  token: string,
  page: number = 1,
  count: number = 40,
  debug: boolean = false
): Promise<RedGifsMedia[]> {
  const cacheKey = `${category}-${page}-${count}`;
  
  // Check cache
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    if (debug) console.log(`📦 Using cached data for ${category}`);
    return cached.data;
  }

  try {
    // Use trending endpoint for "trending", otherwise search
    const isTrending = category.toLowerCase() === 'trending' || category.toLowerCase() === 'hot';
    const searchUrl = isTrending 
      ? `https://api.redgifs.com/v2/gifs/trending`
      : `https://api.redgifs.com/v2/gifs/search`;
    
    const params: any = {
      count,
      page,
    };
    
    // Only add search_text for search endpoint
    if (!isTrending) {
      params.search_text = category;
      params.order = 'trending';
    }

    if (debug) console.log(`🔍 Fetching ${category} (page ${page})...`);

    const response = await axiosInstance.get(searchUrl, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.data || !response.data.gifs) {
      console.error(`❌ Invalid response for category ${category}`);
      return [];
    }

    const media = response.data.gifs.map(convertToMediaFormat);
    
    // Cache the results
    requestCache.set(cacheKey, {
      data: media,
      timestamp: Date.now()
    });

    if (debug) console.log(`✅ Fetched ${media.length} items from ${category}`);
    
    return media;
  } catch (error: any) {
    console.error(`❌ Error fetching ${category}:`, error.message);
    
    // Return cached data if available, even if stale
    if (cached) {
      if (debug) console.log(`⚠️ Using stale cache for ${category} due to error`);
      return cached.data;
    }
    
    return [];
  }
}

/**
 * Main function to fetch RedGIFs data
 */
export async function fetchRedgifsData(config: RedGifsScraperConfig = {}): Promise<RedGifsMedia[]> {
  // Default configuration
  const options = {
    categories: config.categories || ['trending'],
    mediaTypes: config.mediaTypes || ['gif', 'video'],
    maxItems: Math.min(config.maxItems || 100, 1000),
    delayBetweenRequests: config.delayBetweenRequests || 2,
    proxy: config.proxy,
    debug: config.debug || false,
  };

  if (options.debug) {
    console.log('🚀 Starting RedGIFs scraper with config:', options);
  }

  const axiosInstance = createAxiosInstance(options.proxy);
  const startTime = Date.now();

  try {
    // Get authentication token
    const token = await getAuthToken(axiosInstance, options.debug);

    // Calculate items per category
    const itemsPerCategory = Math.ceil(options.maxItems / options.categories.length);
    const results: RedGifsMedia[] = [];

    // Fetch from each category
    for (let i = 0; i < options.categories.length; i++) {
      const category = options.categories[i];
      
      if (i > 0 && options.delayBetweenRequests > 0) {
        // Add delay between requests with some randomization
        const delayMs = (options.delayBetweenRequests * 1000) + (Math.random() * 1000);
        if (options.debug) console.log(`⏳ Waiting ${Math.round(delayMs)}ms...`);
        await delay(delayMs);
      }

      const categoryResults = await fetchFromCategory(
        category,
        axiosInstance,
        token,
        1,
        itemsPerCategory,
        options.debug
      );

      // Filter by media type if specified
      const filtered = categoryResults.filter(item => 
        options.mediaTypes.includes(item.mediaType)
      );

      results.push(...filtered);

      // Stop if we have enough items
      if (results.length >= options.maxItems) {
        break;
      }
    }

    // Trim to exact maxItems
    const finalResults = results.slice(0, options.maxItems);

    if (options.debug) {
      const endTime = Date.now();
      console.log(`✅ Scraping complete in ${endTime - startTime}ms`);
      console.log(`📊 Total items: ${finalResults.length}`);
    }

    return finalResults;
  } catch (error) {
    console.error('❌ Scraper failed:', error);
    return [];
  }
}

/**
 * Fetch trending RedGIFs content (convenience function)
 */
export async function fetchTrendingRedgifs(
  limit: number = 50,
  debug: boolean = false
): Promise<RedGifsMedia[]> {
  return fetchRedgifsData({
    categories: ['trending', 'hot'],
    maxItems: limit,
    debug,
  });
}

/**
 * Fetch RedGIFs by specific tags
 */
export async function fetchRedgifsByTags(
  tags: string[],
  limit: number = 50,
  debug: boolean = false
): Promise<RedGifsMedia[]> {
  return fetchRedgifsData({
    categories: tags,
    maxItems: limit,
    debug,
  });
}

/**
 * Clear all caches (useful for forcing fresh data)
 */
export function clearRedgifsCache(): void {
  requestCache.clear();
  tokenCache.token = '';
  tokenCache.expiresAt = 0;
  console.log('🗑️ RedGIFs cache cleared');
}
