import { useQuery } from "@tanstack/react-query";
import { type Video } from "@shared/schema";
import { motion } from "framer-motion";
import { Play, Download } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useMultipleRedditVideos, useImportRedditVideo } from "@/hooks/use-reddit-videos";
import { VideoGridSkeleton } from "@/components/skeleton-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Explore() {
  const [activeTab, setActiveTab] = useState<"local" | "reddit">("local");
  
  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: redditVideos, isLoading: isLoadingReddit } = useMultipleRedditVideos(
    ["funnyvideos", "videos", "unexpected"],
    10
  );

  const importMutation = useImportRedditVideo();

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleImportVideo = (video: any) => {
    importMutation.mutate({
      ...video,
      subreddit: "reddit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6" data-testid="explore-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Explore
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("local")}
            className={cn(
              "px-6 py-3 font-medium transition-colors relative",
              activeTab === "local"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Local Videos
            {activeTab === "local" && (
              <motion.div
                layoutId="explore-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("reddit")}
            className={cn(
              "px-6 py-3 font-medium transition-colors relative",
              activeTab === "reddit"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Reddit Videos
            {activeTab === "reddit" && (
              <motion.div
                layoutId="explore-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Local Videos Tab */}
        {activeTab === "local" && (
          <>
            {isLoading ? (
              <VideoGridSkeleton />
            ) : !videos || videos.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No videos to explore yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`explore-video-${video.id}`}
              >
                <Link href={`/video/${video.id}`}>
                  <div className="group relative aspect-[9/16] bg-card rounded-lg overflow-hidden cursor-pointer hover-elevate active-elevate-2 border border-card-border">
                    {/* Video thumbnail */}
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 group-hover:opacity-80 transition-opacity" />

                    {/* Play icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 backdrop-blur-md rounded-full p-4">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>

                    {/* Video info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium mb-1 line-clamp-2">
                        {video.description || `Video by @${video.username}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-white/80">
                        <span>{formatCount(video.viewsCount)} views</span>
                        <span>{formatCount(video.likesCount)} likes</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reddit Videos Tab */}
        {activeTab === "reddit" && (
          <>
            {isLoadingReddit ? (
              <VideoGridSkeleton />
            ) : !redditVideos || redditVideos.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No Reddit videos available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {redditVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="group relative aspect-[9/16] bg-card rounded-lg overflow-hidden">
                      {/* Video */}
                      <video
                        src={video.url}
                        poster={video.thumbnail}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 group-hover:opacity-80 transition-opacity" />

                      {/* Play icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-md rounded-full p-4">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>

                      {/* Video info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                          {video.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-white/60">by u/{video.author}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleImportVideo(video)}
                            disabled={importMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Import
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
