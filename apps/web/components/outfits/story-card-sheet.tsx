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
    const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

    img.onload = () => {
      const PAD = 64;

      // ── 1. Background ───────────────────────────────────────────────────────
      ctx.fillStyle = "#faf7f5";
      ctx.fillRect(0, 0, W, H);

      // ── 2. Cover-fit outfit photo ───────────────────────────────────────────
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

      // ── 3. Dual gradient — darkens top (logo) and bottom (vibe text) ────────
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.30);
      topGrad.addColorStop(0, "rgba(0,0,0,0.52)");
      topGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H);

      const botGrad = ctx.createLinearGradient(0, H * 0.58, 0, H);
      botGrad.addColorStop(0, "rgba(0,0,0,0)");
      botGrad.addColorStop(1, "rgba(0,0,0,0.68)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 4. Top-right: "checkd" logo + date ─────────────────────────────────
      const LOGO_SIZE = 58;
      const DATE_SIZE = 27;

      ctx.save();
      ctx.font = `italic 400 ${LOGO_SIZE}px Georgia, serif`;
      ctx.fillStyle = "#F9A8D4";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("checkd", W - PAD, PAD);
      ctx.restore();

      if (dateLabel) {
        ctx.save();
        ctx.font = `400 ${DATE_SIZE}px Georgia, serif`;
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(dateLabel, W - PAD, PAD + LOGO_SIZE + 8);
        ctx.restore();
      }

      // ── 5. Bottom-left: vibe check text ─────────────────────────────────────
      const vibeStr = vibeCheckText?.trim() ? firstSentence(vibeCheckText) : null;
      if (vibeStr) {
        try {
          const VIBE_SIZE = 48;
          const LINE_H = 62;
          const VIBE_MAX_W = W - PAD * 2.2;

          ctx.save();
          ctx.font = `italic 400 ${VIBE_SIZE}px Georgia, serif`;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";

          const lines = wrapLines(ctx, vibeStr, VIBE_MAX_W);

          // Draw lines from bottom up so the last line sits at H - PAD
          let ty = H - PAD;
          for (const line of [...lines].reverse()) {
            ctx.fillText(line, PAD, ty);
            ty -= LINE_H;
          }
          ctx.restore();
        } catch (e) {
          console.warn("Story card vibe text render failed:", e);
        }
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
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,20,22,0.55)] px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-up soft-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
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

        {/* Card preview */}
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
