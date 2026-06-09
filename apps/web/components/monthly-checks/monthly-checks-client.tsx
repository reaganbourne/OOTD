"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, type WrappedStats } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ChecksDeck } from "./checks-deck";

function prevMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function defaultMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MonthlyChecksClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isBootstrapping: authLoading } = useAuth();

  const month = searchParams.get("month") ?? defaultMonth();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [slideIsLight, setSlideIsLight] = useState(true);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isAtLatest = month >= currentMonth;

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let active = true;
    setStats(null);
    setStatus("loading");

    void apiClient.users.getWrapped(month).then((result) => {
      if (!active) return;
      if (!result.ok) { setStatus("error"); return; }
      if (result.data.total_outfits === 0) { setStatus("empty"); return; }
      setStats(result.data);
      setStatus("idle");
    });

    return () => { active = false; };
  }, [month, authLoading, isAuthenticated]);

  function navigate(dir: "prev" | "next") {
    const target = dir === "prev" ? prevMonth(month) : nextMonth(month);
    router.push(`/monthly-checks?month=${target}`);
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex h-screen items-center justify-center" style={{ background: "var(--ink)" }}>
        <p className="font-display italic text-5xl" style={{ color: "var(--pink)" }}>checkd</p>
      </main>
    );
  }

  const controlsDark = !slideIsLight;
  const btnStyle = controlsDark
    ? "bg-white/10 border border-white/20 text-white backdrop-blur-sm hover:bg-white/20"
    : "bg-ink/[0.07] border border-line text-ink backdrop-blur-sm hover:bg-ink/[0.12]";
  const monthLabelColor = controlsDark ? "text-white/70" : "text-ink-soft";

  return (
    <main className="relative h-screen overflow-hidden" style={{ background: "var(--ink)" }}>
      {/* Back */}
      <Link
        href="/profile"
        className={`absolute left-4 top-safe-top z-30 flex h-9 w-9 items-center justify-center rounded-full transition ${btnStyle}`}
        style={{ top: "max(16px, env(safe-area-inset-top))" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>

      {/* Month nav */}
      <div
        className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
        style={{ top: "max(16px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigate("prev")}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${btnStyle}`}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span className={`text-[11px] font-medium ${monthLabelColor}`}>{formatMonthLabel(month)}</span>
        <button
          type="button"
          onClick={() => navigate("next")}
          disabled={isAtLatest}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-30 ${btnStyle}`}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {status === "loading" && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="font-display italic text-5xl" style={{ color: "var(--pink)" }}>checkd</p>
            <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>loading your checks…</p>
          </div>
        </div>
      )}

      {status === "empty" && (
        <div className="flex h-full items-center justify-center px-8">
          <div className="text-center">
            <p className="font-display italic text-4xl" style={{ color: "var(--pink)" }}>no fits yet</p>
            <p className="mt-3 text-sm leading-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              you didn't post any outfits in {formatMonthLabel(month)}
            </p>
            <Link
              href="/profile"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm transition"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              ← back to profile
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex h-full items-center justify-center px-8">
          <div className="text-center">
            <p className="font-display italic text-4xl" style={{ color: "var(--pink)" }}>oops</p>
            <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>couldn't load your checks</p>
          </div>
        </div>
      )}

      {status === "idle" && stats && (
        <ChecksDeck
          stats={stats}
          month={month}
          username={user?.username ?? ""}
          onSlideChange={(isLight) => setSlideIsLight(isLight)}
        />
      )}
    </main>
  );
}
