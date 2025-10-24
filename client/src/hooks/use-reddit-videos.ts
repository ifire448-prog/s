import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

/**
 * Reddit Video Interface
 */
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
 * Hook to fetch Reddit videos from a specific subreddit
 */
export function useRedditVideos(subreddit: string = "funnyvideos", limit: number = 25) {
  return useQuery<RedditVideo[]>({
    queryKey: ["/api/reddit/videos", subreddit, limit, Date.now()],
    queryFn: async () => {
      const timestamp = Date.now();
      const response = await fetch(
        `/api/reddit/videos?subreddit=${subreddit}&limit=${limit}&t=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch Reddit videos");
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh
    gcTime: 0, // Don't cache (formerly cacheTime)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch videos from multiple subreddits - OPTIMIZED FOR SPEED
 */
export function useMultipleRedditVideos(
  subreddits: string[] = ["funnyvideos", "videos", "unexpected"],
  limitPerSub: number = 10
) {
  return useQuery<RedditVideo[]>({
    queryKey: ["/api/reddit/videos/multi", subreddits.join(","), limitPerSub],
    queryFn: async () => {
      const startTime = performance.now();
      
      const response = await fetch(
        `/api/reddit/videos/multi?subreddits=${subreddits.join(",")}&limit=${limitPerSub}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          // Add signal for timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Reddit rate limit reached. Please wait a moment.");
        }
        throw new Error("Failed to fetch Reddit videos");
      }
      
      const data = await response.json();
      
      const endTime = performance.now();
      console.log(`⚡ Fetched videos in ${Math.round(endTime - startTime)}ms`);
      
      // Filter out any invalid videos
      return data.filter((v: RedditVideo) => v.url && v.id);
    },
    staleTime: 30 * 1000, // Reduced to 30 seconds (from 60) for fresher content
    gcTime: 3 * 60 * 1000, // Keep in cache for 3 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Reduced to 1 retry for faster failure
    retryDelay: 1000, // Fixed 1 second delay
  });
}

/**
 * Hook to import a Reddit video to the database
 */
export function useImportRedditVideo() {
  return useMutation({
    mutationFn: async (video: RedditVideo & { subreddit?: string }) => {
      const response = await fetch("/api/reddit/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(video),
      });
      if (!response.ok) {
        throw new Error("Failed to import Reddit video");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate videos query to show the new video
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });
}
