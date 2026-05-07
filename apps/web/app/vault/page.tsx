"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import {
  OutfitCard,
  OutfitCardSkeleton,
  type OutfitCardData,
} from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";
import { apiClient, type OutfitResponse } from "@/lib/api-client";

const INITIAL_PAGE_SIZE = 12;

type VaultStatus = "idle" | "loading" | "ready" | "error";
type LikeMap = Record<string, { liked: boolean; count: number }>;

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

function useSentinel(onIntersect: () => void) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onIntersect);
  cb.current = onIntersect;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) cb.current(); }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return sentinelRef;
}

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Vault state
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("idle");
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Like state
  const [likes, setLikes] = useState<LikeMap>({});

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OutfitResponse[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "done">("idle");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load vault
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let active = true;

    setVaultStatus("loading");
    setErrorMessage(null);

    apiClient.outfits.getVault({ limit: INITIAL_PAGE_SIZE }).then(async (result) => {
      if (!active) return;
      if (!result.ok) {
        setVaultStatus("error");
        setErrorMessage(result.message);
        return;
      }

      const loaded = result.data.outfits;
      setOutfits(loaded);
      setNextCursor(result.data.next_cursor ?? null);
      setVaultStatus("ready");

      // Fetch like status for each outfit in parallel
      const likeResults = await Promise.all(
        loaded.map((o) => apiClient.outfits.getLikes(o.id))
      );
      if (!active) return;
      const map: LikeMap = {};
      loaded.forEach((o, i) => {
        const r = likeResults[i];
        if (r.ok) map[o.id] = { liked: r.data.liked, count: r.data.like_count };
      });
      setLikes((prev) => ({ ...prev, ...map }));
    });

    return () => { active = false; };
  }, [isAuthenticated, isLoading]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || vaultStatus !== "ready") return;
    setLoadingMore(true);

    const result = await apiClient.outfits.getVault({ cursor: nextCursor, limit: INITIAL_PAGE_SIZE });
    if (result.ok) {
      const newOutfits = result.data.outfits;
      setOutfits((prev) => [...prev, ...newOutfits]);
      setNextCursor(result.data.next_cursor ?? null);

      // Fetch likes for new page
      const likeResults = await Promise.all(newOutfits.map((o) => apiClient.outfits.getLikes(o.id)));
      const map: LikeMap = {};
      newOutfits.forEach((o, i) => {
        const r = likeResults[i];
        if (r.ok) map[o.id] = { liked: r.data.liked, count: r.data.like_count };
      });
      setLikes((prev) => ({ ...prev, ...map }));
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, vaultStatus]);

  const sentinelRef = useSentinel(() => { void loadMore(); });

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
      const result = await apiClient.outfits.searchVault(q, 24);
      if (result.ok) setSearchResults(result.data);
      setSearchStatus("done");
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  async function handleLike(outfitId: string) {
    const current = likes[outfitId];
    const isLiked = current?.liked ?? false;

    // Optimistic update
    setLikes((prev) => ({
      ...prev,
      [outfitId]: {
        liked: !isLiked,
        count: (prev[outfitId]?.count ?? 0) + (isLiked ? -1 : 1),
      },
    }));

    const result = isLiked
      ? await apiClient.outfits.unlike(outfitId)
      : await apiClient.outfits.like(outfitId);

    if (result.ok) {
      setLikes((prev) => ({
        ...prev,
        [outfitId]: { liked: result.data.liked, count: result.data.like_count },
      }));
    } else {
      // Revert
      setLikes((prev) => ({
        ...prev,
        [outfitId]: current ?? { liked: false, count: 0 },
      }));
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
            <h1 className="mt-4 text-4xl text-ink">Checking your session</h1>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? "you";
  const displayOutfits = isSearching ? searchResults : outfits;

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[3.4rem] leading-none tracking-[-0.08em] text-[#f09ab4]">
                OOTD
              </p>
              <p className="mt-1 text-sm text-plum/54">{displayName}&rsquo;s vault</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/search" className="icon-button" aria-label="Search people">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Link>
            </div>
          </div>

          <SearchBar
            placeholder="Search your vault"
            value={query}
            onChange={setQuery}
          />

          {!isSearching ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="filter-chip filter-chip-active">Recent</span>
              <span className="filter-chip">Color</span>
              <span className="filter-chip">Event</span>
              <span className="filter-chip">Category</span>
            </div>
          ) : null}
        </header>

        {/* ── Search results ───────────────────────────────────────── */}
        {isSearching ? (
          <section>
            {searchStatus === "searching" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => <OutfitCardSkeleton key={i} showAuthor={false} />)}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="soft-panel px-6 py-10 text-center">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/52">No results</p>
                <p className="mt-3 text-sm leading-6 text-plum/68">
                  Nothing in your vault matched &ldquo;{query}&rdquo;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {searchResults.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    showAuthor={false}
                    showCaption={false}
                    showAccentMarker
                    liked={likes[outfit.id]?.liked}
                    likeCount={likes[outfit.id]?.count}
                    onLike={(e) => { e.preventDefault(); void handleLike(outfit.id); }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* ── Vault grid ─────────────────────────────────────────── */
          <section>
            {errorMessage && vaultStatus !== "loading" ? (
              <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-[#fff3f7] px-4 py-3 text-sm text-[#c04b72]">
                {errorMessage}
              </div>
            ) : null}

            {vaultStatus === "loading" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <OutfitCardSkeleton key={i} showAuthor={false} />)}
              </div>
            ) : null}

            {vaultStatus === "ready" && outfits.length === 0 ? (
              <div className="soft-panel p-6 sm:p-8">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/58">Empty vault</p>
                <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
                  Your archive is ready. It just needs your first look.
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href="/upload" className="rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-4 text-center text-sm font-semibold text-white transition hover:brightness-[0.98]">
                    Upload your first look
                  </Link>
                  <Link href="/feed" className="rounded-[1.2rem] border border-rose/12 bg-white px-5 py-4 text-center text-sm font-semibold text-plum transition hover:border-rose/22">
                    Browse your feed
                  </Link>
                </div>
              </div>
            ) : null}

            {vaultStatus === "ready" && outfits.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  {outfits.map((outfit) => (
                    <OutfitCard
                      key={outfit.id}
                      outfit={toCardData(outfit)}
                      showAuthor={false}
                      showCaption={false}
                      showAccentMarker
                      liked={likes[outfit.id]?.liked}
                      likeCount={likes[outfit.id]?.count}
                      onLike={(e) => { e.preventDefault(); void handleLike(outfit.id); }}
                    />
                  ))}
                  {loadingMore
                    ? Array.from({ length: 3 }).map((_, i) => <OutfitCardSkeleton key={`skel-${i}`} showAuthor={false} />)
                    : null}
                </div>
                {nextCursor ? <div ref={sentinelRef} className="h-px" /> : null}
              </>
            ) : null}

            {vaultStatus === "error" ? (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={() => router.refresh()} className="rounded-full border border-rose/12 bg-white px-4 py-3 text-sm font-semibold text-plum transition hover:border-rose/22">
                  Refresh the page
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
      <MobileNav active="vault" />
    </main>
  );
}
