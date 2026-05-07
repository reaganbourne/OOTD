import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthMode } from "@/lib/auth";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const shellCopy = {
  login: {
    heading: "log in",
    eyebrow: "welcome back.",
    alternateLabel: "need an account?",
    alternateHref: "/signup",
    alternateCta: "sign up"
  },
  signup: {
    heading: "create account",
    eyebrow: "start saving your fits.",
    alternateLabel: "already have an account?",
    alternateHref: "/login",
    alternateCta: "log in"
  }
} as const;

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = shellCopy[mode];

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-sm flex-col items-center justify-center">
        {/* Wordmark */}
        <p className="pb-8 text-center font-display text-7xl text-pink-deep sm:text-8xl">
          OOTD
        </p>

        <div className="w-full">
          <h1 className="mb-1 text-center font-display text-3xl tracking-[-0.02em] text-ink">
            {copy.heading}
          </h1>
          <p className="mb-6 text-center text-sm text-mute">{copy.eyebrow}</p>

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
