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

    if (input?.cursor) {
      params.set("cursor", input.cursor);
    }

    if (input?.limit) {
      params.set("limit", String(input.limit));
    }

    const query = params.toString();

    return sendRequest<FeedPageResponse>(`/outfits/feed${query ? `?${query}` : ""}`, {
      requiresAuth: true,
      successMessage: "Loaded feed."
    });
  }
};

export const apiClient = {
  auth: authApiClient,
  outfits: outfitApiClient,
  request: sendRequest,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl
};
