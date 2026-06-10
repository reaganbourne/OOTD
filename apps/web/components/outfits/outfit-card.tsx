"use client";

import Image from "next/image";
import Link from "next/link";
import { parseDisplayDate } from "@/lib/dates";

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
  compact?: boolean;
  liked?: boolean;
  likeCount?: number;
  onLike?: (e: React.MouseEvent) => void;
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

  // parseDisplayDate anchors date-only worn_on values to local noon so they
  // don't render a day behind in western timezones.
  const date = parseDisplayDate(value);

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
      border: "border-ink-soft/16",
      background: "bg-white/88",
      text: "text-ink-soft"
    }
  );
}

export function OutfitCard({
  outfit,
  href = `/outfits/${outfit.id}`,
  showAuthor = Boolean(outfit.author?.username || outfit.author?.profileImageUrl),
  showCaption = true,
  showAccentMarker = false,
  compact = false,
  liked = false,
  likeCount,
  onLike,
}: OutfitCardProps) {
  const toneClasses = getToneClasses(outfit.vibeTone);
  const toneLabel = formatToneLabel(outfit.vibeTone);
  const metadataLine = [outfit.eventName].filter(Boolean).join(" / ");
  const caption = outfit.caption?.trim() || null;
  const dateLabel = formatOutfitDate(outfit.wornOn ?? outfit.createdAt);

  if (compact) {
    return (
      <Link href={href} className="group relative block bg-pink-soft/30" style={{ overflow: "hidden" }}>
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <Image
            src={outfit.imageUrl}
            alt={outfit.caption?.trim() || "Outfit photo"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:brightness-95"
          />
        </div>
        {toneClasses && toneLabel ? (
          <div className="pointer-events-none absolute left-1.5 top-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.55rem] font-medium lowercase backdrop-blur ${toneClasses.border} ${toneClasses.background} ${toneClasses.text}`}
            >
              {toneLabel}
            </span>
          </div>
        ) : null}
        {onLike ? (
          <button
            type="button"
            aria-label={liked ? "Unlike" : "Like"}
            onClick={(e) => { e.stopPropagation(); onLike(e); }}
            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 backdrop-blur transition hover:bg-black/50"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition ${liked ? "text-pink-deep" : "text-white"}`}
              fill={liked ? "currentColor" : "none"}
              stroke={liked ? "currentColor" : "white"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-xl border border-line bg-white transition hover:-translate-y-0.5 hover:border-pink-deep"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-pink-soft/30">
        <Image
          src={outfit.imageUrl}
          alt={outfit.caption?.trim() || "Outfit card photo"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />

        {showAccentMarker ? (
          <div className="pointer-events-none absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 backdrop-blur">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3 w-3 text-ink-soft"
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
          <div className="pointer-events-none absolute left-3 top-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6rem] font-medium lowercase backdrop-blur ${toneClasses.border} ${toneClasses.background} ${toneClasses.text}`}
            >
              {toneLabel}
            </span>
          </div>
        ) : null}

        {onLike ? (
          <button
            type="button"
            onClick={onLike}
            aria-label={liked ? "Unlike" : "Like"}
            className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 backdrop-blur transition hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition ${liked ? "text-pink-deep" : "text-mute"}`}
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className={`px-3.5 py-3.5 ${showCaption ? "space-y-3" : "space-y-2"}`}>
        {showAuthor ? (
          <div className="flex items-center gap-2.5">
            {outfit.author?.profileImageUrl ? (
              <Image
                src={outfit.author.profileImageUrl}
                alt={getAuthorLabel(outfit.author)}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-line object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-pink bg-pink-soft font-display text-sm italic text-ink-soft">
                {getAuthorInitial(outfit)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">
                {getAuthorLabel(outfit.author)}
              </p>
              <p className="text-[0.65rem] text-mute">
                {dateLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] text-mute">{dateLabel}</p>
            {!toneClasses && toneLabel ? (
              <span className="rounded-full border border-line bg-pink-soft px-2.5 py-0.5 text-[0.6rem] font-medium lowercase text-ink-soft">
                {toneLabel}
              </span>
            ) : null}
          </div>
        )}

        <div className={showCaption ? "space-y-1.5" : "space-y-1"}>
          {showCaption && caption ? (
            <p className="line-clamp-2 font-display text-sm italic leading-snug text-ink-soft">{caption}</p>
          ) : null}

          {metadataLine ? (
            <p className="line-clamp-1 text-[0.65rem] lowercase text-mute">
              {metadataLine}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function OutfitCardSkeleton({
  showAuthor = true,
  compact = false,
}: {
  showAuthor?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="skeleton-stripe aspect-[3/4] w-full animate-pulse bg-pink-soft" />
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="skeleton-stripe aspect-[4/5] w-full animate-pulse" />
      <div className="space-y-3 px-3.5 py-3.5">
        {showAuthor ? (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-2.5 w-24 animate-pulse rounded-full bg-line" />
              <div className="h-2 w-16 animate-pulse rounded-full bg-line/60" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="h-2 w-16 animate-pulse rounded-full bg-line/60" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-line" />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-line" />
          <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-line/70" />
        </div>
      </div>
    </article>
  );
}
