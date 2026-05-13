"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type OutfitResponse, type PublicProfile } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { OutfitCard, OutfitCardSkeleton, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "ready" | "not-found" | "error";

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

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, initial }: { src?: string | null; initial: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt="Profile photo"
        className="h-24 w-24 rounded-full border-2 border-line object-cover"
      />
    );
  }
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-line bg-pink-soft text-2xl font-semibold text-ink-soft">
      {initial}
    </div>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display italic text-2xl leading-none tracking-[-0.04em] text-ink">
        {value.toLocaleString()}
      </span>
      <span className="text-[0.68rem] uppercase tracking-[0.18em] text-mute">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const { user: authUser, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = isAuthenticated && authUser?.username === username;

  // Redirect own profile to /profile
  useEffect(() => {
    if (isOwnProfile) {
      router.replace("/profile");
    }
  }, [isOwnProfile, router]);

  useEffect(() => {
    if (isOwnProfile) return;

    let active = true;

    async function load() {
      setStatus("loading");

      const [profileResult, outfitsResult, followStatusResult] = await Promise.all([
        apiClient.users.getProfile(username),
        apiClient.outfits.getByUser(username, { limit: 12 }),
        isAuthenticated
          ? apiClient.users.getFollowStatus(username)
          : Promise.resolve(null),
      ]);

      if (!active) return;

      if (!profileResult.ok) {
        setStatus(profileResult.message?.toLowerCase().includes("not found") ? "not-found" : "error");
        return;
      }

      setProfile(profileResult.data);
      setFollowerCount(profileResult.data.follower_count);

      // Initialize follow button state from server so it's correct on first render
      if (followStatusResult && followStatusResult.ok) {
        setFollowing(followStatusResult.data.following);
      }

      if (outfitsResult.ok) {
        setOutfits(outfitsResult.data.outfits);
        setNextCursor(outfitsResult.data.next_cursor ?? null);
      }

      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [username, isOwnProfile, isAuthenticated]);

  async function handleFollow() {
    if (!isAuthenticated || followLoading) return;
    setFollowLoading(true);

    if (following) {
      const result = await apiClient.users.unfollow(username);
      if (result.ok) {
        setFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      }
    } else {
      const result = await apiClient.users.follow(username);
      if (result.ok) {
        setFollowing(result.data.following);
        setFollowerCount(result.data.follower_count);
      }
    }

    setFollowLoading(false);
  }

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const result = await apiClient.outfits.getByUser(username, { cursor: nextCursor, limit: 12 });
    if (result.ok) {
      setOutfits((prev) => [...prev, ...result.data.outfits]);
      setNextCursor(result.data.next_cursor ?? null);
    }
    setIsLoadingMore(false);
  }

  if (isOwnProfile) return null; // redirecting

  // ── Not found ──
  if (status === "not-found") {
    return (
      <main className="px-4 pb-28 pt-6 sm:px-6">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">profile not found</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              @{username} doesn&apos;t exist or may have changed their username.
            </p>
            <Link
              href="/feed"
              className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25"
            >
              Back to feed
            </Link>
          </div>
        </div>
        <MobileNav active="feed" />
      </main>
    );
  }

  const displayName = profile?.display_name || profile?.username || username;
  const bio = profile?.bio;
  const avatarSrc = profile?.profile_image_url;

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-0 lg:pt-20">
      <div className="mx-auto max-w-3xl">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-mute transition hover:text-ink"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </button>
            <p className="mt-2 font-display italic text-[2.2rem] leading-none text-pink-deep">
            checkd
            </p>
          </div>
        </header>

        {/* ── Profile card ───────────────────────────────────────────────── */}
        {status === "loading" ? (
          <section className="soft-panel mb-6 animate-pulse px-6 py-7">
            <div className="flex items-start gap-5">
              <div className="h-24 w-24 rounded-full bg-pink-soft" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-5 w-36 rounded-full bg-pink-soft" />
                <div className="h-3.5 w-24 rounded-full bg-pink-soft" />
                <div className="h-3 w-full rounded-full bg-line/60" />
                <div className="h-3 w-4/5 rounded-full bg-line/60" />
              </div>
            </div>
          </section>
        ) : (
          <section className="soft-panel mb-6 px-6 py-7">
            <div className="flex items-start gap-5">
              <Avatar
                src={avatarSrc}
                initial={getInitial(profile?.display_name, username)}
              />

              <div className="min-w-0 flex-1">
                <h1 className="font-display italic text-3xl leading-tight tracking-[-0.03em] text-ink">
                  {displayName}
                </h1>
                <p className="mt-0.5 text-sm text-mute">@{username}</p>
                {bio ? (
                  <p className="mt-3 text-sm leading-6 text-ink-soft">{bio}</p>
                ) : null}
                {profile?.instagram_handle ? (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-pink-deep hover:underline"
                  >
                    @{profile.instagram_handle}
                  </a>
                ) : null}

                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => void handleFollow()}
                    disabled={followLoading}
                    className={`mt-4 rounded-full px-5 py-2 text-sm font-medium lowercase transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      following
                        ? "border border-line bg-white text-ink-soft hover:border-pink-deep"
                        : "bg-ink text-paper hover:opacity-90"
                    }`}
                  >
                    {followLoading ? "…" : following ? "following" : "follow"}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-medium lowercase text-paper transition hover:opacity-90"
                  >
                    follow
                  </Link>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 flex items-center justify-around border-t border-line/50 pt-5">
              <StatPill value={outfits.length} label="Outfits" />
              <div className="h-8 w-px bg-line/50" />
              <StatPill value={followerCount} label="Followers" />
              <div className="h-8 w-px bg-line/50" />
              <StatPill value={profile?.following_count ?? 0} label="Following" />
            </div>
          </section>
        )}

        {/* ── Outfit grid ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 font-display italic text-xl tracking-[-0.02em] text-ink">
            {status === "ready" ? `${displayName?.split(" ")[0]}'s looks` : "Looks"}
          </h2>

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <OutfitCardSkeleton key={i} showAuthor={false} />
              ))}
            </div>
          ) : null}

          {status === "ready" && outfits.length === 0 ? (
            <div className="soft-panel px-6 py-10 text-center">
              <h2 className="text-2xl text-ink">no looks yet</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                @{username} hasn&apos;t uploaded any outfits yet.
              </p>
            </div>
          ) : null}

          {status === "ready" && outfits.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={toCardData(outfit)}
                    showAuthor={false}
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
                    className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading more..." : "Load more looks"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <MobileNav active="feed" />
    </main>
  );
}
