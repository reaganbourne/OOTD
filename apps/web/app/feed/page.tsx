"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type FeedOutfitResponse } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import { useAuth } from "@/lib/auth-context";
import {
  OutfitCard,
  OutfitCardSkeleton,
  type OutfitCardData
} from "@/components/outfits/outfit-card";

const INITIAL_PAGE_SIZE = 12;

type FeedStatus = "idle" | "loading" | "ready" | "error";

function toOutfitCardData(outfit: FeedOutfitResponse): OutfitCardData {
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
      profileImageUrl: outfit.author.profile_image_url
    }
  };
}

export default function FeedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("idle");
  const [outfits, setOutfits] = useState<FeedOutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    let isActive = true;

    async function loadInitialFeed() {
      setFeedStatus("loading");
      setErrorMessage(null);

      const result = await apiClient.outfits.getFeed({ limit: INITIAL_PAGE_SIZE });

      if (!isActive) {
        return;
      }

      if (!result.ok) {
        setFeedStatus("error");
        setErrorMessage(result.message);
        setOutfits([]);
        setNextCursor(null);
        return;
      }

      setOutfits(result.data.outfits);
      setNextCursor(result.data.next_cursor ?? null);
      setFeedStatus("ready");
    }

    void loadInitialFeed();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isLoading]);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    const result = await apiClient.outfits.getFeed({
      cursor: nextCursor,
      limit: INITIAL_PAGE_SIZE
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      setIsLoadingMore(false);
      return;
    }

    setOutfits((current) => [...current, ...result.data.outfits]);
    setNextCursor(result.data.next_cursor ?? null);
    setIsLoadingMore(false);
  }

  const displayName = user?.display_name ?? user?.username ?? "you";

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
            <h1 className="mt-4 text-4xl text-ink">Opening your feed</h1>
            <p className="mt-4 text-sm leading-6 text-plum/82">
              We&apos;re checking your session before loading the latest looks.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[3.4rem] leading-none tracking-[-0.08em] text-[#f09ab4]">
                OOTD
              </p>
              <p className="mt-1 text-sm text-plum/54">Welcome back, {displayName}.</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/upload" className="icon-button" aria-label="Add outfit">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </Link>
              <button type="button" className="icon-button" aria-label="Notifications">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6.5 10a5.5 5.5 0 1 1 11 0c0 5 2 6 2 6h-15s2-1 2-6" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar placeholder="Search outfits, people, vibes" />
            <button type="button" className="icon-button" aria-label="Feed filters">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16" />
                <path d="M7 12h10" />
                <path d="M10 17h4" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="filter-chip filter-chip-active">Following</span>
            <span className="filter-chip">Recent</span>
            <Link href="/vault" className="filter-chip">
              Vault
            </Link>
          </div>
        </header>

        {errorMessage && feedStatus !== "loading" ? (
          <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-[#fff3f7] px-4 py-3 text-sm text-[#c04b72]">
            {errorMessage}
          </div>
        ) : null}

        {feedStatus === "loading" ? (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <OutfitCardSkeleton key={index} />
            ))}
          </section>
        ) : null}

        {feedStatus === "ready" && outfits.length === 0 ? (
          <section className="soft-panel p-6 sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/58">
              Empty feed
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
              Your feed is ready. It just needs people.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/70 sm:text-base">
              Once you follow people, their outfits will land here newest first. Until
              then, keep building your own archive and use the vault as your personal
              style reference.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/upload"
                className="rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-4 text-center text-sm font-semibold text-white transition hover:brightness-[0.98]"
              >
                Upload your next outfit
              </Link>
              <Link
                href="/vault"
                className="rounded-[1.2rem] border border-rose/12 bg-white px-5 py-4 text-center text-sm font-semibold text-plum transition hover:border-rose/22"
              >
                Browse your vault
              </Link>
            </div>
          </section>
        ) : null}

        {feedStatus === "ready" && outfits.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={toOutfitCardData(outfit)}
                  showAccentMarker
                />
              ))}
            </section>

            {nextCursor ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    void handleLoadMore();
                  }}
                  disabled={isLoadingMore}
                  className="rounded-full border border-rose/12 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/22 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading more looks..." : "Load more looks"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {feedStatus === "error" ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-full border border-rose/12 bg-white px-4 py-3 text-sm font-semibold text-plum transition hover:border-rose/22"
            >
              Refresh the page
            </button>
          </div>
        ) : null}
      </div>
      <MobileNav active="home" />
    </main>
  );
}
