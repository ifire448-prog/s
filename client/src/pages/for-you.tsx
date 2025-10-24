import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Video } from "@shared/schema";
import { VideoPlayer } from "@/components/video-player";
import { InteractionPanel } from "@/components/interaction-panel";
import { CommentModal } from "@/components/comment-modal";
import { ShareModal } from "@/components/share-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ForYou() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userIp, setUserIp] = useState<string>("");

  // Fetch videos
  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

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
  const { data: comments = [] } = useQuery({
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
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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

      {/* Progress indicator */}
      {videos.length > 1 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          {videos.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-8 rounded-full transition-all ${
                index === currentVideoIndex
                  ? "bg-gradient-to-b from-primary to-secondary"
                  : "bg-white/30"
              }`}
              data-testid={`progress-indicator-${index}`}
            />
          ))}
        </div>
      )}

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
