"use client";

import type {
  ApiResult,
  CaptionSuggestions,
  Comment,
  CommentPage,
  CreateOutfitInput,
  FeedPageResponse,
  LikeStatus,
  OutfitDetailResponse,
  OutfitOG,
  OutfitResponse,
  VaultPage
} from "./types";
import { getApiBaseUrl, sendRequest } from "./request";

export const outfitApiClient = {
  async create(
    input: CreateOutfitInput,
    options?: { idempotencyKey?: string }
  ): Promise<ApiResult<OutfitResponse>> {
    const formData = new FormData();
    formData.append("image", input.image);
    formData.append("metadata", JSON.stringify(input.metadata));

    const extraHeaders: Record<string, string> = {};
    if (options?.idempotencyKey) {
      extraHeaders["Idempotency-Key"] = options.idempotencyKey;
    }

    return sendRequest<OutfitResponse>("/outfits", {
      method: "POST",
      body: formData,
      requiresAuth: true,
      successMessage: "Outfit uploaded.",
      headers: extraHeaders,
    });
  },

  async getFeed(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<FeedPageResponse>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<FeedPageResponse>(`/outfits/feed${query ? `?${query}` : ""}`, {
      requiresAuth: true,
      successMessage: "Loaded feed."
    });
  },

  async getExplore(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<FeedPageResponse>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<FeedPageResponse>(`/outfits/explore${query ? `?${query}` : ""}`, {
      successMessage: "Loaded explore."
    });
  },

  async getVault(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<VaultPage>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<VaultPage>(`/outfits/me${query ? `?${query}` : ""}`, {
      requiresAuth: true,
      successMessage: "Loaded vault."
    });
  },

  async searchVault(q: string, limit?: number): Promise<ApiResult<OutfitResponse[]>> {
    const params = new URLSearchParams({ q });
    if (limit) params.set("limit", String(limit));
    return sendRequest<OutfitResponse[]>(`/outfits/me/search?${params}`, {
      requiresAuth: true,
      successMessage: "Search complete."
    });
  },

  async getByUser(username: string, input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<VaultPage>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<VaultPage>(`/outfits/user/${encodeURIComponent(username)}${query ? `?${query}` : ""}`, {
      successMessage: "Loaded user vault."
    });
  },

  async getDetail(outfitId: string): Promise<ApiResult<OutfitDetailResponse>> {
    return sendRequest<OutfitDetailResponse>(`/outfits/${outfitId}`, {
      successMessage: "Loaded outfit."
    });
  },

  async getOG(outfitId: string): Promise<ApiResult<OutfitOG>> {
    return sendRequest<OutfitOG>(`/outfits/${outfitId}/og`, {
      successMessage: "Loaded OG metadata."
    });
  },

  /** Returns the direct URL for the story-card PNG — use in an <img> src or download link. */
  storyCardUrl(outfitId: string): string {
    return `${getApiBaseUrl()}/outfits/${outfitId}/story-card`;
  },

  async delete(outfitId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/outfits/${outfitId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Outfit deleted."
    });
  },

  async suggestCaptions(image: File): Promise<ApiResult<CaptionSuggestions>> {
    const formData = new FormData();
    formData.append("image", image);
    return sendRequest<CaptionSuggestions>("/outfits/caption-suggestion", {
      method: "POST",
      body: formData,
      requiresAuth: true,
      successMessage: "Captions generated."
    });
  },

  // ── Likes ──────────────────────────────────────────────────────────────────

  async getLikes(outfitId: string): Promise<ApiResult<LikeStatus>> {
    return sendRequest<LikeStatus>(`/outfits/${outfitId}/likes`, {
      successMessage: "Loaded likes."
    });
  },

  async like(outfitId: string): Promise<ApiResult<LikeStatus>> {
    return sendRequest<LikeStatus>(`/outfits/${outfitId}/likes`, {
      method: "POST",
      requiresAuth: true,
      successMessage: "Liked."
    });
  },

  async unlike(outfitId: string): Promise<ApiResult<LikeStatus>> {
    return sendRequest<LikeStatus>(`/outfits/${outfitId}/likes`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Unliked."
    });
  },

  // ── Comments ───────────────────────────────────────────────────────────────

  async getComments(outfitId: string, input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<CommentPage>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<CommentPage>(`/outfits/${outfitId}/comments${query ? `?${query}` : ""}`, {
      successMessage: "Loaded comments."
    });
  },

  async createComment(outfitId: string, body: string): Promise<ApiResult<Comment>> {
    return sendRequest<Comment>(`/outfits/${outfitId}/comments`, {
      method: "POST",
      body: { body },
      requiresAuth: true,
      successMessage: "Comment posted."
    });
  },

  async updateComment(outfitId: string, commentId: string, body: string): Promise<ApiResult<Comment>> {
    return sendRequest<Comment>(`/outfits/${outfitId}/comments/${commentId}`, {
      method: "PATCH",
      body: { body },
      requiresAuth: true,
      successMessage: "Comment updated."
    });
  },

  async deleteComment(outfitId: string, commentId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/outfits/${outfitId}/comments/${commentId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Comment deleted."
    });
  }
};
