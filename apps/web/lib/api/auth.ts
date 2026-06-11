"use client";

import type {
  ApiResult,
  AuthLogoutResponse,
  AuthRefreshResponse,
  AuthSessionResponse,
  AuthUser
} from "./types";
import {
  clearAccessToken,
  refreshAccessToken,
  sendRequest,
  setAccessToken
} from "./request";

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
    identifier: string;
    password: string;
  }): Promise<ApiResult<AuthSessionResponse>> {
    const result = await sendRequest<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: { identifier: input.identifier, password: input.password },
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
  },

  async forgotPassword(email: string): Promise<ApiResult<{ message: string }>> {
    return sendRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      successMessage: "Reset email sent."
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
    return sendRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
      successMessage: "Password updated."
    });
  }
};
