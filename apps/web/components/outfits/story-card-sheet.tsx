"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

type StoryCardSheetProps = {
  outfitId: string;
  onClose: () => void;
};

export function StoryCardSheet({ outfitId, onClose }: StoryCardSheetProps) {
  const [copied, setCopied] = useState(false);

  const cardUrl = apiClient.outfits.storyCardUrl(outfitId);
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/outfits/${outfitId}`;

  function handleDownload() {
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `ootd-${outfitId.slice(0, 8)}.png`;
    a.click();
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!navigator.share) return;
    await navigator.share({ title: "My OOTD", url: shareLink });
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(36,21,28,0.42)] px-4 pb-4 sm:items-center sm:pb-0 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="soft-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-display text-2xl tracking-[-0.03em] text-ink">Share look</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rose/12 text-plum/50 transition hover:border-rose/22 hover:text-plum"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story card preview */}
        <div className="relative mx-6 mb-5 overflow-hidden rounded-[1.4rem] border border-rose/10 bg-[#0d0f14] shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
          {/* Aspect ratio wrapper — story cards are 1080×1920 (9:16) */}
          <div className="relative aspect-[9/16] w-full">
            <img
              src={cardUrl}
              alt="Story card preview"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Loading shimmer shown while img loads */}
            <div className="absolute inset-0 -z-10 animate-pulse bg-[linear-gradient(135deg,_#1a1020_0%,_#2a1830_50%,_#1a1020_100%)]" />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 px-6 pb-6">
          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center gap-3 rounded-[1.2rem] bg-gradient-to-r from-[#ef6c96] to-[#f493b0] px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Save story card
          </button>

          <div className="flex gap-3">
            {/* Copy link */}
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-rose/15 bg-white py-3.5 text-sm font-semibold text-plum transition hover:border-rose/25"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {copied ? "Copied!" : "Copy link"}
            </button>

            {/* Native share (mobile) */}
            {canNativeShare ? (
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-rose/15 bg-white py-3.5 text-sm font-semibold text-plum transition hover:border-rose/25"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
