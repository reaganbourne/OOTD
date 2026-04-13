export const AUTH_SESSION_COOKIE = "ootd_session";
export const AUTH_SESSION_COOKIE_VALUE = "active";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setAuthSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${AUTH_SESSION_COOKIE}=${AUTH_SESSION_COOKIE_VALUE}; ` +
    `Path=/; Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
