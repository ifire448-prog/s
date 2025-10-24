import { useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Comment } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onSubmitComment: (content: string) => void;
  isPending?: boolean;
}

export function CommentModal({ isOpen, onClose, comments, onSubmitComment, isPending }: CommentModalProps) {
  const [commentText, setCommentText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onSubmitComment(commentText);
      setCommentText("");
    }
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
            data-testid="comment-modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50 max-h-[80vh] flex flex-col md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl"
            data-testid="comment-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Comments</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                data-testid="button-close-comments"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Comments list */}
            <ScrollArea className="flex-1 p-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs mt-1">Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                        {comment.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" data-testid={`comment-username-${comment.id}`}>
                            @{comment.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90" data-testid={`comment-content-${comment.id}`}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Comment input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  disabled={isPending}
                  data-testid="input-comment"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim() || isPending}
                  className="bg-gradient-to-r from-primary to-secondary"
                  data-testid="button-submit-comment"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
