"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient, type Comment } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 20;

function formatCommentDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function getInitial(name?: string | null) {
  return (name?.trim() || "?").charAt(0).toUpperCase();
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
    await onSaveEdit(editBody.trim());
    setSaving(false);
  }

  return (
    <li className="flex gap-3 py-3">
      {comment.author.profile_image_url ? (
        <img
          src={comment.author.profile_image_url}
          alt={comment.author.username ?? ""}
          className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-pink-soft text-xs font-semibold text-ink-soft">
          {getInitial(comment.author.display_name ?? comment.author.username)}
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
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !editBody.trim()}
                className="rounded-full bg-ink px-3 py-1 text-xs font-medium lowercase text-paper transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm leading-6 text-ink-soft">{comment.body}</p>
        )}

        {isOwn && !editing ? (
          <div className="mt-1 flex gap-3">
            <button type="button" onClick={onStartEdit} className="text-[0.65rem] text-mute hover:text-ink-soft transition">
              Edit
            </button>
            <button type="button" onClick={() => void onDelete()} className="text-[0.65rem] text-error/60 hover:text-error transition">
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

type CommentsSheetProps = {
  outfitId: string;
  onClose: () => void;
};

export function CommentsSheet({ outfitId, onClose }: CommentsSheetProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial load
  useEffect(() => {
    let active = true;
    setLoading(true);

    apiClient.outfits.getComments(outfitId, { limit: PAGE_SIZE }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setComments(result.data.comments);
        setCursor(result.data.next_cursor ?? null);
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [outfitId]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor && !loadingMore) {
        setLoadingMore(true);
        apiClient.outfits.getComments(outfitId, { cursor, limit: PAGE_SIZE }).then((result) => {
          if (result.ok) {
            setComments((prev) => [...prev, ...result.data.comments]);
            setCursor(result.data.next_cursor ?? null);
          }
          setLoadingMore(false);
        });
      }
    }, { rootMargin: "100px" });

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadingMore, outfitId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim() || submitting || !isAuthenticated) return;
    setSubmitting(true);

    const result = await apiClient.outfits.createComment(outfitId, newBody.trim());
    if (result.ok) {
      setComments((prev) => [...prev, result.data]);
      setNewBody("");
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
    setSubmitting(false);
  }

  async function handleEdit(commentId: string, body: string) {
    const result = await apiClient.outfits.updateComment(outfitId, commentId, body);
    if (result.ok) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? result.data : c)));
    }
    setEditingId(null);
  }

  async function handleDelete(commentId: string) {
    const result = await apiClient.outfits.deleteComment(outfitId, commentId);
    if (result.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(36,21,28,0.42)] px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="soft-panel flex w-full max-w-sm flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line/60 px-6 pb-4 pt-6">
          <h2 className="font-display italic text-2xl tracking-[-0.03em] text-ink">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-mute transition hover:border-pink-deep/25 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comment list */}
        <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-6 divide-y divide-line/40">
          {loading ? (
            <li className="flex flex-col gap-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-pink-soft" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-2.5 w-24 animate-pulse rounded-full bg-pink-soft" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-pink-soft" />
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-pink-soft" />
                  </div>
                </div>
              ))}
            </li>
          ) : comments.length === 0 ? (
            <li className="py-10 text-center">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-mute">No comments yet</p>
              <p className="mt-2 text-sm text-mute">Be the first to say something.</p>
            </li>
          ) : (
            <>
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
              {loadingMore ? (
                <li className="py-3 text-center text-xs text-mute">Loading more…</li>
              ) : null}
            </>
          )}
        </ul>

        {/* Input */}
        {isAuthenticated ? (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="shrink-0 border-t border-line/60 px-4 py-4"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="shrink-0 border-t border-line/60 px-6 py-4 text-center text-xs text-mute">
            Log in to leave a comment.
          </p>
        )}
      </div>
    </div>
  );
}
