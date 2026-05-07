"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type OutfitDetailResponse } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { StoryCardSheet } from "@/components/outfits/story-card-sheet";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "ready" | "not-found" | "error";

const TONE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  athletic:   { bg: "bg-cyan-100/85",    text: "text-cyan-900",    border: "border-cyan-300/70" },
  boho:       { bg: "bg-violet-100/85",  text: "text-violet-900",  border: "border-violet-300/75" },
  business:   { bg: "bg-sky-100/85",     text: "text-sky-900",     border: "border-sky-300/75" },
  casual:     { bg: "bg-blue-100/85",    text: "text-blue-900",    border: "border-blue-300/75" },
  formal:     { bg: "bg-amber-100/90",   text: "text-amber-950",   border: "border-amber-300/75" },
  maximalist: { bg: "bg-pink-100/85",    text: "text-pink-900",    border: "border-pink-300/75" },
  minimalist: { bg: "bg-slate-100/90",   text: "text-slate-800",   border: "border-slate-300/75" },
  preppy:     { bg: "bg-emerald-100/85", text: "text-emerald-900", border: "border-emerald-300/70" },
  streetwear: { bg: "bg-rose-100/85",    text: "text-rose-900",    border: "border-rose-300/75" },
  vintage:    { bg: "bg-orange-100/85",  text: "text-orange-900",  border: "border-orange-300/75" },
};

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(d));
}

export function OutfitDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [outfit, setOutfit] = useState<OutfitDetailResponse | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("loading");
      const result = await apiClient.outfits.getDetail(id);
      if (!active) return;

      if (!result.ok) {
        setStatus(result.message?.toLowerCase().includes("not found") ? "not-found" : "error");
        return;
      }

      setOutfit(result.data);
      setStatus("ready");

      // Fetch like status if logged in
      if (isAuthenticated) {
        const likeResult = await apiClient.outfits.getLikes(id);
        if (!active) return;
        if (likeResult.ok) {
          setLiked(likeResult.data.liked);
          setLikeCount(likeResult.data.like_count);
        }
      }
    }

    void load();
    return () => { active = false; };
  }, [id, isAuthenticated]);

  async function handleLike() {
    if (!isAuthenticated || likeLoading) return;
    setLikeLoading(true);

    if (liked) {
      const result = await apiClient.outfits.unlike(id);
      if (result.ok) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    } else {
      const result = await apiClient.outfits.like(id);
      if (result.ok) {
        setLiked(true);
        setLikeCount(result.data.like_count);
      }
    }
    setLikeLoading(false);
  }

  // ── Not found ──
  if (status === "not-found") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
          <h1 className="mt-4 text-3xl text-ink">Outfit not found</h1>
          <p className="mt-3 text-sm leading-6 text-plum/68">This look may have been removed.</p>
          <Link href="/feed" className="mt-6 inline-block rounded-[1.2rem] border border-rose/15 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/25">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const tone = outfit?.vibe_check_tone?.toLowerCase();
  const toneStyle = tone ? TONE_BADGE[tone] : null;
  const isOwn = outfit?.owner?.id === user?.id;
  const dateLabel = formatDate(outfit?.worn_on ?? outfit?.created_at);

  return (
    <>
      <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Top bar */}
          <header className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-plum/58 transition hover:text-plum"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </button>

            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 rounded-full border border-rose/15 bg-white px-4 py-2.5 text-[0.78rem] font-semibold text-plum shadow-[0_8px_20px_rgba(244,106,147,0.07)] transition hover:border-rose/28"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

            {/* ── Left: outfit image ── */}
            <div>
              {status === "loading" ? (
                <div className="aspect-[4/5] w-full animate-pulse rounded-[2rem] bg-[linear-gradient(120deg,_rgba(255,236,242,0.8),_rgba(255,255,255,0.98),_rgba(250,216,225,0.62))]" />
              ) : (
                <div className="relative overflow-hidden rounded-[2rem] border border-rose/10 bg-white shadow-[0_24px_60px_rgba(244,106,147,0.12)]">
                  <img
                    src={outfit?.image_url}
                    alt={outfit?.caption ?? "Outfit photo"}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  {toneStyle ? (
                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] backdrop-blur ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}>
                        {outfit?.vibe_check_tone}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Right: details ── */}
            <div className="space-y-5">

              {/* Author */}
              {status === "loading" ? (
                <div className="soft-panel flex animate-pulse items-center gap-3 px-5 py-4">
                  <div className="h-11 w-11 rounded-full bg-[#ffe8ef]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 rounded-full bg-[#ffe8ef]" />
                    <div className="h-3 w-20 rounded-full bg-[#fff3f7]" />
                  </div>
                </div>
              ) : outfit?.owner ? (
                <Link
                  href={`/profile/${outfit.owner.username}`}
                  className="soft-panel flex items-center gap-3 px-5 py-4 transition hover:border-rose/18"
                >
                  {outfit.owner.profile_image_url ? (
                    <img
                      src={outfit.owner.profile_image_url}
                      alt={outfit.owner.username ?? ""}
                      className="h-11 w-11 rounded-full border border-plum/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-plum/14 bg-gradient-to-br from-[#fce4ec] to-[#f8bbd0] text-sm font-semibold text-[#c0476e]">
                      {(outfit.owner.display_name ?? outfit.owner.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {outfit.owner.display_name ?? outfit.owner.username}
                    </p>
                    {outfit.owner.username ? (
                      <p className="text-[0.7rem] text-plum/50">@{outfit.owner.username}</p>
                    ) : null}
                  </div>
                  <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-plum/30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ) : null}

              {/* Caption + meta */}
              <div className="soft-panel px-5 py-5 space-y-4">
                {status === "loading" ? (
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded-full bg-[#ffe8ef]" />
                    <div className="h-4 w-4/5 rounded-full bg-[#fff3f7]" />
                    <div className="h-3 w-1/3 rounded-full bg-[#fff6f9]" />
                  </div>
                ) : (
                  <>
                    {outfit?.caption ? (
                      <p className="text-sm leading-7 text-plum/84">{outfit.caption}</p>
                    ) : null}

                    {outfit?.event_name ? (
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-plum/52">
                        {outfit.event_name}
                      </p>
                    ) : null}

                    {dateLabel ? (
                      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-plum/42">{dateLabel}</p>
                    ) : null}

                    {outfit?.vibe_check_text ? (
                      <div className="rounded-[1rem] border border-rose/10 bg-[#fff8fb] px-4 py-3">
                        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#ef5f8a]">Vibe check</p>
                        <p className="text-sm leading-6 text-plum/80">{outfit.vibe_check_text}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Clothing items */}
              {status === "ready" && outfit && outfit.clothing_items.length > 0 ? (
                <div className="soft-panel px-5 py-5">
                  <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-plum/48">Pieces</p>
                  <ul className="space-y-3">
                    {outfit.clothing_items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink capitalize">{item.category}</p>
                          <p className="text-[0.7rem] text-plum/52">
                            {[item.brand, item.color].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {item.link_url ? (
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full border border-rose/15 px-3 py-1 text-[0.68rem] font-semibold text-[#ef5f8a] transition hover:border-rose/28"
                          >
                            Shop
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Like + share actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleLike()}
                  disabled={likeLoading || !isAuthenticated}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border py-3.5 text-sm font-semibold transition disabled:cursor-default ${
                    liked
                      ? "border-[#f6a9be] bg-[#fff1f6] text-[#ef5f8a]"
                      : "border-rose/15 bg-white text-plum hover:border-rose/28"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {likeCount > 0 ? likeCount.toLocaleString() : "Like"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowShare(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-rose/15 bg-white py-3.5 text-sm font-semibold text-plum transition hover:border-rose/28"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share
                </button>

                {isOwn ? (
                  <Link
                    href="/vault"
                    className="flex aspect-square items-center justify-center rounded-[1.2rem] border border-rose/15 bg-white p-3.5 text-plum/60 transition hover:border-rose/28 hover:text-plum"
                    aria-label="View in vault"
                  >
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 7.5A2.5 2.5 0 0 1 9.5 5h5A2.5 2.5 0 0 1 17 7.5V9H7V7.5Z" />
                      <path d="M6 9h12v9.5A2.5 2.5 0 0 1 15.5 21h-7A2.5 2.5 0 0 1 6 18.5V9Z" />
                      <path d="M10 13h4" />
                    </svg>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showShare ? (
        <StoryCardSheet outfitId={id} onClose={() => setShowShare(false)} />
      ) : null}

      <MobileNav active="home" />
    </>
  );
}
