# Stellar Stream

Build a Premium Movie Streaming Platform

Build a modern, premium movie-streaming web app inspired by the overall usability of popular streaming platforms, but do not copy MovieBox's branding, logo, exact UI, or proprietary design.

The platform should allow an administrator to add movies through an admin dashboard and allow users to browse movies and watch authorized content directly inside the platform.

1. User Home Page

Create a cinematic, premium streaming homepage containing:

Large featured movie section

Movie poster and backdrop

Movie title

Short description

Genre

Release year

Rating

"Watch Now" button

"Add to Watchlist" button

Continue Watching section

Trending Movies

Latest Movies

Popular Movies

Genre/category sections

Search button

User profile/menu

Use a dark cinematic interface with subtle glassmorphism, smooth animations, premium spacing, and high-quality movie artwork.

Do not overcrowd the interface.

2. Movie Details Page

When a user selects a movie, display:

Large cinematic backdrop

Movie poster

Title

Description

Genre

Release year

Runtime

Rating

Cast

Director

Trailer button

Watch Now button

Add to Watchlist

Related Movies

The page should feel like a professional streaming service.

3. Video Player

Create a dedicated movie-watching page.

The player should support authorized streaming URLs, including HLS .m3u8 streams where available.

Player controls should include:

Play/pause

Seek

Volume

Fullscreen

Playback quality when supported

Subtitle selection when available

Picture-in-picture when supported

Continue watching position

Do not download or scrape videos from unauthorized third-party movie websites.

The application must only play content that the platform has permission to stream.

4. Admin Dashboard

Create an admin section with a premium dashboard.

Add a Movies management page.

Administrator should be able to:

Add movie

Edit movie

Delete movie

Publish/unpublish movie

Feature movie

Change movie category

Upload/change poster

Upload/change backdrop

Add trailer URL

Add authorized video source URL

Add subtitle URL

Set movie quality

Set release year

Set runtime

Add description

Add cast

Add director

Add rating

Create an "Add Movie" form with clear sections:

Movie Information

Title

Description

Genre

Release year

Runtime

Rating

Cast

Director

Artwork

Poster

Backdrop

Streaming

Authorized video URL

Streaming format

Subtitle URL

Trailer URL

Publishing

Draft

Published

Featured

Trending

Add validation so an administrator cannot publish a movie without the required information.

5. Supabase Database

Create a clean database structure for:

movies

id

title

slug

description

poster_url

backdrop_url

video_url

video_type

subtitle_url

trailer_url

genre

release_year

runtime

rating

cast

director

is_published

is_featured

is_trending

created_at

updated_at

watch_history

id

user_id

movie_id

progress_seconds

completed

updated_at

watchlists

id

user_id

movie_id

created_at

genres

id

name

slug

Use proper foreign keys, indexes, timestamps, and Row Level Security.

Users should only be able to modify their own watch history and watchlists.

Only authorized administrators should be able to create, edit, publish, or delete movies.

6. Movie Search

Add a fast search experience.

Users should be able to search by:

Movie title

Genre

Year

Cast

Display search results using movie cards.

7. Responsive Design

The entire platform must work properly on:

Android phones

iPhones

Tablets

Desktop

Large screens

Prioritize mobile usability because most users will access the platform from mobile devices.

8. Visual Direction

Use a:

Premium cinematic aesthetic

Dark interface

Glassmorphism where appropriate

Subtle gradients

Large movie artwork

Smooth transitions

Rounded cards

Clean typography

Minimal clutter

Professional spacing

Avoid making every element glow or look overly futuristic.

The interface should feel like a real premium streaming platform, not a generic dashboard template.

9. Important Architecture Rule

Separate the movie metadata from the actual video content.

The Supabase database should store the authorized video source URL or playback reference.

The actual video files should be hosted on an appropriate video-storage/CDN service rather than unnecessarily storing large movie files directly inside database rows.

Build the application so the video provider can be changed later without redesigning the entire application.

10. Admin Preview

After implementing the database and UI, create sample movie records using placeholder/demo content so I can immediately test:

Adding a movie

Publishing a movie

Searching

Opening movie details

Starting playback

Watch history

Watchlist

Admin editing

Do not use copyrighted movies or unauthorized streaming sources for the demo data.

Final Requirement

Before finishing, make sure the complete flow works:

Admin adds movie → Movie is saved to Supabase → Admin publishes movie → Movie appears on homepage → User opens movie → User taps Watch Now → Authorized video source opens in the built-in player → Playback position is saved → User can resume watching later.

Do not remove or break existing application functionality while implementing this.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://storyframe-player.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/96cfedf7-7669-49bb-a487-64b305227b4a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
