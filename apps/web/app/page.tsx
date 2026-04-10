import Link from "next/link";

const productPillars = [
  "Personal outfit vault",
  "Event board coordination",
  "AI vibe checks",
  "Story card export"
];

export default function HomePage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <section className="soft-panel w-full overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                OOTD Vault
              </p>
              <h1 className="mt-4 max-w-xl text-5xl leading-none text-ink sm:text-6xl">
                Your style archive, your social loop, your next night out.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-plum/85 sm:text-lg">
                This frontend branch starts the auth experience for a fashion-first
                social product built around logging looks, coordinating events, and
                exporting story-ready moments.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {productPillars.map((pillar) => (
                  <span
                    key={pillar}
                    className="rounded-full border border-plum/15 bg-white/70 px-4 py-2 text-sm text-plum/85"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                  Start Here
                </p>
                <h2 className="mt-4 text-4xl leading-tight text-ink">
                  Auth flow scaffold is ready for review.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-plum/85">
                  Use the links below to inspect the initial login and sign-up
                  screens. They currently run against mocked submit behavior so the
                  UI can be built before the backend auth contract is wired in.
                </p>
              </div>

              <div className="grid gap-4">
                <Link
                  href="/login"
                  className="rounded-[1.5rem] bg-plum px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                >
                  Review login screen
                </Link>
                <Link
                  href="/signup"
                  className="rounded-[1.5rem] border border-plum/20 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-plum transition hover:bg-white"
                >
                  Review sign-up screen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
