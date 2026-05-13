"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, type Comment, type OutfitDetailResponse } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { StoryCardSheet } from "@/components/outfits/story-card-sheet";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "ready" | "not-found" | "error";

const TONE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  athletic:   { bg: "bg-cyan-100/85",    text: "text-cyan-900",    border: "border-cyan-300/70" },
  boho:       { bg: "bg-violet-100/85",  text: "text-violet-900",  border: "border-violet-300/75" },
  business:   { bg: "bg-sky-100/85",     text: "text-sky-900",     border: "border-sky-300/75" },
  casual:     { bg: "bg-blue-100/85",    text: "text-blue-900",    border: "border-blue-300/75" },
  formal:     { bg: "bg-amber-100/90",   text: "text-amber-950",   border: "border-amber-300/75" },
  maximalist: { bg: "bg-pink-100/85",    text: "text-pink-900",    border: "border-pink-300/75" },
  minimalist: { bg: "bg-slate-100/90",   text: "text-slate-800",   border: "border-slate-300/75" },
  preppy:     { bg: "bg-emerald-100/85", text: "text-emerald-900", border: "border-emerald-300/70" },
  streetwear: { bg: "bg-rose-100/85",    text: "text-rose-900",    border: "border-rose-300/75" },
  vintage:    { bg: "bg-orange-100/85",  text: "text-orange-900",  border: "border-orange-300/75" },
};

/** Trim AI-generated vibe text to the first sentence for a tighter display. */
function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(d));
}

function formatCommentDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

// ── Inline comments section ────────────────────────────────────────────────────

function CommentsSection({ outfitId }: { outfitId: string }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.outfits.getComments(outfitId, { limit: 20 }).then((r) => {
      if (!active) return;
      if (r.ok) { setComments(r.data.comments); setCursor(r.data.next_cursor ?? null); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [outfitId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore) {
        setLoadingMore(true);
        apiClient.outfits.getComments(outfitId, { cursor, limit: 20 }).then((r) => {
          if (r.ok) { setComments((p) => [...p, ...r.data.comments]); setCursor(r.data.next_cursor ?? null); }
          setLoadingMore(false);
        });
      }
    }, { rootMargin: "120px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadingMore, outfitId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim() || submitting || !isAuthenticated) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await apiClient.outfits.createComment(outfitId, newBody.trim());
    if (result.ok) {
      setComments((prev) => [result.data, ...prev]);
      setNewBody("");
    } else {
      setSubmitError(result.message ?? "Failed to post comment. Please try again.");
    }
    setSubmitting(false);
  }

  async function handleEdit(commentId: string, body: string) {
    const result = await apiClient.outfits.updateComment(outfitId, commentId, body);
    if (result.ok) setComments((prev) => prev.map((c) => (c.id === commentId ? result.data : c)));
    setEditingId(null);
  }

  async function handleDelete(commentId: string) {
    const result = await apiClient.outfits.deleteComment(outfitId, commentId);
    if (result.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="soft-panel px-5 py-5">
      <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">
        Comments {comments.length > 0 ? `· ${comments.length}${cursor ? "+" : ""}` : ""}
      </p>

      {/* Compose box */}
      {isAuthenticated ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mb-5">
          {submitError ? (
            <p className="mb-2 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
              {submitError}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={newBody}
              onChange={(e) => { setNewBody(e.target.value); if (submitError) setSubmitError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Add a comment…"
              rows={1}
              disabled={submitting}
              className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-pink-deep disabled:opacity-50 placeholder:text-mute"
            />
            <button
              type="submit"
              disabled={!newBody.trim() || submitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Post comment"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-sm text-mute">
          <Link href="/login" className="text-pink-deep hover:underline">Log in</Link> to leave a comment.
        </p>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 shrink-0 rounded-full bg-pink-soft" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-2.5 w-24 rounded-full bg-pink-soft" />
                <div className="h-3 w-full rounded-full bg-pink-soft" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-mute">no comments yet. be first ✨</p>
      ) : (
        <ul className="divide-y divide-line/40">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isOwn={comment.user_id === user?.id}
              editing={editingId === comment.id}
              onStartEdit={() => setEditingId(comment.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(body) => handleEdit(comment.id, body)}
              onDelete={() => handleDelete(comment.id)}
            />
          ))}
          {cursor ? <div ref={sentinelRef} className="h-px" /> : null}
          {loadingMore ? <li className="py-3 text-center text-xs text-mute">loading…</li> : null}
        </ul>
      )}
    </div>
  );
}

type CommentRowProps = {
  comment: Comment;
  isOwn: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

function CommentRow({ comment, isOwn, editing, onStartEdit, onCancelEdit, onSaveEdit, onDelete }: CommentRowProps) {
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editBody.trim() || saving) return;
    setSaving(true);
    try {
      await onSaveEdit(editBody.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex gap-3 py-3">
      {comment.author.profile_image_url ? (
        <img src={comment.author.profile_image_url} alt={comment.author.username ?? ""} className="h-8 w-8 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-pink-soft text-xs font-semibold text-ink-soft">
          {(comment.author.display_name ?? comment.author.username ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-ink">
            {comment.author.display_name ?? comment.author.username ?? "Someone"}
          </span>
          <span className="text-[0.65rem] text-mute">{formatCommentDate(comment.created_at)}</span>
        </div>
        {editing ? (
          <div className="mt-1.5 space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pink-deep"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleSave()} disabled={saving || !editBody.trim()}
                className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-50">
                {saving ? "saving…" : "save"}
              </button>
              <button type="button" onClick={onCancelEdit}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">
                cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm leading-6 text-ink-soft">{comment.body}</p>
        )}
        {isOwn && !editing ? (
          <div className="mt-1 flex gap-3">
            <button type="button" onClick={onStartEdit} className="text-[0.65rem] text-mute hover:text-ink-soft transition">edit</button>
            <button type="button" onClick={() => void onDelete()} className="text-[0.65rem] text-error/60 hover:text-error transition">delete</button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

// ── Main detail view ───────────────────────────────────────────────────────────

export function OutfitDetailView({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromVault = searchParams.get("from") === "vault";
  const { user, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [outfit, setOutfit] = useState<OutfitDetailResponse | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      const result = await apiClient.outfits.getDetail(id);
      if (!active) return;
      if (!result.ok) {
        setStatus(result.message?.toLowerCase().includes("not found") ? "not-found" : "error");
        return;
      }
      setOutfit(result.data);
      setStatus("ready");
      if (isAuthenticated) {
        const likeResult = await apiClient.outfits.getLikes(id);
        if (!active) return;
        if (likeResult.ok) { setLiked(likeResult.data.liked); setLikeCount(likeResult.data.like_count); }
      }
    }
    void load();
    return () => { active = false; };
  }, [id, isAuthenticated]);

  async function handleLike() {
    if (!isAuthenticated || likeLoading) return;
    setLikeLoading(true);
    if (liked) {
      const result = await apiClient.outfits.unlike(id);
      if (result.ok) { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
    } else {
      const result = await apiClient.outfits.like(id);
      if (result.ok) { setLiked(true); setLikeCount(result.data.like_count); }
    }
    setLikeLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this outfit? This can't be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await apiClient.outfits.delete(id);
    if (result.ok) {
      router.push("/vault");
    } else {
      setDeleting(false);
      setDeleteError(result.message ?? "Failed to delete. Please try again.");
    }
  }

  if (status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-3xl text-ink">Outfit not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">This look may have been removed.</p>
          <Link href="/feed" className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const tone = outfit?.vibe_check_tone?.toLowerCase();
  const toneStyle = tone ? TONE_BADGE[tone] : null;
  const isOwn = outfit?.owner?.id === user?.id;
  const dateLabel = formatDate(outfit?.worn_on ?? outfit?.created_at);

  return (
    <>
      <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Top bar — prominent back button */}
          <header className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (fromVault) {
                  router.push("/vault");
                } else if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/feed");
                }
              }}
              className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-pink-deep/30 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              {fromVault ? "vault" : "back"}
            </button>

            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-pink-deep/30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              share
            </button>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

            {/* ── Left: outfit image ── */}
            <div>
              {status === "loading" ? (
                <div className="aspect-[4/5] w-full animate-pulse rounded-[2rem] bg-[linear-gradient(120deg,_rgba(255,236,242,0.8),_rgba(255,255,255,0.98),_rgba(250,216,225,0.62))]" />
              ) : (
                <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_rgba(244,106,147,0.12)]">
                  <img
                    src={outfit?.image_url}
                    alt={outfit?.caption ?? "Outfit photo"}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  {toneStyle ? (
                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] backdrop-blur ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}>
                        {outfit?.vibe_check_tone
                          ? outfit.vibe_check_tone.charAt(0).toUpperCase() + outfit.vibe_check_tone.slice(1)
                          : null}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Right: details ── */}
            <div className="space-y-5">

              {/* Author */}
              {status === "loading" ? (
                <div className="soft-panel flex animate-pulse items-center gap-3 px-5 py-4">
                  <div className="h-11 w-11 rounded-full bg-pink-soft" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 rounded-full bg-pink-soft" />
                    <div className="h-3 w-20 rounded-full bg-pink-soft" />
                  </div>
                </div>
              ) : outfit?.owner ? (
                <Link href={`/profile/${outfit.owner.username}`}
                  className="soft-panel flex items-center gap-3 px-5 py-4 transition hover:border-pink-deep/20">
                  {outfit.owner.profile_image_url ? (
                    <img src={outfit.owner.profile_image_url} alt={outfit.owner.username ?? ""}
                      className="h-11 w-11 rounded-full border border-line object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-pink-soft text-sm font-semibold text-ink-soft">
                      {(outfit.owner.display_name ?? outfit.owner.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{outfit.owner.display_name ?? outfit.owner.username}</p>
                    {outfit.owner.username ? <p className="text-[0.7rem] text-mute">@{outfit.owner.username}</p> : null}
                  </div>
                  <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-mute/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ) : null}

              {/* Caption + meta */}
              <div className="soft-panel px-5 py-5 space-y-4">
                {status === "loading" ? (
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded-full bg-pink-soft" />
                    <div className="h-4 w-4/5 rounded-full bg-pink-soft" />
                    <div className="h-3 w-1/3 rounded-full bg-line/60" />
                  </div>
                ) : (
                  <>
                    {outfit?.caption ? <p className="text-sm leading-7 text-ink-soft">{outfit.caption}</p> : null}
                    {outfit?.event_name ? (
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-mute">{outfit.event_name}</p>
                    ) : null}
                    {dateLabel ? <p className="text-[0.7rem] uppercase tracking-[0.18em] text-mute">{dateLabel}</p> : null}
                    {outfit?.vibe_check_text?.trim() ? (
                      <div className="rounded-[1rem] border border-line bg-pink-soft px-4 py-3">
                        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-pink-deep">Vibe check</p>
                        <p className="text-sm leading-6 text-ink-soft">{firstSentence(outfit.vibe_check_text)}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Clothing items */}
              {status === "ready" && outfit && outfit.clothing_items.length > 0 ? (
                <div className="soft-panel px-5 py-5">
                  <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-mute">Pieces</p>
                  <ul className="space-y-3">
                    {outfit.clothing_items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink capitalize">{item.category}</p>
                          <p className="text-[0.7rem] text-mute">{[item.brand, item.color].filter(Boolean).join(" · ")}</p>
                        </div>
                        {item.link_url ? (
                          <a href={item.link_url} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 rounded-full border border-line px-3 py-1 text-[0.68rem] font-semibold text-pink-deep transition hover:border-pink-deep/30">
                            Shop
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {deleteError ? (
                <div className="rounded-[1rem] border border-error/25 bg-error/5 px-4 py-3 text-sm text-error">{deleteError}</div>
              ) : null}

              {/* Like + share + delete actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleLike()}
                  disabled={likeLoading || !isAuthenticated}
                  className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition disabled:cursor-default ${
                    liked ? "border-pink-deep/40 bg-pink-soft text-pink-deep" : "border-line bg-white text-ink-soft hover:border-pink-deep/30"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {likeCount > 0 ? likeCount.toLocaleString() : "like"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowShare(true)}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white text-xs font-medium text-ink-soft transition hover:border-pink-deep/30"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  share
                </button>

                {isOwn ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-error/40 hover:text-error disabled:opacity-40"
                    aria-label="Delete outfit"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                ) : null}
              </div>

              {/* Inline comments — always visible, no sheet needed */}
              {status === "ready" ? <CommentsSection outfitId={id} /> : null}
            </div>
          </div>
        </div>
      </main>

      {showShare ? (
        <StoryCardSheet
          outfitId={id}
          imageUrl={outfit?.image_url ?? ""}
          wornOn={outfit?.worn_on}
          createdAt={outfit?.created_at}
          vibeCheckText={outfit?.vibe_check_text}
          vibeCheckTone={outfit?.vibe_check_tone}
          onClose={() => setShowShare(false)}
        />
      ) : null}

      <MobileNav active="feed" />
    </>
  );
}
