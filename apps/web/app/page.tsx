import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, AUTH_SESSION_COOKIE_VALUE } from "@/lib/auth-session";
import { VibeCheckLabel } from "@/components/vibe-check-label";

const FEATURES = [
  {
    title: "my vault",
    description:
      "every outfit you've ever worn, organized and searchable. search by date, event, or clothing item.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 8h14M5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" />
      </svg>
    ),
  },
  {
    title: "boards",
    description:
      "planning a birthday dinner or a trip? create a board, share the link, and coordinate fits with your girls.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "discover",
    description:
      "follow friends, see what everyone's wearing, and get ai-powered vibe checks on every fit you post.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
];

function OutfitMosaicGrid() {
  return (
    <div className="relative mx-auto max-w-[320px] select-none lg:max-w-[360px]">
      <div className="grid grid-cols-3 gap-2.5">
        <div
          className="col-span-2 h-44 rounded-2xl shadow-lift"
          style={{ background: "linear-gradient(145deg, #E8A8C0, #F8C8DC)" }}
        />
        <div className="h-44 rounded-2xl border border-line bg-pink-soft" />

        <div className="h-36 rounded-2xl border border-line bg-paper" />
        <div
          className="h-36 rounded-2xl shadow-lift"
          style={{ background: "linear-gradient(145deg, #F8C8DC, #FDEDF3)" }}
        />
        <div
          className="h-36 rounded-2xl shadow-lift"
          style={{ background: "linear-gradient(160deg, #FDEDF3, #E8A8C0)" }}
        />

        <div
          className="h-40 rounded-2xl shadow-lift"
          style={{ background: "linear-gradient(145deg, #F8C8DC, #FDEDF3)" }}
        />
        <div className="col-span-2 h-40 rounded-2xl border border-line bg-pink-soft" />
      </div>

      <div className="absolute -bottom-3 left-4 rounded-2xl border border-line bg-paper/95 px-5 py-3.5 shadow-lift backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-widest text-mute">vibe check</p>
        <VibeCheckLabel />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn =
    cookieStore.get(AUTH_SESSION_COOKIE)?.value === AUTH_SESSION_COOKIE_VALUE;

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-line/50 bg-paper/80 px-6 backdrop-blur-md sm:px-10">
        <span
          className="font-display italic text-2xl leading-none text-ink"
          style={{ letterSpacing: "-0.01em" }}
        >
          checkd
        </span>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/feed"
              className="inline-flex h-9 items-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-90"
            >
              go to feed
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-ink-soft transition hover:text-ink"
              >
                log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-90"
              >
                get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative px-6 pb-32 pt-32 sm:px-10 lg:flex lg:min-h-screen lg:items-center lg:gap-24 lg:px-24 lg:pb-0 lg:pt-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 72% 18%, rgba(232,168,192,0.32), transparent 65%), radial-gradient(ellipse 60% 50% at 5% 95%, rgba(248,200,220,0.38), transparent 55%), #faf7f5",
        }}
      >
        <div className="relative z-10 flex-1 max-w-lg">
          <span className="mb-6 inline-block rounded-full border border-pink-deep/40 bg-pink-soft px-4 py-1.5 text-xs lowercase tracking-wider text-pink-deep">
            your personal fit archive
          </span>

          <h1
            className="font-display italic leading-none text-ink"
            style={{ fontSize: "clamp(72px, 10vw, 108px)", letterSpacing: "-0.03em" }}
          >
            checkd.
          </h1>

          <p className="mt-6 max-w-sm text-lg leading-relaxed text-ink-soft">
            log your outfits, coordinate looks for events, and share the fits
            with the girls.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {["vault your fits", "event boards", "discover friends", "ai vibe checks"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs lowercase text-mute"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            {isLoggedIn ? (
              <Link
                href="/feed"
                className="inline-flex h-10 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper transition hover:opacity-90"
              >
                go to feed
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper transition hover:opacity-90"
                >
                  get started
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center rounded-full border border-line bg-paper px-7 text-sm font-medium text-ink-soft transition hover:border-ink-soft hover:text-ink"
                >
                  log in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative mt-20 flex-1 lg:mt-0">
          <OutfitMosaicGrid />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line px-6 py-24 sm:px-10 lg:px-24">
        <p className="mb-3 text-center text-xs uppercase tracking-widest text-mute">
          everything you need
        </p>
        <p
          className="mb-14 text-center font-display italic text-3xl text-ink"
          style={{ letterSpacing: "-0.02em" }}
        >
          your whole wardrobe story, in one place.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-line p-8 transition hover:border-pink-deep/40 hover:bg-pink-soft/40"
            >
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-pink-soft text-pink-deep">
                {f.icon}
              </div>
              <h3 className="font-display italic text-lg text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it feels strip */}
      <section
        className="border-t border-line px-6 py-20 sm:px-10 lg:px-24"
        style={{ background: "linear-gradient(160deg, #FDEDF3 0%, #faf7f5 100%)" }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="font-display italic text-4xl leading-tight text-ink sm:text-5xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            never forget what you wore<br className="hidden sm:block" /> on your best night out.
          </p>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-ink-soft">
            checkd is a soft place to keep your style history, for yourself and the
            friends who were there.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { label: "log a fit", body: "upload a photo and add details about what you're wearing: brand, category, color, all of it." },
            { label: "share with your board", body: "create an event board for a trip or a night out and invite your girls to post their looks." },
            { label: "get your vibe check", body: "our ai reads the room and gives your fit a vibe check so you always know the energy you're giving." },
          ].map((step, i) => (
            <div key={step.label} className="rounded-2xl border border-line bg-paper p-6">
              <span className="text-xs uppercase tracking-widest text-pink-deep">
                0{i + 1}
              </span>
              <h4 className="mt-3 font-display italic text-base text-ink">{step.label}</h4>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-6 py-28 text-center sm:px-10"
        style={{ background: "linear-gradient(150deg, #F8C8DC 0%, #E8A8C0 50%, #FDEDF3 100%)" }}
      >
        <h2
          className="font-display italic text-5xl text-ink sm:text-6xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          archive the fits.
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-base leading-7 text-ink-soft">
          start today. no algorithm, just your style.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/feed"
              className="inline-flex h-11 items-center rounded-full bg-ink px-9 text-sm font-medium text-paper transition hover:opacity-90"
            >
              go to feed
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-full bg-ink px-9 text-sm font-medium text-paper transition hover:opacity-90"
              >
                get started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-full border border-ink/20 bg-paper/70 px-9 text-sm font-medium text-ink-soft backdrop-blur-sm transition hover:bg-paper"
              >
                log in
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span
            className="font-display italic text-lg text-ink-soft"
            style={{ letterSpacing: "-0.01em" }}
          >
            checkd
          </span>
          <div className="flex gap-6 text-xs text-mute">
            <Link href="/terms" className="transition hover:text-ink">
              terms
            </Link>
            <Link href="/privacy" className="transition hover:text-ink">
              privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
