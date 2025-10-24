# VidFlow - Short Video Platform

## Overview
VidFlow is a TikTok-inspired short-form video platform with a dark, immersive design. The platform features vertical video scrolling, anonymous uploads, and social interactions without requiring user authentication.

## Purpose
Create an engaging video sharing platform where users can:
- Watch curated short-form videos in a vertical feed
- Discover new content through an explore page
- Upload videos anonymously (IP-only tracking)
- Interact with content (like, comment, bookmark, share)
- Search for videos

## Current State
**Phase 1 Complete**: All frontend components and pages implemented with exceptional visual quality
**Phase 2 In Progress**: Backend API implementation

## Recent Changes
- **October 24, 2025**: Initial project setup
  - Defined complete data schema for videos, likes, comments, and bookmarks
  - Configured TikTok-inspired design system (deep black, pink/cyan accents, Inter font)
  - Built all core React components with smooth animations
  - Created all pages: For You feed, Explore, Upload, Search
  - Implemented left sidebar navigation with VidFlow branding
  - Added vertical video player with mute/unmute controls
  - Created right-side interaction panel with gradient buttons
  - Built comment and share modals with slide-in animations

## Project Architecture

### Design System
- **Colors**: Deep black backgrounds (#000000), vibrant pink primary (#FC1F7C - 330 85% 60%), cyan secondary (#00F5D4 - 185 85% 55%)
- **Typography**: Inter font for modern, clean aesthetics
- **Animations**: Framer Motion for smooth transitions and interactions
- **Layout**: Fixed left sidebar (16rem), full-screen video feed, fixed right interaction panel

### Data Model
**Videos**
- ID, video URL, thumbnail URL, title, description
- Username (default: "anonymous"), uploader IP
- Engagement metrics: likes, comments, bookmarks, shares, views
- Source: "upload" or "reddit"

**Interactions**
- Likes: videoId + userIp
- Comments: videoId + userIp + username + content
- Bookmarks: videoId + userIp

### Frontend Structure
**Pages**
- `/` - For You feed (vertical scrolling video player)
- `/explore` - Grid layout of all videos with hover previews
- `/upload` - Drag-and-drop video upload interface
- `/search` - Search functionality with grid results

**Components**
- `AppSidebar` - Left navigation with For You, Explore, Upload, Search
- `VideoPlayer` - Full-screen vertical video with controls and info overlay
- `InteractionPanel` - Right-side buttons (like, comment, bookmark, share)
- `CommentModal` - Slide-up modal for viewing and posting comments
- `ShareModal` - Modal with copy link, download, and embed options

### Backend Structure
**API Endpoints** (To be implemented)
- `GET /api/videos` - Fetch all videos
- `POST /api/videos/upload` - Upload new video
- `GET /api/videos/search?q=` - Search videos
- `POST /api/likes` - Like a video
- `DELETE /api/likes/:videoId` - Unlike a video
- `GET /api/likes/user/:ip` - Get user's liked videos
- `POST /api/comments` - Add comment
- `GET /api/comments/:videoId` - Get video comments
- `POST /api/bookmarks` - Bookmark a video
- `DELETE /api/bookmarks/:videoId` - Remove bookmark
- `GET /api/bookmarks/user/:ip` - Get user's bookmarks
- `POST /api/videos/:id/share` - Increment share count
- `GET /api/user-ip` - Get user's IP address

### User Preferences
- No authentication required - fully anonymous platform
- IP addresses stored for moderation and tracking interactions
- Default username is "anonymous" but can be customized per upload/comment
- Pink/cyan gradient theme with deep black backgrounds
- Smooth animations and transitions throughout

### Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js, TypeScript
- **Storage**: In-memory (MemStorage for MVP)
- **UI Components**: Shadcn UI with custom theming
- **State Management**: TanStack Query (React Query v5)

### Key Features
1. **Vertical Video Feed**: Smooth scroll/swipe navigation between videos
2. **Anonymous Uploads**: No login required, IP-only tracking
3. **Social Interactions**: Like, comment, bookmark, share on each video
4. **Explore Grid**: Discover new content with hover-to-play previews
5. **Search**: Find videos by username or description
6. **Responsive Design**: Mobile-first with desktop optimizations

### Notes
- Videos autoplay when in view, muted by default
- Keyboard navigation supported (Arrow Up/Down)
- Mouse wheel scrolling for video navigation
- All interactions tracked by IP address
- Share modal provides copy link, download, and embed options
- Comments display with relative timestamps
- Grid layouts use staggered animations for visual appeal
