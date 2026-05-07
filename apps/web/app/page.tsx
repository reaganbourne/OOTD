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
      style={{ background: "#F8C8DC" }}
    >
      {/* Radial glow overlays — soft depth like the design */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(253,237,243,0.55) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(232,168,192,0.45) 0%, transparent 60%)"
        }}
      />

      {/* Mobile-first centered layout */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center md:hidden">
        {/* Wordmark */}
        <p
          className="font-display leading-none"
          style={{ fontSize: "88px", color: "#faf7f5" }}
        >
          checkd
        </p>

        {/* Tagline */}
        <p
          className="mt-6 font-display"
          style={{ fontSize: "22px", color: "#8a7a80", lineHeight: 1.4 }}
        >
          your daily fit, kept close.<br />shared with the girls.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/signup"
            className="btn-primary"
            style={{ background: "#1a1416", color: "#faf7f5" }}
          >
            create account
          </Link>
          <Link
            href="/login"
            className="inline-flex h-[50px] items-center justify-center rounded-full border border-[rgba(26,20,22,0.25)] px-6 text-sm font-medium lowercase text-ink transition hover:border-ink"
          >
            i already have one
          </Link>
        </div>
      </div>

      {/* Desktop / laptop — two-column layout, still pink-toned */}
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
