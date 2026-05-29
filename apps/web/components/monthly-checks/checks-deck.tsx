"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WrappedStats } from "@/lib/api-client";
import { ChecksShareSheet } from "./checks-share-sheet";

// slides 0,2,4,6,8 have light bg; 1,3,5,7 have dark bg
const LIGHT_SLIDES = new Set([0, 2, 4, 6, 8]);

const VIBE_BG: Record<string, string> = {
  athletic: "#1a3a2a",
  boho: "#3d2e1a",
  casual: "#1a2a3d",
  chic: "#2a1a2e",
  classic: "#1a2030",
  edgy: "#111111",
  feminine: "#3d1a2a",
  minimalist: "#242424",
  preppy: "#1a2e1a",
  streetwear: "#1a1a2e",
  vintage: "#2e2010",
};

const VIBE_ACCENT: Record<string, string> = {
  athletic: "#5ccb8c",
  boho: "#e0a44a",
  casual: "#6aabf7",
  chic: "#c97ad4",
  classic: "#80a8e0",
  edgy: "#e05555",
  feminine: "#f797b8",
  minimalist: "#aaaaaa",
  preppy: "#55bb66",
  streetwear: "#7788ff",
  vintage: "#d4a852",
};

function monthName(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

type ChecksDeckProps = {
  stats: WrappedStats;
  month: string;
  username: string;
  onSlideChange: (isLight: boolean) => void;
};

export function ChecksDeck({ stats, month, username, onSlideChange }: ChecksDeckProps) {
  const TOTAL = 9;
  const [slide, setSlide] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isLight = LIGHT_SLIDES.has(slide);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(TOTAL - 1, index));
      setSlide(next);
      onSlideChange(LIGHT_SLIDES.has(next));
    },
    [onSlideChange]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(slide + 1);
      if (e.key === "ArrowLeft") goTo(slide - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, goTo]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 48) goTo(slide + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
  }

  const vibe = stats.most_worn_vibe ?? "casual";
  const vibeBg = VIBE_BG[vibe] ?? "#1a1416";
  const vibeAccent = VIBE_ACCENT[vibe] ?? "#F8C8DC";

  const maxWeek = Math.max(...stats.outfits_by_week.map((w) => w.count), 1);
  const avgPerWeek =
    stats.outfits_by_week.length > 0
      ? Math.round((stats.total_outfits / stats.outfits_by_week.length) * 10) / 10
      : 0;

  // dot + arrow colors based on current slide
  const dotActive = isLight ? "#1a1416" : "rgba(255,255,255,0.9)";
  const dotInactive = isLight ? "rgba(26,20,22,0.15)" : "rgba(255,255,255,0.18)";
  const arrowCls = isLight
    ? "bg-ink/[0.07] border border-line text-ink hover:bg-ink/[0.13]"
    : "bg-white/10 border border-white/20 text-white hover:bg-white/20";

  const cards = [
    // 0 — Intro
    <div
      key="intro"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(160deg, #FDEDF3 0%, #F8C8DC 100%)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-soft">monthly checks</p>
      <h1
        className="mt-4 font-display italic text-ink"
        style={{ fontSize: "clamp(48px, 13vw, 76px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        {monthName(month)}
      </h1>
      <p className="mt-3 text-sm text-mute">@{username}</p>
      <p className="mt-14 flex items-center gap-1.5 text-xs text-mute">
        swipe to see your month
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </p>
    </div>,

    // 1 — Total outfits
    <div
      key="outfits"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "#1a1416" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em]" style={{ color: "rgba(255,255,255,0.35)" }}>
        you posted
      </p>
      <p
        className="mt-2 font-display italic leading-none"
        style={{ fontSize: "clamp(100px, 30vw, 168px)", color: "#fff" }}
      >
        {stats.total_outfits}
      </p>
      <p
        className="font-display italic"
        style={{ fontSize: "clamp(28px, 8vw, 44px)", color: "var(--pink)", lineHeight: 1 }}
      >
        outfits
      </p>
      {avgPerWeek > 0 && (
        <p className="mt-5 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          ~{avgPerWeek} a week
        </p>
      )}
    </div>,

    // 2 — Streak
    <div
      key="streak"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--paper)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mute">longest streak</p>
      <p
        className="mt-2 font-display italic leading-none text-ink"
        style={{ fontSize: "clamp(100px, 30vw, 168px)" }}
      >
        {stats.longest_streak}
      </p>
      <p
        className="font-display italic text-ink-soft"
        style={{ fontSize: "clamp(24px, 7vw, 36px)", lineHeight: 1 }}
      >
        {stats.longest_streak === 1 ? "day" : "days"} in a row
      </p>
      {stats.longest_streak >= 7 && (
        <p className="mt-5 text-sm text-mute">you were on a roll</p>
      )}
    </div>,

    // 3 — Vibe
    <div
      key="vibe"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: vibeBg }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.24em]"
        style={{ color: `${vibeAccent}80` }}
      >
        your vibe this month
      </p>
      <p
        className="mt-6 font-display italic leading-none"
        style={{ fontSize: "clamp(52px, 16vw, 100px)", color: vibeAccent, letterSpacing: "-0.02em" }}
      >
        {vibe}
      </p>
    </div>,

    // 4 — Colors
    <div
      key="colors"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--pink-soft)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mute">your palette</p>
      <div className="mt-10 flex gap-6">
        {stats.top_colors.slice(0, 3).map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div
              className="rounded-full border-2 border-line shadow-sm"
              style={{ width: 76, height: 76, background: c.color }}
            />
            <span className="text-[11px] lowercase text-ink-soft">{c.color}</span>
          </div>
        ))}
      </div>
    </div>,

    // 5 — Brands
    <div
      key="brands"
      className="flex h-full flex-col items-center justify-center px-8"
      style={{ background: "#1a1416" }}
    >
      <p
        className="mb-8 text-center text-[10px] font-medium uppercase tracking-[0.24em]"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        your labels
      </p>
      <div className="w-full max-w-xs space-y-5">
        {stats.top_brands.slice(0, 3).map((b, i) => (
          <div key={i} className="flex items-baseline gap-4">
            <span
              className="font-display italic shrink-0"
              style={{ fontSize: 36, lineHeight: 1, color: "rgba(255,255,255,0.15)" }}
            >
              {i + 1}
            </span>
            <span
              className="font-display italic text-white"
              style={{ fontSize: "clamp(22px, 6.5vw, 34px)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
            >
              {b.brand}
            </span>
          </div>
        ))}
        {stats.top_brands.length === 0 && (
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            no brands tagged yet
          </p>
        )}
      </div>
    </div>,

    // 6 — Category
    <div
      key="category"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--paper)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mute">you mostly wore</p>
      <p
        className="mt-5 font-display italic text-ink"
        style={{ fontSize: "clamp(44px, 13vw, 80px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        {stats.top_categories[0]?.category ?? "everything"}
      </p>
    </div>,

    // 7 — Weekly rhythm
    <div
      key="rhythm"
      className="flex h-full flex-col items-center justify-center px-8"
      style={{ background: "#1a1416" }}
    >
      <p
        className="mb-10 text-center text-[10px] font-medium uppercase tracking-[0.24em]"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        your weekly rhythm
      </p>
      <div
        className="flex w-full max-w-[280px] items-end justify-center gap-3"
        style={{ height: 140 }}
      >
        {stats.outfits_by_week.map((w, i) => {
          const pct = (w.count / maxWeek) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {w.count > 0 ? w.count : ""}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: "var(--pink)",
                  opacity: w.count === 0 ? 0.2 : 1,
                  minHeight: 3,
                }}
              />
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                wk {w.week}
              </span>
            </div>
          );
        })}
        {stats.outfits_by_week.length === 0 && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>no data</p>
        )}
      </div>
    </div>,

    // 8 — Summary / share
    <div
      key="summary"
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(160deg, #FDEDF3 0%, #F8C8DC 100%)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-soft">
        {monthName(month)}
      </p>
      <p
        className="mt-4 font-display italic text-ink"
        style={{ fontSize: "clamp(40px, 12vw, 64px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        that's a wrap
      </p>
      <div className="mt-5 space-y-1 text-sm text-ink-soft">
        <p>{stats.total_outfits} outfits · {stats.longest_streak}-day streak</p>
        {stats.most_worn_vibe && <p>{stats.most_worn_vibe} vibes</p>}
      </div>
      <div className="mt-10 w-full max-w-[260px] space-y-3">
        <button type="button" onClick={() => setShowShare(true)} className="btn-primary w-full gap-2.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          share my checks
        </button>
      </div>
    </div>,
  ];

  return (
    <>
      <div
        className="relative h-full w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {/* Card track */}
        <div
          className="flex h-full"
          style={{
            width: "max-content",
            transform: `translateX(calc(-1 * ${slide} * 100vw))`,
            transition: "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {cards.map((card, i) => (
            <div key={i} className="h-full shrink-0" style={{ width: "100vw" }}>
              {card}
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2" style={{ bottom: "max(32px, env(safe-area-inset-bottom))" }}>
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === slide ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === slide ? dotActive : dotInactive,
                transition: "width 0.2s ease, background 0.2s ease",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Desktop arrows */}
        {slide > 0 && (
          <button
            type="button"
            onClick={() => goTo(slide - 1)}
            className={`absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full transition lg:flex ${arrowCls}`}
            style={{ width: 44, height: 44 }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        {slide < TOTAL - 1 && (
          <button
            type="button"
            onClick={() => goTo(slide + 1)}
            className={`absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full transition lg:flex ${arrowCls}`}
            style={{ width: 44, height: 44 }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {showShare && (
        <ChecksShareSheet
          stats={stats}
          month={month}
          username={username}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
