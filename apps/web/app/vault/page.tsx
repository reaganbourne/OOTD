"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/chrome/mobile-nav";
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

function matchesSearch(outfit: OutfitResponse, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const items = outfit.clothing_items ?? [];
  return (
    outfit.caption?.toLowerCase().includes(q) === true ||
    outfit.event_name?.toLowerCase().includes(q) === true ||
    outfit.vibe_check_tone?.toLowerCase().includes(q) === true ||
    outfit.vibe_check_text?.toLowerCase().includes(q) === true ||
    items.some(
      (i) =>
        i.brand?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.color?.toLowerCase().includes(q)
    )
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");

  // Like state
  const [likes, setLikes] = useState<LikeMap>({});

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
            <p className="font-display text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-4xl text-ink">Checking your session</h1>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? "you";

  return (
    <main className="pb-28 lg:pb-0 lg:pt-16">
      <div className="mx-auto max-w-7xl">
        {/* vault header */}
        <header className="flex items-end justify-between bg-paper" style={{ padding: "16px 20px 10px" }}>
          <div>
            <h1 className="font-logo text-ink" style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 100 }}>
              my vault.
            </h1>
            <p className="text-mute" style={{ fontSize: 11.5, marginTop: 3 }}>
              {outfits.length} fits · {displayName}
            </p>
          </div>
          <Link
            href="/search"
            aria-label="Search"
            className="flex items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-pink-deep hover:text-ink"
            style={{ width: 36, height: 36, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
        </header>

        {/* search bar */}
        <div style={{ padding: "0 20px 12px" }}>
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-white px-4" style={{ height: 40 }}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search by brand, event, color, vibe…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-mute"
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery("")} className="shrink-0 text-mute hover:text-ink">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Vault grid — 3-col, 2px gap, per design vault-grid ─────── */}
        <section>
          {errorMessage && vaultStatus !== "loading" ? (
            <div className="mx-5 my-3 rounded-xl border border-pink-deep/30 bg-pink-soft px-4 py-3 text-sm text-error">
              {errorMessage}
            </div>
          ) : null}

          {vaultStatus === "loading" ? (
            <div className="grid grid-cols-3 gap-px bg-line">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] w-full animate-pulse bg-pink-soft skeleton-stripe" />
              ))}
            </div>
          ) : null}

          {(() => {
            const filtered = outfits.filter((o) => matchesSearch(o, searchQuery));
            if (vaultStatus === "ready" && outfits.length > 0 && filtered.length === 0) {
              return (
                <div className="px-5 py-10 text-center">
                  <p className="font-display text-2xl text-ink">no matches.</p>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                    try searching by brand, event, color, or vibe.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-5 text-sm text-pink-deep hover:underline"
                  >
                    clear search
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {vaultStatus === "ready" && outfits.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-display text-2xl text-ink">your archive is ready.</p>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                it just needs your first look.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/upload" className="btn-primary">
                  upload your first look
                </Link>
              </div>
            </div>
          ) : null}

          {vaultStatus === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-px bg-line">
                {outfits.filter((o) => matchesSearch(o, searchQuery)).map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    compact
                    liked={likes[outfit.id]?.liked}
                    onLike={(e) => { e.preventDefault(); void handleLike(outfit.id); }}
                  />
                ))}
                {loadingMore
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={`skel-${i}`} className="aspect-[3/4] w-full animate-pulse bg-pink-soft skeleton-stripe" />
                    ))
                  : null}
              </div>
              {nextCursor ? <div ref={sentinelRef} className="h-px" /> : null}
            </>
          ) : null}

          {vaultStatus === "error" ? (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => router.refresh()} className="rounded-full border border-line bg-white px-4 py-3 text-sm font-medium text-ink-soft transition hover:border-pink-deep">
                refresh
              </button>
            </div>
          ) : null}
        </section>
      </div>
      <MobileNav active="vault" />
    </main>
  );
}
