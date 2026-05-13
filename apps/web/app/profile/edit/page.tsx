"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { MobileNav } from "@/components/chrome/mobile-nav";

const BIO_LIMIT = 160;
const USERNAME_CHECK_DELAY = 500;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function getInitial(displayName?: string | null, username?: string | null) {
  const source = displayName?.trim() || username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function AvatarUpload({
  src,
  initial,
  uploading,
  onFile,
}: {
  src?: string | null;
  initial: string;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-24 w-24 flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-deep/50"
        aria-label="Change profile photo"
      >
        {src ? (
          <img
            src={src}
            alt="Your profile photo"
            className="h-24 w-24 rounded-full border-2 border-line object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-line bg-pink-soft text-2xl font-semibold text-ink-soft">
            {initial}
          </div>
        )}

        {/* overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/30 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100"
        >
          {uploading ? (
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </span>
      </button>

      <p className="text-[0.72rem] text-mute">Tap to change photo</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UsernameHint({ status }: { status: UsernameStatus }) {
  if (status === "idle" || status === "checking") return null;

  if (status === "available") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Username is available
      </p>
    );
  }

  if (status === "taken") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-error">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Username is already taken
      </p>
    );
  }

  return null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, setUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=/profile/edit");
    }
  }, [authLoading, isAuthenticated, router]);

  // Seed form from auth context once available
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setUsername(user.username ?? "");
    setBio(user.bio ?? "");
    setAvatarSrc(user.profile_image_url ?? null);
    setInstagramHandle((user as { instagram_handle?: string | null }).instagram_handle ?? "");
  }, [user]);

  const checkUsername = useCallback(
    (value: string) => {
      if (!user) return;

      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }

      const trimmed = value.trim();

      // No check needed if unchanged or empty
      if (!trimmed || trimmed === user.username) {
        setUsernameStatus("idle");
        return;
      }

      setUsernameStatus("checking");

      usernameTimerRef.current = setTimeout(async () => {
        const result = await apiClient.users.search(trimmed, 10);

        if (!result.ok) {
          setUsernameStatus("error");
          return;
        }

        const taken = result.data.some(
          (u) => u.username?.toLowerCase() === trimmed.toLowerCase() && u.id !== user.id
        );

        setUsernameStatus(taken ? "taken" : "available");
      }, USERNAME_CHECK_DELAY);
    },
    [user]
  );

  async function handleAvatarFile(file: File) {
    setAvatarUploading(true);
    setAvatarError(null);

    const result = await apiClient.users.uploadAvatar(file);

    if (result.ok) {
      setAvatarSrc(result.data.profile_image_url ?? null);
      setUser(result.data);
    } else {
      setAvatarError(result.message);
    }

    setAvatarUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (usernameStatus === "taken") return;

    setSaveStatus("saving");
    setSaveError(null);
    setFieldErrors({});

    const result = await apiClient.users.updateProfile({
      display_name: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      instagram_handle: instagramHandle.trim().replace(/^@/, "") || null,
    });

    if (result.ok) {
      setUser(result.data);
      setSaveStatus("saved");
      setTimeout(() => router.push("/profile"), 800);
    } else {
      setSaveStatus("error");
      setSaveError(result.message);
      if (result.errors) {
        setFieldErrors(result.errors);
      }
    }
  }

  if (authLoading || !isAuthenticated || !user) {
    return (
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <section className="soft-panel w-full max-w-sm px-6 py-10 text-center">
            <p className="font-display italic text-5xl text-pink-deep">checkd</p>
            <h1 className="mt-4 text-3xl text-ink">Loading…</h1>
          </section>
        </div>
      </main>
    );
  }

  const initial = getInitial(displayName, username);
  const bioRemaining = BIO_LIMIT - bio.length;
  const isSaving = saveStatus === "saving";

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-0 lg:pt-20">
      <div className="mx-auto max-w-lg">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header className="mb-6 flex items-center justify-between">
          <p className="font-display italic text-[2.2rem] leading-none text-pink-deep">
            checkd
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="icon-button"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </header>

        {/* ── Title ───────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="font-display italic text-3xl tracking-[-0.03em] text-ink">edit profile</h1>
          <p className="mt-1 text-sm text-mute">Changes are visible on your public profile</p>
        </div>

        <form onSubmit={(e) => void handleSave(e)} noValidate>

          {/* ── Avatar ────────────────────────────────────────────────────── */}
          <section className="soft-panel mb-4 flex flex-col items-center px-6 py-7">
            <AvatarUpload
              src={avatarSrc}
              initial={initial}
              uploading={avatarUploading}
              onFile={(file) => void handleAvatarFile(file)}
            />
            {avatarError ? (
              <p className="mt-3 text-center text-xs text-error">{avatarError}</p>
            ) : null}
          </section>

          {/* ── Fields ────────────────────────────────────────────────────── */}
          <section className="soft-panel mb-4 px-6 py-6 space-y-5">

            {/* Display name */}
            <div>
              <label htmlFor="display-name" className="block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-mute">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                disabled={isSaving}
                className="mt-2 w-full rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-mute/40 outline-none transition focus:border-pink-deep/40 focus:ring-2 focus:ring-pink-deep/12 disabled:opacity-50"
              />
              {fieldErrors.display_name ? (
                <p className="mt-1.5 text-xs text-error">{fieldErrors.display_name}</p>
              ) : null}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-mute">
                Username
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute">
                  @
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    checkUsername(e.target.value);
                  }}
                  placeholder="yourhandle"
                  maxLength={30}
                  disabled={isSaving}
                  className="w-full rounded-2xl border border-line bg-white/70 py-3 pl-8 pr-4 text-sm text-ink placeholder:text-mute/40 outline-none transition focus:border-pink-deep/40 focus:ring-2 focus:ring-pink-deep/12 disabled:opacity-50"
                />
                {usernameStatus === "checking" ? (
                  <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-mute/40" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : null}
              </div>
              <UsernameHint status={usernameStatus} />
              {fieldErrors.username ? (
                <p className="mt-1.5 text-xs text-error">{fieldErrors.username}</p>
              ) : null}
            </div>

            {/* Instagram handle */}
            <div>
              <label htmlFor="instagram" className="block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-mute">
                Instagram
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute">
                  @
                </span>
                <input
                  id="instagram"
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                  placeholder="yourhandle"
                  maxLength={30}
                  disabled={isSaving}
                  className="w-full rounded-2xl border border-line bg-white/70 py-3 pl-8 pr-4 text-sm text-ink placeholder:text-mute/40 outline-none transition focus:border-pink-deep/40 focus:ring-2 focus:ring-pink-deep/12 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="bio" className="block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-mute">
                  Bio
                </label>
                <span className={`text-[0.68rem] tabular-nums ${bioRemaining < 20 ? "text-error" : "text-mute"}`}>
                  {bioRemaining}
                </span>
              </div>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_LIMIT) {
                    setBio(e.target.value);
                  }
                }}
                placeholder="A little about your style…"
                rows={3}
                disabled={isSaving}
                className="mt-2 w-full resize-none rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-mute/40 outline-none transition focus:border-pink-deep/40 focus:ring-2 focus:ring-pink-deep/12 disabled:opacity-50"
              />
              {fieldErrors.bio ? (
                <p className="mt-1.5 text-xs text-error">{fieldErrors.bio}</p>
              ) : null}
            </div>
          </section>

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {saveError ? (
            <div className="mb-4 rounded-[1.25rem] border border-pink-deep/25 bg-pink-soft px-4 py-3 text-sm text-error">
              {saveError}
            </div>
          ) : null}

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSaving || usernameStatus === "taken" || avatarUploading}
              className="btn-primary w-full"
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved!" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSaving}
              className="w-full rounded-[1.5rem] border border-line bg-white/80 px-5 py-4 text-sm font-semibold text-ink-soft transition hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <MobileNav active="me" />
    </main>
  );
}
