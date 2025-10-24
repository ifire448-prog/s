import { Copy, Download, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Video } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

export function ShareModal({ isOpen, onClose, video }: ShareModalProps) {
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/video/${video.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Video link has been copied to clipboard",
    });
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = video.videoUrl;
    a.download = `video-${video.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: "Downloading...",
      description: "Video download started",
    });
  };

  const embedCode = `<iframe src="${shareUrl}" width="315" height="560" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Embed code copied!",
      description: "Embed code has been copied to clipboard",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
            data-testid="share-modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl z-50 w-full max-w-md p-6"
            data-testid="share-modal"
          >
            <h2 className="text-xl font-semibold mb-6">Share Video</h2>

            <div className="space-y-3">
              {/* Copy Link */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                <Copy className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Copy Link</div>
                  <div className="text-xs text-muted-foreground">Share this video with anyone</div>
                </div>
              </Button>

              {/* Download */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Download</div>
                  <div className="text-xs text-muted-foreground">Save video to your device</div>
                </div>
              </Button>

              {/* Embed */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={handleCopyEmbed}
                data-testid="button-embed"
              >
                <Code className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Embed</div>
                  <div className="text-xs text-muted-foreground">Get embed code for your website</div>
                </div>
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-6"
              onClick={onClose}
              data-testid="button-close-share"
            >
              Cancel
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
