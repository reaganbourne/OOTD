"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authApiClient,
  clearAccessToken,
  type AuthUser
} from "@/lib/api-client";
import { toAuthErrors, type AuthErrors } from "@/lib/auth";
import {
  clearAuthSessionCookie,
  setAuthSessionCookie
} from "@/lib/auth-session";

type LoginInput = {
  email: string;
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
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthActionResult>;
  signup: (input: SignupInput) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function bootstrapAuth() {
      setIsLoading(true);

      const refreshResult = await authApiClient.refresh();

      if (!isActive) {
        return;
      }

      if (!refreshResult.ok) {
        clearAccessToken();
        clearAuthSessionCookie();
        setUser(null);
        setIsLoading(false);
        return;
      }

      const meResult = await authApiClient.me();

      if (!isActive) {
        return;
      }

      if (meResult.ok) {
        setAuthSessionCookie();
        setUser(meResult.data);
      } else {
        clearAccessToken();
        clearAuthSessionCookie();
        setUser(null);
      }

      setIsLoading(false);
    }

    void bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, []);

  async function login(input: LoginInput): Promise<AuthActionResult> {
    setIsLoading(true);

    const result = await authApiClient.login(input);

    if (result.ok) {
      setAuthSessionCookie();
      setUser(result.data.user);
      setIsLoading(false);

      return {
        ok: true,
        message: result.message
      };
    }

    setIsLoading(false);

    return {
      ok: false,
      message: result.message,
      errors: toAuthErrors(result.errors)
    };
  }

  async function signup(input: SignupInput): Promise<AuthActionResult> {
    setIsLoading(true);

    const result = await authApiClient.register(input);

    if (result.ok) {
      setAuthSessionCookie();
      setUser(result.data.user);
      setIsLoading(false);

      return {
        ok: true,
        message: result.message
      };
    }

    setIsLoading(false);

    return {
      ok: false,
      message: result.message,
      errors: toAuthErrors(result.errors)
    };
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
        isLoading,
        login,
        signup,
        logout
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
