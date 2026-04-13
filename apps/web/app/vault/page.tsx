"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const nextUp = [
  "Your saved outfits and filters",
  "Event-linked looks and memories",
  "Quick export paths into story cards"
] as const;

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              OOTD Vault
            </p>
            <h1 className="mt-4 text-4xl text-ink">Checking your session</h1>
            <p className="mt-4 text-sm leading-6 text-plum/82">
              We&apos;re getting your vault entrance ready.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? user?.email ?? "you";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <section className="soft-panel w-full overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                Your vault
              </p>
              <h1 className="mt-4 max-w-xl text-5xl leading-none text-ink sm:text-6xl">
                Welcome back, {displayName}.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-plum/85 sm:text-lg">
                This is the authenticated landing spot for now while the full feed and
                outfit archive screens are being built.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                  Next up
                </p>
                <h2 className="mt-4 text-4xl leading-tight text-ink">
                  Your private home base for every look you log.
                </h2>
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-plum/82">
                  {nextUp.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4">
                <Link
                  href="/"
                  className="rounded-[1.5rem] bg-plum px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                >
                  Back to landing
                </Link>
                <Link
                  href="/login"
                  className="rounded-[1.5rem] border border-plum/20 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-plum transition hover:bg-white"
                >
                  Switch account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
