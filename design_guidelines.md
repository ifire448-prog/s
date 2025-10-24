# Design Guidelines: TikTok-Inspired Video Platform

## Design Approach
**Reference-Based**: Directly inspired by TikTok's immersive video-first interface, optimized for vertical video consumption with dark aesthetics and intuitive mobile-first interactions.

## Color System
- **Primary Background**: Deep black (#000000)
- **Primary Accent**: Vibrant pink (TikTok signature)
- **Secondary Accent**: Cyan (TikTok signature)
- **Gradients**: Subtle pink-to-cyan for interactive elements and hover states
- **Text**: White/light gray for high contrast on dark backgrounds

## Typography
- **Font Family**: Modern, clean sans-serif (use Inter or similar via Google Fonts)
- **Hierarchy**: 
  - Video titles/usernames: Medium weight, 16-18px
  - Descriptions: Regular weight, 14-16px
  - UI labels: Medium weight, 12-14px
  - Counts/stats: Regular weight, 12-14px

## Layout Architecture

### Left Sidebar Navigation (Fixed)
- Vertical navigation bar with icons and labels
- Navigation items: For You, Explore, Upload, Search
- Dark background with subtle transparency
- Active state uses pink accent color
- Width: 240px on desktop, collapsible to icon-only on smaller screens

### Center Stage - Video Feed
- Full-height vertical video player taking maximum viewport space
- Videos fill the screen with 9:16 aspect ratio
- Smooth vertical scrolling between videos (snap-scroll behavior)
- Video controls: Bottom-left positioned play/pause and mute/unmute buttons with subtle backdrop blur

### Right-Side Interaction Panel (Fixed)
- Vertical stack of interaction buttons positioned right side of video
- Buttons: Like (heart icon), Comment (speech bubble), Bookmark, Share
- Each button shows icon with count below
- Pink accent on active/liked state
- Slight scale animation on interaction
- Position: 20px from right edge, vertically centered

## Core Components

### Video Player Card
- Full viewport height container
- Video element with object-fit cover
- Bottom overlay gradient for text readability
- User info (username, description) overlaid at bottom-left
- Autoplay on scroll into view
- Muted by default with unmute control

### Upload Page
- Centered upload interface with drag-and-drop zone
- Large dashed border area for file selection
- Preview of selected video before upload
- Anonymous upload notice (IP tracking only)
- Pink gradient primary upload button

### Explore Page
- Grid layout of video thumbnails (3-4 columns on desktop)
- Hover effect showing video preview/play
- Thumbnail shows first frame with play overlay
- Click opens video in full-screen player

### Search Interface
- Top search bar with dark background and subtle border
- Search results in grid format similar to Explore
- Filtering options for categories/tags

## Spacing & Rhythm
- Use Tailwind units: 2, 4, 6, 8, 12, 16, 20 for consistent spacing
- Video padding: 0 (full bleed)
- Sidebar padding: p-4 to p-6
- Interaction buttons spacing: gap-6 between buttons
- Content padding within overlays: p-6

## Animations
- **Scroll Transitions**: Smooth snap-scroll between videos (300ms ease)
- **Button Interactions**: Scale effect (1.1x) on like/bookmark (200ms)
- **Fade-ins**: Video info overlay fades in on load (400ms)
- **Slide Transitions**: Sidebar and modals slide in from edges (300ms)
- Keep animations subtle to maintain immersive video experience

## Component Specifications

### Interaction Buttons
- Circular white icons on transparent/blur background
- Size: 48x48px touch targets
- Pink fill on active states
- Count displayed below in small text
- Hover: subtle scale and brightness increase

### Comment Modal
- Slides up from bottom on mobile, modal on desktop
- Dark background with slight transparency
- Comment input at bottom with pink send button
- Scrollable comment list above

### Share Sheet
- Bottom sheet on mobile, popover on desktop
- Share options: Copy link, Download, Embed
- Dark theme consistent with app

## Images
No hero images required - this is a video-first application. All content is user-generated vertical videos scraped from Reddit or uploaded anonymously. Video thumbnails serve as all visual content.

## Accessibility
- High contrast white text on black backgrounds
- Keyboard navigation support for video controls
- ARIA labels on all interactive icons
- Focus states using pink accent outline
- Captions support for videos (when available)