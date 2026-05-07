"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type UserSearchResult } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "ootd_onboarded";
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
              ? "w-5 bg-[#f46a93]"
              : i < current
              ? "w-1.5 bg-[#f46a93]/40"
              : "w-1.5 bg-plum/14"
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
      <p className="font-display text-[4.5rem] leading-none tracking-[-0.08em] text-[#f09ab4]">
        OOTD
      </p>
      <h1 className="mt-8 text-3xl leading-tight text-ink sm:text-4xl">
        Your outfit archive<br />starts here.
      </h1>
      <p className="mt-4 max-w-xs text-sm leading-6 text-plum/64">
        Log every look, revisit your style history, and see how your taste evolves — one outfit at a time.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-10 rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-8 py-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(244,106,147,0.3)] transition hover:brightness-[0.97]"
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
          className="h-11 w-11 shrink-0 rounded-full border border-plum/10 object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fce4ec] to-[#f8bbd0] text-sm font-semibold text-[#c0476e]">
          {getInitial(user.display_name, user.username)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {user.display_name ?? user.username ?? "Unknown"}
        </p>
        {user.username ? (
          <p className="text-[0.68rem] text-plum/50">@{user.username}</p>
        ) : null}
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-plum/38">
          {user.follower_count.toLocaleString()} {user.follower_count === 1 ? "follower" : "followers"}
        </p>
      </div>

      <button
        type="button"
        onClick={following ? onUnfollow : onFollow}
        className={`shrink-0 rounded-full px-4 py-1.5 text-[0.75rem] font-semibold transition ${
          following
            ? "border border-rose/15 bg-white text-plum hover:border-rose/28"
            : "bg-gradient-to-r from-[#ef6c96] to-[#f493b0] text-white hover:brightness-[0.97]"
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
      <h2 className="text-2xl text-ink">Find people to follow</h2>
      <p className="mt-1.5 text-sm text-plum/60">
        See what the community is wearing. You can always find more later.
      </p>

      <div className="mt-5 divide-y divide-rose/6">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#ffe8ef]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-[#ffe8ef]" />
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#fff3f7]" />
                </div>
                <div className="h-7 w-20 animate-pulse rounded-full bg-[#ffe8ef]" />
              </div>
            ))
          : users.map((user) => (
              <UserSuggestionRow
                key={user.id}
                user={user}
                following={follows[user.id]?.following ?? false}
                onFollow={() => void onFollow(user.id)}
                onUnfollow={() => void onUnfollow(user.id)}
              />
            ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] py-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(244,106,147,0.25)] transition hover:brightness-[0.97]"
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
      <div className="flex h-36 w-28 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-rose/25 bg-gradient-to-b from-[#fff0f4] to-[#fff7fa]">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#f09ab4]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h2 className="mt-7 text-2xl leading-tight text-ink sm:text-3xl">
        Upload your first fit
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-plum/64">
        Drop your outfit photo and get an instant vibe check — our AI will tag your style and kick off your archive.
      </p>

      <Link
        href="/upload"
        onClick={onDone}
        className="mt-8 block w-full rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] py-4 text-center text-sm font-semibold text-white shadow-[0_8px_24px_rgba(244,106,147,0.3)] transition hover:brightness-[0.97]"
      >
        Upload my first look →
      </Link>
      <button
        type="button"
        onClick={onDone}
        className="mt-3 text-sm text-plum/50 transition hover:text-plum"
      >
        Maybe later
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
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
    router.replace("/feed");
  }

  function skip() {
    finish();
  }

  async function handleFollow(userId: string) {
    setFollows((prev) => ({ ...prev, [userId]: { following: true } }));
    const result = await apiClient.users.follow(userId);
    if (!result.ok) {
      setFollows((prev) => ({ ...prev, [userId]: { following: false } }));
    }
  }

  async function handleUnfollow(userId: string) {
    setFollows((prev) => ({ ...prev, [userId]: { following: false } }));
    const result = await apiClient.users.unfollow(userId);
    if (!result.ok) {
      setFollows((prev) => ({ ...prev, [userId]: { following: true } }));
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffafc] px-4">
        <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fffafc] px-5 pb-10 pt-6 sm:px-8">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <StepDots total={STEPS} current={step} />
        <button
          type="button"
          onClick={skip}
          className="text-[0.8rem] text-plum/46 transition hover:text-plum"
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
