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
    redirect("/vault");
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <section className="soft-panel w-full overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                OOTD Vault
              </p>
              <h1 className="mt-4 max-w-2xl text-5xl leading-none text-ink sm:text-6xl">
                Your personal style archive, built for the plans that become memories.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-plum/85 sm:text-lg">
                OOTD Vault helps you log outfits, coordinate looks with friends, and turn
                great nights into reusable style history instead of one-off screenshots.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-plum/15 bg-white/75 px-4 py-2 text-sm text-plum/85"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {productPillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-[1.75rem] border border-plum/12 bg-white/72 p-5 shadow-card"
                  >
                    <h2 className="text-2xl text-ink">{pillar.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-plum/82">
                      {pillar.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                  Launch loop
                </p>
                <h2 className="mt-4 max-w-lg text-4xl leading-tight text-ink">
                  Save the outfit, share the vibe, and remember what actually worked.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-plum/85">
                  Start with your archive, then layer on social discovery, event planning,
                  AI support, and instant export for the looks worth keeping.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-plum/12 bg-cream/75 p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-plum/70">
                  Built for
                </p>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-plum/85">
                  <li>People who want a real archive of what they wore and loved</li>
                  <li>Friends coordinating events without matching by accident</li>
                  <li>Creators who want captions and exports without extra steps</li>
                </ul>
              </div>

              <div className="grid gap-4">
                <Link
                  href="/signup"
                  className="rounded-[1.5rem] bg-plum px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                >
                  Create your account
                </Link>
                <Link
                  href="/login"
                  className="rounded-[1.5rem] border border-plum/20 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-plum transition hover:bg-white"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
