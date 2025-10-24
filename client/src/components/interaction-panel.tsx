import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Video } from "@shared/schema";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface InteractionPanelProps {
  video: Video;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export function InteractionPanel({
  video,
  onLike,
  onComment,
  onBookmark,
  onShare,
  isLiked = false,
  isBookmarked = false,
}: InteractionPanelProps) {
  const [animateLike, setAnimateLike] = useState(false);
  const [animateBookmark, setAnimateBookmark] = useState(false);

  const handleLike = () => {
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 300);
    onLike?.();
  };

  const handleBookmark = () => {
    setAnimateBookmark(true);
    setTimeout(() => setAnimateBookmark(false), 300);
    onBookmark?.();
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="fixed right-4 bottom-32 flex flex-col gap-4 z-10"
      data-testid="interaction-panel"
    >
      {/* Like button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLike}
          className={cn(
            "w-12 h-12 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0 transition-transform",
            animateLike && "scale-125",
            isLiked && "bg-primary/60 hover:bg-primary/80"
          )}
          data-testid={`button-like-${video.id}`}
        >
          <Heart className={cn("w-6 h-6", isLiked && "fill-white")} />
        </Button>
        <span className="text-xs text-white font-medium" data-testid={`count-likes-${video.id}`}>
          {formatCount(video.likesCount)}
        </span>
      </div>

      {/* Comment button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onComment}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0"
          data-testid={`button-comment-${video.id}`}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        <span className="text-xs text-white font-medium" data-testid={`count-comments-${video.id}`}>
          {formatCount(video.commentsCount)}
        </span>
      </div>

      {/* Bookmark button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleBookmark}
          className={cn(
            "w-12 h-12 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0 transition-transform",
            animateBookmark && "scale-125",
            isBookmarked && "bg-secondary/60 hover:bg-secondary/80"
          )}
          data-testid={`button-bookmark-${video.id}`}
        >
          <Bookmark className={cn("w-6 h-6", isBookmarked && "fill-white")} />
        </Button>
        <span className="text-xs text-white font-medium" data-testid={`count-bookmarks-${video.id}`}>
          {formatCount(video.bookmarksCount)}
        </span>
      </div>

      {/* Share button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onShare}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0"
          data-testid={`button-share-${video.id}`}
        >
          <Share2 className="w-6 h-6" />
        </Button>
        <span className="text-xs text-white font-medium" data-testid={`count-shares-${video.id}`}>
          {formatCount(video.sharesCount)}
        </span>
      </div>
    </motion.div>
  );
}
