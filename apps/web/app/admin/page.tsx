"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { MobileNav } from "@/components/chrome/mobile-nav";

type Action = "outfit" | "board";

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [action, setAction] = useState<Action>("outfit");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || !user?.is_admin) {
    return null;
  }

  async function handleDelete() {
    const id = targetId.trim();
    if (!id) return;
    if (!confirm(`Delete ${action} "${id}"? This cannot be undone.`)) return;

    setBusy(true);
    setFeedback(null);

    const result =
      action === "outfit"
        ? await apiClient.admin.deleteOutfit(id)
        : await apiClient.admin.deleteBoard(id);

    setFeedback({ ok: result.ok, message: result.message });
    if (result.ok) setTargetId("");
    setBusy(false);
  }

  return (
    <main className="pb-28 lg:pb-0 lg:pt-16">
      <div className="mx-auto max-w-xl px-5 py-8">
        <header className="mb-8">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">admin</h1>
          <p className="mt-1 text-sm text-mute">logged in as {user.email}</p>
        </header>

        <section className="soft-panel p-6 space-y-5">
          <h2 className="text-base font-semibold text-ink">Delete content</h2>

          <div className="flex gap-3">
            {(["outfit", "board"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setAction(t); setTargetId(""); setFeedback(null); }}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  action === t
                    ? "border-pink-deep bg-pink-deep text-white"
                    : "border-line bg-white text-ink hover:border-pink-deep"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-ink-soft">
              {action === "outfit" ? "Outfit" : "Board"} ID (UUID)
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => { setTargetId(e.target.value); setFeedback(null); }}
              placeholder={`paste ${action} UUID here`}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-mute focus:border-pink-deep"
            />
            <button
              type="button"
              disabled={!targetId.trim() || busy}
              onClick={() => void handleDelete()}
              className="rounded-full border border-error bg-error px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-40 hover:opacity-90"
            >
              {busy ? "Deleting…" : `Delete ${action}`}
            </button>
          </div>

          {feedback ? (
            <p className={`text-sm ${feedback.ok ? "text-ink" : "text-error"}`}>
              {feedback.message}
            </p>
          ) : null}
        </section>
      </div>
      <MobileNav active="none" />
    </main>
  );
}
