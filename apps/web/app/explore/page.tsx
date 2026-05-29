"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  type FeedOutfitResponse,
  type UserSearchResult,
} from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import {
  OutfitCard,
  OutfitCardSkeleton,
  type OutfitCardData,
} from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 16;

type FollowMap = Record<string, { following: boolean; followerCount: number }>;

function toCardData(outfit: FeedOutfitResponse): OutfitCardData {
  return {
    id: outfit.id,
    imageUrl: outfit.image_url,
    caption: outfit.caption,
    eventName: outfit.event_name,
    wornOn: outfit.worn_on,
    createdAt: outfit.created_at,
    vibeTone: outfit.vibe_check_tone,
    author: {
      username: outfit.author.username,
      profileImageUrl: outfit.author.profile_image_url,
    },
  };
}

function useSentinel(onIntersect: () => void) {
  const cb = useRef(onIntersect);
  cb.current = onIntersect;
  const obsRef = useRef<IntersectionObserver | null>(null);

  // Callback ref: fires whenever the sentinel mounts/unmounts, so the
  // observer always attaches even when the element appears after data loads.
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) cb.current(); },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    obsRef.current = obs;
  }, []);

  return sentinelRef;
}

// ── Who-to-follow rail ────────────────────────────────────────────────────────

function UserChip({
  user,
  followState,
  onFollow,
  onUnfollow,
}: {
  user: UserSearchResult;
  followState: { following: boolean } | undefined;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const following = followState?.following ?? false;
  const initial = (user.display_name?.trim() || user.username?.trim() || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-line bg-white px-2 py-3 text-center">
      {user.profile_image_url ? (
        <img
          src={user.profile_image_url}
          alt={user.username ?? ""}
          className="h-10 w-10 rounded-full border border-line object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-soft text-sm font-semibold text-ink-soft">
          {initial}
        </div>
      )}
      <p className="w-full truncate text-[0.68rem] font-semibold text-ink">
        {user.display_name ?? user.username ?? "Unknown"}
      </p>
      <button
        type="button"
        onClick={following ? onUnfollow : onFollow}
        className={`w-full rounded-full px-2 py-1 text-[0.65rem] font-medium lowercase transition ${
          following
            ? "border border-line bg-white text-ink-soft hover:border-pink-deep"
            : "bg-ink text-paper hover:opacity-90"
        }`}
      >
        {following ? "following" : "follow"}
      </button>
    </div>
  );
}

const PAGE_USERS = 3;

function WhoToFollowRail({
  users,
  loading,
  follows,
  onFollow,
  onUnfollow,
}: {
  users: UserSearchResult[];
  loading: boolean;
  follows: FollowMap;
  onFollow: (userId: string, followerCount: number) => void;
  onUnfollow: (userId: string, followerCount: number) => void;
}) {
  const [page, setPage] = useState(0);

  if (!loading && users.length === 0) return null;

  const totalPages = Math.ceil(users.length / PAGE_USERS);
  const visible = users.slice(page * PAGE_USERS, page * PAGE_USERS + PAGE_USERS);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-mute">
          People to follow
        </p>
        <div className="flex items-center gap-1">
          {!loading && hasPrev ? (
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-[0.65rem] font-semibold text-mute transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : null}
          {!loading && hasNext ? (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-[0.65rem] font-semibold text-mute transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {loading
          ? Array.from({ length: PAGE_USERS }).map((_, i) => (
              <div key={i} className="flex h-12 animate-pulse items-center gap-2 rounded-[1.25rem] border border-line bg-pink-soft px-3" />
            ))
          : visible.map((user) => (
              <UserChip
                key={user.id}
                user={user}
                followState={follows[user.username ?? user.id]}
                onFollow={() => onFollow(user.username ?? user.id, user.follower_count)}
                onUnfollow={() => onUnfollow(user.username ?? user.id, user.follower_count)}
              />
            ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [outfits, setOutfits] = useState<FeedOutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [gridStatus, setGridStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [suggested, setSuggested] = useState<UserSearchResult[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [follows, setFollows] = useState<FollowMap>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load outfit grid
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let active = true;
    setGridStatus("loading");

    apiClient.outfits.getExplore({ limit: PAGE_SIZE }).then((result) => {
      if (!active) return;
      if (!result.ok) { setGridStatus("error"); return; }
      setOutfits(result.data.outfits);
      setNextCursor(result.data.next_cursor ?? null);
      setGridStatus("ready");
    });

    return () => { active = false; };
  }, [isAuthenticated, isLoading, reloadKey]);

  // Load suggested users
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let active = true;
    setSuggestedLoading(true);

    apiClient.users.getSuggested(10).then((result) => {
      if (!active) return;
      if (result.ok) setSuggested(result.data);
      setSuggestedLoading(false);
    });

    return () => { active = false; };
  }, [isAuthenticated, isLoading]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || gridStatus !== "ready") return;
    setLoadingMore(true);

    const result = await apiClient.outfits.getExplore({ cursor: nextCursor, limit: PAGE_SIZE });
    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setNextCursor(result.data.next_cursor ?? null);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, gridStatus]);

  const sentinelRef = useSentinel(() => { void loadMore(); });

  async function handleFollow(username: string, currentCount: number) {
    setFollows((prev) => ({ ...prev, [username]: { following: true, followerCount: currentCount + 1 } }));
    const result = await apiClient.users.follow(username);
    if (result.ok) {
      setFollows((prev) => ({ ...prev, [username]: { following: result.data.following, followerCount: result.data.follower_count } }));
    } else {
      setFollows((prev) => ({ ...prev, [username]: { following: false, followerCount: currentCount } }));
    }
  }

  async function handleUnfollow(username: string, currentCount: number) {
    setFollows((prev) => ({ ...prev, [username]: { following: false, followerCount: Math.max(0, currentCount - 1) } }));
    const result = await apiClient.users.unfollow(username);
    if (result.ok) {
      setFollows((prev) => ({ ...prev, [username]: { following: result.data.following, followerCount: result.data.follower_count } }));
    } else {
      setFollows((prev) => ({ ...prev, [username]: { following: true, followerCount: currentCount } }));
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-28 pt-14 lg:pb-0 lg:pt-20">
      {/* Header and people rail stay padded */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display italic text-[2.2rem] leading-none text-pink-deep">
                checkd
              </p>
              <p className="mt-1 text-sm text-mute">explore</p>
            </div>
            <Link href="/search" className="icon-button" aria-label="Search people">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
          </div>

          {/* Who to follow rail */}
          <WhoToFollowRail
            users={suggested}
            loading={suggestedLoading}
            follows={follows}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        </header>
      </div>

      {/* ── Outfit grid ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl">
        {gridStatus === "loading" ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <OutfitCardSkeleton key={i} compact />
            ))}
          </div>
        ) : null}

        {gridStatus === "ready" && outfits.length === 0 ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="soft-panel px-6 py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">
                Nothing yet
              </p>
              <h2 className="mt-3 text-2xl text-ink">follow some people to see outfits here</h2>
              <Link href="/search" className="mt-5 btn-primary">
                Find people to follow
              </Link>
            </div>
          </div>
        ) : null}

        {gridStatus === "ready" && outfits.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-0.5">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={toCardData(outfit)}
                  compact
                />
              ))}
              {loadingMore
                ? Array.from({ length: 3 }).map((_, i) => (
                    <OutfitCardSkeleton key={`skel-${i}`} compact />
                  ))
                : null}
            </div>
            {nextCursor ? <div ref={sentinelRef} className="h-4" /> : null}
          </>
        ) : null}

        {gridStatus === "error" ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="soft-panel px-6 py-8 text-center">
              <p className="text-sm text-mute">Couldn&rsquo;t load outfits. Try refreshing.</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-4 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25"
              >
                Refresh
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <MobileNav active="none" />
    </main>
  );
}
