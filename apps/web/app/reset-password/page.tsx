import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper" style={{ padding: "20px 28px 0" }}>
      <div style={{ marginBottom: 20 }}>
        <a
          href="/login"
          className="text-ink-soft transition hover:text-ink"
          style={{ fontSize: 13 }}
        >
          ‹ back to log in
        </a>
      </div>

      <div className="flex flex-1 flex-col" style={{ paddingBottom: 32 }}>
        <h1
          className="font-display italic text-ink"
          style={{ fontSize: 40, margin: "8px 0 0", letterSpacing: "-0.01em", lineHeight: 1.1 }}
        >
          new password
        </h1>
        <p className="text-mute" style={{ fontSize: 13, marginTop: 8 }}>
          choose something you&apos;ll remember.
        </p>

        <div style={{ marginTop: 28 }}>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
