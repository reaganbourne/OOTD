"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type OutfitResponse, type PublicProfile } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import { OutfitCard, OutfitCardSkeleton, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "idle" | "loading" | "ready" | "error";

function toCardData(outfit: OutfitResponse): OutfitCardData {
  return {
    id: outfit.id,
    imageUrl: outfit.image_url,
    caption: outfit.caption,
    eventName: outfit.event_name,
    wornOn: outfit.worn_on,
    createdAt: outfit.created_at,
    vibeTone: outfit.vibe_check_tone,
  };
}

function getInitial(displayName?: string | null, username?: string | null) {
  const source = displayName?.trim() || username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  src,
  initial,
  size = "lg",
}: {
  src?: string | null;
  initial: string;
  size?: "lg" | "xl";
}) {
  const dim = size === "xl" ? "h-24 w-24 text-2xl" : "h-16 w-16 text-lg";

  if (src) {
    return (
      <img
        src={src}
        alt="Your profile photo"
        className={`${dim} rounded-full border-2 border-line object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full border-2 border-line bg-pink-soft font-semibold text-ink-soft`}
    >
      {initial}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display text-2xl leading-none tracking-[-0.04em] text-ink">
        {value.toLocaleString()}
      </span>
      <span className="text-[0.68rem] uppercase tracking-[0.18em] text-mute">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [status, setStatus] = useState<PageStatus>("idle");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OutfitResponse[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "done">("idle");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = searchQuery.trim().length > 0;

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load profile + outfits
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.username) return;

    let active = true;

    async function load() {
      setStatus("loading");
      setErrorMessage(null);

      const [profileResult, outfitsResult] = await Promise.all([
        apiClient.users.getProfile(user!.username),
        apiClient.outfits.getVault({ limit: 12 }),
      ]);

      if (!active) return;

      if (!profileResult.ok) {
        setStatus("error");
        setErrorMessage(profileResult.message);
        return;
      }

      if (!outfitsResult.ok) {
        setStatus("error");
        setErrorMessage(outfitsResult.message);
        return;
      }

      setProfile(profileResult.data);
      setOutfits(outfitsResult.data.outfits);
      setNextCursor(outfitsResult.data.next_cursor ?? null);
      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSearchStatus("idle"); return; }

    setSearchStatus("searching");
    searchTimerRef.current = setTimeout(async () => {
      const result = await apiClient.outfits.searchVault(q, 24);
      if (result.ok) setSearchResults(result.data);
      setSearchStatus("done");
    }, 350);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const result = await apiClient.outfits.getVault({ cursor: nextCursor, limit: 12 });

    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setNextCursor(result.data.next_cursor ?? null);
    }
    setIsLoadingMore(false);
  }

  // Loading gate
  if (authLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">OOTD</p>
            <h1 className="mt-4 text-3xl text-ink">Loading your profile</h1>
          </section>
        </div>
      </main>
    );
  }

  const displayName = profile?.display_name ?? user?.display_name ?? user?.username ?? "Your profile";
  const username = user?.username ?? "";
  const bio = profile?.bio ?? user?.bio ?? null;
  const avatarSrc = profile?.profile_image_url ?? user?.profile_image_url ?? null;
  const followerCount = profile?.follower_count ?? 0;
  const followingCount = profile?.following_count ?? 0;

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[3.4rem] leading-none text-pink-deep">
              OOTD
            </p>
            <p className="mt-1 text-sm text-mute">@{username}</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link href="/search" className="icon-button" aria-label="Search people">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>

            <Link href="/profile/edit" className="icon-button" aria-label="Edit profile">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => void logout()}
              className="icon-button"
              aria-label="Sign out"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Profile card ───────────────────────────────────────────────── */}
        <section className="soft-panel mb-6 px-6 py-7">
          <div className="flex items-start gap-5">
            <Avatar src={avatarSrc} initial={getInitial(displayName, username)} size="xl" />

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl leading-tight tracking-[-0.03em] text-ink">
                {displayName}
              </h1>
              {username ? (
                <p className="mt-0.5 text-sm text-mute">@{username}</p>
              ) : null}
              {bio ? (
                <p className="mt-3 text-sm leading-6 text-ink-soft">{bio}</p>
              ) : (
                <Link
                  href="/profile/edit"
                  className="mt-3 inline-block text-sm text-pink-deep hover:underline"
                >
                  Add a bio →
                </Link>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 flex items-center justify-around border-t border-rose/8 pt-5">
            <StatPill value={outfits.length + (nextCursor ? 1 : 0)} label="Outfits" />
            <div className="h-8 w-px bg-rose/10" />
            <StatPill value={followerCount} label="Followers" />
            <div className="h-8 w-px bg-rose/10" />
            <StatPill value={followingCount} label="Following" />
          </div>
        </section>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {errorMessage ? (
          <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-pink-soft px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}

        {/* ── Outfit grid ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-[-0.02em] text-ink">Your looks</h2>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose/15 bg-white px-4 py-2 text-[0.78rem] font-semibold text-pink-deep transition hover:border-rose/28"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add look
            </Link>
          </div>

          <div className="mb-4">
            <SearchBar
              placeholder="Search your looks"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Search results */}
          {isSearching ? (
            <>
              {searchStatus === "searching" ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <OutfitCardSkeleton key={i} showAuthor={false} />)}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="soft-panel px-5 py-8 text-center">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">No results</p>
                  <p className="mt-2 text-sm text-mute">Nothing matched &ldquo;{searchQuery}&rdquo;.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {searchResults.map((outfit) => (
                    <OutfitCard key={outfit.id} outfit={toCardData(outfit)} showAuthor={false} showCaption={false} showAccentMarker />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {status === "loading" && !isSearching ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <OutfitCardSkeleton key={i} showAuthor={false} />
              ))}
            </div>
          ) : null}

          {status === "ready" && outfits.length === 0 && !isSearching ? (
            <div className="soft-panel px-6 py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">
                Nothing yet
              </p>
              <h2 className="mt-3 text-3xl text-ink">Start your style archive</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                Upload your first outfit and it will live here, forever ready to revisit.
              </p>
              <Link
                href="/upload"
                className="mt-6 inline-block btn-primary"
              >
                Upload your first look
              </Link>
            </div>
          ) : null}

          {status === "ready" && outfits.length > 0 && !isSearching ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    showAuthor={false}
                    showAccentMarker
                  />
                ))}
              </div>

              {nextCursor ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    className="rounded-full border border-rose/12 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/22 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading more..." : "Load more looks"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <MobileNav active="profile" />
    </main>
  );
}
