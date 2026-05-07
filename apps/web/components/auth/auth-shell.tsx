import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthMode } from "@/lib/auth";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const shellCopy = {
  login: {
    heading: "welcome back",
    eyebrow: "let's see what you wore today.",
    alternateLabel: "need an account?",
    alternateHref: "/signup",
    alternateCta: "sign up"
  },
  signup: {
    heading: "make your account",
    eyebrow: "start your fit diary in seconds.",
    alternateLabel: "already have an account?",
    alternateHref: "/login",
    alternateCta: "log in"
  }
} as const;

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = shellCopy[mode];

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm flex-col justify-center">

        {/* Back arrow */}
        <div className="mb-8">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-mute transition hover:border-pink-deep hover:text-ink"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
        </div>

        <div className="w-full">
          {/* Heading — serif italic, large, per checkd spec */}
          <h1
            className="font-display text-ink"
            style={{ fontSize: mode === "login" ? "44px" : "40px", lineHeight: 1.1 }}
          >
            {copy.heading}
          </h1>
          <p className="mb-7 mt-2 text-sm text-mute">{copy.eyebrow}</p>

          {children}

          <p className="mt-5 text-center text-sm text-mute">
            {copy.alternateLabel}{" "}
            <Link
              href={copy.alternateHref}
              className="font-medium text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
            >
              {copy.alternateCta}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
