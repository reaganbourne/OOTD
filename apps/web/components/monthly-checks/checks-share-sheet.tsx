"use client";

import { useEffect, useRef, useState } from "react";
import type { WrappedStats } from "@/lib/api-client";

type ChecksShareSheetProps = {
  stats: WrappedStats;
  month: string;
  username: string;
  onClose: () => void;
};

function monthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ChecksShareSheet({ stats, month, username, onClose }: ChecksShareSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileName = `checkd-monthly-checks-${month}.png`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // ── Background — dark ink
    ctx.fillStyle = "#1a1416";
    ctx.fillRect(0, 0, W, H);

    // ── Subtle pink gradient overlay at top
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    topGrad.addColorStop(0, "rgba(248,200,220,0.10)");
    topGrad.addColorStop(1, "rgba(248,200,220,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H);

    const PAD = 80;

    // ── "checkd" wordmark — top right
    ctx.save();
    ctx.font = `italic 400 68px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "#F8C8DC";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("checkd", W - PAD, 120);
    ctx.restore();

    // ── "monthly checks" label — top right below logo
    ctx.save();
    ctx.font = `400 22px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("monthly checks", W - PAD, 204);
    ctx.restore();

    // ── Month name — large centered
    ctx.save();
    ctx.font = `italic 400 108px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(monthLabel(month), W / 2, 340);
    ctx.restore();

    // ── Thin divider
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, 540);
    ctx.lineTo(W - PAD, 540);
    ctx.stroke();
    ctx.restore();

    // ── Stats row
    const statY = 620;
    const statItems = [
      { value: String(stats.total_outfits), label: "outfits" },
      { value: `${stats.longest_streak}d`, label: "streak" },
      { value: String(stats.total_items), label: "items" },
    ];
    const colW = (W - PAD * 2) / statItems.length;
    statItems.forEach(({ value, label }, i) => {
      const cx = PAD + colW * i + colW / 2;
      ctx.save();
      ctx.font = `italic 400 80px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(value, cx, statY);
      ctx.restore();

      ctx.save();
      ctx.font = `400 24px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, cx, statY + 96);
      ctx.restore();
    });

    // ── Vibe
    if (stats.most_worn_vibe) {
      ctx.save();
      ctx.font = `italic 400 56px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = "#F8C8DC";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${stats.most_worn_vibe} vibes`, W / 2, 840);
      ctx.restore();
    }

    // ── Color swatches
    if (stats.top_colors.length > 0) {
      const swatchCount = Math.min(stats.top_colors.length, 3);
      const swatchSize = 90;
      const swatchGap = 28;
      const swatchTotalW = swatchCount * swatchSize + (swatchCount - 1) * swatchGap;
      const swatchStartX = (W - swatchTotalW) / 2;
      const swatchY = 1000;

      stats.top_colors.slice(0, 3).forEach((c, i) => {
        const cx = swatchStartX + i * (swatchSize + swatchGap) + swatchSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, swatchY + swatchSize / 2, swatchSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── Top brand
    if (stats.top_brands[0]) {
      ctx.save();
      ctx.font = `400 22px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("top label", W / 2, 1160);
      ctx.restore();

      ctx.save();
      ctx.font = `italic 400 52px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(stats.top_brands[0].brand, W / 2, 1196);
      ctx.restore();
    }

    // ── Thin divider bottom
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, 1420);
    ctx.lineTo(W - PAD, 1420);
    ctx.stroke();
    ctx.restore();

    // ── @username — bottom left
    ctx.save();
    ctx.font = `400 28px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`@${username}`, PAD, 1460);
    ctx.restore();

    // ── "checkd.app" — bottom right
    ctx.save();
    ctx.font = `400 28px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("checkd.app", W - PAD, 1460);
    ctx.restore();

    setRendered(true);
  }, [stats, month, username]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    setDownloading(true);
    canvas.toBlob((blob) => {
      if (!blob) { setDownloading(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, "image/png");
  }

  function handleNativeShare() {
    const canvas = canvasRef.current;
    if (!canvas || !rendered || !navigator.share) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `my ${monthLabel(month)} checks` });
        } else {
          await navigator.share({ title: `my ${monthLabel(month)} checks` });
        }
      } catch {
        // user cancelled
      }
    }, "image/png");
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/monthly-checks?month=${month}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(26,20,22,0.65)] px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-up soft-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 className="font-display italic text-2xl tracking-[-0.03em] text-ink">share your checks</h2>
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

        {/* Canvas preview */}
        <div className="mx-6 mb-5 overflow-hidden rounded-[1.2rem] border border-line bg-ink">
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
            className="btn-primary w-full gap-2.5"
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

            {canNativeShare && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
