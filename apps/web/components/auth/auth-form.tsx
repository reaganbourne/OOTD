"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthErrors, AuthMode, AuthValues } from "@/lib/auth";
import {
  createInitialAuthValues,
  getMockQaNotes,
  mockSubmitAuth,
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
    intro: "Use the mocked flow for now. Wiring to the real API comes next once the auth contract is frozen.",
    submitLabel: "Enter the vault"
  },
  signup: {
    title: "Create account",
    intro: "This captures the first-pass onboarding fields we expect the backend auth contract to support.",
    submitLabel: "Create my account"
  }
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const [values, setValues] = useState<AuthValues>(() => createInitialAuthValues());
  const [errors, setErrors] = useState<AuthErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const formCopy = copy[mode];
  const qaNotes = getMockQaNotes(mode);

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
    const result = await mockSubmitAuth(mode, values);

    if (result.ok) {
      setErrors({});
      setSubmitState({
        status: "success",
        message: result.message
      });
      return;
    }

    setErrors(result.errors ?? {});
    setSubmitState({
      status: "error",
      message: result.message
    });
  }

  return (
    <div className="soft-panel p-6 sm:p-8">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
        Auth prototype
      </p>
      <h2 className="mt-3 text-4xl text-ink">{formCopy.title}</h2>
      <p className="mt-3 text-sm leading-6 text-plum/80">{formCopy.intro}</p>

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
          disabled={submitState.status === "submitting"}
          className="mt-2 rounded-[1.5rem] bg-plum px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#5c3049] disabled:cursor-not-allowed disabled:bg-plum/55"
        >
          {submitState.status === "submitting" ? "Working..." : formCopy.submitLabel}
        </button>
      </form>

      <div className="mt-6 rounded-[1.5rem] border border-plum/15 bg-mist/70 p-4">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-plum/70">
          Mock QA shortcuts
        </p>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-plum/85">
          {qaNotes.map((note) => (
            <li key={note} className="flex items-start gap-3">
              <span className="mt-2 inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
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
    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${toneClasses}`}>
      {message}
    </div>
  );
}
