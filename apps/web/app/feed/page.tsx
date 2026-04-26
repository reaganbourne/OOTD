"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedCard, FeedCardSkeleton } from "@/components/feed/feed-card";
import { apiClient, type FeedOutfitResponse } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const INITIAL_PAGE_SIZE = 12;

type FeedStatus = "idle" | "loading" | "ready" | "error";

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
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              Vault feed
            </p>
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
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              Vault feed
            </p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
              Fresh looks from the people in your orbit, {displayName}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/84 sm:text-base">
              This is the main browsing surface for followed users. Save your own fits,
              follow people, and build a feed that feels like a personal style magazine.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-[1.35rem] bg-plum px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5c3049]"
            >
              Log an outfit
            </Link>
            <Link
              href="/vault"
              className="rounded-[1.35rem] border border-plum/18 bg-white/80 px-4 py-3 text-sm font-semibold text-plum transition hover:bg-white"
            >
              Open your vault
            </Link>
          </div>
        </div>

        {errorMessage && feedStatus !== "loading" ? (
          <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-rose/10 px-4 py-3 text-sm text-[#7f2947]">
            {errorMessage}
          </div>
        ) : null}

        {feedStatus === "loading" ? (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <FeedCardSkeleton key={index} />
            ))}
          </section>
        ) : null}

        {feedStatus === "ready" && outfits.length === 0 ? (
          <section className="soft-panel overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                  Empty feed
                </p>
                <h2 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl">
                  Your feed is ready. It just needs people.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/84 sm:text-base">
                  Once you follow people, their outfits will land here newest first. For
                  now, you can keep building your own archive and come back once your
                  network starts filling in.
                </p>
              </div>

              <div className="flex flex-col justify-between gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                <div className="rounded-[1.75rem] border border-plum/12 bg-cream/75 p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                    What to do next
                  </p>
                  <ul className="mt-4 grid gap-3 text-sm leading-6 text-plum/84">
                    <li>Log a few outfits so your own style archive starts strong.</li>
                    <li>Follow people once profile surfaces are in place.</li>
                    <li>Come back here for the newest looks in one scrollable grid.</li>
                  </ul>
                </div>

                <div className="grid gap-3">
                  <Link
                    href="/upload"
                    className="rounded-[1.4rem] bg-plum px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                  >
                    Upload your next outfit
                  </Link>
                  <Link
                    href="/vault"
                    className="rounded-[1.4rem] border border-plum/18 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-plum transition hover:bg-white"
                  >
                    Browse your vault
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {feedStatus === "ready" && outfits.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {outfits.map((outfit) => (
                <FeedCard key={outfit.id} outfit={outfit} />
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
                  className="rounded-[1.4rem] border border-plum/18 bg-white/82 px-5 py-3 text-sm font-semibold text-plum transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-[1.35rem] border border-plum/18 bg-white/82 px-4 py-3 text-sm font-semibold text-plum transition hover:bg-white"
            >
              Refresh the page
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
