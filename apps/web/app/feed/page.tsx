"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  type Board,
  type BoardOutfitResponse,
  type FeedOutfitResponse,
  type OutfitResponse,
} from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { useAuth } from "@/lib/auth-context";
import {
  OutfitCard,
  OutfitCardSkeleton,
  type OutfitCardData,
} from "@/components/outfits/outfit-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "vault" | "boards";
type Status = "idle" | "loading" | "ready" | "error";

type BoardSection = {
  board: Board;
  outfits: BoardOutfitResponse[];
  cursor: string | null;
  status: Status;
  loadingMore: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toVaultCardData(outfit: FeedOutfitResponse): OutfitCardData {
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

function toBoardCardData(outfit: BoardOutfitResponse): OutfitCardData {
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

function formatEventDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

// ── Infinite scroll hook ──────────────────────────────────────────────────────

function useSentinel(onIntersect: () => void) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) callbackRef.current(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return sentinelRef;
}

// ── Tab switcher ──────────────────────────────────────────────────────────────

function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex rounded-full border border-rose/12 bg-white/80 p-1 shadow-[0_4px_14px_rgba(244,106,147,0.08)]">
      {(["vault", "boards"] as Tab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-full px-5 py-2 text-[0.78rem] font-semibold transition ${
            active === tab
              ? "bg-gradient-to-r from-[#ef6c96] to-[#f493b0] text-white shadow-[0_4px_10px_rgba(244,106,147,0.3)]"
              : "text-plum/60 hover:text-plum"
          }`}
        >
          {tab === "vault" ? "Vault Feed" : "Boards"}
        </button>
      ))}
    </div>
  );
}

// ── Board activity card ───────────────────────────────────────────────────────

function BoardActivityCard({
  outfit,
  boardName,
}: {
  outfit: BoardOutfitResponse;
  boardName: string;
}) {
  return (
    <div className="relative">
      <OutfitCard outfit={toBoardCardData(outfit)} showAuthor />
      {/* Board name badge */}
      <div className="pointer-events-none absolute left-3 bottom-[4.5rem] right-3">
        <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-plum/10 bg-white/88 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-plum/70 backdrop-blur">
          <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
            <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
            <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
            <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
          </svg>
          <span className="truncate">{boardName}</span>
        </span>
      </div>
    </div>
  );
}

// ── Vault feed tab ────────────────────────────────────────────────────────────

const VAULT_PAGE_SIZE = 12;

function VaultFeedTab({ displayName }: { displayName: string }) {
  const [outfits, setOutfits] = useState<FeedOutfitResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);

    apiClient.outfits.getFeed({ limit: VAULT_PAGE_SIZE }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setStatus("error");
        setError(result.message);
        return;
      }
      setOutfits(result.data.outfits);
      setCursor(result.data.next_cursor ?? null);
      setStatus("ready");
    });

    return () => { active = false; };
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || status !== "ready") return;
    setLoadingMore(true);

    const result = await apiClient.outfits.getFeed({ cursor, limit: VAULT_PAGE_SIZE });
    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setCursor(result.data.next_cursor ?? null);
    }
    setLoadingMore(false);
  }, [cursor, loadingMore, status]);

  const sentinelRef = useSentinel(() => { void loadMore(); });

  if (status === "loading") {
    return (
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <OutfitCardSkeleton key={i} />)}
      </section>
    );
  }

  if (status === "error") {
    return (
      <div className="soft-panel px-6 py-8 text-center">
        <p className="text-sm text-[#c04b72]">{error}</p>
      </div>
    );
  }

  if (status === "ready" && outfits.length === 0) {
    return (
      <section className="soft-panel p-6 sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/58">Empty feed</p>
        <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
          Your feed is ready. It just needs people.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/70 sm:text-base">
          Once you follow people, their outfits will land here newest first. Until then, keep building your own archive.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/upload" className="rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-4 text-center text-sm font-semibold text-white transition hover:brightness-[0.98]">
            Upload your next outfit
          </Link>
          <Link href="/vault" className="rounded-[1.2rem] border border-rose/12 bg-white px-5 py-4 text-center text-sm font-semibold text-plum transition hover:border-rose/22">
            Browse your vault
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {outfits.map((outfit) => (
          <OutfitCard key={outfit.id} outfit={toVaultCardData(outfit)} showAccentMarker />
        ))}
        {loadingMore
          ? Array.from({ length: 3 }).map((_, i) => <OutfitCardSkeleton key={`skel-${i}`} />)
          : null}
      </section>
      {cursor ? <div ref={sentinelRef} className="h-px" /> : null}
    </>
  );
}

// ── Boards activity tab ───────────────────────────────────────────────────────

const BOARD_PAGE_SIZE = 6;

function BoardSectionSentinel({ onIntersect }: { onIntersect: () => void }) {
  const ref = useSentinel(onIntersect);
  return <div ref={ref} className="h-px" />;
}

function BoardsActivityTab() {
  const [sections, setSections] = useState<BoardSection[]>([]);
  const [boardsStatus, setBoardsStatus] = useState<Status>("idle");
  const [boardsError, setBoardsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setBoardsStatus("loading");

    apiClient.boards.list().then(async (boardsResult) => {
      if (!active) return;

      if (!boardsResult.ok) {
        setBoardsStatus("error");
        setBoardsError(boardsResult.message);
        return;
      }

      const boards = boardsResult.data;

      if (boards.length === 0) {
        setSections([]);
        setBoardsStatus("ready");
        return;
      }

      // Fetch first page of outfits for each board in parallel
      const results = await Promise.all(
        boards.map((board) =>
          apiClient.boards.getOutfits(board.id, { limit: BOARD_PAGE_SIZE })
        )
      );

      if (!active) return;

      setSections(
        boards.map((board, i) => {
          const result = results[i];
          return {
            board,
            outfits: result.ok ? result.data.outfits : [],
            cursor: result.ok ? (result.data.next_cursor ?? null) : null,
            status: "ready",
            loadingMore: false,
          };
        })
      );

      setBoardsStatus("ready");
    });

    return () => { active = false; };
  }, []);

  const loadMoreForBoard = useCallback(async (boardId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.board.id === boardId ? { ...s, loadingMore: true } : s
      )
    );

    const section = sections.find((s) => s.board.id === boardId);
    if (!section?.cursor) return;

    const result = await apiClient.boards.getOutfits(boardId, {
      cursor: section.cursor,
      limit: BOARD_PAGE_SIZE,
    });

    setSections((prev) =>
      prev.map((s) => {
        if (s.board.id !== boardId) return s;
        return {
          ...s,
          outfits: result.ok ? [...s.outfits, ...result.data.outfits] : s.outfits,
          cursor: result.ok ? (result.data.next_cursor ?? null) : s.cursor,
          loadingMore: false,
        };
      })
    );
  }, [sections]);

  if (boardsStatus === "loading") {
    return (
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="mb-4 h-5 w-36 animate-pulse rounded-full bg-[#ffe8ef]" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, j) => <OutfitCardSkeleton key={j} showAuthor={false} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (boardsStatus === "error") {
    return (
      <div className="soft-panel px-6 py-8 text-center">
        <p className="text-sm text-[#c04b72]">{boardsError}</p>
      </div>
    );
  }

  if (boardsStatus === "ready" && sections.length === 0) {
    return (
      <section className="soft-panel p-6 sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/58">No boards yet</p>
        <h2 className="mt-4 text-4xl leading-tight text-ink">Join a board to see activity here</h2>
        <p className="mt-4 text-sm leading-7 text-plum/70">
          Boards are where you coordinate looks with friends for events. Get an invite link from someone to join.
        </p>
        <Link href="/boards" className="mt-6 inline-block rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-4 text-sm font-semibold text-white transition hover:brightness-[0.98]">
          Go to boards
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.board.id}>
          {/* Board header */}
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display truncate text-xl tracking-[-0.02em] text-ink">
                {section.board.name}
              </h2>
              {section.board.event_date ? (
                <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.18em] text-plum/50">
                  {formatEventDate(section.board.event_date)}
                </p>
              ) : null}
            </div>
            <Link
              href={`/boards/${section.board.id}`}
              className="shrink-0 text-[0.72rem] font-semibold text-[#ef5f8a] hover:underline"
            >
              View board →
            </Link>
          </div>

          {section.outfits.length === 0 ? (
            <p className="rounded-2xl border border-rose/10 bg-white/70 px-4 py-5 text-sm text-plum/54">
              No outfits posted yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {section.outfits.map((outfit) => (
                  <BoardActivityCard
                    key={outfit.id}
                    outfit={outfit}
                    boardName={section.board.name}
                  />
                ))}
                {section.loadingMore
                  ? Array.from({ length: 2 }).map((_, i) => <OutfitCardSkeleton key={`skel-${i}`} showAuthor={false} />)
                  : null}
              </div>

              {section.cursor && !section.loadingMore ? (
                <BoardSectionSentinel onIntersect={() => void loadMoreForBoard(section.board.id)} />
              ) : null}
            </>
          )}
        </section>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("vault");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const displayName = user?.display_name ?? user?.username ?? "you";

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
            <h1 className="mt-4 text-4xl text-ink">Opening your feed</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="mb-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[3.4rem] leading-none tracking-[-0.08em] text-[#f09ab4]">
                OOTD
              </p>
              <p className="mt-1 text-sm text-plum/54">Welcome back, {displayName}.</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/explore" className="icon-button" aria-label="Explore">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m14.5 9.5-5 2-2 5 5-2 2-5Z" />
                </svg>
              </Link>
              <Link href="/search" className="icon-button" aria-label="Search people">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Link>
              <button type="button" className="icon-button" aria-label="Notifications">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 10a5.5 5.5 0 1 1 11 0c0 5 2 6 2 6h-15s2-1 2-6" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </button>
            </div>
          </div>

          <TabSwitcher active={activeTab} onChange={setActiveTab} />
        </header>

        {/* ── Tab content ──────────────────────────────────────────────── */}
        {activeTab === "vault" ? (
          <VaultFeedTab displayName={displayName} />
        ) : (
          <BoardsActivityTab />
        )}
      </div>

      <MobileNav active="home" />
    </main>
  );
}
