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

export function AuthForm({ mode }: AuthFormProps) {
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
    const result =
      mode === "signup"
        ? await signup({
            username: values.username.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password
          })
        : await login({
            email: values.email.trim().toLowerCase(),
            password: values.password
          });

    if (result.ok) {
      setErrors({});
      setSubmitState({ status: "idle" });
      router.replace(mode === "signup" ? "/onboarding" : "/");
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
      <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
        {mode === "signup" ? (
          <Field
            label="username"
            name="username"
            placeholder="@closetmaincharacter"
            value={values.username}
            error={errors.username}
            onChange={(value) => setValue("username", value)}
          />
        ) : null}

        <Field
          label="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors.email}
          onChange={(value) => setValue("email", value)}
        />

        <Field
          label="password"
          name="password"
          type="password"
          placeholder="at least 8 characters"
          value={values.password}
          error={errors.password}
          onChange={(value) => setValue("password", value)}
        />

        {mode === "signup" ? (
          <Field
            label="confirm password"
            name="confirmPassword"
            type="password"
            placeholder="repeat your password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(value) => setValue("confirmPassword", value)}
          />
        ) : null}

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
    <div>
      <label className="field-label" htmlFor={name}>{label}</label>
      <div className={`field-shell ${error ? "border-error/60 bg-error/5" : ""}`}>
        <input
          id={name}
          className="field-input"
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
        />
      </div>
      {error ? (
        <span id={`${name}-error`} className="mt-1.5 block text-xs text-error">
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
