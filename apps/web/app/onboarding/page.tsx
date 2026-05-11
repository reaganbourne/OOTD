"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, type UserSearchResult } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "checkd_onboarded";
type FollowMap = Record<string, { following: boolean }>;

function getInitial(displayName?: string | null, username?: string | null) {
  const src = displayName?.trim() || username?.trim() || "?";
  return src.charAt(0).toUpperCase();
}

// ── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-5 bg-pink-deep"
              : i < current
              ? "w-1.5 bg-pink-deep/40"
              : "w-1.5 bg-line"
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-display text-[4.5rem] leading-none text-pink-deep">
        checkd
      </p>
      <h1 className="mt-8 text-3xl leading-tight text-ink sm:text-4xl">
        your fit diary<br />starts here.
      </h1>
      <p className="mt-4 max-w-xs text-sm leading-6 text-ink-soft/70">
        Log every look, revisit your style history, and see how your taste evolves — one outfit at a time.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-10 btn-primary"
      >
        Let&rsquo;s build your vault →
      </button>
    </div>
  );
}

// ── Step 2: Follow suggestions ────────────────────────────────────────────────

function UserSuggestionRow({
  user,
  following,
  onFollow,
  onUnfollow,
}: {
  user: UserSearchResult;
  following: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {user.profile_image_url ? (
        <img
          src={user.profile_image_url}
          alt={user.display_name ?? user.username ?? ""}
          className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-soft text-sm font-semibold text-ink-soft">
          {getInitial(user.display_name, user.username)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {user.display_name ?? user.username ?? "Unknown"}
        </p>
        {user.username ? (
          <p className="text-[0.68rem] text-mute">@{user.username}</p>
        ) : null}
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
          {user.follower_count.toLocaleString()} {user.follower_count === 1 ? "follower" : "followers"}
        </p>
      </div>

      <button
        type="button"
        onClick={following ? onUnfollow : onFollow}
        className={`shrink-0 rounded-full px-4 py-1.5 text-[0.75rem] font-medium lowercase transition ${
          following
            ? "border border-line bg-white text-ink-soft hover:border-pink-deep"
            : "bg-ink text-paper hover:opacity-90"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

function StepFollow({
  onNext,
  follows,
  onFollow,
  onUnfollow,
}: {
  onNext: () => void;
  follows: FollowMap;
  onFollow: (id: string) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
}) {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.users.getSuggested(8).then((result) => {
      if (result.ok) setUsers(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="w-full">
      <h2 className="text-2xl text-ink">find people to follow</h2>
      <p className="mt-1.5 text-sm text-mute">
        See what the community is wearing. You can always find more later.
      </p>

      <div className="mt-5 divide-y divide-line/40">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-pink-soft" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-pink-soft" />
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-pink-soft" />
                </div>
                <div className="h-7 w-20 animate-pulse rounded-full bg-pink-soft" />
              </div>
            ))
          : users.map((user) => (
              <UserSuggestionRow
                key={user.id}
                user={user}
                following={follows[user.username ?? user.id]?.following ?? false}
                onFollow={() => void onFollow(user.username ?? user.id)}
                onUnfollow={() => void onUnfollow(user.username ?? user.id)}
              />
            ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="btn-primary mt-8 w-full"
      >
        Continue
      </button>
    </div>
  );
}

// ── Step 3: First outfit prompt ───────────────────────────────────────────────

function StepUpload({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Decorative outfit frame */}
      <div className="flex h-36 w-28 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-pink-deep/25 bg-pink-soft">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h2 className="mt-7 text-2xl leading-tight text-ink sm:text-3xl">
        Upload your first fit
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-ink-soft/70">
        Drop your outfit photo and get an instant vibe check — our AI will tag your style and kick off your archive.
      </p>

      <Link
        href="/upload"
        onClick={onDone}
        className="mt-8 btn-primary block w-full"
      >
        Upload my first look →
      </Link>
      <button
        type="button"
        onClick={onDone}
        className="mt-3 text-sm text-mute transition hover:text-ink"
      >
        Maybe later
      </button>
    </div>
  );
}

// ── Page (inner — uses useSearchParams, must be inside Suspense) ──────────────

const STEPS = 3;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [follows, setFollows] = useState<FollowMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true") {
      router.replace("/feed");
      return;
    }
    setReady(true);
  }, [isAuthenticated, isLoading, router]);

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    // If the user arrived here from a board invite (or any other ?next= flow),
    // send them there instead of the generic feed.
    const next = searchParams.get("next");
    router.replace(next ?? "/feed");
  }

  function skip() {
    finish();
  }

  async function handleFollow(username: string) {
    setFollows((prev) => ({ ...prev, [username]: { following: true } }));
    const result = await apiClient.users.follow(username);
    if (!result.ok) {
      setFollows((prev) => ({ ...prev, [username]: { following: false } }));
    }
  }

  async function handleUnfollow(username: string) {
    setFollows((prev) => ({ ...prev, [username]: { following: false } }));
    const result = await apiClient.users.unfollow(username);
    if (!result.ok) {
      setFollows((prev) => ({ ...prev, [username]: { following: true } }));
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <p className="font-display text-5xl text-pink-deep">checkd</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper px-5 pb-10 pt-6 sm:px-8">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <StepDots total={STEPS} current={step} />
        <button
          type="button"
          onClick={skip}
          className="text-[0.8rem] text-mute/60 transition hover:text-ink"
        >
          Skip
        </button>
      </div>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        {step === 0 && (
          <StepWelcome onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <StepFollow
            onNext={() => setStep(2)}
            follows={follows}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        )}
        {step === 2 && (
          <StepUpload onDone={finish} />
        )}
      </div>
    </main>
  );
}

// ── Page (exported — wraps inner in Suspense for Next.js static prerender) ────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-paper px-4">
          <p className="font-display text-5xl text-pink-deep">checkd</p>
        </main>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
