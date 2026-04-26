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
      router.replace("/");
      return;
    }

    setErrors(result.errors ?? {});
    setSubmitState({
      status: "error",
      message: result.message
    });
  }

  return (
    <div className="soft-panel rounded-[2.1rem] px-6 py-7 sm:px-7 sm:py-8">
      <h2 className="text-center font-sans text-[2.15rem] font-semibold tracking-[-0.04em] text-ink">
        {formCopy.title}
      </h2>
      <p className="mt-2 text-center text-sm text-plum/55">{formCopy.intro}</p>

      <form className="mt-8 grid gap-4" onSubmit={handleSubmit} noValidate>
        {mode === "signup" ? (
          <Field
            label="Username"
            name="username"
            placeholder="@closetmaincharacter"
            value={values.username}
            error={errors.username}
            onChange={(value) => setValue("username", value)}
          />
        ) : null}

        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors.email}
          onChange={(value) => setValue("email", value)}
        />

        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={values.password}
          error={errors.password}
          onChange={(value) => setValue("password", value)}
        />

        {mode === "signup" ? (
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="Repeat your password"
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
          className="mt-2 rounded-[1rem] bg-gradient-to-r from-[#ef6c96] to-[#f06e8f] px-5 py-4 text-sm font-semibold text-white transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState.status === "submitting" || isLoading
            ? "Working..."
            : formCopy.submitLabel}
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
    <label className={`field-shell ${error ? "border-rose/80 bg-rose/10" : ""}`}>
      <span className="field-label">{label}</span>
      <input
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
      {error ? (
        <span id={`${name}-error`} className="mt-2 block text-xs text-[#9c425d]">
          {error}
        </span>
      ) : null}
    </label>
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose/25 bg-rose/10 text-[#7f2947]";

  return (
    <div className={`rounded-[1rem] border px-4 py-3 text-sm ${toneClasses}`}>
      {message}
    </div>
  );
}
