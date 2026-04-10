# OOTD V1 Database Schema

This document defines the first-pass relational schema for the OOTD MVP.

Owner: `@otthomas`
Backend reviewer: `@reaganbourne`

## Goals

The V1 schema needs to support:

- user accounts and refresh sessions
- outfit logging
- clothing item tagging
- social graph basics
- lightweight engagement
- future extension into event boards and AI features without painful rewrites

## MVP Tables

### `users`

Stores the core user account and profile identity.

Suggested columns:

- `id` UUID primary key
- `email` text not null unique
- `username` text unique
- `password_hash` text not null
- `display_name` text
- `profile_image_url` text
- `bio` text
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Notes:

- `email` should always be required and unique.
- `username` can be required at signup or nullable until profile completion.
- `display_name` is user-facing and can be changed later.

Indexes and constraints:

- unique index on `email`
- unique index on `username` if usernames are required or when present

### `refresh_sessions`

Stores refresh-token session state for auth lifecycle management.

Suggested columns:

- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `token_hash` text not null unique
- `user_agent` text
- `ip_address` inet or text
- `expires_at` timestamptz not null
- `revoked_at` timestamptz
- `created_at` timestamptz not null default now()

Notes:

- Store a hashed refresh token rather than the raw token.
- This supports logout, logout-all, session revocation, and refresh rotation later.

Indexes and constraints:

- unique index on `token_hash`
- index on `user_id`
- index on `expires_at`

### `outfits`

Stores the core outfit log record.

Suggested columns:

- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `image_url` text not null
- `caption` text
- `event_name` text
- `worn_on` date
- `vibe_check_text` text
- `vibe_check_tone` text
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Notes:

- `event_name` is enough for V1 before formal event boards exist.
- `vibe_check_*` can live on the outfit for V1 even if later normalized into AI-run tables.
- `worn_on` should be filterable in the vault.

Indexes and constraints:

- index on `user_id`
- index on `created_at`
- index on `(user_id, worn_on desc)`

### `clothing_items`

Stores structured tags attached to an outfit.

Suggested columns:

- `id` UUID primary key
- `outfit_id` UUID not null references `outfits(id)` on delete cascade
- `brand` text
- `category` text not null
- `color` text
- `display_order` integer not null default 0
- `created_at` timestamptz not null default now()

Notes:

- Each row represents one tagged item in the outfit.
- `display_order` allows frontend control over tag ordering.
- Keep category as free text in V1 unless a shared enum becomes necessary.

Indexes and constraints:

- index on `outfit_id`
- index on `category`
- index on `color`

### `follows`

Stores user follow relationships for the feed.

Suggested columns:

- `follower_id` UUID not null references `users(id)` on delete cascade
- `following_id` UUID not null references `users(id)` on delete cascade
- `created_at` timestamptz not null default now()

Primary key:

- composite primary key on (`follower_id`, `following_id`)

Constraints:

- check constraint preventing `follower_id = following_id`

Indexes:

- index on `following_id`

### `likes`

Stores outfit likes.

Suggested columns:

- `user_id` UUID not null references `users(id)` on delete cascade
- `outfit_id` UUID not null references `outfits(id)` on delete cascade
- `created_at` timestamptz not null default now()

Primary key:

- composite primary key on (`user_id`, `outfit_id`)

Indexes:

- index on `outfit_id`

### `comments`

Stores outfit comments.

Suggested columns:

- `id` UUID primary key
- `outfit_id` UUID not null references `outfits(id)` on delete cascade
- `user_id` UUID not null references `users(id)` on delete cascade
- `body` text not null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Indexes:

- index on `outfit_id`
- index on `user_id`
- index on `created_at`

## Relationship Summary

- one user has many outfits
- one user has many refresh sessions
- one outfit has many clothing items
- users follow many other users through `follows`
- users like many outfits through `likes`
- outfits have many comments

## Feed Query Needs

The home feed depends on:

- follow relationships by `follower_id`
- fetching outfits from followed users ordered by `created_at desc`
- like counts or comment counts later

That means V1 should at minimum support:

- fast lookup of who a user follows
- fast lookup of outfits by followed user IDs
- stable ordering by `created_at`

## Vault Query Needs

The personal vault depends on:

- filtering outfits by user
- sorting by `worn_on` or `created_at`
- filtering by event name
- filtering indirectly by item color or category

Likely V1 query pattern:

- fetch outfits for a user
- join clothing items when filter by color or category is used

## Deferred For Later Phases

Do not add these yet unless they become blockers:

- event boards
- board memberships
- board submissions
- notifications
- AI runs or prompt logs
- search materialization tables
- analytics tables

These belong in later migrations once the core auth and outfit loop are stable.

## Recommended Type Decisions

- use UUID primary keys for all major entities
- use `timestamptz` for created and updated timestamps
- use composite primary keys for join tables like `follows` and `likes`
- use `on delete cascade` for child records tied to users or outfits

## Open Decisions For Review With Reagan

1. Should `username` be required at signup, or nullable until onboarding?
2. Should `event_name` stay directly on `outfits` for V1, or do you want a more normalized placeholder now?
3. Should `vibe_check_text` live on `outfits` in V1, or should we defer that column until the AI phase?
4. Are comments definitely in MVP, or can comment endpoints be deferred while keeping the table available?
5. Do we want `ip_address` stored as `inet` or plain `text` for portability and local dev simplicity?

## Migration Readiness Checklist

Before turning this doc into Alembic migrations:

- Reagan signs off on auth-related fields
- frontend assumptions about `username` and `display_name` are settled
- no table is carrying future-phase complexity that can wait
- indexes support the first feed and vault queries
