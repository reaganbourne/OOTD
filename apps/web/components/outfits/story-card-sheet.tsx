"use client";

import { useEffect, useRef, useState } from "react";

type StoryCardSheetProps = {
  outfitId: string;
  imageUrl: string;
  wornOn?: string | null;
  createdAt?: string | null;
  vibeCheckText?: string | null;
  vibeCheckTone?: string | null;
  onClose: () => void;
};

// Tone accent colours — match the Python story_card.py palette
const TONE_ACCENT: Record<string, string> = {
  athletic:   "#22d3ee",
  boho:       "#c084fc",
  business:   "#93c5fd",
  casual:     "#60a5fa",
  formal:     "#fbbf24",
  maximalist: "#f472b6",
  minimalist: "#cbd5e1",
  preppy:     "#4ade80",
  streetwear: "#fb7185",
  vintage:    "#fb923c",
};

/** Wrap text to fit maxWidth on a canvas context. Returns array of lines. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Extract the first sentence from a vibe check string. */
function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

function formatShareDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function StoryCardSheet({ outfitId, imageUrl, wornOn, createdAt, vibeCheckText, vibeCheckTone, onClose }: StoryCardSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const dateLabel = formatShareDate(wornOn ?? createdAt);
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/outfits/${outfitId}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1080 × 1920 — 9:16 portrait (Instagram Story size)
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    const img = new Image();
    // Load through the Next.js proxy so the image is same-origin.
    // Direct S3 URLs fail with crossOrigin="anonymous" unless the bucket
    // has CORS headers — the proxy adds them server-side.
    const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

    img.onload = () => {
      // Background
      ctx.fillStyle = "#faf7f5";
      ctx.fillRect(0, 0, W, H);

      // Cover-fit the outfit photo
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = W / H;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgAspect > canvasAspect) {
        sw = img.naturalHeight * canvasAspect;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / canvasAspect;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

      // Bottom gradient for text legibility
      const grad = ctx.createLinearGradient(0, H * 0.6, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ── Vibe check — above branding pill ─────────────────────────────
      const PAD = 52;
      const VIBE_MAX_W = W - PAD * 2;

      try {
        if (vibeCheckText?.trim() || vibeCheckTone?.trim()) {
          const vibe = vibeCheckText?.trim() ? firstSentence(vibeCheckText) : null;
          const accentColor = TONE_ACCENT[(vibeCheckTone ?? "").toLowerCase()] ?? "rgba(255,255,255,0.7)";

          // Measure how many lines the vibe text needs so we can position from the bottom up
          let vibeLineCount = 0;
          if (vibe) {
            ctx.font = `italic 400 34px Georgia, serif`;
            vibeLineCount = wrapLines(ctx, vibe, VIBE_MAX_W).length;
          }

          const TONE_H   = vibeCheckTone?.trim() ? 44 : 0;
          const VIBE_H   = vibeLineCount * 42;
          const BLOCK_H  = TONE_H + (TONE_H && VIBE_H ? 14 : 0) + VIBE_H;
          const PILL_H   = 72;
          const PILL_GAP = 24;

          // Start block this many pixels above the pill
          let vy = H - PAD - PILL_H - PILL_GAP - BLOCK_H;

          // Tone badge — use the polyfill roundRect so it works on all browsers
          if (vibeCheckTone?.trim()) {
            ctx.save();
            ctx.font = `600 22px -apple-system, sans-serif`;
            const badgeText = vibeCheckTone.toUpperCase();
            const bw = ctx.measureText(badgeText).width;
            const bpad = 14;
            const bh = 32;
            const rx = PAD, ry = vy;
            // Badge background
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = accentColor;
            roundRect(ctx, rx, ry, bw + bpad * 2, bh, bh / 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Badge border
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.5;
            roundRect(ctx, rx, ry, bw + bpad * 2, bh, bh / 2);
            ctx.stroke();
            // Badge text
            ctx.fillStyle = accentColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(badgeText, rx + bpad, ry + bh / 2);
            ctx.restore();
            vy += bh + 14;
          }

          // Vibe text
          if (vibe) {
            ctx.save();
            ctx.font = `italic 400 34px Georgia, serif`;
            ctx.fillStyle = "rgba(255,255,255,0.92)";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            const lines = wrapLines(ctx, vibe, VIBE_MAX_W);
            for (const line of lines) {
              ctx.fillText(line, PAD, vy);
              vy += 42;
            }
            ctx.restore();
          }
        }
      } catch (e) {
        // Vibe check rendering failed — canvas continues without it
        console.warn("Story card vibe check render failed:", e);
      }

      // ── Branding pill — bottom-left ──────────────────────────────────
      const PILL_H = 72;
      const PILL_PAD_X = 30;
      const LOGO_SIZE = 40;
      const DATE_SIZE = 27;
      const SEP = 20;

      ctx.font = `italic 400 ${LOGO_SIZE}px Georgia, serif`;
      const logoW = ctx.measureText("checkd").width;
      ctx.font = `400 ${DATE_SIZE}px Georgia, serif`;
      const dateW = dateLabel ? ctx.measureText(dateLabel).width : 0;

      const innerW = logoW + (dateLabel ? SEP + dateW : 0);
      const pillW = innerW + PILL_PAD_X * 2;
      const pillX = PAD;
      const pillY = H - PAD - PILL_H;
      const textY = pillY + PILL_H / 2;

      // Frosted pill
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, pillX, pillY, pillW, PILL_H, PILL_H / 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, pillX, pillY, pillW, PILL_H, PILL_H / 2);
      ctx.stroke();
      ctx.restore();

      // "checkd" — italic, pink
      ctx.save();
      ctx.font = `italic 400 ${LOGO_SIZE}px Georgia, serif`;
      ctx.fillStyle = "#F9A8D4";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("checkd", pillX + PILL_PAD_X, textY);
      ctx.restore();

      // Date — white, smaller
      if (dateLabel) {
        ctx.save();
        ctx.font = `400 ${DATE_SIZE}px Georgia, serif`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(dateLabel, pillX + PILL_PAD_X + logoW + SEP, textY + 1);
        ctx.restore();
      }

      setRendered(true);
    };

    img.onerror = () => {
      ctx.fillStyle = "#F9A8D4";
      ctx.fillRect(0, 0, W, H);
      ctx.font = `italic 400 96px Georgia, serif`;
      ctx.fillStyle = "#faf7f5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("checkd", W / 2, H / 2);
      setRendered(true);
    };

    img.src = proxiedSrc;
  }, [imageUrl, dateLabel, vibeCheckText, vibeCheckTone]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    setDownloading(true);
    canvas.toBlob((blob) => {
      if (!blob) { setDownloading(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checkd-${outfitId.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, "image/png");
  }

  function handleNativeShare() {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    canvas.toBlob(async (blob) => {
      if (!blob || !navigator.share) return;
      try {
        const file = new File([blob], "checkd-fit.png", { type: "image/png" });
        const canShare = navigator.canShare?.({ files: [file] });
        if (canShare) {
          await navigator.share({ files: [file], title: "my checkd fit" });
        } else {
          await navigator.share({ title: "my checkd fit", url: shareLink });
        }
      } catch {
        // user cancelled
      }
    }, "image/png");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,20,22,0.55)] px-4 pb-4 sm:items-center sm:pb-0 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="soft-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="font-display text-2xl tracking-[-0.03em] text-ink">share look</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-mute transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview — shows the canvas at display scale */}
        <div className="mx-6 mb-5 overflow-hidden rounded-[1.2rem] border border-line bg-pink-soft">
          <div className="relative aspect-[9/16] w-full">
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ display: rendered ? "block" : "none", objectFit: "cover" }}
            />
            {!rendered && <div className="absolute inset-0 animate-pulse bg-pink-soft" />}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 px-6 pb-6">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!rendered || downloading}
            className="btn-primary w-full gap-2.5 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "saving…" : "save to camera roll"}
          </button>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white py-3 text-sm font-medium text-ink-soft transition hover:border-pink-deep/40"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {copied ? "copied!" : "copy link"}
            </button>

            {canNativeShare ? (
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={!rendered}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white py-3 text-sm font-medium text-ink-soft transition hover:border-pink-deep/40 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                share
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
