"use client";

import type {
  ApiResult,
  Board,
  BoardMember,
  BoardOutfitPage,
  OutfitResponse
} from "./types";
import { sendRequest } from "./request";

export const boardApiClient = {
  async create(input: { name: string; event_date?: string; media_link?: string | null }): Promise<ApiResult<Board>> {
    return sendRequest<Board>("/boards", {
      method: "POST",
      body: input,
      requiresAuth: true,
      successMessage: "Board created."
    });
  },

  async list(): Promise<ApiResult<Board[]>> {
    return sendRequest<Board[]>("/boards/me", {
      requiresAuth: true,
      successMessage: "Loaded boards."
    });
  },

  async get(boardId: string): Promise<ApiResult<Board>> {
    return sendRequest<Board>(`/boards/${boardId}`, {
      requiresAuth: true,
      successMessage: "Loaded board."
    });
  },

  async update(boardId: string, input: { name?: string; media_link?: string | null }): Promise<ApiResult<Board>> {
    return sendRequest<Board>(`/boards/${boardId}`, {
      method: "PATCH",
      body: input,
      requiresAuth: true,
      successMessage: "Board updated."
    });
  },

  async delete(boardId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/boards/${boardId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Board deleted."
    });
  },

  /** Preview a board via invite link — no auth required. */
  async previewInvite(code: string): Promise<ApiResult<Board>> {
    return sendRequest<Board>(`/boards/invite/${code}`, {
      successMessage: "Loaded board preview."
    });
  },

  async join(code: string): Promise<ApiResult<Board>> {
    return sendRequest<Board>(`/boards/invite/${code}/join`, {
      method: "POST",
      requiresAuth: true,
      successMessage: "Joined board."
    });
  },

  async getMembers(boardId: string): Promise<ApiResult<BoardMember[]>> {
    return sendRequest<BoardMember[]>(`/boards/${boardId}/members`, {
      requiresAuth: true,
      successMessage: "Loaded members."
    });
  },

  async leave(boardId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/boards/${boardId}/leave`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Left board."
    });
  },

  async removeMember(boardId: string, userId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/boards/${boardId}/members/${userId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Member removed."
    });
  },

  async addOutfit(boardId: string, outfitId: string): Promise<ApiResult<OutfitResponse>> {
    return sendRequest<OutfitResponse>(`/boards/${boardId}/outfits?outfit_id=${outfitId}`, {
      method: "POST",
      requiresAuth: true,
      successMessage: "Outfit added to board."
    });
  },

  async getOutfits(boardId: string, input?: {
    cursor?: string;
    limit?: number;
  }): Promise<ApiResult<BoardOutfitPage>> {
    const params = new URLSearchParams();
    if (input?.cursor) params.set("cursor", input.cursor);
    if (input?.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return sendRequest<BoardOutfitPage>(`/boards/${boardId}/outfits${query ? `?${query}` : ""}`, {
      requiresAuth: true,
      successMessage: "Loaded board outfits."
    });
  },

  async removeOutfit(boardId: string, outfitId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/boards/${boardId}/outfits/${outfitId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Outfit removed from board."
    });
  },

  async pinOutfit(boardId: string, outfitId: string, pinned: boolean): Promise<ApiResult<OutfitResponse>> {
    return sendRequest<OutfitResponse>(`/boards/${boardId}/outfits/${outfitId}/pin`, {
      method: "PATCH",
      body: { pinned },
      requiresAuth: true,
      successMessage: pinned ? "Outfit pinned." : "Outfit unpinned."
    });
  }
};
