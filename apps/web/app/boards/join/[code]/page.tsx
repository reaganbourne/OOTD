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
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
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

  // Load board preview (no auth needed)
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
      // Send to login, then return here
      router.push(`/login?redirect=/boards/join/${code}`);
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
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">Loading invite…</h1>
        </div>
      </main>
    );
  }

  // ── Not found ──
  if (status === "not-found" || status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">Invite not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            This invite link is invalid or the board no longer exists.
          </p>
          <Link
            href="/feed"
            className="mt-6 inline-block rounded-[1.2rem] border border-rose/15 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/25"
          >
            Go to feed
          </Link>
        </div>
      </main>
    );
  }

  const eventLabel = formatDate(board?.event_date);
  const expiryLabel = board ? formatExpiry(board.expires_at) : "";
  const expired = expiryLabel === "Expired";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <p className="mb-8 text-center font-display text-5xl text-pink-deep">checkd</p>

        {/* Board preview card */}
        <div className="soft-panel overflow-hidden">
          {/* Coloured header */}
          <div className="bg-pink-soft px-6 pt-6 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose/15 bg-white/80 text-pink-deep">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
                <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
                <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
                <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
              </svg>
            </div>
          </div>

          {/* Board details */}
          <div className="px-6 py-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mute">
              You&apos;re invited to join
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight tracking-[-0.03em] text-ink">
              {board?.name}
            </h1>
            {eventLabel ? (
              <p className="mt-1 text-sm text-mute">{eventLabel}</p>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${expired ? "bg-rose/8 text-mute" : "bg-pink-soft text-pink-deep"}`}>
                {expiryLabel}
              </span>
              <span className="text-[0.72rem] text-mute">
                {board?.member_count ?? 0} {(board?.member_count ?? 0) === 1 ? "member" : "members"}
              </span>
            </div>

            {joinError ? (
              <p className="mt-4 rounded-[1rem] border border-rose/25 bg-pink-soft px-4 py-3 text-sm text-error">{joinError}</p>
            ) : null}

            {/* CTA */}
            <div className="mt-6 space-y-3">
              {expired ? (
                <p className="rounded-[1.2rem] border border-rose/12 bg-pink-soft px-5 py-3.5 text-center text-sm font-semibold text-error">
                  This board has expired
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={joining}
                  className="btn-primary w-full"
                >
                  {joining ? "Joining…" : isAuthenticated ? "Join board" : "Sign in to join"}
                </button>
              )}

              <Link
                href="/feed"
                className="block rounded-[1.2rem] border border-rose/12 bg-white py-3.5 text-center text-sm font-semibold text-plum transition hover:border-rose/22"
              >
                Maybe later
              </Link>
            </div>
          </div>
        </div>

        {!isAuthenticated ? (
          <p className="mt-5 text-center text-[0.72rem] text-mute">
            Don&apos;t have an account?{" "}
            <Link href={`/signup?redirect=/boards/join/${code}`} className="text-pink-deep hover:underline">
              Sign up free
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
