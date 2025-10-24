import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload as UploadIcon, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [username, setUsername] = useState("anonymous");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("POST", "/api/videos/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Success!",
        description: "Your video has been uploaded successfully",
      });
      // Reset form
      setVideoFile(null);
      setVideoPreview(null);
      setTitle("");
      setDescription("");
      setUsername("anonymous");
      // Redirect to For You page
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a video file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("username", username);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background p-6" data-testid="upload-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Upload Video
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Share your video anonymously. Only your IP address will be stored for moderation purposes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload Area */}
          <div>
            <Label>Video</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mt-2 border-2 border-dashed rounded-lg transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {videoPreview ? (
                <div className="relative aspect-[9/16] max-h-[500px] mx-auto">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full h-full object-contain rounded-lg"
                    data-testid="video-preview"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                    data-testid="button-remove-video"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="p-12 text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-dropzone"
                >
                  <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-1">Drop your video here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <Button type="button" variant="outline" data-testid="button-browse">
                    Browse Files
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              data-testid="input-file"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a title"
              className="mt-2"
              data-testid="input-title"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your video..."
              className="mt-2 min-h-24"
              data-testid="input-description"
            />
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="username">Username (Optional)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="anonymous"
              className="mt-2"
              data-testid="input-username"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!videoFile || uploadMutation.isPending}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white"
            data-testid="button-submit-upload"
          >
            <AnimatePresence mode="wait">
              {uploadMutation.isPending ? (
                <motion.span
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </motion.span>
              ) : uploadMutation.isSuccess ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Uploaded!
                </motion.span>
              ) : (
                <motion.span
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Upload Video
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
