"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import {
  OutfitCard,
  OutfitCardSkeleton,
  type OutfitCardData
} from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";
import { apiClient, type OutfitResponse } from "@/lib/api-client";

const INITIAL_PAGE_SIZE = 12;

type VaultStatus = "idle" | "loading" | "ready" | "error";

function toOutfitCardData(outfit: OutfitResponse): OutfitCardData {
  return {
    id: outfit.id,
    imageUrl: outfit.image_url,
    caption: outfit.caption,
    eventName: outfit.event_name,
    wornOn: outfit.worn_on,
    createdAt: outfit.created_at,
    vibeTone: outfit.vibe_check_tone
  };
}

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("idle");
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
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

    async function loadVault() {
      setVaultStatus("loading");
      setErrorMessage(null);

      const result = await apiClient.outfits.getMine({ limit: INITIAL_PAGE_SIZE });

      if (!isActive) {
        return;
      }

      if (!result.ok) {
        setVaultStatus("error");
        setErrorMessage(result.message);
        setOutfits([]);
        setNextCursor(null);
        return;
      }

      setOutfits(result.data.outfits);
      setNextCursor(result.data.next_cursor ?? null);
      setVaultStatus("ready");
    }

    void loadVault();

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

    const result = await apiClient.outfits.getMine({
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

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
            <h1 className="mt-4 text-4xl text-ink">Checking your session</h1>
            <p className="mt-4 text-sm leading-6 text-plum/82">
              We&apos;re getting your vault entrance ready.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? user?.email ?? "you";

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
              <Link href="/feed" className="icon-button" aria-label="Go to feed">
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
                  <path d="M4 10.5 12 4l8 6.5" />
                  <path d="M6.5 10v8.5h11V10" />
                </svg>
              </Link>
              <button type="button" className="icon-button" aria-label="Vault settings">
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
          </div>

          <div className="flex items-center gap-3">
            <SearchBar placeholder="Search your vault" />
            <button type="button" className="icon-button" aria-label="Adjust filters">
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
            <span className="filter-chip filter-chip-active">Recent</span>
            <span className="filter-chip">Color</span>
            <span className="filter-chip">Event</span>
            <span className="filter-chip">Category</span>
            <span className="filter-chip">Saved</span>
          </div>
        </header>

        {errorMessage && vaultStatus !== "loading" ? (
          <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-[#fff3f7] px-4 py-3 text-sm text-[#c04b72]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mb-5 rounded-[1.6rem] border border-rose/10 bg-white px-4 py-4 text-sm leading-6 text-plum/62 shadow-[0_16px_40px_rgba(244,106,147,0.06)] sm:px-5">
          Your saved looks below are live from the backend. Search and filter controls are
          the next layer to wire up.
        </section>

        {vaultStatus === "loading" ? (
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <OutfitCardSkeleton key={index} showAuthor={false} />
            ))}
          </section>
        ) : null}

        {vaultStatus === "ready" && outfits.length === 0 ? (
          <section className="soft-panel p-6 sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/58">
              Empty vault
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
              Your archive is ready. It just needs your first look.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/70 sm:text-base">
              Once outfit uploads are landing, every look you save will show up here newest
              first. For now, the read path is live and ready for real data.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/feed"
                className="rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-4 text-center text-sm font-semibold text-white transition hover:brightness-[0.98]"
              >
                Browse your feed
              </Link>
              <Link
                href="/upload"
                className="rounded-[1.2rem] border border-rose/12 bg-white px-5 py-4 text-center text-sm font-semibold text-plum transition hover:border-rose/22"
              >
                Open upload flow
              </Link>
            </div>
          </section>
        ) : null}

        {vaultStatus === "ready" && outfits.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={toOutfitCardData(outfit)}
                  showAuthor={false}
                  showCaption={false}
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

        {vaultStatus === "error" ? (
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
      <MobileNav active="vault" />
    </main>
  );
}
