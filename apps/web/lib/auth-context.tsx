"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authApiClient,
  clearAccessToken,
  hydrateAccessToken,
  type AuthUser
} from "@/lib/api-client";
import { toAuthErrors, type AuthErrors } from "@/lib/auth";
import {
  clearAuthSessionCookie,
  hasAuthSessionCookie,
  setAuthSessionCookie
} from "@/lib/auth-session";

type LoginInput = {
  identifier: string;
  password: string;
};

type SignupInput = {
  username: string;
  email: string;
  password: string;
};

type AuthActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
      errors?: AuthErrors;
    };

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only while the initial session check runs on mount. Use this to show a full-screen skeleton. */
  isBootstrapping: boolean;
  /** True while an active login/signup/logout action is in flight. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthActionResult>;
  signup: (input: SignupInput) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function bootstrapAuth() {
      // ── Fast path: valid token already cached in sessionStorage ──────────
      const cachedToken = hydrateAccessToken();
      if (cachedToken) {
        const meResult = await authApiClient.me();
        if (!isActive) return;
        if (meResult.ok) {
          setUser(meResult.data);
          setIsBootstrapping(false);
          return;
        }
        clearAccessToken();
      }

      if (!hasAuthSessionCookie()) {
        clearAccessToken();
        setUser(null);
        setIsBootstrapping(false);
        return;
      }

      // ── Slow path: exchange refresh-token cookie for token + user ───
      const refreshResult = await authApiClient.refresh();
      if (!isActive) return;

      if (refreshResult.ok) {
        setAuthSessionCookie();
        setUser(refreshResult.data.user);
      } else {
        clearAccessToken();
        clearAuthSessionCookie();
        setUser(null);
      }

      setIsBootstrapping(false);
    }

    void bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, []);

  async function login(input: LoginInput): Promise<AuthActionResult> {
    setIsLoading(true);

    try {
      const result = await authApiClient.login(input);

      if (result.ok) {
        setAuthSessionCookie();
        setUser(result.data.user);
        return { ok: true, message: result.message };
      }

      return {
        ok: false,
        message: result.message,
        errors: toAuthErrors(result.errors)
      };
    } finally {
      setIsLoading(false);
    }
  }

  async function signup(input: SignupInput): Promise<AuthActionResult> {
    setIsLoading(true);

    try {
      const result = await authApiClient.register(input);

      if (result.ok) {
        setAuthSessionCookie();
        setUser(result.data.user);
        return { ok: true, message: result.message };
      }

      return {
        ok: false,
        message: result.message,
        errors: toAuthErrors(result.errors)
      };
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUser() {
    const meResult = await authApiClient.me();
    if (meResult.ok) {
      setUser(meResult.data);
    }
  }

  async function logout() {
    setIsLoading(true);

    await authApiClient.logout();
    clearAccessToken();
    clearAuthSessionCookie();
    setUser(null);
    setIsLoading(false);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isBootstrapping,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
