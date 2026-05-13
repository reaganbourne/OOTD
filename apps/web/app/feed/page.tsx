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
    <div
      className="inline-flex border border-line bg-white"
      style={{ borderRadius: 999, padding: 3, margin: "0 20px 14px" }}
    >
      {(["vault", "boards"] as Tab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          style={{
            padding: "7px 16px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
          }}
          className={`transition ${
            active === tab
              ? "bg-ink text-paper"
              : "text-mute hover:text-ink"
          }`}
        >
          {tab === "vault" ? "vault feed" : "boards"}
        </button>
      ))}
    </div>
  );
}

// ── Board activity card ───────────────────────────────────────────────────────

function BoardActivityCard({
  outfit,
}: {
  outfit: BoardOutfitResponse;
  boardName: string;
}) {
  return <OutfitCard outfit={toBoardCardData(outfit)} showAuthor />;
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
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => <OutfitCardSkeleton key={i} />)}
      </section>
    );
  }

  if (status === "error") {
    return (
      <div className="soft-panel px-6 py-8 text-center">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (status === "ready" && outfits.length === 0) {
    return (
      <section className="soft-panel p-6 sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">Empty feed</p>
        <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
          your feed is ready. it just needs people.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft sm:text-base">
          Once you follow people, their outfits will land here newest first. Until then, keep building your own archive.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/upload" className="btn-primary">
            upload your next outfit
          </Link>
          <Link href="/vault" className="rounded-[1.2rem] border border-line bg-white px-5 py-4 text-center text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25">
            browse your vault
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <div className="mb-4 h-5 w-36 animate-pulse rounded-full bg-pink-soft" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
        <p className="text-sm text-error">{boardsError}</p>
      </div>
    );
  }

  if (boardsStatus === "ready" && sections.length === 0) {
    return (
      <section className="soft-panel p-6 sm:p-8">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-mute">No boards yet</p>
        <h2 className="mt-4 text-4xl leading-tight text-ink">join a board to see activity here</h2>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          Boards are where you coordinate looks with friends for events. Get an invite link from someone to join.
        </p>
        <Link href="/boards" className="mt-6 btn-primary">
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
              <h2 className="font-display italic truncate text-xl tracking-[-0.02em] text-ink">
                {section.board.name}
              </h2>
              {section.board.event_date ? (
                <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.18em] text-mute">
                  {formatEventDate(section.board.event_date)}
                </p>
              ) : null}
            </div>
            <Link
              href={`/boards/${section.board.id}`}
              className="shrink-0 text-[0.72rem] font-semibold text-pink-deep hover:underline"
            >
              view board →
            </Link>
          </div>

          {section.outfits.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white/70 px-4 py-5 text-sm text-mute">
              No outfits posted yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <p className="font-display italic text-5xl text-pink-deep" style={{ letterSpacing: "-0.02em" }}>checkd</p>
            <h1 className="mt-4 text-4xl text-ink">Opening your feed</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-28 lg:pb-0 lg:pt-16">
      <div className="mx-auto max-w-3xl">

        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between bg-paper"
          style={{ padding: "16px 20px 12px" }}
        >
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            welcome back, {displayName}.
          </p>

          <div className="flex items-center" style={{ gap: 6 }}>
            {/* Explore */}
            <Link
              href="/explore"
              aria-label="Explore"
              className="flex items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-pink-deep hover:text-ink"
              style={{ width: 36, height: 36 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" /><path d="m14.5 9.5-5 2-2 5 5-2 2-5z" />
              </svg>
            </Link>
            {/* Search */}
            <Link
              href="/search"
              aria-label="Search"
              className="flex items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-pink-deep hover:text-ink"
              style={{ width: 36, height: 36 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Pill tabs ──────────────────────────────────────────────── */}
        <TabSwitcher active={activeTab} onChange={setActiveTab} />

        {/* ── Tab content ──────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 lg:px-8">
          {activeTab === "vault" ? (
            <VaultFeedTab displayName={displayName} />
          ) : (
            <BoardsActivityTab />
          )}
        </div>
      </div>

      <MobileNav active="feed" />
    </main>
  );
}
