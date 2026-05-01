"use client";

export type ApiFieldErrors = Record<string, string>;

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
      status: number;
    }
  | {
      ok: false;
      message: string;
      errors?: ApiFieldErrors;
      status: number;
    };

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
};

export type AuthSessionResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type AuthRefreshResponse = {
  access_token: string;
  token_type: string;
};

export type AuthLogoutResponse = {
  message: string;
};

export type OutfitClothingItem = {
  id: string;
  outfit_id: string;
  brand?: string | null;
  category: string;
  color?: string | null;
  display_order: number;
  link_url?: string | null;
  created_at: string;
};

export type OutfitResponse = {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string | null;
  event_name?: string | null;
  worn_on?: string | null;
  vibe_check_text?: string | null;
  vibe_check_tone?: string | null;
  created_at: string;
  updated_at: string;
  clothing_items: OutfitClothingItem[];
};

export type FeedAuthor = {
  id: string;
  username?: string | null;
  profile_image_url?: string | null;
};

export type FeedOutfitResponse = OutfitResponse & {
  author: FeedAuthor;
};

export type FeedPageResponse = {
  outfits: FeedOutfitResponse[];
  next_cursor?: string | null;
};

// ── Outfit detail ─────────────────────────────────────────────────────────────

export type OutfitOwner = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
};

/** Full outfit detail — returned by GET /outfits/{id} */
export type OutfitDetailResponse = OutfitResponse & {
  owner: OutfitOwner;
};

export type VaultPage = {
  outfits: OutfitResponse[];
  next_cursor: string | null;
};

export type OutfitOG = {
  title: string;
  description: string;
  image_url: string;
  page_url: string;
  site_name: string;
  twitter_card: string;
};

export type CaptionSuggestions = {
  suggestions: string[];
};

// ── Likes & comments ──────────────────────────────────────────────────────────

export type LikeStatus = {
  like_count: number;
  liked: boolean;
};

export type CommentAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
};

export type Comment = {
  id: string;
  outfit_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: CommentAuthor;
};

export type CommentPage = {
  comments: Comment[];
  next_cursor: string | null;
};

// ── Users ─────────────────────────────────────────────────────────────────────

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  follower_count: number;
  following_count: number;
  created_at: string;
};

export type FollowStatus = {
  following: boolean;
  follower_count: number;
};

export type UserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  follower_count: number;
};

export type WrappedStats = {
  year: number;
  month: number;
  total_outfits: number;
  total_items: number;
  top_colors: Array<{ color: string; count: number }>;
  top_brands: Array<{ brand: string; count: number }>;
  top_categories: Array<{ category: string; count: number }>;
  longest_streak: number;
  current_streak: number;
  most_worn_vibe: string | null;
  outfits_by_week: Array<{ week: number; count: number }>;
};

// ── Boards ────────────────────────────────────────────────────────────────────

export type Board = {
  id: string;
  name: string;
  event_date: string | null;
  invite_code: string;
  creator_id: string;
  expires_at: string;
  member_count: number;
  created_at: string;
};

export type BoardMember = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  role: "creator" | "member";
  joined_at: string;
};

export type BoardOutfitPage = {
  outfits: OutfitResponse[];
  next_cursor: string | null;
};

export type CreateOutfitInput = {
  image: File;
  metadata: {
    caption?: string;
    event_name?: string;
    worn_on?: string;
    clothing_items: Array<{
      brand?: string;
      category: string;
      color?: string;
      display_order: number;
      link_url?: string;
    }>;
  };
};

type ApiFailureShape = {
  message: string;
  errors?: ApiFieldErrors;
  status: number;
};

type ApiRequestOptions = {
  method?: string;
  body?: FormData | Record<string, unknown>;
  headers?: HeadersInit;
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
  successMessage?: string;
};

type ValidationDetail = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

let accessToken: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidationDetailList(value: unknown): value is ValidationDetail[] {
  return Array.isArray(value);
}

function getValidationField(loc?: Array<string | number>): string {
  if (!loc || loc.length === 0) {
    return "form";
  }

  const lastString = [...loc]
    .reverse()
    .find((part): part is string => typeof part === "string" && part !== "body");

  return lastString ?? "form";
}

function normalizeErrorPayload(
  payload: unknown,
  status: number,
  statusText: string
): ApiFailureShape {
  if (isRecord(payload) && typeof payload.detail === "string") {
    return {
      message: payload.detail,
      status
    };
  }

  if (isRecord(payload) && isValidationDetailList(payload.detail)) {
    const errors: ApiFieldErrors = {};

    for (const detail of payload.detail) {
      const field = getValidationField(detail.loc);
      if (field in errors) {
        continue;
      }

      errors[field] = detail.msg ?? "Invalid value.";
    }

    return {
      message: Object.values(errors)[0] ?? "Validation failed.",
      errors,
      status
    };
  }

  return {
    message:
      status === 0
        ? "Unable to reach the API. Make sure the backend is running and NEXT_PUBLIC_API_URL is set."
        : statusText || "Something went wrong.",
    status
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL;
}

async function refreshAccessToken(): Promise<ApiResult<AuthRefreshResponse>> {
  const result = await sendRequest<AuthRefreshResponse>("/auth/refresh", {
    method: "POST",
    successMessage: "Session refreshed.",
    retryOnUnauthorized: false
  });

  if (result.ok) {
    setAccessToken(result.data.access_token);
  } else {
    clearAccessToken();
  }

  return result;
}

async function sendRequest<T>(
  path: string,
  {
    method = "GET",
    body,
    headers,
    requiresAuth = false,
    retryOnUnauthorized = true,
    successMessage = "Request completed."
  }: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const requestHeaders = new Headers(headers);

  if (!(body instanceof FormData) && body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (requiresAuth && accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      credentials: "include"
    });
  } catch {
    return {
      ok: false,
      ...normalizeErrorPayload(null, 0, "")
    };
  }

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    const refreshResult = await refreshAccessToken();

    if (refreshResult.ok) {
      return sendRequest<T>(path, {
        method,
        body,
        headers,
        requiresAuth,
        retryOnUnauthorized: false,
        successMessage
      });
    }

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }

    return {
      ok: false,
      message: refreshResult.message,
      errors: refreshResult.errors,
      status: 401
    };
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    return {
      ok: false,
      ...normalizeErrorPayload(payload, response.status, response.statusText)
    };
  }

  return {
    ok: true,
    data: payload as T,
    message: successMessage,
    status: response.status
  };
}

export const authApiClient = {
  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResult<AuthSessionResponse>> {
    const result = await sendRequest<AuthSessionResponse>("/auth/register", {
      method: "POST",
      body: input,
      successMessage: "Account created. The form is now wired to the shared auth API."
    });

    if (result.ok) {
      setAccessToken(result.data.access_token);
    }

    return result;
  },

  async login(input: {
    email: string;
    password: string;
  }): Promise<ApiResult<AuthSessionResponse>> {
    const result = await sendRequest<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: input,
      successMessage: "Welcome back. The form is now using the shared auth API."
    });

    if (result.ok) {
      setAccessToken(result.data.access_token);
    }

    return result;
  },

  async refresh(): Promise<ApiResult<AuthRefreshResponse>> {
    return refreshAccessToken();
  },

  async logout(): Promise<ApiResult<AuthLogoutResponse>> {
    const result = await sendRequest<AuthLogoutResponse>("/auth/logout", {
      method: "POST",
      successMessage: "Logged out."
    });

    clearAccessToken();
    return result;
  },

  async me(): Promise<ApiResult<AuthUser>> {
    return sendRequest<AuthUser>("/auth/me", {
      requiresAuth: true,
      successMessage: "Loaded current user."
    });
  }
};

export const outfitApiClient = {
  async create(input: CreateOutfitInput): Promise<ApiResult<OutfitResponse>> {
    const formData = new FormData();
    formData.append("image", input.image);
    formData.append("metadata", JSON.stringify(input.metadata));

    return sendRequest<OutfitResponse>("/outfits", {
      method: "POST",
      body: formData,
      requiresAuth: true,
      successMessage: "Outfit uploaded."
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
    return `${DEFAULT_API_BASE_URL}/outfits/${outfitId}/story-card`;
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

// ── Users ─────────────────────────────────────────────────────────────────────

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

  async follow(userId: string): Promise<ApiResult<FollowStatus>> {
    return sendRequest<FollowStatus>(`/users/${userId}/follow`, {
      method: "POST",
      requiresAuth: true,
      successMessage: "Followed."
    });
  },

  async unfollow(userId: string): Promise<ApiResult<FollowStatus>> {
    return sendRequest<FollowStatus>(`/users/${userId}/follow`, {
      method: "DELETE",
      requiresAuth: true,
      successMessage: "Unfollowed."
    });
  },

  async getWrapped(input?: { year?: number; month?: number }): Promise<ApiResult<WrappedStats>> {
    const params = new URLSearchParams();
    if (input?.year) params.set("year", String(input.year));
    if (input?.month) params.set("month", String(input.month));
    const query = params.toString();
    return sendRequest<WrappedStats>(`/users/me/wrapped${query ? `?${query}` : ""}`, {
      requiresAuth: true,
      successMessage: "Loaded wrapped stats."
    });
  }
};

// ── Boards ────────────────────────────────────────────────────────────────────

export const boardApiClient = {
  async create(input: { name: string; event_date?: string }): Promise<ApiResult<Board>> {
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

export const apiClient = {
  auth: authApiClient,
  outfits: outfitApiClient,
  users: userApiClient,
  boards: boardApiClient,
  request: sendRequest,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl
};
