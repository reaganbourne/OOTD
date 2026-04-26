import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthMode } from "@/lib/auth";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const shellCopy = {
  login: {
    eyebrow: "Welcome back.",
    title: "Soft pink, simple, and ready to wear.",
    description:
      "Log in through a screen that feels polished and easy instead of busy or technical.",
    alternateLabel: "Need an account?",
    alternateHref: "/signup",
    alternateCta: "Create account"
  },
  signup: {
    eyebrow: "Start saving your outfits.",
    title: "Build the archive your camera roll never became.",
    description:
      "Create your account and keep the first step light, direct, and easy to understand.",
    alternateLabel: "Already have an account?",
    alternateHref: "/login",
    alternateCta: "Log in"
  }
} as const;

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = shellCopy[mode];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(242,196,206,0.72),_transparent_62%)]" />
      <div className="absolute right-[-4rem] top-20 h-40 w-40 rounded-full bg-rose/20 blur-3xl" />
      <div className="absolute left-[-3rem] bottom-16 h-36 w-36 rounded-full bg-blush/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center">
        <p className="bg-gradient-to-r from-[#f0a6bb] via-[#ef6c96] to-[#f7a8bc] bg-clip-text pb-8 text-center font-display text-7xl tracking-[-0.08em] text-transparent sm:text-8xl">
          OOTD
        </p>

        <div className="w-full">
          <div className="mb-5 text-center">
            <p className="text-sm text-plum/65">{copy.eyebrow}</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-plum/58">
              {copy.description}
            </p>
          </div>

          {children}

          <p className="mt-5 text-center text-sm text-plum/72">
            {copy.alternateLabel}{" "}
            <Link
              href={copy.alternateHref}
              className="font-medium text-[#ef5f8a] transition hover:text-[#de4e7a]"
            >
              {copy.alternateCta}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
