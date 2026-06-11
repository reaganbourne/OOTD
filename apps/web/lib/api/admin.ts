"use client";

import type { ApiResult } from "./types";
import { sendRequest } from "./request";

export const adminApiClient = {
  async deleteOutfit(outfitId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/admin/outfits/${outfitId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Outfit deleted."
    });
  },

  async deleteBoard(boardId: string): Promise<ApiResult<null>> {
    return sendRequest<null>(`/admin/boards/${boardId}`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Board deleted."
    });
  }
};
