"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type Board, type BoardMember, type OutfitResponse } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { OutfitCard, OutfitCardSkeleton, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "ready" | "not-found" | "gone" | "error";

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

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(d));
}

function formatExpiry(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// ── Invite link copy ──────────────────────────────────────────────────────────

function InviteCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/boards/join/${code}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-[1.2rem] border border-rose/12 bg-white px-4 py-3">
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-[0.72rem] text-mute">{link}</span>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 text-[0.72rem] font-semibold text-pink-deep transition hover:text-[#d94e7a]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Member strip ──────────────────────────────────────────────────────────────

function MemberStrip({ members }: { members: BoardMember[] }) {
  const shown = members.slice(0, 7);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((m) => (
        <div key={m.user_id} title={m.display_name ?? m.username ?? "Member"}>
          {m.profile_image_url ? (
            <img
              src={m.profile_image_url}
              alt={m.username ?? "Member"}
              className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-pink-soft text-[0.65rem] font-semibold text-ink-soft shadow-sm">
              {(m.display_name ?? m.username ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {extra > 0 ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-pink-soft text-[0.6rem] font-semibold text-pink-deep">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [board, setBoard] = useState<Board | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let active = true;

    async function load() {
      setStatus("loading");

      const [boardResult, membersResult, outfitsResult] = await Promise.all([
        apiClient.boards.get(id),
        apiClient.boards.getMembers(id),
        apiClient.boards.getOutfits(id, { limit: 12 }),
      ]);

      if (!active) return;

      if (!boardResult.ok) {
        const msg = boardResult.message?.toLowerCase() ?? "";
        setStatus(msg.includes("expired") ? "gone" : msg.includes("not found") ? "not-found" : "error");
        setErrorMessage(boardResult.message);
        return;
      }

      setBoard(boardResult.data);
      if (membersResult.ok) setMembers(membersResult.data);
      if (outfitsResult.ok) {
        setOutfits(outfitsResult.data.outfits);
        setNextCursor(outfitsResult.data.next_cursor ?? null);
      }
      setStatus("ready");
    }

    void load();
    return () => { active = false; };
  }, [id, isAuthenticated, authLoading]);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const result = await apiClient.boards.getOutfits(id, { cursor: nextCursor, limit: 12 });
    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setNextCursor(result.data.next_cursor ?? null);
    }
    setIsLoadingMore(false);
  }

  async function handleLeave() {
    if (leaveLoading) return;
    setLeaveLoading(true);
    const result = await apiClient.boards.leave(id);
    if (result.ok) {
      router.replace("/boards");
    } else {
      setErrorMessage(result.message);
      setLeaveLoading(false);
    }
  }

  if (authLoading || !isAuthenticated) return null;

  // ── Error states ──
  if (status === "gone") {
    return (
      <main className="px-4 pb-28 pt-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">OOTD</p>
            <h1 className="mt-4 text-3xl text-ink">Board expired</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">This board has passed its event date and is no longer active.</p>
            <Link href="/boards" className="mt-6 inline-block rounded-[1.2rem] border border-rose/15 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/25">
              Back to boards
            </Link>
          </div>
        </div>
        <MobileNav active="boards" />
      </main>
    );
  }

  if (status === "not-found" || status === "error") {
    return (
      <main className="px-4 pb-28 pt-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">OOTD</p>
            <h1 className="mt-4 text-3xl text-ink">Board not found</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{errorMessage ?? "This board doesn't exist or you're not a member."}</p>
            <Link href="/boards" className="mt-6 inline-block rounded-[1.2rem] border border-rose/15 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/25">
              Back to boards
            </Link>
          </div>
        </div>
        <MobileNav active="boards" />
      </main>
    );
  }

  const isCreator = board?.creator_id === user?.id;
  const eventLabel = formatDate(board?.event_date);
  const expiryLabel = board ? formatExpiry(board.expires_at) : "";

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* Top bar */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <Link href="/boards" className="flex items-center gap-1.5 text-sm text-mute transition hover:text-plum">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Boards
            </Link>
            <p className="mt-2 font-display text-[3.4rem] leading-none text-pink-deep">OOTD</p>
          </div>
        </header>

        {/* Board info card */}
        {status === "loading" ? (
          <div className="soft-panel mb-6 animate-pulse px-6 py-7">
            <div className="space-y-3">
              <div className="h-6 w-48 rounded-full bg-pink-soft" />
              <div className="h-3.5 w-32 rounded-full bg-pink-soft" />
            </div>
          </div>
        ) : (
          <section className="soft-panel mb-6 px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-3xl leading-tight tracking-[-0.03em] text-ink">{board?.name}</h1>
                {eventLabel ? (
                  <p className="mt-1 text-sm text-mute">{eventLabel}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full border border-rose/15 bg-pink-soft px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-pink-deep">
                {expiryLabel}
              </span>
            </div>

            {/* Members */}
            {members.length > 0 ? (
              <div className="mt-4 flex items-center gap-3 border-t border-rose/8 pt-4">
                <MemberStrip members={members} />
                <span className="text-[0.72rem] text-mute">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            ) : null}

            {/* Invite link */}
            {board ? (
              <div className="mt-4">
                <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">Invite link</p>
                <InviteCopy code={board.invite_code} />
              </div>
            ) : null}

            {/* Leave / delete */}
            <div className="mt-4 flex gap-2 border-t border-rose/8 pt-4">
              {isCreator ? (
                <Link
                  href="/boards"
                  className="text-[0.72rem] text-mute transition hover:text-error"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!confirm("Delete this board and all its content?")) return;
                    await apiClient.boards.delete(id);
                    router.replace("/boards");
                  }}
                >
                  Delete board
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLeave()}
                  disabled={leaveLoading}
                  className="text-[0.72rem] text-mute transition hover:text-error disabled:opacity-50"
                >
                  {leaveLoading ? "Leaving…" : "Leave board"}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Outfits section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-[-0.02em] text-ink">Looks</h2>
            <Link
              href={`/upload?board=${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose/15 bg-white px-4 py-2 text-[0.78rem] font-semibold text-pink-deep transition hover:border-rose/28"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add look
            </Link>
          </div>

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => <OutfitCardSkeleton key={i} showAuthor={false} />)}
            </div>
          ) : null}

          {status === "ready" && outfits.length === 0 ? (
            <div className="soft-panel px-6 py-10 text-center">
              <h2 className="text-2xl text-ink">No looks yet</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">Be the first to post an outfit to this board.</p>
              <Link
                href={`/upload?board=${id}`}
                className="mt-5 inline-block btn-primary"
              >
                Add the first look
              </Link>
            </div>
          ) : null}

          {status === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {outfits.map((o) => <OutfitCard key={o.id} outfit={toCardData(o)} showAuthor={false} showAccentMarker />)}
              </div>
              {nextCursor ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    className="rounded-full border border-rose/12 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/22 disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
      <MobileNav active="boards" />
    </main>
  );
}
