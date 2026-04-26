"use client";

import Link from "next/link";
import type { FeedOutfitResponse } from "@/lib/api-client";

function formatFeedDate(value?: string | null) {
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

function getAuthorLabel(outfit: FeedOutfitResponse) {
  if (outfit.author.username) {
    return `@${outfit.author.username}`;
  }

  return "From your network";
}

function getAuthorInitial(outfit: FeedOutfitResponse) {
  const source = outfit.author.username?.trim() || outfit.caption?.trim() || "o";
  return source.charAt(0).toUpperCase();
}

export function FeedCard({ outfit }: { outfit: FeedOutfitResponse }) {
  const metadataLine = [outfit.event_name, outfit.vibe_check_tone]
    .filter(Boolean)
    .join(" / ");

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group overflow-hidden rounded-[1.9rem] border border-plum/12 bg-white/80 shadow-card transition hover:-translate-y-1 hover:border-plum/22 hover:bg-white"
    >
      <div className="overflow-hidden bg-cream/65">
        <img
          src={outfit.image_url}
          alt={outfit.caption?.trim() || "Outfit feed photo"}
          className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center gap-3">
          {outfit.author.profile_image_url ? (
            <img
              src={outfit.author.profile_image_url}
              alt={getAuthorLabel(outfit)}
              className="h-11 w-11 rounded-full border border-plum/12 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-plum/14 bg-brand-glow text-sm font-semibold text-plum">
              {getAuthorInitial(outfit)}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{getAuthorLabel(outfit)}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-plum/62">
              {formatFeedDate(outfit.worn_on ?? outfit.created_at)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="line-clamp-2 text-sm leading-6 text-plum/84">
            {outfit.caption?.trim() || "A saved look from someone you follow."}
          </p>

          {metadataLine ? (
            <p className="line-clamp-1 text-xs uppercase tracking-[0.16em] text-plum/62">
              {metadataLine}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function FeedCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[1.9rem] border border-plum/10 bg-white/72 shadow-card">
      <div className="aspect-[4/5] w-full animate-pulse bg-[linear-gradient(120deg,_rgba(242,196,206,0.35),_rgba(255,255,255,0.92),_rgba(242,196,206,0.28))]" />
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-cream/90" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded-full bg-cream/90" />
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-cream/75" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-cream/90" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-cream/80" />
          <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-cream/70" />
        </div>
      </div>
    </article>
  );
}
