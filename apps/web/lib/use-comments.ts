"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, type Comment } from "@/lib/api-client";

const DEFAULT_PAGE_SIZE = 20;

type UseCommentsOptions = {
  /** How many comments to request per page. */
  pageSize?: number;
  /**
   * Where a freshly created comment lands in the list.
   * "start" for newest-first panels, "end" for chat-style sheets.
   */
  insert?: "start" | "end";
  /** rootMargin for the infinite-scroll sentinel observer. */
  rootMargin?: string;
};

/** Result of a create attempt so callers can surface errors / react to success. */
type CreateResult = { ok: boolean; message?: string };

/**
 * Shared comment data layer for an outfit: initial load, cursor pagination,
 * create, edit, and delete against `apiClient.outfits.*`, with the optimistic
 * list state the UI renders. Presentation (sheet vs inline panel) lives in the
 * consuming components — this hook only owns the data operations.
 */
export function useComments(outfitId: string, options: UseCommentsOptions = {}) {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    insert = "start",
    rootMargin = "120px",
  } = options;

  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Attach to a sentinel element at the end of the list to drive pagination.
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial load (and reset when the outfit changes).
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.outfits.getComments(outfitId, { limit: pageSize }).then((r) => {
      if (!active) return;
      if (r.ok) {
        setComments(r.data.comments);
        setCursor(r.data.next_cursor ?? null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [outfitId, pageSize]);

  // Infinite-scroll pagination via an IntersectionObserver on the sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          apiClient.outfits.getComments(outfitId, { cursor, limit: pageSize }).then((r) => {
            if (r.ok) {
              setComments((prev) => [...prev, ...r.data.comments]);
              setCursor(r.data.next_cursor ?? null);
            }
            setLoadingMore(false);
          });
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadingMore, outfitId, pageSize, rootMargin]);

  const createComment = useCallback(
    async (body: string): Promise<CreateResult> => {
      const trimmed = body.trim();
      if (!trimmed || submitting) return { ok: false };
      setSubmitting(true);
      const result = await apiClient.outfits.createComment(outfitId, trimmed);
      if (result.ok) {
        setComments((prev) =>
          insert === "start" ? [result.data, ...prev] : [...prev, result.data],
        );
      }
      setSubmitting(false);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [outfitId, submitting, insert],
  );

  const editComment = useCallback(
    async (commentId: string, body: string) => {
      const result = await apiClient.outfits.updateComment(outfitId, commentId, body);
      if (result.ok) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? result.data : c)));
      }
      setEditingId(null);
    },
    [outfitId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const result = await apiClient.outfits.deleteComment(outfitId, commentId);
      if (result.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    },
    [outfitId],
  );

  return {
    comments,
    cursor,
    loading,
    loadingMore,
    submitting,
    editingId,
    setEditingId,
    sentinelRef,
    createComment,
    editComment,
    deleteComment,
  };
}
