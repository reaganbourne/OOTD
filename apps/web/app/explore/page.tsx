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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onIntersect);
  cb.current = onIntersect;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) cb.current(); },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
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
    <div className="flex shrink-0 items-center gap-2 rounded-[1.25rem] border border-line bg-white px-3 py-2">
      {user.profile_image_url ? (
        <img
          src={user.profile_image_url}
          alt={user.username ?? ""}
          className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-soft text-xs font-semibold text-ink-soft">
          {initial}
        </div>
      )}
      <span className="max-w-[80px] truncate text-xs font-semibold text-ink">
        {user.display_name ?? user.username ?? "Unknown"}
      </span>
      <button
        type="button"
        onClick={following ? onUnfollow : onFollow}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-medium lowercase transition ${
          following
            ? "border border-line bg-white text-ink-soft hover:border-pink-deep"
            : "bg-ink text-paper hover:opacity-90"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

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
  if (!loading && users.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-mute">
        People to follow
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex h-12 w-44 shrink-0 animate-pulse items-center gap-2 rounded-[1.25rem] border border-line bg-pink-soft px-3"
              />
            ))
          : users.map((user) => (
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
            <p className="font-display text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-0 lg:pt-20">
      <div className="mx-auto max-w-3xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[2.2rem] leading-none text-pink-deep">
                checkd
              </p>
              <p className="mt-1 text-sm text-mute">Explore</p>
            </div>
            <Link href="/search" className="icon-button" aria-label="Search people">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
          </div>

          {/* Search tap-target → /search */}
          <Link
            href="/search"
            className="search-shell mb-5 block"
            aria-label="Search people"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <span className="search-input text-mute">Find people…</span>
          </Link>

          {/* Who to follow rail */}
          <WhoToFollowRail
            users={suggested}
            loading={suggestedLoading}
            follows={follows}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        </header>

        {/* ── Outfit grid ─────────────────────────────────────────────────── */}
        <section>
          {gridStatus === "loading" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <OutfitCardSkeleton key={i} showAuthor />
              ))}
            </div>
          ) : null}

          {gridStatus === "ready" && outfits.length === 0 ? (
            <div className="soft-panel px-6 py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">
                Nothing yet
              </p>
              <h2 className="mt-3 text-2xl text-ink">follow some people to see outfits here</h2>
              <Link
                href="/search"
                className="mt-5 btn-primary"
              >
                Find people to follow
              </Link>
            </div>
          ) : null}

          {gridStatus === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    showAuthor
                    showCaption={false}
                    showAccentMarker={false}
                  />
                ))}
                {loadingMore
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <OutfitCardSkeleton key={`skel-${i}`} showAuthor />
                    ))
                  : null}
              </div>
              {nextCursor ? <div ref={sentinelRef} className="h-px" /> : null}
            </>
          ) : null}

          {gridStatus === "error" ? (
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
          ) : null}
        </section>
      </div>

      <MobileNav active="none" />
    </main>
  );
}
