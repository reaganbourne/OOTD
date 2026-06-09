"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

async function normalizeImageFile(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif" || (type === "" && file.name.toLowerCase().endsWith(".heic"))) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
  }
  return file;
}

type Step = 1 | 2;
type SubmitStatus = "idle" | "uploading" | "error";
type BoardStatus = "loading" | "ready" | "not-member" | "expired" | "error";

export default function BoardUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();

  const [boardStatus, setBoardStatus] = useState<BoardStatus>("loading");
  const [step, setStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saveToVault, setSaveToVault] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isBootstrapping, router]);

  // Pre-check board membership + expiry before showing upload UI
  useEffect(() => {
    if (isBootstrapping || !isAuthenticated) return;
    let active = true;

    apiClient.boards.get(id).then((result) => {
      if (!active) return;
      if (result.ok) {
        setBoardStatus("ready");
        return;
      }
      if (result.status === 403) { setBoardStatus("not-member"); return; }
      if (result.status === 410) { setBoardStatus("expired"); return; }
      setBoardStatus("error");
    });

    return () => { active = false; };
  }, [id, isAuthenticated, isBootstrapping]);

  function handleFile(file: File) {
    normalizeImageFile(file).then((normalized) => {
      setPhoto(normalized);
      setPreview(URL.createObjectURL(normalized));
    }).catch(() => {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    const isImage = file && (file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic"));
    if (isImage) handleFile(file);
  }

  async function handlePost() {
    if (!photo) return;
    setSubmitStatus("uploading");
    setErrorMsg(null);

    const createResult = await apiClient.outfits.create({
      image: photo,
      metadata: { caption: caption.trim() || undefined, clothing_items: [], save_to_vault: saveToVault },
    });

    if (!createResult.ok) {
      setErrorMsg(createResult.message);
      setSubmitStatus("error");
      return;
    }

    const addResult = await apiClient.boards.addOutfit(id, createResult.data.id);

    if (!addResult.ok) {
      if (addResult.status === 403) { setBoardStatus("not-member"); return; }
      if (addResult.status === 410) { setBoardStatus("expired"); return; }
      setErrorMsg(addResult.message);
      setSubmitStatus("error");
      return;
    }

    router.replace(`/boards/${id}`);
  }

  if (isBootstrapping || !isAuthenticated) return null;

  // ── Error states ──────────────────────────────────────────────────────────────

  if (boardStatus === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">loading board…</h1>
        </div>
      </main>
    );
  }

  if (boardStatus === "not-member") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">not a member</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            You need to join this board before you can post to it.
          </p>
          <Link
            href="/boards"
            className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25"
          >
            Back to boards
          </Link>
        </div>
      </main>
    );
  }

  if (boardStatus === "expired") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">board expired</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            This board has passed its event date and is no longer accepting new posts.
          </p>
          <Link
            href={`/boards/${id}`}
            className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25"
          >
            View board
          </Link>
        </div>
      </main>
    );
  }

  if (boardStatus === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-panel w-full max-w-sm px-6 py-10 text-center">
          <p className="font-display italic text-5xl text-pink-deep">checkd</p>
          <h1 className="mt-4 text-2xl text-ink">something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Couldn&rsquo;t load this board. Try again.
          </p>
          <Link
            href="/boards"
            className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-pink-deep/25"
          >
            Back to boards
          </Link>
        </div>
      </main>
    );
  }

  // ── Upload flow ───────────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen flex-col bg-paper">

      {/* Topbar */}
      <div
        className="flex items-center justify-between border-b border-line bg-paper"
        style={{ padding: "12px 20px" }}
      >
        <Link
          href={`/boards/${id}`}
          className="text-sm text-ink-soft transition hover:text-ink"
        >
          ‹ back
        </Link>

        <div className="flex items-center gap-1.5">
          {([1, 2] as Step[]).map((s) => (
            <span
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: step === s ? 20 : 6,
                background: step === s ? "var(--ink)" : "var(--line)",
              }}
            />
          ))}
        </div>

        <span className="text-[11px] text-mute" style={{ minWidth: 24, textAlign: "right" }}>
          {step}/2
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-28 pt-8">

        {/* Step 1: photo + caption */}
        {step === 1 ? (
          <>
            <h1 className="font-display italic text-[2rem] leading-tight text-ink">add a look</h1>
            <p className="mt-1 text-sm text-mute">post your outfit to this board.</p>

            <div
              className="relative mt-6 flex items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-line bg-pink-soft transition hover:border-pink-deep"
              style={{ aspectRatio: "3/4", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/30 opacity-0 transition hover:opacity-100">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-paper" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="mt-2 text-sm font-medium text-paper">change photo</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <svg viewBox="0 0 24 24" className="h-10 w-10 text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-ink">tap to choose photo</p>
                    <p className="mt-0.5 text-xs text-mute">or drag and drop</p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />

            <div className="mt-5">
              <label className="field-label" htmlFor="caption">
                caption <span className="font-normal normal-case tracking-normal text-mute">(optional)</span>
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="what's the vibe?"
                maxLength={500}
                rows={3}
                className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pink-deep focus:ring-2 focus:ring-pink/40"
              />
            </div>
          </>
        ) : null}

        {/* Step 2: review */}
        {step === 2 ? (
          <>
            <h1 className="font-display italic text-[2rem] leading-tight text-ink">looking good.</h1>
            <p className="mt-1 text-sm text-mute">review before posting to the board.</p>

            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-line bg-white">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 380 }} />
              ) : null}
              {caption ? (
                <div className="px-5 py-4">
                  <p className="text-sm text-ink">{caption}</p>
                </div>
              ) : (
                <div className="px-5 py-3">
                  <p className="text-xs italic text-mute">no caption</p>
                </div>
              )}
            </div>

            {/* Vault toggle */}
            <button
              type="button"
              onClick={() => setSaveToVault((v) => !v)}
              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-pink-deep/30"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-ink">save to my vault</p>
                <p className="mt-0.5 text-xs text-mute">keep this look in your personal archive</p>
              </div>
              <div
                className={`relative h-6 w-10 flex-shrink-0 rounded-full border transition-colors duration-200 ${
                  saveToVault ? "border-ink bg-ink" : "border-line bg-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    saveToVault ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </button>

            {errorMsg ? (
              <div className="mt-4 rounded-2xl border border-pink-deep/30 bg-pink-soft px-4 py-3 text-sm text-error">
                {errorMsg}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed inset-x-0 bottom-0 flex items-center gap-3 border-t border-line bg-paper"
        style={{ padding: "12px 20px 28px" }}
      >
        {step === 1 ? (
          <>
            <Link
              href={`/boards/${id}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-pink-deep"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <button
              type="button"
              disabled={!photo}
              onClick={() => setStep(2)}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              looks good
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setSubmitStatus("idle"); setErrorMsg(null); setStep(1); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-mute transition hover:border-pink-deep"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              disabled={submitStatus === "uploading"}
              onClick={() => void handlePost()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {submitStatus === "uploading" ? "posting…" : "post to board"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
