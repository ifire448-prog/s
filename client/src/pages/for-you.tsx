import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Video, type Comment } from "@shared/schema";
import { VideoPlayer } from "@/components/video-player";
import { InteractionPanel } from "@/components/interaction-panel";
import { CommentModal } from "@/components/comment-modal";
import { ShareModal } from "@/components/share-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { VideoCardSkeleton } from "@/components/skeleton-loader";
import { motion } from "framer-motion";
import { useMultipleRedditVideos, type RedditVideo } from "@/hooks/use-reddit-videos";

export default function ForYou() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userIp, setUserIp] = useState<string>("");
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasLoadedInitial = useRef(false);
  const seenVideoIds = useRef(new Set<string>()); // Track seen videos to prevent duplicates
  const sortMethods = useRef(['hot', 'top', 'rising', 'new']); // Different sort methods
  const currentSortIndex = useRef(0);
  const seenPostIds = useRef(new Set<string>());
  const seenMediaKeys = useRef(new Set<string>());
  // Subreddit pagination state (per-sub after cursors)
  const subredditsPoolRef = useRef([
    // NSFW video-focused subreddits (working, non-quarantined)
    "NSFW_GIF", "porn_gifs", "nsfw", "RealGirls", "adorableporn",
    "LegalTeens", "collegesluts", "ass", "boobbounce", "tiktoknsfw",
    "TikTokNude", "nsfwhardcore"
  ]);
  const subredditIndexRef = useRef(0);
  const afterCursorsRef = useRef<Record<string, string | null>>({});
  const emptyAttemptsRef = useRef(0);

  // Proxy helper to avoid CORS/range issues on remote hosts
  const proxify = (u: string) => (u?.startsWith('/uploads') ? u : `/api/proxy?url=${encodeURIComponent(u)}`);
  const normalizeMediaKey = (u: string) => {
    try {
      let raw = u || "";
      if (raw.startsWith('/api/proxy?')) {
        const qs = raw.split('?')[1] || '';
        const sp = new URLSearchParams(qs);
        raw = sp.get('url') || raw;
      }
      const p = new URL(raw);
      const host = p.hostname.toLowerCase();
      let path = p.pathname.toLowerCase();
      if (host.endsWith('v.redd.it')) {
        const seg = path.split('/').filter(Boolean)[0] || '';
        path = `/${seg}`;
      }
      return `${host}${path}`;
    } catch {
      return u || '';
    }
  };

  // Fetch local videos (one-time)
  const { data: localVideos, isLoading: isLoadingLocal } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  // Randomize initial NSFW subreddits for the first load
  const initialNsfwSubs = useMemo(() => {
    const pool = [
      "NSFW_GIF", "porn_gifs", "nsfw", "RealGirls", "adorableporn",
      "LegalTeens", "tiktoknsfw", "nsfwhardcore"
    ];
    return pool.sort(() => Math.random() - 0.5).slice(0, 5);
  }, []);

  // Fetch Reddit videos from randomized subreddits for initial batch
  const { data: redditVideos, isLoading: isLoadingReddit, error: redditError } = useMultipleRedditVideos(
    initialNsfwSubs,
    15 // More videos per subreddit
  );

  // Show error toast if Reddit fails
  useEffect(() => {
    if (redditError) {
      console.error("Reddit fetch error:", redditError);
      // Continue with local videos only - no need to block user
    }
  }, [redditError]);

  // Initialize feed with local + first batch of Reddit videos
  useEffect(() => {
    if (!hasLoadedInitial.current && localVideos && redditVideos) {
      const merged: Video[] = [];
      
      // Add local videos
      merged.push(...localVideos);
      
      // Mark local videos as seen
      localVideos.forEach(v => seenVideoIds.current.add(v.id));
      
      // Add Reddit videos and mark as seen
      const redditMapped: Video[] = redditVideos
        .filter(rv => {
          const mk = normalizeMediaKey(rv.url);
          if (seenPostIds.current.has(rv.id) || seenMediaKeys.current.has(mk)) {
            return false;
          }
          seenPostIds.current.add(rv.id);
          seenMediaKeys.current.add(mk);
          return true;
        })
        .map(rv => ({
          id: `reddit-${rv.id}`,
          videoUrl: proxify(rv.url),
          thumbnailUrl: rv.thumbnail || null,
          title: rv.title || null,
          description: rv.title || null,
          username: rv.author,
          uploaderIp: "reddit",
          likesCount: rv.score,
          commentsCount: 0,
          bookmarksCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          source: 'reddit',
          createdAt: new Date(rv.created * 1000),
        }));
      merged.push(...redditMapped);
      
      // Shuffle for variety
      setAllVideos(merged.sort(() => Math.random() - 0.5));
      console.log(`✅ Initial load: ${merged.length} videos (${seenVideoIds.current.size} unique IDs tracked)`);
      hasLoadedInitial.current = true;
    }
  }, [localVideos, redditVideos]);

  // Load more Reddit videos when needed with per-subreddit pagination and deduplication
  const loadMoreVideos = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    const loadStartTime = performance.now();
    
    try {
      // Rotate through different sort methods for variety
      const sortMethod = sortMethods.current[currentSortIndex.current % sortMethods.current.length];
      currentSortIndex.current++;

      // Select one subreddit per request and use its pagination cursor
      const pool = subredditsPoolRef.current;
      const sub = pool[Math.floor(Math.random() * pool.length)]; // random subreddit each load
      const after = afterCursorsRef.current[sub] || undefined;

      console.log(`🔄 Loading subreddit=${sub}, sort=${sortMethod}, after=${after ?? 'none'}`);

      const response = await fetch(
        `/api/reddit/videos?subreddit=${encodeURIComponent(sub)}&limit=20&sort=${encodeURIComponent(sortMethod)}${after ? `&after=${encodeURIComponent(after)}` : ''}`,
        {
          // Match server timeout (20s) to avoid premature aborts
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("⚠️ Reddit rate limit - using cached or fallback content");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const nextAfter = response.headers.get('X-Reddit-After');
      if (nextAfter !== null) {
        afterCursorsRef.current[sub] = nextAfter || null;
      }

      const newRedditVideos: RedditVideo[] = await response.json();
      
      if (newRedditVideos && newRedditVideos.length > 0) {
        // Filter out videos we've already seen
        const uniqueVideos = newRedditVideos.filter(rv => {
          const mk = normalizeMediaKey(rv.url);
          if (seenPostIds.current.has(rv.id) || seenMediaKeys.current.has(mk)) {
            return false;
          }
          seenPostIds.current.add(rv.id);
          seenMediaKeys.current.add(mk);
          return true;
        });
        // Shuffle order to randomize UI presentation
        const shuffled = uniqueVideos.sort(() => Math.random() - 0.5);

        console.log(`✅ Got ${shuffled.length} unique videos (filtered ${newRedditVideos.length - uniqueVideos.length} duplicates)`);
        
        if (shuffled.length > 0) {
          const newMapped: Video[] = shuffled.map(rv => ({
            id: `reddit-${rv.id}`,
            videoUrl: proxify(rv.url),
            thumbnailUrl: rv.thumbnail || null,
            title: rv.title || null,
            description: rv.title || null,
            username: rv.author,
            uploaderIp: "reddit",
            likesCount: rv.score,
            commentsCount: 0,
            bookmarksCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            source: 'reddit',
            createdAt: new Date(rv.created * 1000),
          }));
          
          setAllVideos(prev => [...prev, ...newMapped]);
          setPage(p => p + 1);
          emptyAttemptsRef.current = 0;
          
          const loadEndTime = performance.now();
          console.log(`⚡ Load complete in ${Math.round(loadEndTime - loadStartTime)}ms`);
        } else if (newRedditVideos.length > 0) {
          // All were duplicates; try next subreddit quickly
          console.log("⚠️ All videos were duplicates, rotating subreddit...");
          emptyAttemptsRef.current++;
          setTimeout(() => loadMoreVideos(), 400);
        }
      } else {
        // No items returned for this subreddit page
        emptyAttemptsRef.current++;
        console.log(`ℹ️ No items for ${sub} (after=${after ?? 'none'}). Attempts=${emptyAttemptsRef.current}`);
        if (emptyAttemptsRef.current >= 5) {
          // Fallback: fetch some RedGIFs to keep feed fresh (after 5 empty attempts)
          try {
            console.log('📡 Attempting RedGIFs NSFW fallback...');
            const rg = await fetch(`/api/redgifs/tags?tags=amateur,blowjob,ass,boobs&limit=24`, { signal: AbortSignal.timeout(10000) });
            if (rg.ok) {
              const rgItems: any[] = await rg.json();
              const mapped: Video[] = rgItems
                .filter(item => {
                  if (!item || !item.url || !item.id) return false;
                  const mk = normalizeMediaKey(item.url);
                  if (seenMediaKeys.current.has(mk) || seenVideoIds.current.has(`redgifs-${item.id}`)) return false;
                  seenMediaKeys.current.add(mk);
                  seenVideoIds.current.add(`redgifs-${item.id}`);
                  return true;
                })
                .map(item => {
                  return {
                    id: `redgifs-${item.id}`,
                    videoUrl: proxify(item.url),
                    thumbnailUrl: item.thumbnailUrl ?? null,
                    title: item.title ?? null,
                    description: item.tags?.join(', ') ?? null,
                    username: item.userName ?? 'redgifs_user',
                    uploaderIp: 'redgifs',
                    likesCount: item.likes ?? 0,
                    commentsCount: 0,
                    bookmarksCount: 0,
                    sharesCount: 0,
                    viewsCount: item.views ?? 0,
                    source: 'redgifs',
                    createdAt: new Date(item.createdAt ?? Date.now()),
                  } as Video;
                });
              if (mapped.length > 0) {
                console.log(`🧩 Added ${mapped.length} RedGIFs items as fallback`);
                setAllVideos(prev => [...prev, ...mapped]);
                emptyAttemptsRef.current = 0;
              } else {
                console.log('⚠️ RedGIFs returned no valid items');
              }
            } else {
              console.warn(`⚠️ RedGIFs API error: ${rg.status}`);
            }
          } catch (err: any) {
            console.warn('⚠️ RedGIFs fallback failed:', err.message);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
      const loadEndTime = performance.now();
      console.log(`❌ Load failed after ${Math.round(loadEndTime - loadStartTime)}ms`);
      // Don't break the app - user can continue with existing videos
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Aggressive prefetch - load before user needs them
  useEffect(() => {
    // Prefetch when 10 videos remaining (was 5)
    if (allVideos.length > 0 && currentVideoIndex >= allVideos.length - 10 && !isLoadingMore) {
      loadMoreVideos();
    }
  }, [currentVideoIndex, allVideos.length, isLoadingMore]);

  const videos = allVideos;
  const isLoading = isLoadingLocal || isLoadingReddit;

  // Fetch user IP
  useEffect(() => {
    fetch("/api/user-ip")
      .then((res) => res.text())
      .then((ip) => setUserIp(ip))
      .catch(() => setUserIp("unknown"));
  }, []);

  // Fetch user interactions
  const { data: userLikes = [] } = useQuery<string[]>({
    queryKey: ["/api/likes/user", userIp],
    enabled: !!userIp,
  });

  const { data: userBookmarks = [] } = useQuery<string[]>({
    queryKey: ["/api/bookmarks/user", userIp],
    enabled: !!userIp,
  });

  // Scroll handling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!videos || videos.length === 0) return;

      if (e.deltaY > 0 && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex((prev) => prev + 1);
      } else if (e.deltaY < 0 && currentVideoIndex > 0) {
        setCurrentVideoIndex((prev) => prev - 1);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [currentVideoIndex, videos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videos || videos.length === 0) return;

      if (e.key === "ArrowDown" && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex((prev) => prev + 1);
      } else if (e.key === "ArrowUp" && currentVideoIndex > 0) {
        setCurrentVideoIndex((prev) => prev - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentVideoIndex, videos]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const isLiked = userLikes.includes(videoId);
      if (isLiked) {
        return apiRequest("DELETE", `/api/likes/${videoId}`, { userIp });
      } else {
        return apiRequest("POST", "/api/likes", { videoId, userIp });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/likes/user", userIp] });
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const isBookmarked = userBookmarks.includes(videoId);
      if (isBookmarked) {
        return apiRequest("DELETE", `/api/bookmarks/${videoId}`, { userIp });
      } else {
        return apiRequest("POST", "/api/bookmarks", { videoId, userIp });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/user", userIp] });
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return apiRequest("POST", `/api/videos/${videoId}/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  // Fetch comments for selected video
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", selectedVideoId],
    enabled: !!selectedVideoId && showComments,
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ videoId, content }: { videoId: string; content: string }) => {
      return apiRequest("POST", "/api/comments", {
        videoId,
        content,
        userIp,
        username: "anonymous",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments", selectedVideoId] });
    },
  });

  if (isLoading) {
    return <VideoCardSkeleton />;
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-2">No videos yet</h2>
          <p className="text-muted-foreground">Upload the first video to get started!</p>
        </motion.div>
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-hidden bg-black relative"
      data-testid="for-you-page"
    >
      {/* Video player */}
      <VideoPlayer video={currentVideo} isActive={true} />

      {/* Interaction panel */}
      <InteractionPanel
        video={currentVideo}
        isLiked={userLikes.includes(currentVideo.id)}
        isBookmarked={userBookmarks.includes(currentVideo.id)}
        onLike={() => likeMutation.mutate(currentVideo.id)}
        onComment={() => {
          setSelectedVideoId(currentVideo.id);
          setShowComments(true);
        }}
        onBookmark={() => bookmarkMutation.mutate(currentVideo.id)}
        onShare={() => {
          setSelectedVideoId(currentVideo.id);
          setShowShare(true);
          shareMutation.mutate(currentVideo.id);
        }}
      />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">Loading more videos...</span>
          </div>
        </motion.div>
      )}

      {/* Video counter */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full">
        <span className="text-white text-xs font-medium">
          {currentVideoIndex + 1} / {videos.length === 0 ? "∞" : videos.length}
        </span>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        onSubmitComment={(content) =>
          selectedVideoId && commentMutation.mutate({ videoId: selectedVideoId, content })
        }
        isPending={commentMutation.isPending}
      />

      {/* Share Modal */}
      {selectedVideoId && (
        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          video={currentVideo}
        />
      )}
    </div>
  );
}
