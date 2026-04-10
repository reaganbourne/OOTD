import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthMode } from "@/lib/auth";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const shellCopy = {
  login: {
    eyebrow: "Welcome back to the vault",
    title: "Log the look before the moment slips away.",
    description:
      "Re-enter the app through a screen that feels editorial, not utilitarian. The goal here is polish, confidence, and a clear sense that the product is built around style culture.",
    alternateLabel: "Need an account?",
    alternateHref: "/signup",
    alternateCta: "Create one",
    checklist: [
      "Mobile-first card layout",
      "Mocked validation and submit behavior",
      "Clear error, loading, and success states"
    ]
  },
  signup: {
    eyebrow: "Create your archive",
    title: "Build the closet memory you wish your camera roll had.",
    description:
      "Sign-up introduces the product promise right away: every look, every event, every vibe check, saved in one place and ready to share with your people.",
    alternateLabel: "Already have an account?",
    alternateHref: "/login",
    alternateCta: "Log in",
    checklist: [
      "Username capture for profile identity",
      "Password confirmation with validation",
      "Mocked success flow ready for API wiring"
    ]
  }
} as const;

const brandMoments = [
  {
    title: "Personal vault",
    body: "Save every look with enough structure to make the archive actually useful later."
  },
  {
    title: "Group coordination",
    body: "Give event planning a place that is better than a scrolling, chaotic group chat."
  },
  {
    title: "Story energy",
    body: "Everything should feel worthy of being screenshotted, shared, and remembered."
  }
];

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = shellCopy[mode];

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto min-h-[calc(100vh-3rem)] max-w-6xl">
        <div className="grid min-h-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="soft-panel relative overflow-hidden bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-plum/35 to-transparent" />
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-5xl leading-none text-ink sm:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-plum/85 sm:text-lg">
              {copy.description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {brandMoments.map((moment) => (
                <article
                  key={moment.title}
                  className="rounded-[1.5rem] border border-plum/15 bg-white/65 p-4 backdrop-blur"
                >
                  <h2 className="text-2xl text-ink">{moment.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-plum/80">
                    {moment.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-plum/15 bg-white/72 p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                This milestone covers
              </p>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-plum/85">
                {copy.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full">
              {children}
              <p className="mt-5 text-center text-sm text-plum/75">
                {copy.alternateLabel}{" "}
                <Link
                  href={copy.alternateHref}
                  className="font-semibold text-plum transition hover:text-ink"
                >
                  {copy.alternateCta}
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
