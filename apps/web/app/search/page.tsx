"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type UserSearchResult } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import { useAuth } from "@/lib/auth-context";

type FollowMap = Record<string, { following: boolean; followerCount: number }>;

function getInitial(displayName?: string | null, username?: string | null) {
  const source = displayName?.trim() || username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  followState,
  onFollow,
  onUnfollow,
}: {
  user: UserSearchResult;
  followState: { following: boolean; followerCount: number } | undefined;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const following = followState?.following ?? false;
  const followerCount = followState?.followerCount ?? user.follower_count;

  return (
    <div className="flex items-center gap-3 py-3">
      {user.profile_image_url ? (
        <img
          src={user.profile_image_url}
          alt={user.display_name ?? user.username ?? ""}
          className="h-11 w-11 shrink-0 rounded-full border border-plum/10 object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-plum/12 bg-pink-soft text-sm font-semibold text-ink-soft">
          {getInitial(user.display_name, user.username)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {user.display_name ?? user.username ?? "Unknown"}
        </p>
        {user.username ? (
          <p className="text-[0.68rem] text-mute">@{user.username}</p>
        ) : null}
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
          {followerCount.toLocaleString()} {followerCount === 1 ? "follower" : "followers"}
        </p>
      </div>

      <button
        type="button"
        onClick={following ? onUnfollow : onFollow}
        className={`shrink-0 rounded-full px-4 py-1.5 text-[0.75rem] font-medium lowercase transition ${
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

function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-pink-soft" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 animate-pulse rounded-full bg-pink-soft" />
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-pink-soft" />
        <div className="h-2 w-16 animate-pulse rounded-full bg-line/60" />
      </div>
      <div className="h-7 w-20 animate-pulse rounded-full bg-pink-soft" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "done">("idle");

  const [suggested, setSuggested] = useState<UserSearchResult[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  const [follows, setFollows] = useState<FollowMap>({});

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load suggested users
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let active = true;
    setSuggestedLoading(true);

    apiClient.users.getSuggested(12).then((result) => {
      if (!active) return;
      if (result.ok) setSuggested(result.data);
      setSuggestedLoading(false);
    });

    return () => { active = false; };
  }, [isAuthenticated, isLoading]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    setSearchStatus("searching");
    searchTimerRef.current = setTimeout(async () => {
      const result = await apiClient.users.search(q, 30);
      if (result.ok) setSearchResults(result.data);
      setSearchStatus("done");
    }, 300);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  async function handleFollow(userId: string, currentFollowerCount: number) {
    setFollows((prev) => ({
      ...prev,
      [userId]: { following: true, followerCount: currentFollowerCount + 1 },
    }));

    const result = await apiClient.users.follow(userId);
    if (result.ok) {
      setFollows((prev) => ({
        ...prev,
        [userId]: { following: result.data.following, followerCount: result.data.follower_count },
      }));
    } else {
      setFollows((prev) => ({
        ...prev,
        [userId]: { following: false, followerCount: currentFollowerCount },
      }));
    }
  }

  async function handleUnfollow(userId: string, currentFollowerCount: number) {
    setFollows((prev) => ({
      ...prev,
      [userId]: { following: false, followerCount: Math.max(0, currentFollowerCount - 1) },
    }));

    const result = await apiClient.users.unfollow(userId);
    if (result.ok) {
      setFollows((prev) => ({
        ...prev,
        [userId]: { following: result.data.following, followerCount: result.data.follower_count },
      }));
    } else {
      setFollows((prev) => ({
        ...prev,
        [userId]: { following: true, followerCount: currentFollowerCount },
      }));
    }
  }

  function getFollowerCount(user: UserSearchResult) {
    return follows[user.id]?.followerCount ?? user.follower_count;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-lg items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading</h1>
          </section>
        </div>
      </main>
    );
  }

  const displayList = isSearching ? searchResults : suggested;

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-lg">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mb-5">
          <p className="font-display text-[2.2rem] leading-none text-pink-deep">
            checkd
          </p>
          <p className="mt-1 text-sm text-mute">Find people</p>
        </header>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="mb-5">
          <SearchBar
            placeholder="Search by name or username"
            value={query}
            onChange={setQuery}
          />
        </div>

        {/* ── Section label ──────────────────────────────────────────────── */}
        {!isSearching ? (
          <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">
            People you may know
          </p>
        ) : null}

        {/* ── Results ────────────────────────────────────────────────────── */}
        <section className="soft-panel divide-y divide-rose/6 px-5">
          {/* Searching skeleton */}
          {isSearching && searchStatus === "searching" ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <UserRowSkeleton key={i} />
              ))}
            </>
          ) : null}

          {/* Search empty */}
          {isSearching && searchStatus === "done" && searchResults.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">
                No results
              </p>
              <p className="mt-2 text-sm text-mute">
                No users found for &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : null}

          {/* Suggested skeleton */}
          {!isSearching && suggestedLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <UserRowSkeleton key={i} />
              ))}
            </>
          ) : null}

          {/* Suggested empty */}
          {!isSearching && !suggestedLoading && suggested.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">
                Nothing yet
              </p>
              <p className="mt-2 text-sm text-mute">
                Search to find people to follow.
              </p>
            </div>
          ) : null}

          {/* Results list */}
          {(isSearching ? searchStatus !== "searching" && searchResults.length > 0 : !suggestedLoading && suggested.length > 0) ? (
            <>
              {displayList.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  followState={follows[user.id]}
                  onFollow={() => void handleFollow(user.id, getFollowerCount(user))}
                  onUnfollow={() => void handleUnfollow(user.id, getFollowerCount(user))}
                />
              ))}
            </>
          ) : null}
        </section>
      </div>

      <MobileNav active="none" />
    </main>
  );
}
