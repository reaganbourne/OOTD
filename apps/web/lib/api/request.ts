"use client";

import type { ApiFieldErrors, ApiResult, AuthRefreshResponse } from "./types";

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

// Route browser traffic through Next.js so local-device testing does not depend
// on cross-origin cookies, CORS, or "localhost" resolving on the client device.
const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY_BASE_URL ??
  "/backend";

let accessToken: string | null = null;

// ── Session-storage token cache ───────────────────────────────────────────────
// The access token lives in JS memory only and is lost on every page refresh.
// Persisting it in sessionStorage (same-tab, cleared on tab close) means a page
// reload can skip the cross-origin cookie round-trip to /auth/refresh entirely.
// Access tokens only live 15 minutes, so we store an expiry and reject stale ones.

const _SESSION_TOKEN_KEY = "ootd_at";
const _SESSION_EXPIRY_KEY = "ootd_at_exp";
const _TOKEN_TTL_MS = 14 * 60 * 1000; // 14 min (1 min buffer before JWT expires)

function _saveTokenToSession(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(_SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(_SESSION_EXPIRY_KEY, String(Date.now() + _TOKEN_TTL_MS));
  } catch { /* private browsing may block sessionStorage */ }
}

function _clearTokenFromSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(_SESSION_EXPIRY_KEY);
  } catch { /* ignore */ }
}

/**
 * Try to hydrate the in-memory access token from sessionStorage.
 * Returns the token if found and not expired, otherwise null.
 * Call this at app boot before attempting a network refresh.
 */
export function hydrateAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = sessionStorage.getItem(_SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(_SESSION_EXPIRY_KEY);
    if (!token || !expiry || Date.now() > Number(expiry)) {
      _clearTokenFromSession();
      return null;
    }
    accessToken = token;
    return token;
  } catch { return null; }
}

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
        ? "Unable to reach the API proxy. Make sure the backend is running and restart Next.js after env changes."
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

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    _saveTokenToSession(token);
  } else {
    _clearTokenFromSession();
  }
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

export async function refreshAccessToken(): Promise<ApiResult<AuthRefreshResponse>> {
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

const REQUEST_TIMEOUT_MS = 15_000;

export async function sendRequest<T>(
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      ...normalizeErrorPayload(null, 0, isTimeout ? "Request timed out. Please try again." : "")
    };
  }

  clearTimeout(timeoutId);

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
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?next=${next}`);
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
