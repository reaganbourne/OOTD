"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
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

function InviteCopy({ code, boardName }: { code: string; boardName?: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/boards/join/${code}`;
  const shareText = `Join my board${boardName ? ` "${boardName}"` : ""} on checkd! ${link}`;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: link });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-[1.2rem] border border-line bg-white px-4 py-3">
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-[0.72rem] text-mute">{link}</span>
      <button
        type="button"
        onClick={() => void share()}
        className="shrink-0 text-[0.72rem] font-semibold text-pink-deep transition hover:text-[#d94e7a]"
      >
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}

// ── Media link ────────────────────────────────────────────────────────────────

function MediaLinkRow({
  boardId,
  value,
  onSave,
}: {
  boardId: string;
  value: string | null;
  onSave: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value ?? "");
    setSaveError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const trimmed = draft.trim();
    const result = await apiClient.boards.update(boardId, { media_link: trimmed || null });
    if (result.ok) {
      onSave(result.data.media_link);
      setEditing(false);
    } else {
      setSaveError(result.message ?? "Couldn't save link.");
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        {saveError ? (
          <p className="rounded-[1rem] border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">{saveError}</p>
        ) : null}
        <div className="flex items-center gap-2 rounded-[1.2rem] border border-pink-deep/30 bg-white px-4 py-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <input
          ref={inputRef}
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="https://pinterest.com/…"
          maxLength={500}
          className="min-w-0 flex-1 bg-transparent text-[0.72rem] text-ink outline-none placeholder:text-mute"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="shrink-0 text-[0.72rem] font-semibold text-pink-deep transition hover:text-[#d94e7a] disabled:opacity-50"
        >
          {saving ? "saving…" : "save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 text-[0.72rem] text-mute transition hover:text-ink"
        >
          cancel
        </button>
      </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-[1.2rem] border border-line bg-white px-4 py-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-[0.72rem] text-pink-deep hover:underline"
        >
          {value.replace(/^https?:\/\//, "")}
        </a>
        <button
          type="button"
          onClick={startEdit}
          className="shrink-0 text-[0.72rem] font-semibold text-mute transition hover:text-ink"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="flex w-full items-center gap-2 rounded-[1.2rem] border border-dashed border-line bg-white/50 px-4 py-3 text-left transition hover:border-pink-deep/40"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-mute" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="text-[0.72rem] text-mute">add a link: pinterest, partiful, etc.</span>
    </button>
  );
}

// ── Member strip ──────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: BoardMember }) {
  const inner = member.profile_image_url ? (
    <img
      src={member.profile_image_url}
      alt={member.username ?? "Member"}
      className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-pink-soft text-[0.65rem] font-semibold text-ink-soft shadow-sm">
      {(member.display_name ?? member.username ?? "?").charAt(0).toUpperCase()}
    </div>
  );

  if (member.username) {
    return (
      <Link
        href={`/profile/${member.username}`}
        title={member.display_name ?? member.username ?? "Member"}
        className="transition hover:opacity-80"
      >
        {inner}
      </Link>
    );
  }
  return <div title={member.display_name ?? "Member"}>{inner}</div>;
}

function MemberStrip({ members }: { members: BoardMember[] }) {
  const shown = members.slice(0, 7);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((m) => (
        <MemberAvatar key={m.user_id} member={m} />
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editNameSaving, setEditNameSaving] = useState(false);
  const editNameInputRef = useRef<HTMLInputElement>(null);

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

  function startEditName() {
    setEditNameValue(board?.name ?? "");
    setEditingName(true);
    // Focus the input on next tick after render
    setTimeout(() => editNameInputRef.current?.focus(), 0);
  }

  async function saveEditName() {
    const trimmed = editNameValue.trim();
    if (!trimmed || editNameSaving) return;
    setEditNameSaving(true);
    const result = await apiClient.boards.update(id, { name: trimmed });
    if (result.ok) {
      setBoard(result.data);
    } else {
      setErrorMessage(result.message);
    }
    setEditingName(false);
    setEditNameSaving(false);
  }

  if (authLoading) {
    return (
      <main className="px-4 pb-28 pt-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-full bg-pink-soft" />
          <div className="soft-panel h-48 w-full animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-[1.5rem] bg-pink-soft" />
            ))}
          </div>
        </div>
        <MobileNav active="boards" />
      </main>
    );
  }
  if (!isAuthenticated) return null;

  // ── Error states ──
  if (status === "gone") {
    return (
      <main className="px-4 pb-28 pt-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">board expired</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">This board has passed its event date and is no longer active.</p>
            <Link href="/boards" className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25">
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
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">board not found</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{errorMessage ?? "This board doesn't exist or you're not a member."}</p>
            <Link href="/boards" className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25">
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
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-0 lg:pt-20">
      <div className="mx-auto max-w-3xl">

        {/* Top bar */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <Link href="/boards" className="flex items-center gap-1.5 text-sm text-mute transition hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Boards
            </Link>
            <p className="mt-2 font-display italic text-[2.2rem] leading-none text-pink-deep">checkd</p>
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
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editNameInputRef}
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEditName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      maxLength={120}
                      className="min-w-0 flex-1 rounded-xl border border-pink-deep/40 bg-white px-3 py-2 font-display text-2xl tracking-[-0.03em] text-ink outline-none focus:border-pink-deep"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEditName()}
                      disabled={editNameSaving || !editNameValue.trim()}
                      className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
                    >
                      {editNameSaving ? "saving…" : "save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="shrink-0 rounded-full border border-line px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="font-display italic text-3xl leading-tight tracking-[-0.03em] text-ink">{board?.name}</h1>
                    {isCreator ? (
                      <button
                        type="button"
                        onClick={startEditName}
                        aria-label="Rename board"
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-mute/60 transition hover:border-pink-deep/30 hover:text-ink"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                )}
                {eventLabel ? (
                  <p className="mt-1 text-sm text-mute">{eventLabel}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full border border-line bg-pink-soft px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-pink-deep">
                {expiryLabel}
              </span>
            </div>

            {/* Members */}
            {members.length > 0 ? (
              <div className="mt-4 flex items-center gap-3 border-t border-line/60 pt-4">
                <MemberStrip members={members} />
                <span className="text-[0.72rem] text-mute">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            ) : null}

            {/* Invite link */}
            {board ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">Invite link</p>
                  <InviteCopy code={board.invite_code} boardName={board.name} />
                </div>
                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">Board link</p>
                  <MediaLinkRow
                    boardId={id}
                    value={board.media_link ?? null}
                    onSave={(next) => setBoard((b) => b ? { ...b, media_link: next } : b)}
                  />
                </div>
              </div>
            ) : null}

            {/* Leave / delete */}
            <div className="mt-4 flex flex-col gap-2 border-t border-line/60 pt-4">
              {errorMessage && !deleteLoading ? (
                <p className="text-[0.72rem] text-error">{errorMessage}</p>
              ) : null}
              {isCreator ? (
                <button
                  type="button"
                  disabled={deleteLoading}
                  className="w-fit text-[0.72rem] text-mute transition hover:text-error disabled:opacity-50"
                  onClick={async () => {
                    if (!confirm("Delete this board and all its content?")) return;
                    setDeleteLoading(true);
                    setErrorMessage(null);
                    const result = await apiClient.boards.delete(id);
                    if (result.ok) {
                      router.replace("/boards");
                    } else {
                      setErrorMessage(result.message ?? "Failed to delete. Please try again.");
                      setDeleteLoading(false);
                    }
                  }}
                >
                  {deleteLoading ? "Deleting…" : "Delete board"}
                </button>
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
            <h2 className="font-display italic text-xl tracking-[-0.02em] text-ink">looks</h2>
            <Link
              href={`/boards/${id}/upload`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[0.78rem] font-semibold text-ink transition hover:border-pink-deep"
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
              <h2 className="text-2xl text-ink">no looks yet</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">Be the first to post an outfit to this board.</p>
              <Link
                href={`/boards/${id}/upload`}
                className="mt-5 btn-primary"
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
                    className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25 disabled:opacity-50"
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
