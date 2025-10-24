import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

/**
 * RedGIFs Media Hooks for React
 * Provides easy integration with RedGIFs API endpoints
 */

// Media interface matching the backend
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

export interface RedGifsConfig {
  categories?: string[];
  mediaTypes?: ('gif' | 'video' | 'image')[];
  maxItems?: number;
  delayBetweenRequests?: number;
  proxy?: string;
  debug?: boolean;
}

/**
 * Hook to fetch trending RedGIFs content
 */
export function useTrendingRedgifs(limit: number = 50, debug: boolean = false) {
  return useQuery<RedGifsMedia[]>({
    queryKey: ["/api/redgifs/trending", limit, debug],
    queryFn: async () => {
      const response = await fetch(
        `/api/redgifs/trending?limit=${limit}&debug=${debug}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch trending RedGIFs");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch RedGIFs by tags
 */
export function useRedgifsByTags(
  tags: string[] = ["trending"],
  limit: number = 50,
  debug: boolean = false
) {
  return useQuery<RedGifsMedia[]>({
    queryKey: ["/api/redgifs/tags", tags.join(","), limit, debug],
    queryFn: async () => {
      const response = await fetch(
        `/api/redgifs/tags?tags=${tags.join(",")}&limit=${limit}&debug=${debug}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch RedGIFs by tags");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch RedGIFs with custom configuration
 */
export function useRedgifsCustom(config: RedGifsConfig) {
  return useQuery<RedGifsMedia[]>({
    queryKey: ["/api/redgifs/fetch", config],
    queryFn: async () => {
      const response = await fetch("/api/redgifs/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch RedGIFs with custom config");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to import RedGIFs media to database
 */
export function useImportRedgifs() {
  return useMutation({
    mutationFn: async (media: RedGifsMedia) => {
      const response = await fetch("/api/redgifs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: media.id,
          title: media.title,
          url: media.url,
          thumbnailUrl: media.thumbnailUrl,
          tags: media.tags,
          userName: media.userName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to import RedGIFs media");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the videos query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });
}

/**
 * Hook to clear RedGIFs cache
 */
export function useClearRedgifsCache() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/redgifs/clear-cache", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear RedGIFs cache");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all RedGIFs queries
      queryClient.invalidateQueries({ queryKey: ["/api/redgifs"] });
    },
  });
}

/**
 * Hook to fetch RedGIFs content for infinite scroll
 * Similar to Reddit integration but for RedGIFs
 */
export function useRedgifsForFeed(
  categories: string[] = ["trending", "hot"],
  initialLimit: number = 50
) {
  return useQuery<RedGifsMedia[]>({
    queryKey: ["/api/redgifs/feed", categories.join(","), initialLimit],
    queryFn: async () => {
      const startTime = performance.now();
      
      const response = await fetch(
        `/api/redgifs/tags?tags=${categories.join(",")}&limit=${initialLimit}`
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("RedGIFs rate limit reached. Please wait.");
        }
        throw new Error("Failed to fetch RedGIFs for feed");
      }
      
      const data = await response.json();
      
      const endTime = performance.now();
      console.log(`⚡ Fetched RedGIFs in ${Math.round(endTime - startTime)}ms`);
      
      return data.filter((item: RedGifsMedia) => item.url && item.id);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 2000,
  });
}
