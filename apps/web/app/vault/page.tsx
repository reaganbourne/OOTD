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
    <main className="pb-28">
      <div className="mx-auto max-w-7xl">
        {/* vault topbar — checkd wordmark (ink 30px) + search + filter */}
        <div
          className="flex items-center justify-between bg-paper"
          style={{ padding: "8px 20px 12px" }}
        >
          <p
            className="font-display leading-none text-ink"
            style={{ fontSize: 30, lineHeight: 0.95, letterSpacing: "-0.01em" }}
          >
            checkd
          </p>
          <div className="flex items-center" style={{ gap: 6 }}>
            <button
              type="button"
              aria-label="Search"
              className="flex items-center justify-center rounded-full border border-line bg-white text-mute"
              style={{ width: 36, height: 36 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Filter"
              className="flex items-center justify-center rounded-full border border-line bg-white text-mute"
              style={{ width: 36, height: 36 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M3 6h18M6 12h12M10 18h4" />
              </svg>
            </button>
          </div>
        </div>

        {/* vault-head */}
        <header style={{ padding: "0 20px 10px" }}>
          <h1 className="font-display text-ink" style={{ fontSize: 36, margin: 0, lineHeight: 1, letterSpacing: "-0.01em" }}>
            my vault
          </h1>
          <p className="text-mute" style={{ fontSize: 11.5, marginTop: 4 }}>
            {outfits.length} fits · {displayName}
          </p>
        </header>

        {/* filter chips */}
        <div
          className="flex overflow-x-auto"
          style={{ padding: "4px 20px 12px", gap: 8 }}
        >
          {["all", "brown", "formal", "streetwear"].map((chip, i) => (
            <span
              key={chip}
              className="flex-shrink-0 inline-flex items-center rounded-full border text-[11px]"
              style={{
                padding: "5px 11px",
                background: i === 0 ? "var(--ink)" : "#fff",
                borderColor: i === 0 ? "var(--ink)" : "var(--line)",
                color: i === 0 ? "var(--paper)" : "var(--ink-soft)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* ── Vault grid — 3-col, 2px gap, per design vault-grid ─────── */}
        <section>
          {errorMessage && vaultStatus !== "loading" ? (
            <div className="mx-5 my-3 rounded-xl border border-pink-deep/30 bg-pink-soft px-4 py-3 text-sm text-error">
              {errorMessage}
            </div>
          ) : null}

          {vaultStatus === "loading" ? (
            <div className="grid grid-cols-3 gap-0.5 pt-0.5">
              {Array.from({ length: 9 }).map((_, i) => <OutfitCardSkeleton key={i} showAuthor={false} />)}
            </div>
          ) : null}

          {vaultStatus === "ready" && outfits.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-display text-2xl text-ink">your archive is ready.</p>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                it just needs your first look.
              </p>
              <Link href="/upload" className="mt-6 inline-block btn-primary">
                upload your first look
              </Link>
            </div>
          ) : null}

          {vaultStatus === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-0.5 pt-0.5">
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
