"use client";

import Link from "next/link";

type OutfitCardAuthor = {
  username?: string | null;
  profileImageUrl?: string | null;
};

export type OutfitCardData = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  eventName?: string | null;
  wornOn?: string | null;
  createdAt?: string | null;
  vibeTone?: string | null;
  author?: OutfitCardAuthor | null;
};

type OutfitCardProps = {
  outfit: OutfitCardData;
  href?: string;
  showAuthor?: boolean;
  showCaption?: boolean;
  showAccentMarker?: boolean;
};

type ToneClasses = {
  border: string;
  background: string;
  text: string;
};

const TONE_STYLES: Record<string, ToneClasses> = {
  athletic: {
    border: "border-cyan-300/70",
    background: "bg-cyan-100/85",
    text: "text-cyan-900"
  },
  boho: {
    border: "border-violet-300/75",
    background: "bg-violet-100/85",
    text: "text-violet-900"
  },
  business: {
    border: "border-sky-300/75",
    background: "bg-sky-100/85",
    text: "text-sky-900"
  },
  casual: {
    border: "border-blue-300/75",
    background: "bg-blue-100/85",
    text: "text-blue-900"
  },
  formal: {
    border: "border-amber-300/75",
    background: "bg-amber-100/90",
    text: "text-amber-950"
  },
  maximalist: {
    border: "border-pink-300/75",
    background: "bg-pink-100/85",
    text: "text-pink-900"
  },
  minimalist: {
    border: "border-slate-300/75",
    background: "bg-slate-100/90",
    text: "text-slate-800"
  },
  preppy: {
    border: "border-emerald-300/70",
    background: "bg-emerald-100/85",
    text: "text-emerald-900"
  },
  streetwear: {
    border: "border-rose-300/75",
    background: "bg-rose-100/85",
    text: "text-rose-900"
  },
  vintage: {
    border: "border-orange-300/75",
    background: "bg-orange-100/85",
    text: "text-orange-900"
  }
};

function formatOutfitDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getAuthorLabel(author?: OutfitCardAuthor | null) {
  if (author?.username?.trim()) {
    return `@${author.username.trim()}`;
  }

  return "From your network";
}

function getAuthorInitial(outfit: OutfitCardData) {
  const source =
    outfit.author?.username?.trim() ||
    outfit.caption?.trim() ||
    outfit.eventName?.trim() ||
    "o";

  return source.charAt(0).toUpperCase();
}

function formatToneLabel(tone?: string | null) {
  if (!tone) {
    return null;
  }

  const normalizedTone = tone.trim().toLowerCase();

  if (!normalizedTone) {
    return null;
  }

  return normalizedTone.charAt(0).toUpperCase() + normalizedTone.slice(1);
}

function getToneClasses(tone?: string | null) {
  const normalizedTone = tone?.trim().toLowerCase();

  if (!normalizedTone) {
    return null;
  }

  return (
    TONE_STYLES[normalizedTone] ?? {
      border: "border-plum/16",
      background: "bg-white/88",
      text: "text-plum"
    }
  );
}

export function OutfitCard({
  outfit,
  href = `/outfits/${outfit.id}`,
  showAuthor = Boolean(outfit.author?.username || outfit.author?.profileImageUrl),
  showCaption = true,
  showAccentMarker = false
}: OutfitCardProps) {
  const toneClasses = getToneClasses(outfit.vibeTone);
  const toneLabel = formatToneLabel(outfit.vibeTone);
  const metadataLine = [outfit.eventName].filter(Boolean).join(" / ");
  const caption =
    outfit.caption?.trim() || "A saved look ready to be revisited later.";
  const dateLabel = formatOutfitDate(outfit.wornOn ?? outfit.createdAt);

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[1.75rem] border border-rose/10 bg-white shadow-[0_18px_42px_rgba(244,106,147,0.08)] transition hover:-translate-y-1 hover:border-rose/20"
    >
      <div className="relative overflow-hidden bg-cream/65">
        <img
          src={outfit.imageUrl}
          alt={outfit.caption?.trim() || "Outfit card photo"}
          className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />

        {showAccentMarker ? (
          <div className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/55 bg-white/72 backdrop-blur">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3 1.8 5.2H19l-4.2 3 1.6 5-4.4-3.1-4.4 3.1 1.6-5L5 8.2h5.2L12 3Z" />
            </svg>
          </div>
        ) : null}

        {toneClasses && toneLabel ? (
          <div className="pointer-events-none absolute left-4 top-4">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] backdrop-blur ${toneClasses.border} ${toneClasses.background} ${toneClasses.text}`}
            >
              {toneLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className={`px-4 py-4 sm:px-5 sm:py-5 ${showCaption ? "space-y-4" : "space-y-2"}`}>
        {showAuthor ? (
          <div className="flex items-center gap-3">
            {outfit.author?.profileImageUrl ? (
              <img
                src={outfit.author.profileImageUrl}
                alt={getAuthorLabel(outfit.author)}
                className="h-11 w-11 rounded-full border border-plum/12 object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-plum/14 bg-brand-glow text-sm font-semibold text-plum">
                {getAuthorInitial(outfit)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {getAuthorLabel(outfit.author)}
              </p>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-plum/54">
                {dateLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-plum/54">{dateLabel}</p>
            {!toneClasses && toneLabel ? (
              <span className="rounded-full border border-rose/12 bg-[#fff4f7] px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#ef5f8a]">
                {toneLabel}
              </span>
            ) : null}
          </div>
        )}

        <div className={showCaption ? "space-y-2" : "space-y-1"}>
          {showCaption ? (
            <p className="line-clamp-2 text-sm leading-6 text-plum/84">{caption}</p>
          ) : null}

          {metadataLine ? (
            <p className="line-clamp-1 text-[0.68rem] uppercase tracking-[0.16em] text-plum/54">
              {metadataLine}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function OutfitCardSkeleton({
  showAuthor = true
}: {
  showAuthor?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-rose/10 bg-white shadow-[0_18px_42px_rgba(244,106,147,0.06)]">
      <div className="aspect-[4/5] w-full animate-pulse bg-[linear-gradient(120deg,_rgba(255,236,242,0.8),_rgba(255,255,255,0.98),_rgba(250,216,225,0.62))]" />
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {showAuthor ? (
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-[#ffe8ef]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[#ffe8ef]" />
              <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#fff3f7]" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#fff3f7]" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-[#ffe8ef]" />
          </div>
        )}

        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-[#ffe8ef]" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#fff3f7]" />
          <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-[#fff6f9]" />
        </div>
      </div>
    </article>
  );
}
