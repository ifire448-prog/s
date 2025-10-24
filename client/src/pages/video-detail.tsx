import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type Video } from "@shared/schema";
import { VideoPlayer } from "@/components/video-player";
import { InteractionPanel } from "@/components/interaction-panel";
import { CommentModal } from "@/components/comment-modal";
import { ShareModal } from "@/components/share-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function VideoDetail() {
  const [, params] = useRoute("/video/:id");
  const videoId = params?.id;
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [userIp, setUserIp] = useState<string>("");

  // Fetch video
  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch video");
      }
      return response.json();
    },
    enabled: !!videoId,
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

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (vId: string) => {
      const isLiked = userLikes.includes(vId);
      if (isLiked) {
        return apiRequest("DELETE", `/api/likes/${vId}`, { userIp });
      } else {
        return apiRequest("POST", "/api/likes", { videoId: vId, userIp });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/likes/user", userIp] });
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (vId: string) => {
      const isBookmarked = userBookmarks.includes(vId);
      if (isBookmarked) {
        return apiRequest("DELETE", `/api/bookmarks/${vId}`, { userIp });
      } else {
        return apiRequest("POST", "/api/bookmarks", { videoId: vId, userIp });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/user", userIp] });
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async (vId: string) => {
      return apiRequest("POST", `/api/videos/${vId}/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
    },
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["/api/comments", videoId],
    enabled: !!videoId && showComments,
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ vId, content }: { vId: string; content: string }) => {
      return apiRequest("POST", "/api/comments", {
        videoId: vId,
        content,
        userIp,
        username: "anonymous",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/comments", videoId] });
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <h2 className="text-2xl font-bold mb-2">Video not found</h2>
        <p className="text-muted-foreground mb-6">The video you're looking for doesn't exist</p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-primary to-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-black relative" data-testid="video-detail-page">
      {/* Back button */}
      <Link href="/">
        <Button
          size="icon"
          variant="ghost"
          className="fixed top-4 left-4 z-20 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </Link>

      {/* Video player */}
      <VideoPlayer video={video} isActive={true} />

      {/* Interaction panel */}
      <InteractionPanel
        video={video}
        isLiked={userLikes.includes(video.id)}
        isBookmarked={userBookmarks.includes(video.id)}
        onLike={() => likeMutation.mutate(video.id)}
        onComment={() => setShowComments(true)}
        onBookmark={() => bookmarkMutation.mutate(video.id)}
        onShare={() => {
          setShowShare(true);
          shareMutation.mutate(video.id);
        }}
      />

      {/* Comment Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        onSubmitComment={(content) => commentMutation.mutate({ vId: video.id, content })}
        isPending={commentMutation.isPending}
      />

      {/* Share Modal */}
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} video={video} />
    </div>
  );
}
