import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE
} from "@/lib/auth-session";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasActiveSession =
    cookieStore.get(AUTH_SESSION_COOKIE)?.value === AUTH_SESSION_COOKIE_VALUE;

  if (hasActiveSession) {
    redirect("/feed");
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 80% 0%, rgba(255,255,255,0.45), transparent 60%), radial-gradient(80% 60% at 0% 100%, rgba(232,168,192,0.55), transparent 60%), #F8C8DC"
      }}
    >
      {/* Mobile — full pink, left-aligned, space-between */}
      <div
        className="relative flex min-h-screen flex-col md:hidden"
        style={{ padding: "60px 28px 40px" }}
      >
        {/* Top: est. tag + wordmark + tagline */}
        <div>
          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "#faf7f5",
              opacity: 0.7,
              textTransform: "lowercase"
            }}
          >
            est. 2026
          </div>
          <div
            className="font-display"
            style={{ fontSize: 88, lineHeight: 0.95, letterSpacing: "-0.01em", color: "#faf7f5", marginTop: 40 }}
          >
            checkd
          </div>
          <div
            className="font-display"
            style={{ fontSize: 22, lineHeight: 1.25, marginTop: 14, color: "#faf7f5", opacity: 0.92, maxWidth: 260 }}
          >
            your daily fit, kept&nbsp;close. shared with the&nbsp;girls.
          </div>
        </div>

        {/* Bottom: CTAs + terms */}
        <div>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/signup"
              className="flex h-[50px] items-center justify-center rounded-full text-sm font-medium lowercase"
              style={{ background: "#1a1416", color: "#faf7f5" }}
            >
              create account
            </Link>
            <Link
              href="/login"
              className="flex h-[50px] items-center justify-center rounded-full border text-sm font-medium lowercase"
              style={{ borderColor: "currentColor", color: "#faf7f5" }}
            >
              i already have one
            </Link>
          </div>
          <p className="mt-3.5 text-center text-xs" style={{ color: "#faf7f5", opacity: 0.85 }}>
            by continuing you agree to our{" "}
            <Link href="/terms" className="underline">terms</Link>
            {" "}&amp;{" "}
            <Link href="/privacy" className="underline">privacy</Link>
          </p>
        </div>
      </div>

      {/* Desktop / laptop — two-column card layout */}
      <div className="relative hidden min-h-screen md:flex md:items-center md:justify-center md:px-8 md:py-12">
        <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-pink-deep/40 bg-paper/90 shadow-lift backdrop-blur-sm">
          <div className="grid lg:grid-cols-[1fr_380px]">
            {/* Left — brand + tagline */}
            <div className="flex flex-col justify-center border-b border-line px-8 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
              <p className="font-display text-[80px] leading-none text-pink-deep">
                checkd
              </p>
              <h1 className="mt-5 max-w-sm text-3xl leading-snug text-ink">
                your daily fit, kept close,<br />shared with the girls.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-ink-soft">
                log outfits, coordinate with friends, and turn great nights into reusable style history.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {["personal fit archive", "share with friends", "AI-generated captions"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs lowercase text-mute"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — CTA */}
            <div className="flex flex-col justify-center gap-8 px-8 py-10 lg:px-8 lg:py-14">
              <div>
                <h2 className="font-display text-3xl text-ink">
                  a soft place for outfits.
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  start your archive, discover your friends&rsquo; fits, and share to your story in one tap.
                </p>
              </div>

              <div className="grid gap-3">
                <Link href="/signup" className="btn-primary text-center">
                  get started
                </Link>
                <Link href="/login" className="btn-secondary text-center">
                  log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
