"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const CONSENT_KEY = "checkd_ai_consent_v1";

export function AiConsentModal() {
  const { isAuthenticated, isLoading } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (typeof localStorage === "undefined") return;
    if (!localStorage.getItem(CONSENT_KEY)) {
      setShow(true);
    }
  }, [isAuthenticated, isLoading]);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-t-[2rem] border border-line bg-paper px-6 pb-10 pt-8 sm:rounded-[2rem] sm:pb-8">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-pink-soft">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>

        <h2 className="font-display italic text-2xl leading-snug text-ink">
          a quick note on AI
        </h2>

        <p className="mt-3 text-sm leading-6 text-ink-soft">
          checkd uses AI to generate <strong className="font-medium text-ink">vibe checks</strong> for your outfit photos. When you upload a photo, it's processed by our AI provider to generate a style label.
        </p>

        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Your photos and captions may be sent to a third-party AI service. We don't use them to train models. You can turn vibe checks off anytime in your profile settings.
        </p>

        <button
          type="button"
          onClick={accept}
          className="mt-6 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper transition hover:opacity-90"
        >
          got it
        </button>
      </div>
    </div>
  );
}
