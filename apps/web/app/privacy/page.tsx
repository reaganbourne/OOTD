import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-mute hover:text-ink">‹ back</Link>
        <h1 className="mt-6 font-display text-4xl text-ink">privacy policy</h1>
        <p className="mt-3 text-sm text-mute">Last updated May 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-ink-soft">
          <p>
            checkd is a private beta. We collect only the information you provide
            (username, email, outfit photos) to run the service.
          </p>
          <p>
            We do not sell your data to third parties. Outfit photos are stored
            securely and only shared with users you choose to follow or invite to boards.
          </p>
          <p>
            You can delete your account and all associated data at any time by emailing{" "}
            <a href="mailto:hello@checkd.app" className="text-pink-deep hover:underline">
              hello@checkd.app
            </a>
            . A full privacy policy will be published before public launch.
          </p>
        </div>
      </div>
    </main>
  );
}
