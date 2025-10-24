import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Video } from "@shared/schema";
import { motion } from "framer-motion";
import { Search as SearchIcon, Loader2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/videos/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to search videos");
      }
      return response.json();
    },
    enabled: searchQuery.length > 0,
  });

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-background p-6" data-testid="search-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Search
        </h1>

        {/* Search Input */}
        <div className="relative mb-8 max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
            data-testid="input-search"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length === 0 ? (
          <div className="text-center py-20">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Search for videos by username or description</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !videos || videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No videos found for "{searchQuery}"</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-6" data-testid="search-results-count">
              {videos.length} {videos.length === 1 ? "result" : "results"} found
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  data-testid={`search-result-${video.id}`}
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
