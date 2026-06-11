"use client";

import type {
  ApiResult,
  AuthUser,
  FollowStatus,
  PublicProfile,
  UserSearchResult,
  WrappedStats
} from "./types";
import { sendRequest } from "./request";

export const userApiClient = {
  async getProfile(username: string): Promise<ApiResult<PublicProfile>> {
    return sendRequest<PublicProfile>(`/users/${encodeURIComponent(username)}`, {
      successMessage: "Loaded profile."
    });
  },

  async updateProfile(input: {
    display_name?: string | null;
    bio?: string | null;
    username?: string | null;
    instagram_handle?: string | null;
    vibe_check_enabled?: boolean;
    ai_consent_accepted?: boolean;
  }): Promise<ApiResult<AuthUser>> {
    return sendRequest<AuthUser>("/users/me", {
      method: "PATCH",
      body: input,
      requiresAuth: true,
      successMessage: "Profile updated."
    });
  },

  async uploadAvatar(image: File): Promise<ApiResult<AuthUser>> {
    const formData = new FormData();
    formData.append("image", image);
    return sendRequest<AuthUser>("/users/me/avatar", {
      method: "POST",
      body: formData,
      requiresAuth: true,
      successMessage: "Avatar updated."
    });
  },

  async search(q: string, limit?: number): Promise<ApiResult<UserSearchResult[]>> {
    const params = new URLSearchParams({ q });
    if (limit) params.set("limit", String(limit));
    return sendRequest<UserSearchResult[]>(`/users/search?${params}`, {
      successMessage: "Search complete."
    });
  },

  async getSuggested(limit?: number): Promise<ApiResult<UserSearchResult[]>> {
    const params = limit ? `?limit=${limit}` : "";
    return sendRequest<UserSearchResult[]>(`/users/suggested${params}`, {
      requiresAuth: true,
      successMessage: "Loaded suggestions."
    });
  },

  async getFollowStatus(username: string): Promise<ApiResult<FollowStatus>> {
    return sendRequest<FollowStatus>(`/users/${username}/follow-status`, {
      requiresAuth: true,
      successMessage: "Loaded follow status."
    });
  },

  async follow(username: string): Promise<ApiResult<FollowStatus>> {
    return sendRequest<FollowStatus>(`/users/${username}/follow`, {
      method: "POST",
      requiresAuth: true,
      successMessage: "Followed."
    });
  },

  async unfollow(username: string): Promise<ApiResult<FollowStatus>> {
    return sendRequest<FollowStatus>(`/users/${username}/follow`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Unfollowed."
    });
  },

  async getFollowers(username: string): Promise<ApiResult<{ id: string; username: string; display_name: string | null; profile_image_url: string | null }[]>> {
    return sendRequest(`/users/${username}/followers`, {
      requiresAuth: true,
      successMessage: "Loaded followers."
    });
  },

  async getFollowing(username: string): Promise<ApiResult<{ id: string; username: string; display_name: string | null; profile_image_url: string | null }[]>> {
    return sendRequest(`/users/${username}/following`, {
      requiresAuth: true,
      successMessage: "Loaded following."
    });
  },

  /** month must be "YYYY-MM" (e.g. "2026-04"). Defaults to the current calendar month. */
  async getWrapped(month?: string): Promise<ApiResult<WrappedStats>> {
    const m = month ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"
    return sendRequest<WrappedStats>(`/users/me/wrapped?month=${encodeURIComponent(m)}`, {
      requiresAuth: true,
      successMessage: "Loaded wrapped stats."
    });
  }
};
