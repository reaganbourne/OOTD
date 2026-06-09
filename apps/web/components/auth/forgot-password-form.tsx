"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { authApiClient } from "@/lib/api-client";

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setState({ status: "error", message: "Please enter your email address." });
      return;
    }

    setState({ status: "submitting" });
    const result = await authApiClient.forgotPassword(trimmed);

    if (result.ok) {
      setState({ status: "success" });
    } else {
      // Still show success-like message to avoid email enumeration, but show
      // a generic error if the request itself failed (network, 500, etc.)
      setState({ status: "error", message: result.message });
    }
  }

  if (state.status === "success") {
    return (
      <div style={{ padding: "20px 0" }}>
        <p className="text-ink" style={{ fontSize: 15, lineHeight: 1.6 }}>
          If that email is registered, a reset link is on its way. Check your inbox — it
          expires in 1 hour.
        </p>
        <a
          href="/login"
          className="btn-primary mt-6 block w-full text-center"
        >
          back to log in
        </a>
      </div>
    );
  }

  return (
    <form className="grid gap-[14px]" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <label
          htmlFor="email"
          style={{ fontSize: 11, textTransform: "lowercase", letterSpacing: "0.04em", color: "var(--mute)" }}
        >
          email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          style={{
            height: 48,
            border: `1px solid ${state.status === "error" ? "rgba(196,69,47,0.6)" : "var(--line)"}`,
            borderRadius: 12,
            padding: "0 14px",
            fontSize: 15,
            fontFamily: "var(--font-sans), Inter, sans-serif",
            background: state.status === "error" ? "rgba(196,69,47,0.05)" : "#fff",
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
        {state.status === "submitting" ? "sending..." : "send reset link"}
      </button>
    </form>
  );
}
