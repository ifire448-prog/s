import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import { insertVideoSchema, insertLikeSchema, insertCommentSchema, insertBookmarkSchema } from "@shared/schema";
import { fetchRedditVideos, fetchMultipleSubreddits } from "./reddit-scraper";
import { fetchRedgifsData, fetchTrendingRedgifs, fetchRedgifsByTags, clearRedgifsCache } from "./redgifs-scraper";

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

  // =================
  // VIDEO PROXY (CORS fallback)
  // =================
  app.get("/api/proxy", async (req, res) => {
    try {
      const target = req.query.url as string;
      if (!target) return res.status(400).send("Missing url param");

      const parsed = new URL(target);
      const allowedSuffixes = [
        "v.redd.it",           // exact
        "redd.it",             // subdomains
        "redditmedia.com",
        "imgur.com",
        "gfycat.com",
        "redgifs.com",
      ];
      const host = parsed.hostname.toLowerCase();
      const allowed = allowedSuffixes.some(s => host === s || host.endsWith(`.${s}`));
      if (!allowed) return res.status(400).send("Host not allowed");

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
      };
      if (req.headers.range) headers["Range"] = String(req.headers.range);

      const upstream = await fetch(target, {
        method: "GET",
        headers,
      });

      // Forward status for range support
      res.status(upstream.status);

      // Forward critical headers
      const passthroughHeaders = [
        "content-type",
        "content-length",
        "accept-ranges",
        "content-range",
        "cache-control",
      ];
      passthroughHeaders.forEach((h) => {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      });
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (!upstream.body) return res.end();
      // Stream body (convert Web ReadableStream to Node Readable)
      try {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.pipe(res);
      } catch {
        // Fallback: buffer and send (less efficient)
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.end(buf);
      }
    } catch (err: any) {
      console.error("Proxy error:", err.message);
      res.status(502).send("Proxy failed");
    }
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

  // Fetch Reddit videos from a specific subreddit
  app.get("/api/reddit/videos", async (req, res) => {
    try {
      const subreddit = (req.query.subreddit as string) || "funnyvideos";
      const limit = parseInt((req.query.limit as string) || "25");
      const sort = (req.query.sort as string) || "hot";
      const after = (req.query.after as string) || undefined;
      const { videos, after: next } = await fetchRedditVideos(subreddit, limit, sort, after);
      // For backward compatibility, return only the videos array
      if (next) {
        res.set("X-Reddit-After", next);
      }
      res.json(videos);
    } catch (error) {
      console.error("Reddit fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Reddit videos" });
    }
  });

  // Fetch Reddit videos from multiple subreddits
  app.get("/api/reddit/videos/multi", async (req, res) => {
    try {
      const subredditsParam = req.query.subreddits as string;
      const subreddits = subredditsParam 
        ? subredditsParam.split(",") 
        : ["funnyvideos", "videos", "unexpected"];
      const limitPerSub = parseInt((req.query.limit as string) || "10");
      const sort = (req.query.sort as string) || "hot"; // Support different sorting
      const videos = await fetchMultipleSubreddits(subreddits, limitPerSub, sort);
      res.json(videos);
    } catch (error) {
      console.error("Reddit multi-fetch error:", error);
      res.status(500).json({ error: "Failed to fetch videos from multiple subreddits" });
    }
  });

  // Import Reddit video to database
  app.post("/api/reddit/import", async (req, res) => {
    try {
      const { id, title, author, url, thumbnail } = req.body;
      
      if (!id || !url) {
        return res.status(400).json({ error: "Missing required fields: id, url" });
      }

      const userIp = getUserIp(req);
      const videoData = {
        videoUrl: url,
        thumbnailUrl: thumbnail || null,
        title: title || null,
        description: `From r/${req.body.subreddit || "reddit"}`,
        username: author || "reddit_user",
        uploaderIp: userIp,
        source: "reddit",
      };

      const result = insertVideoSchema.safeParse(videoData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid video data", details: result.error });
      }

      const video = await storage.createVideo(result.data);
      res.status(201).json(video);
    } catch (error) {
      console.error("Reddit import error:", error);
      res.status(500).json({ error: "Failed to import Reddit video" });
    }
  });

  // =================
  // REDGIFS ENDPOINTS
  // =================

  // Fetch trending RedGIFs content
  app.get("/api/redgifs/trending", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "50");
      const debug = req.query.debug === 'true';
      const media = await fetchTrendingRedgifs(limit, debug);
      res.json(media);
    } catch (error) {
      console.error("RedGIFs trending error:", error);
      res.status(500).json({ error: "Failed to fetch trending RedGIFs" });
    }
  });

  // Fetch RedGIFs by tags/categories
  app.get("/api/redgifs/tags", async (req, res) => {
    try {
      const tagsParam = req.query.tags as string;
      const tags = tagsParam ? tagsParam.split(",") : ["trending"];
      const limit = parseInt((req.query.limit as string) || "50");
      const debug = req.query.debug === 'true';
      
      const media = await fetchRedgifsByTags(tags, limit, debug);
      res.json(media);
    } catch (error) {
      console.error("RedGIFs tags error:", error);
      res.status(500).json({ error: "Failed to fetch RedGIFs by tags" });
    }
  });

  // Fetch RedGIFs with full configuration
  app.post("/api/redgifs/fetch", async (req, res) => {
    try {
      const config = req.body;
      const media = await fetchRedgifsData(config);
      res.json(media);
    } catch (error) {
      console.error("RedGIFs fetch error:", error);
      res.status(500).json({ error: "Failed to fetch RedGIFs data" });
    }
  });

  // Clear RedGIFs cache
  app.post("/api/redgifs/clear-cache", async (req, res) => {
    try {
      clearRedgifsCache();
      res.json({ message: "RedGIFs cache cleared successfully" });
    } catch (error) {
      console.error("RedGIFs cache clear error:", error);
      res.status(500).json({ error: "Failed to clear RedGIFs cache" });
    }
  });

  // Import RedGIFs media to database
  app.post("/api/redgifs/import", async (req, res) => {
    try {
      const { id, title, url, thumbnailUrl, tags, userName } = req.body;
      
      if (!id || !url) {
        return res.status(400).json({ error: "Missing required fields: id, url" });
      }

      const userIp = getUserIp(req);
      const videoData = {
        videoUrl: url,
        thumbnailUrl: thumbnailUrl || null,
        title: title || null,
        description: tags?.join(", ") || null,
        username: userName || "redgifs_user",
        uploaderIp: userIp,
        source: "redgifs",
      };

      const result = insertVideoSchema.safeParse(videoData);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid video data", details: result.error });
      }

      const video = await storage.createVideo(result.data);
      res.status(201).json(video);
    } catch (error) {
      console.error("RedGIFs import error:", error);
      res.status(500).json({ error: "Failed to import RedGIFs media" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
