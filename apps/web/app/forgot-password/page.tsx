import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell mode="login">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-ink">forgot your password?</h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Password reset is coming soon. For now, reach out to us at{" "}
            <a
              href="mailto:hello@checkd.app"
              className="text-pink-deep underline-offset-2 hover:underline"
            >
              hello@checkd.app
            </a>{" "}
            and we&apos;ll get you back in.
          </p>
        </div>

        <Link
          href="/login"
          className="btn-primary block w-full text-center"
        >
          back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
