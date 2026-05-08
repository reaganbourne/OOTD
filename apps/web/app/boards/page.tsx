"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type Board } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { useAuth } from "@/lib/auth-context";

type PageStatus = "loading" | "ready" | "error";

function formatEventDate(d?: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}

function formatExpiry(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// ── Create board modal ────────────────────────────────────────────────────────

function CreateBoardModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (board: Board) => void;
}) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const result = await apiClient.boards.create({
      name: name.trim(),
      event_date: eventDate || undefined,
    });

    if (result.ok) {
      onCreate(result.data);
    } else {
      setError(result.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(36,21,28,0.38)] px-4 pb-4 sm:items-center sm:pb-0 backdrop-blur-sm">
      <div className="soft-panel w-full max-w-md px-6 py-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-[-0.03em] text-ink">New board</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rose/12 text-mute transition hover:border-rose/22 hover:text-plum"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="board-name">Board name</label>
            <div className="field-shell">
              <input
                ref={inputRef}
                id="board-name"
                type="text"
                placeholder="e.g. Met Gala 2026, Summer wedding"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="event-date">
              Event date <span className="font-normal normal-case tracking-normal text-mute">(optional)</span>
            </label>
            <div className="field-shell">
              <input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="field-input text-sm"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-[1rem] border border-rose/25 bg-pink-soft px-4 py-3 text-sm text-error">{error}</p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[1.2rem] border border-rose/12 bg-white py-3.5 text-sm font-semibold text-plum transition hover:border-rose/22"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex-1"
            >
              {loading ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Board card ────────────────────────────────────────────────────────────────

function BoardCard({ board }: { board: Board }) {
  const eventLabel = formatEventDate(board.event_date);
  const expiryLabel = formatExpiry(board.expires_at);
  const expired = expiryLabel === "Expired";

  return (
    <Link
      href={`/boards/${board.id}`}
      className={`group block overflow-hidden rounded-[1.75rem] border bg-white transition hover:-translate-y-0.5 hover:border-rose/22 ${expired ? "border-rose/8 opacity-60" : "border-rose/10"}`}
    >
      <div className="bg-pink-soft px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose/15 bg-white/80 text-pink-deep">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
              <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
              <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
              <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
            </svg>
          </div>
          <span className={`rounded-full px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] ${expired ? "bg-rose/10 text-mute" : "bg-white/80 text-pink-deep"}`}>
            {expiryLabel}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-1">
        <h3 className="font-display text-xl tracking-[-0.02em] text-ink leading-tight">{board.name}</h3>
        {eventLabel ? (
          <p className="text-[0.72rem] uppercase tracking-[0.18em] text-mute">{eventLabel}</p>
        ) : null}
        <p className="text-[0.72rem] uppercase tracking-[0.16em] text-mute">
          {board.member_count} {board.member_count === 1 ? "member" : "members"}
        </p>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoardsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [boards, setBoards] = useState<Board[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let active = true;

    async function load() {
      setStatus("loading");
      const result = await apiClient.boards.list();
      if (!active) return;
      if (result.ok) {
        setBoards(result.data);
        setStatus("ready");
      } else {
        setErrorMessage(result.message);
        setStatus("error");
      }
    }

    void load();
    return () => { active = false; };
  }, [isAuthenticated, authLoading]);

  function handleCreated(board: Board) {
    setBoards((prev) => [board, ...prev]);
    setShowCreate(false);
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading boards</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="pb-28">
        <div className="mx-auto max-w-3xl">

          {/* Topbar — matches design 03.01 */}
          <div
            className="flex items-center justify-between bg-paper"
            style={{ padding: "8px 20px 12px" }}
          >
            <div>
              <p
                className="font-display leading-none text-pink-deep"
                style={{ fontSize: 38, lineHeight: 0.95, letterSpacing: "-0.01em" }}
              >
                checkd
              </p>
              <p style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>
                your outfit boards
              </p>
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <Link
                href="/search"
                aria-label="Search"
                className="flex items-center justify-center rounded-full border border-line bg-white text-mute"
                style={{ width: 36, height: 36 }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                aria-label="Create new board"
                className="flex items-center justify-center rounded-full border text-paper"
                style={{ width: 36, height: 36, background: "var(--ink)", borderColor: "var(--ink)" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-5">

          {errorMessage ? (
            <div className="mb-5 rounded-[1.25rem] border border-rose/25 bg-pink-soft px-4 py-3 text-sm text-error">{errorMessage}</div>
          ) : null}

          {/* Loading skeletons */}
          {status === "loading" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-[1.75rem] border border-rose/10 bg-white">
                  <div className="h-20 bg-[linear-gradient(120deg,_rgba(255,236,242,0.8),_rgba(255,255,255,0.98))]" />
                  <div className="space-y-2 px-5 py-4">
                    <div className="h-4 w-2/3 rounded-full bg-pink-soft" />
                    <div className="h-3 w-1/3 rounded-full bg-pink-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Empty state */}
          {status === "ready" && boards.length === 0 ? (
            <section className="soft-panel px-6 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose/12 bg-pink-soft text-pink-deep">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
                  <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
                  <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
                  <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
                </svg>
              </div>
              <h2 className="mt-5 text-3xl text-ink">No boards yet</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                Boards are private spaces for an event — create one and invite your crew to post their looks together.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-6 btn-primary"
              >
                Create your first board
              </button>
            </section>
          ) : null}

          {/* Board grid */}
          {status === "ready" && boards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {boards.map((b) => <BoardCard key={b.id} board={b} />)}
            </div>
          ) : null}
          </div>{/* end px wrapper */}
        </div>
      </main>

      {showCreate ? (
        <CreateBoardModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      ) : null}

      <MobileNav active="boards" />
    </>
  );
}
