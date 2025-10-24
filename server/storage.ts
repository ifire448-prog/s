import {
  type Video,
  type InsertVideo,
  type Like,
  type InsertLike,
  type Comment,
  type InsertComment,
  type Bookmark,
  type InsertBookmark,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Videos
  getAllVideos(): Promise<Video[]>;
  getVideoById(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  searchVideos(query: string): Promise<Video[]>;
  incrementShareCount(videoId: string): Promise<void>;

  // Likes
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(videoId: string, userIp: string): Promise<void>;
  getUserLikes(userIp: string): Promise<string[]>;
  isVideoLiked(videoId: string, userIp: string): Promise<boolean>;

  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getVideoComments(videoId: string): Promise<Comment[]>;

  // Bookmarks
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(videoId: string, userIp: string): Promise<void>;
  getUserBookmarks(userIp: string): Promise<string[]>;
  isVideoBookmarked(videoId: string, userIp: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private videos: Map<string, Video>;
  private likes: Map<string, Like>;
  private comments: Map<string, Comment>;
  private bookmarks: Map<string, Bookmark>;

  constructor() {
    this.videos = new Map();
    this.likes = new Map();
    this.comments = new Map();
    this.bookmarks = new Map();

    // Seed with mock Reddit videos
    this.seedMockVideos();
  }

  private seedMockVideos() {
    const mockVideos = [
      {
        id: randomUUID(),
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl: null,
        title: "Big Buck Bunny",
        description: "A large and lovable rabbit deals with three tiny bullies, led by a flying squirrel",
        username: "blender_studio",
        uploaderIp: "mock",
        likesCount: 12500,
        commentsCount: 342,
        bookmarksCount: 1890,
        sharesCount: 456,
        viewsCount: 125000,
        source: "reddit",
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: randomUUID(),
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnailUrl: null,
        title: "Elephants Dream",
        description: "The first Blender open movie from 2006",
        username: "orange_films",
        uploaderIp: "mock",
        likesCount: 8900,
        commentsCount: 234,
        bookmarksCount: 1200,
        sharesCount: 289,
        viewsCount: 89000,
        source: "reddit",
        createdAt: new Date(Date.now() - 86400000 * 1),
      },
      {
        id: randomUUID(),
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnailUrl: null,
        title: "For Bigger Blazes",
        description: "HBO GO now works with Chromecast",
        username: "google_demo",
        uploaderIp: "mock",
        likesCount: 15600,
        commentsCount: 567,
        bookmarksCount: 2100,
        sharesCount: 678,
        viewsCount: 156000,
        source: "reddit",
        createdAt: new Date(Date.now() - 86400000 * 3),
      },
    ];

    mockVideos.forEach((video) => {
      this.videos.set(video.id, video as Video);
    });
  }

  // Videos
  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getVideoById(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      ...insertVideo,
      id,
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async searchVideos(query: string): Promise<Video[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.videos.values()).filter(
      (video) =>
        video.username.toLowerCase().includes(lowerQuery) ||
        video.description?.toLowerCase().includes(lowerQuery) ||
        video.title?.toLowerCase().includes(lowerQuery)
    );
  }

  async incrementShareCount(videoId: string): Promise<void> {
    const video = this.videos.get(videoId);
    if (video) {
      video.sharesCount++;
      this.videos.set(videoId, video);
    }
  }

  // Likes
  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = randomUUID();
    const like: Like = {
      ...insertLike,
      id,
      createdAt: new Date(),
    };
    this.likes.set(id, like);

    // Increment video likes count
    const video = this.videos.get(insertLike.videoId);
    if (video) {
      video.likesCount++;
      this.videos.set(insertLike.videoId, video);
    }

    return like;
  }

  async deleteLike(videoId: string, userIp: string): Promise<void> {
    const like = Array.from(this.likes.values()).find(
      (l) => l.videoId === videoId && l.userIp === userIp
    );
    if (like) {
      this.likes.delete(like.id);

      // Decrement video likes count
      const video = this.videos.get(videoId);
      if (video && video.likesCount > 0) {
        video.likesCount--;
        this.videos.set(videoId, video);
      }
    }
  }

  async getUserLikes(userIp: string): Promise<string[]> {
    return Array.from(this.likes.values())
      .filter((like) => like.userIp === userIp)
      .map((like) => like.videoId);
  }

  async isVideoLiked(videoId: string, userIp: string): Promise<boolean> {
    return Array.from(this.likes.values()).some(
      (like) => like.videoId === videoId && like.userIp === userIp
    );
  }

  // Comments
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);

    // Increment video comments count
    const video = this.videos.get(insertComment.videoId);
    if (video) {
      video.commentsCount++;
      this.videos.set(insertComment.videoId, video);
    }

    return comment;
  }

  async getVideoComments(videoId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter((comment) => comment.videoId === videoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Bookmarks
  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = randomUUID();
    const bookmark: Bookmark = {
      ...insertBookmark,
      id,
      createdAt: new Date(),
    };
    this.bookmarks.set(id, bookmark);

    // Increment video bookmarks count
    const video = this.videos.get(insertBookmark.videoId);
    if (video) {
      video.bookmarksCount++;
      this.videos.set(insertBookmark.videoId, video);
    }

    return bookmark;
  }

  async deleteBookmark(videoId: string, userIp: string): Promise<void> {
    const bookmark = Array.from(this.bookmarks.values()).find(
      (b) => b.videoId === videoId && b.userIp === userIp
    );
    if (bookmark) {
      this.bookmarks.delete(bookmark.id);

      // Decrement video bookmarks count
      const video = this.videos.get(videoId);
      if (video && video.bookmarksCount > 0) {
        video.bookmarksCount--;
        this.videos.set(videoId, video);
      }
    }
  }

  async getUserBookmarks(userIp: string): Promise<string[]> {
    return Array.from(this.bookmarks.values())
      .filter((bookmark) => bookmark.userIp === userIp)
      .map((bookmark) => bookmark.videoId);
  }

  async isVideoBookmarked(videoId: string, userIp: string): Promise<boolean> {
    return Array.from(this.bookmarks.values()).some(
      (bookmark) => bookmark.videoId === videoId && bookmark.userIp === userIp
    );
  }
}

export const storage = new MemStorage();
