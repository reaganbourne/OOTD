"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type OutfitResponse, type PublicProfile } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { OutfitCard, OutfitCardSkeleton, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "idle" | "loading" | "ready" | "error";
type ProfileTab = "fits" | "checks" | "about";
type FollowSheet = "followers" | "following" | null;

// Monthly Checks launched May 2026. A month unlocks in its last week (day >= 25).
const CHECKS_LAUNCH_YEAR = 2026;
const CHECKS_LAUNCH_MONTH = 5; // May

function availableChecksMonths(): string[] {
  const now = new Date();
  const months: string[] = [];

  // Walk backwards from the most recent unlocked month
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1-indexed

  // Current month only unlocks on day 25+
  if (now.getDate() < 25) {
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }

  // Collect months back to launch
  while (y > CHECKS_LAUNCH_YEAR || (y === CHECKS_LAUNCH_YEAR && m >= CHECKS_LAUNCH_MONTH)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }

  return months;
}

function formatMonthShort(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

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
  const { user, isAuthenticated, isBootstrapping: authLoading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const [status, setStatus] = useState<PageStatus>("idle");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [outfits, setOutfits] = useState<OutfitResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isBootstrappingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("fits");
  const [shareCopied, setShareCopied] = useState(false);
  const [followSheet, setFollowSheet] = useState<FollowSheet>(null);
  const [followList, setFollowList] = useState<{ id: string; username: string; display_name: string | null; profile_image_url: string | null }[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

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
    if (!nextCursor || isBootstrappingMore) return;
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
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
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

  async function handleShare() {
    const url = `${window.location.origin}/profile/${username}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function openFollowSheet(type: "followers" | "following") {
    setFollowSheet(type);
    setFollowList([]);
    setFollowListLoading(true);
    try {
      const result = type === "followers"
        ? await apiClient.users.getFollowers(username)
        : await apiClient.users.getFollowing(username);
      if (result.ok) setFollowList(result.data);
    } finally {
      setFollowListLoading(false);
    }
  }

  return (
    <main className="px-4 pb-28 pt-14 sm:px-6 lg:px-8 lg:pb-0 lg:pt-20">
      <div className="mx-auto max-w-3xl">

        {/* ── Top bar — @username + ⋯ per design ─────────────────────────── */}
        <header className="flex items-center justify-between border-b border-line bg-paper px-5 py-3.5">
          <p className="font-display italic text-[22px] leading-none text-ink" style={{ letterSpacing: "-0.005em" }}>
            @{username}
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="text-mute transition hover:text-ink"
              aria-label="More options"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <circle cx="5" cy="12" r="1.3" />
                <circle cx="12" cy="12" r="1.3" />
                <circle cx="19" cy="12" r="1.3" />
              </svg>
            </button>
            {showMenu ? (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-2xl border border-rose/12 bg-white shadow-lift">
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); void logout(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-sm text-error transition hover:bg-pink-soft"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
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
            className="font-display italic text-ink"
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
                {nextCursor ? `${outfits.length}+` : outfits.length}
              </div>
              <div className="text-mute" style={{ fontSize: 10 }}>fits</div>
            </div>
            <button type="button" onClick={() => void openFollowSheet("followers")} className="text-center transition hover:opacity-70">
              <div className="font-medium text-ink" style={{ fontSize: 18 }}>{followerCount}</div>
              <div className="text-mute" style={{ fontSize: 10 }}>followers</div>
            </button>
            <button type="button" onClick={() => void openFollowSheet("following")} className="text-center transition hover:opacity-70">
              <div className="font-medium text-ink" style={{ fontSize: 18 }}>{followingCount}</div>
              <div className="text-mute" style={{ fontSize: 10 }}>following</div>
            </button>
          </div>

          {/* Action buttons — edit profile + share */}
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
              onClick={() => void handleShare()}
              className="flex flex-1 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
              style={{ height: 36, fontSize: 12 }}
            >
              {shareCopied ? "copied!" : "share"}
            </button>
          </div>
        </section>

        {/* ── Profile tabs ─────────────────────────────────────────────── */}
        <div className="flex border-b border-line">
          {(["fits", "checks", "about"] as ProfileTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-[11px] text-center text-[12px] font-medium transition ${isActive ? "border-b-[1.5px] border-ink text-ink" : "text-mute hover:text-ink"}`}
                style={{ marginBottom: isActive ? -1 : 0 }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {errorMessage ? (
          <div className="mb-5 rounded-[1.25rem] border border-pink-deep/30 bg-pink-soft px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}

        {/* ── Tab: fits ───────────────────────────────────────────────────── */}
        {activeTab === "fits" ? (
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
                <p className="font-display italic text-2xl text-ink">start your archive</p>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                  upload your first outfit and it will live here.
                </p>
                <Link href="/upload" className="mt-6 btn-primary">
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
                    />
                  ))}
                </div>

                {nextCursor ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void handleLoadMore()}
                      disabled={isBootstrappingMore}
                      className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-ink-soft transition hover:border-pink-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBootstrappingMore ? "loading..." : "load more"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        {/* ── Tab: checks ─────────────────────────────────────────────────── */}
        {activeTab === "checks" ? (
          <div className="px-5 py-6">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">monthly checks</p>
            <p className="mb-5 text-xs text-mute">your style, month by month</p>
            {availableChecksMonths().length === 0 ? (
              <div className="rounded-2xl border border-line bg-white px-5 py-8 text-center">
                <p className="font-display italic text-lg text-ink">coming soon</p>
                <p className="mt-2 text-xs text-mute">your first monthly checks drops the last week of this month</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableChecksMonths().map((m) => (
                  <Link
                    key={m}
                    href={`/monthly-checks?month=${m}`}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-pink-deep"
                  >
                    <p className="text-sm font-medium text-ink">{formatMonthShort(m)}</p>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-mute/50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Tab: about ──────────────────────────────────────────────────── */}
        {activeTab === "about" ? (
          <div className="px-5 py-6 space-y-4">
            {/* Bio */}
            <div className="rounded-2xl border border-line bg-white px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">bio</p>
              {bio ? (
                <p className="mt-2 text-sm leading-6 text-ink">{bio}</p>
              ) : (
                <Link href="/profile/edit" className="mt-2 inline-block text-sm text-pink-deep hover:underline">
                  add a bio →
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-line bg-white px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">stats</p>
              <div className="mt-3 grid grid-cols-3 divide-x divide-line">
                {[
                  { label: "fits", value: outfits.length + (nextCursor ? "+" : "") },
                  { label: "followers", value: followerCount },
                  { label: "following", value: followingCount },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 text-center first:pl-0 last:pr-0">
                    <div className="text-lg font-medium text-ink">{value}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instagram */}
            {profile?.instagram_handle ? (
              <div className="rounded-2xl border border-line bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">instagram</p>
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-pink-deep hover:underline"
                >
                  @{profile.instagram_handle}
                </a>
              </div>
            ) : null}

            {/* Member since */}
            {profile?.created_at ? (
              <div className="rounded-2xl border border-line bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">member since</p>
                <p className="mt-2 text-sm text-ink">
                  {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(profile.created_at))}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <MobileNav active="me" />

      {/* ── Follow list sheet ─────────────────────────────────────────── */}
      {followSheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,20,22,0.55)] px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setFollowSheet(null); }}
        >
          <div className="soft-panel w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
              <h2 className="font-display italic text-2xl tracking-[-0.03em] text-ink">
                {followSheet === "followers" ? "followers" : "following"}
              </h2>
              <button
                type="button"
                onClick={() => setFollowSheet(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-mute transition hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {followListLoading ? (
                <div className="flex flex-col gap-3 px-6 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-pink-soft shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded-full bg-pink-soft" />
                        <div className="h-2.5 w-20 rounded-full bg-line" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followList.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-mute">
                    {followSheet === "followers" ? "no followers yet" : "not following anyone yet"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {followList.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/profile/${person.username}`}
                        onClick={() => setFollowSheet(null)}
                        className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-pink-soft/30"
                      >
                        {person.profile_image_url ? (
                          <img src={person.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover border border-line shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-soft border border-line text-sm font-medium text-ink-soft shrink-0">
                            {(person.display_name ?? person.username ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{person.display_name ?? person.username}</p>
                          <p className="text-xs text-mute">@{person.username}</p>
                        </div>
                        <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-mute/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
