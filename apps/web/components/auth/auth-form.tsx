"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthErrors, AuthMode, AuthValues } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import {
  createInitialAuthValues,
  validateAuthForm
} from "@/lib/auth";

type AuthFormProps = {
  mode: AuthMode;
  next?: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const copy = {
  login: {
    title: "Log in",
    intro: "Welcome back.",
    submitLabel: "Continue"
  },
  signup: {
    title: "Create account",
    intro: "Start saving your outfits.",
    submitLabel: "Continue"
  }
} as const;

export function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const { isLoading, login, signup } = useAuth();
  const [values, setValues] = useState<AuthValues>(() => createInitialAuthValues());
  const [errors, setErrors] = useState<AuthErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const formCopy = copy[mode];

  function setValue(field: keyof AuthValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined
    }));
    if (submitState.status !== "idle") {
      setSubmitState({ status: "idle" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateAuthForm(mode, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitState({
        status: "error",
        message: "Please fix the highlighted fields before continuing."
      });
      return;
    }

    setSubmitState({ status: "submitting" });

    let result: Awaited<ReturnType<typeof login>> | null = null;
    try {
      result =
        mode === "signup"
          ? await signup({
              username: values.username.trim(),
              email: values.email.trim().toLowerCase(),
              password: values.password
            })
          : await login({
              identifier: values.identifier.trim().toLowerCase(),
              password: values.password
            });
    } catch (err) {
      console.error("[auth-form] unexpected error during submit:", err);
      setSubmitState({ status: "error", message: "Something went wrong. Please try again." });
      return;
    }

    if (result.ok) {
      setErrors({});
      setSubmitState({ status: "idle" });
      router.replace(
        mode === "signup"
          ? (next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding")
          : (next ?? "/feed")
      );
      return;
    }

    setErrors(result.errors ?? {});
    setSubmitState({
      status: "error",
      message: result.message
    });
  }

  return (
    <div>
      <form className="grid gap-[14px]" onSubmit={handleSubmit} noValidate>
        {/* Signup: email → username → password (→ confirm) per design */}
        {mode === "signup" ? (
          <>
            <Field
              label="username"
              name="username"
              placeholder="@closetmaincharacter"
              value={values.username}
              error={errors.username}
              onChange={(value) => setValue("username", value)}
            />
            <Field
              label="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              value={values.email}
              error={errors.email}
              onChange={(value) => setValue("email", value)}
            />
            <Field
              label="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={values.password}
              error={errors.password}
              onChange={(value) => setValue("password", value)}
            />
            <Field
              label="confirm password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              onChange={(value) => setValue("confirmPassword", value)}
            />
          </>
        ) : (
          <>
            {/* Login: email or username → password */}
            <Field
              label="email or username"
              name="identifier"
              type="text"
              placeholder="ava@email.com or @handle"
              value={values.identifier ?? ""}
              error={errors.email}
              onChange={(value) => setValue("identifier", value)}
            />
            <Field
              label="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={values.password}
              error={errors.password}
              onChange={(value) => setValue("password", value)}
            />
            <div style={{ textAlign: "right" }}>
              <a href="/forgot-password" style={{ fontSize: 12, color: "var(--ink-soft)", textDecoration: "underline" }}>
                forgot password?
              </a>
            </div>
          </>
        )}

        {submitState.status === "error" ? (
          <StatusBanner tone="error" message={submitState.message} />
        ) : null}

        {submitState.status === "success" ? (
          <StatusBanner tone="success" message={submitState.message} />
        ) : null}

        <button
          type="submit"
          disabled={submitState.status === "submitting" || isLoading}
          className="btn-primary w-full"
        >
          {submitState.status === "submitting" || isLoading
            ? "working..."
            : mode === "login" ? "log in" : "create account"}
        </button>
      </form>
    </div>
  );
}


type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
};

function Field({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  type = "text"
}: FieldProps) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label
        htmlFor={name}
        style={{ fontSize: 11, textTransform: "lowercase", letterSpacing: "0.04em", color: "var(--mute)" }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={
          name === "email"
            ? "email"
            : name === "password"
              ? "current-password"
              : name === "confirmPassword"
                ? "new-password"
                : name === "username"
                  ? "username"
                  : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        style={{
          height: 48,
          border: `1px solid ${error ? "rgba(196,69,47,0.6)" : "var(--line)"}`,
          borderRadius: 12,
          padding: "0 14px",
          fontSize: 15,
          fontFamily: "var(--font-sans), Inter, sans-serif",
          background: error ? "rgba(196,69,47,0.05)" : "#fff",
          color: "var(--ink)",
          outline: "none",
          width: "100%",
        }}
      />
      {error ? (
        <span id={`${name}-error`} className="text-xs text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function StatusBanner({
  tone,
  message
}: {
  tone: "success" | "error";
  message: string;
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success/8 text-success"
      : "border-error/25 bg-error/8 text-error";

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClasses}`}>
      {message}
    </div>
  );
}
