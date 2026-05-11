"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type Board } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "preview" | "not-found" | "error";

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(d));
}

function formatExpiry(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days === 0) return "expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export default function JoinBoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [board, setBoard] = useState<Board | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await apiClient.boards.previewInvite(code);
      if (!active) return;
      if (result.ok) {
        setBoard(result.data);
        setStatus("preview");
      } else {
        setStatus(result.message?.toLowerCase().includes("not found") ? "not-found" : "error");
      }
    }
    void load();
    return () => { active = false; };
  }, [code]);

  async function handleJoin() {
    if (!isAuthenticated) {
      router.push(`/login?next=/boards/join/${code}`);
      return;
    }
    setJoining(true);
    setJoinError(null);
    const result = await apiClient.boards.join(code);
    if (result.ok) {
      router.replace(`/boards/${result.data.id}`);
    } else {
      setJoinError(result.message);
      setJoining(false);
    }
  }

  // ── Loading ──
  if (status === "loading" || authLoading) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5">
        <p className="font-display italic text-4xl text-pink-deep animate-pulse">checkd</p>
      </main>
    );
  }

  // ── Not found / error ──
  if (status === "not-found" || status === "error") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5">
        <div className="w-full max-w-[360px] text-center">
          <p className="font-display italic text-4xl text-pink-deep mb-8">checkd</p>
          <div className="soft-panel px-6 py-10">
            <p className="text-3xl mb-2">🔗</p>
            <h1 className="font-display text-2xl tracking-[-0.03em] text-ink mb-2">link not found</h1>
            <p className="text-sm leading-6 text-ink-soft mb-6">
              This invite link is invalid or has expired.
            </p>
            <Link href="/feed" className="btn-primary w-full">
              go to feed
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const eventLabel = formatDate(board?.event_date);
  const expiryLabel = board ? formatExpiry(board.expires_at) : "";
  const expired = expiryLabel === "expired";
  const memberCount = board?.member_count ?? 0;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-12"
      style={{ background: "var(--canvas)" }}>
      <div className="w-full max-w-[360px] flex flex-col gap-6">

        {/* Wordmark */}
        <p className="text-center font-display italic text-4xl text-pink-deep">checkd</p>

        {/* Invite card */}
        <div className="soft-panel overflow-hidden">
          {/* Pink header band */}
          <div
            className="px-6 pt-6 pb-5"
            style={{ background: "linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)" }}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-pink-deep/60 mb-3">
              you&apos;re invited to
            </p>
            <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.04em] text-ink">
              {board?.name}
            </h1>
            {eventLabel ? (
              <p className="mt-1.5 text-sm text-ink-soft">{eventLabel}</p>
            ) : null}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-line">
            <div className="flex items-center gap-1.5 text-[0.72rem] text-mute">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </div>
            <span className="text-line">·</span>
            <span className={`text-[0.72rem] font-medium ${expired ? "text-error" : "text-ink-soft"}`}>
              {expiryLabel}
            </span>
          </div>

          {/* CTA area */}
          <div className="px-6 py-5 space-y-3">
            {joinError ? (
              <p className="rounded-[1rem] border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {joinError}
              </p>
            ) : null}

            {expired ? (
              <p className="w-full rounded-[1.2rem] border border-line bg-line/20 py-3.5 text-center text-sm font-semibold text-mute">
                this invite has expired
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void handleJoin()}
                disabled={joining}
                className="btn-primary w-full"
              >
                {joining ? "joining…" : isAuthenticated ? "join board" : "sign in to join"}
              </button>
            )}

            <Link
              href="/feed"
              className="block rounded-[1.2rem] border border-line bg-white py-3.5 text-center text-sm font-medium text-mute transition hover:text-ink hover:border-line/80"
            >
              maybe later
            </Link>
          </div>
        </div>

        {/* Sign up nudge */}
        {!isAuthenticated ? (
          <p className="text-center text-[0.72rem] text-mute">
            No account yet?{" "}
            <Link
              href={`/signup?next=/boards/join/${code}`}
              className="font-semibold text-pink-deep hover:underline"
            >
              sign up free
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
