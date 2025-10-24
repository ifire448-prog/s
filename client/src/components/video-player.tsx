import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Video } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onVideoClick?: () => void;
}

export function VideoPlayer({ video, isActive, onVideoClick }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleVideoClick = () => {
    togglePlayPause();
    if (onVideoClick) {
      onVideoClick();
    }
  };

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={handleVideoClick}
      data-testid={`video-player-${video.id}`}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        data-testid={`video-element-${video.id}`}
      />

      {/* Gradient overlay at bottom for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Video info overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="absolute bottom-0 left-0 right-20 p-6 text-white pointer-events-none"
      >
        <div className="mb-3">
          <h3 className="text-lg font-semibold mb-1" data-testid={`video-username-${video.id}`}>
            @{video.username}
          </h3>
          {video.description && (
            <p className="text-sm text-white/90 line-clamp-2" data-testid={`video-description-${video.id}`}>
              {video.description}
            </p>
          )}
        </div>
        {video.source === "reddit" && (
          <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
            From Reddit
          </span>
        )}
      </motion.div>

      {/* Mute/Unmute button */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-6 pointer-events-auto z-10"
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border-0"
              data-testid={`button-mute-${video.id}`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/50 backdrop-blur-md rounded-full p-6">
              <Play className="w-12 h-12 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
