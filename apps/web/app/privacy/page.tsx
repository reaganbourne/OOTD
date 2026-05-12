import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-mute hover:text-ink">
          ‹ back
        </Link>

        <h1 className="mt-6 font-display text-4xl text-ink">
          privacy policy
        </h1>

        <p className="mt-3 text-sm text-mute">Last updated May 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-ink-soft">
          <p>
            checkd is currently in private beta. We collect the information you
            provide to create and use your account, including your username,
            email address, outfit photos, captions, tags, comments, likes,
            follows, boards, and other activity within the app.
          </p>

          <p>
            We use this information to run the service, show your outfits and
            activity in the app, support social and board features, generate
            optional AI captions, prevent abuse, fix bugs, and improve checkd.
          </p>

          <p>
            Some content you upload may be visible to other users depending on
            the features you use, including profile, feed, follow, board, and
            sharing features. Outfit images may also be accessible through
            public or shareable image links. Please do not upload anything you
            would not want others to see.
          </p>

          <p>
            We do not sell your personal data. We may use trusted third-party
            services to operate checkd, including hosting, database, image
            storage, analytics or error logging, and optional AI caption
            generation services.
          </p>

          <p>
            We use reasonable technical measures to protect your information,
            including password hashing and secure session handling. However, no
            online service is completely secure.
          </p>

          <p>
            You can request deletion of your account and associated data at any
            time by emailing{" "}
            <a
              href="mailto:hello@checkd.app"
              className="text-pink-deep hover:underline"
            >
              hello@checkd.app
            </a>
            .
          </p>

          <p>
            We may update this policy as checkd changes. If we make meaningful
            changes, we will update the date above.
          </p>
        </div>
      </div>
    </main>
  );
}