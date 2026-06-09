"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApiClient } from "@/lib/api-client";

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string }
  | { status: "invalid-token" };

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid-token" });
    }
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 12) {
      setState({ status: "error", message: "Password must be at least 12 characters." });
      return;
    }
    if (password !== confirm) {
      setState({ status: "error", message: "Passwords don't match." });
      return;
    }

    setState({ status: "submitting" });
    const result = await authApiClient.resetPassword(token, password);

    if (result.ok) {
      setState({ status: "success" });
      setTimeout(() => router.replace("/login"), 2000);
    } else {
      setState({ status: "error", message: result.message });
    }
  }

  if (state.status === "invalid-token") {
    return (
      <div style={{ padding: "20px 0" }}>
        <p className="text-mute" style={{ fontSize: 15 }}>
          This reset link is missing or invalid.{" "}
          <a href="/forgot-password" className="text-ink underline-offset-2 hover:underline">
            Request a new one.
          </a>
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div style={{ padding: "20px 0" }}>
        <p className="text-ink" style={{ fontSize: 15 }}>
          Password updated. Taking you to log in&hellip;
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-[14px]" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <label
          htmlFor="new-password"
          style={{ fontSize: 11, textTransform: "lowercase", letterSpacing: "0.04em", color: "var(--mute)" }}
        >
          new password
        </label>
        <input
          id="new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          style={{
            height: 48,
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "0 14px",
            fontSize: 15,
            fontFamily: "var(--font-sans), Inter, sans-serif",
            background: "#fff",
            color: "var(--ink)",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      <div className="flex flex-col" style={{ gap: 6 }}>
        <label
          htmlFor="confirm-password"
          style={{ fontSize: 11, textTransform: "lowercase", letterSpacing: "0.04em", color: "var(--mute)" }}
        >
          confirm password
        </label>
        <input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          style={{
            height: 48,
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "0 14px",
            fontSize: 15,
            fontFamily: "var(--font-sans), Inter, sans-serif",
            background: "#fff",
            color: "var(--ink)",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      {state.status === "error" ? (
        <div className="rounded-md border border-error/25 bg-error/8 px-4 py-3 text-sm text-error">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className="btn-primary w-full"
      >
        {state.status === "submitting" ? "updating..." : "set new password"}
      </button>
    </form>
  );
}
