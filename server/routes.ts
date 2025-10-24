import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import { insertVideoSchema, insertLikeSchema, insertCommentSchema, insertBookmarkSchema } from "@shared/schema";

// Configure multer for video uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

// Middleware to get user IP
function getUserIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get user IP
  app.get("/api/user-ip", (req, res) => {
    res.send(getUserIp(req));
  });

  // Get all videos
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  // Get video by ID
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideoById(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  // Search videos
  app.get("/api/videos/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const videos = await storage.searchVideos(query);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to search videos" });
    }
  });

  // Upload video
  app.post("/api/videos/upload", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const userIp = getUserIp(req);
      const videoUrl = `/uploads/${req.file.filename}`;

      const videoData = {
        videoUrl,
        thumbnailUrl: null,
        title: req.body.title || null,
        description: req.body.description || null,
        username: req.body.username || "anonymous",
        uploaderIp: userIp,
        source: "upload",
      };

      const result = insertVideoSchema.safeParse(videoData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid video data", details: result.error });
      }

      const video = await storage.createVideo(result.data);
      res.status(201).json(video);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  // Increment share count
  app.post("/api/videos/:id/share", async (req, res) => {
    try {
      await storage.incrementShareCount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to increment share count" });
    }
  });

  // Like a video
  app.post("/api/likes", async (req, res) => {
    try {
      const userIp = req.body.userIp || getUserIp(req);
      const likeData = {
        videoId: req.body.videoId,
        userIp,
      };

      const result = insertLikeSchema.safeParse(likeData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid like data", details: result.error });
      }

      // Check if already liked
      const isLiked = await storage.isVideoLiked(result.data.videoId, result.data.userIp);
      if (isLiked) {
        return res.status(400).json({ error: "Video already liked" });
      }

      const like = await storage.createLike(result.data);
      res.status(201).json(like);
    } catch (error) {
      res.status(500).json({ error: "Failed to like video" });
    }
  });

  // Unlike a video
  app.delete("/api/likes/:videoId", async (req, res) => {
    try {
      const userIp = req.body.userIp || getUserIp(req);
      await storage.deleteLike(req.params.videoId, userIp);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unlike video" });
    }
  });

  // Get user's liked videos
  app.get("/api/likes/user/:ip", async (req, res) => {
    try {
      const userIp = req.params.ip === "current" ? getUserIp(req) : req.params.ip;
      const likedVideoIds = await storage.getUserLikes(userIp);
      res.json(likedVideoIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user likes" });
    }
  });

  // Add a comment
  app.post("/api/comments", async (req, res) => {
    try {
      const userIp = req.body.userIp || getUserIp(req);
      const commentData = {
        videoId: req.body.videoId,
        userIp,
        username: req.body.username || "anonymous",
        content: req.body.content,
      };

      const result = insertCommentSchema.safeParse(commentData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid comment data", details: result.error });
      }

      const comment = await storage.createComment(result.data);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Get video comments
  app.get("/api/comments/:videoId", async (req, res) => {
    try {
      const comments = await storage.getVideoComments(req.params.videoId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Bookmark a video
  app.post("/api/bookmarks", async (req, res) => {
    try {
      const userIp = req.body.userIp || getUserIp(req);
      const bookmarkData = {
        videoId: req.body.videoId,
        userIp,
      };

      const result = insertBookmarkSchema.safeParse(bookmarkData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid bookmark data", details: result.error });
      }

      // Check if already bookmarked
      const isBookmarked = await storage.isVideoBookmarked(result.data.videoId, result.data.userIp);
      if (isBookmarked) {
        return res.status(400).json({ error: "Video already bookmarked" });
      }

      const bookmark = await storage.createBookmark(result.data);
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(500).json({ error: "Failed to bookmark video" });
    }
  });

  // Remove bookmark
  app.delete("/api/bookmarks/:videoId", async (req, res) => {
    try {
      const userIp = req.body.userIp || getUserIp(req);
      await storage.deleteBookmark(req.params.videoId, userIp);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  // Get user's bookmarked videos
  app.get("/api/bookmarks/user/:ip", async (req, res) => {
    try {
      const userIp = req.params.ip === "current" ? getUserIp(req) : req.params.ip;
      const bookmarkedVideoIds = await storage.getUserBookmarks(userIp);
      res.json(bookmarkedVideoIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user bookmarks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
