import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE
} from "@/lib/auth-session";

const productPillars = [
  {
    title: "Personal outfit vault",
    description:
      "Log the looks you actually wore so your closet becomes a searchable memory, not a blur."
  },
  {
    title: "Event board coordination",
    description:
      "Plan girls' nights, birthday dinners, and group trips without duplicate outfits or last-minute chaos."
  },
  {
    title: "AI vibe checks",
    description:
      "Get quick caption ideas, styling feedback, and a second opinion before you step out."
  },
  {
    title: "Story card export",
    description:
      "Turn a saved fit into a clean, story-ready card you can post without rebuilding it from scratch."
  }
] as const;

const highlights = [
  "Archive every fit with context",
  "Coordinate group events visually",
  "Keep your style history in one place"
] as const;

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasActiveSession =
    cookieStore.get(AUTH_SESSION_COOKIE)?.value === AUTH_SESSION_COOKIE_VALUE;

  if (hasActiveSession) {
    redirect("/feed");
  }

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <section className="soft-panel w-full overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_380px]">
            {/* Left — brand + feature pillars */}
            <div className="border-b border-line px-6 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
              <p className="font-display text-6xl italic text-pink-deep sm:text-7xl">OOTD</p>
              <h1 className="mt-5 max-w-xl text-3xl leading-snug text-ink sm:text-4xl">
                your daily fit, kept close,<br />shared with the girls.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-ink-soft">
                log outfits, coordinate with friends, and turn great nights into reusable style history.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs lowercase text-mute"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {productPillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-xl border border-line bg-paper p-4"
                  >
                    <h2 className="font-display text-xl italic text-ink">{pillar.title}</h2>
                    <p className="mt-2 text-xs leading-5 text-mute">
                      {pillar.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            {/* Right — CTA */}
            <div className="flex flex-col justify-between gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-8 lg:py-12">
              <div>
                <h2 className="text-2xl leading-snug text-ink">
                  a soft place for outfits.
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  start with your archive, then layer on social discovery, event planning, and story-ready exports.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-paper p-4">
                <p className="text-xs font-medium lowercase text-mute">built for</p>
                <ul className="mt-3 grid gap-2 text-xs leading-5 text-ink-soft">
                  <li>people who want a real archive of what they wore</li>
                  <li>friends coordinating events without matching by accident</li>
                  <li>creators who want captions and exports without extra steps</li>
                </ul>
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
