import Link from "next/link";

export default async function OutfitDetailStub({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <section className="soft-panel w-full overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-brand-glow px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                Outfit detail
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl">
                This outfit detail screen is the next layer after the feed.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-plum/84 sm:text-base">
                You made it here from the feed card successfully. The full detail
                experience will eventually show the outfit image, tagged items, social
                actions, vibe check output, and story-card tools.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div className="rounded-[1.75rem] border border-plum/12 bg-cream/75 p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                  Stub route
                </p>
                <p className="mt-4 break-all text-sm leading-6 text-plum/84">
                  Outfit ID: <span className="font-semibold text-ink">{id}</span>
                </p>
              </div>

              <div className="grid gap-3">
                <Link
                  href="/feed"
                  className="rounded-[1.4rem] bg-plum px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                >
                  Back to feed
                </Link>
                <Link
                  href="/vault"
                  className="rounded-[1.4rem] border border-plum/18 bg-white/80 px-5 py-4 text-center text-sm font-semibold text-plum transition hover:bg-white"
                >
                  Open your vault
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
