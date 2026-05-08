"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type OutfitResponse, type PublicProfile } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { OutfitCard, OutfitCardSkeleton, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "idle" | "loading" | "ready" | "error";

function toCardData(outfit: OutfitResponse): OutfitCardData {
  return {
    id: outfit.id,
    imageUrl: outfit.image_url,
    caption: outfit.caption,
    eventName: outfit.event_name,
    wornOn: outfit.worn_on,
    createdAt: outfit.created_at,
    vibeTone: outfit.vibe_check_tone,
  };
}

function getInitial(displayName?: string | null, username?: string | null) {
  const source = displayName?.trim() || username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [status, setStatus] = useState<PageStatus>("idle");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load profile + outfits
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.username) return;

    let active = true;

    async function load() {
      setStatus("loading");
      setErrorMessage(null);

      const [profileResult, outfitsResult] = await Promise.all([
        apiClient.users.getProfile(user!.username),
        apiClient.outfits.getVault({ limit: 12 }),
      ]);

      if (!active) return;

      if (!profileResult.ok) {
        setStatus("error");
        setErrorMessage(profileResult.message);
        return;
      }

      if (!outfitsResult.ok) {
        setStatus("error");
        setErrorMessage(outfitsResult.message);
        return;
      }

      setProfile(profileResult.data);
      setOutfits(outfitsResult.data.outfits);
      setNextCursor(outfitsResult.data.next_cursor ?? null);
      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, user]);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const result = await apiClient.outfits.getVault({ cursor: nextCursor, limit: 12 });

    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setNextCursor(result.data.next_cursor ?? null);
    }
    setIsLoadingMore(false);
  }

  // Loading gate
  if (authLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading your profile</h1>
          </section>
        </div>
      </main>
    );
  }

  const displayName = profile?.display_name ?? user?.display_name ?? user?.username ?? "Your profile";
  const username = user?.username ?? "";
  const bio = profile?.bio ?? user?.bio ?? null;
  const avatarSrc = profile?.profile_image_url ?? user?.profile_image_url ?? null;
  const followerCount = profile?.follower_count ?? 0;
  const followingCount = profile?.following_count ?? 0;

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* ── Top bar — @username + ⋯ per design ─────────────────────────── */}
        <header className="flex items-center justify-between border-b border-line bg-paper px-5 py-3.5">
          <p className="font-display text-[22px] leading-none text-ink" style={{ letterSpacing: "-0.005em" }}>
            @{username}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-mute transition hover:text-ink"
            aria-label="More options / sign out"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <circle cx="5" cy="12" r="1.3" />
              <circle cx="12" cy="12" r="1.3" />
              <circle cx="19" cy="12" r="1.3" />
            </svg>
          </button>
        </header>

        {/* ── Profile head — centered, matches design exactly ─────────────── */}
        <section
          className="border-b border-line text-center"
          style={{ padding: "24px 20px 18px" }}
        >
          {/* 88px pink circle avatar, paper initial in 54px serif italic */}
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile photo"
              className="mx-auto rounded-full object-cover"
              style={{ width: 88, height: 88, marginBottom: 12, border: "2px solid var(--line)" }}
            />
          ) : (
            <div
              className="mx-auto flex items-center justify-center rounded-full font-display"
              style={{
                width: 88,
                height: 88,
                background: "var(--pink)",
                color: "var(--paper)",
                fontSize: 54,
                lineHeight: 1,
                marginBottom: 12,
              }}
            >
              {getInitial(displayName, username)}
            </div>
          )}

          {/* Name — 28px serif italic */}
          <h1
            className="font-display text-ink"
            style={{ fontSize: 28, lineHeight: 1, margin: 0 }}
          >
            {displayName}
          </h1>

          {/* Handle */}
          <p className="text-mute" style={{ fontSize: 13, marginTop: 4 }}>
            @{username}
          </p>

          {/* Bio */}
          {bio ? (
            <p className="mx-auto text-ink-soft" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.4, maxWidth: 280 }}>
              {bio}
            </p>
          ) : (
            <Link
              href="/profile/edit"
              className="text-pink-deep hover:underline"
              style={{ fontSize: 13, marginTop: 10, display: "inline-block" }}
            >
              add a bio →
            </Link>
          )}

          {/* Stats — fits / followers / following */}
          <div className="mx-auto flex justify-center" style={{ gap: 24, marginTop: 14 }}>
            <div className="text-center">
              <div className="font-medium text-ink" style={{ fontSize: 18 }}>
                {outfits.length + (nextCursor ? 1 : 0)}
              </div>
              <div className="text-mute" style={{ fontSize: 10 }}>fits</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-ink" style={{ fontSize: 18 }}>
                {followerCount}
              </div>
              <div className="text-mute" style={{ fontSize: 10 }}>followers</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-ink" style={{ fontSize: 18 }}>
                {followingCount}
              </div>
              <div className="text-mute" style={{ fontSize: 10 }}>following</div>
            </div>
          </div>

          {/* Action buttons — edit profile + share + wrapped ✦ */}
          <div className="mt-4 flex w-full gap-2">
            <Link
              href="/profile/edit"
              className="flex flex-1 items-center justify-center rounded-full bg-ink text-paper transition hover:opacity-90"
              style={{ height: 36, fontSize: 12 }}
            >
              edit profile
            </Link>
            <button
              type="button"
              className="flex flex-1 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
              style={{ height: 36, fontSize: 12 }}
            >
              share
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
              style={{ height: 36, fontSize: 12 }}
            >
              wrapped ✦
            </button>
          </div>
        </section>

        {/* ── Profile tabs ─────────────────────────────────────────────── */}
        <div className="flex border-b border-line">
          {["fits", "tagged", "saved", "about"].map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`flex-1 py-[11px] text-center text-[12px] font-medium transition ${i === 0 ? "border-b-[1.5px] border-ink text-ink" : "text-mute hover:text-ink"}`}
              style={{ marginBottom: i === 0 ? -1 : 0 }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {errorMessage ? (
          <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-pink-soft px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}

        {/* ── Outfit grid — 3-col, 2px gap, matches design vault-grid ─────── */}
        <section>
          {status === "loading" ? (
            <div className="grid grid-cols-3 gap-0.5 pt-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <OutfitCardSkeleton key={i} showAuthor={false} />
              ))}
            </div>
          ) : null}

          {status === "ready" && outfits.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-display text-2xl text-ink">start your archive</p>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                upload your first outfit and it will live here.
              </p>
              <Link href="/upload" className="mt-6 inline-block btn-primary">
                upload your first look
              </Link>
            </div>
          ) : null}

          {status === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-0.5 pt-0.5">
                {outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    showAuthor={false}
                    showCaption={false}
                    showAccentMarker
                  />
                ))}
              </div>

              {nextCursor ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-ink-soft transition hover:border-pink-deep disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore ? "loading..." : "load more"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <MobileNav active="me" />
    </main>
  );
}
