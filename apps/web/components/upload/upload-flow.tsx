"use client";

import type { ChangeEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { EventDatePicker } from "@/components/boards/event-date-picker";

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

type UploadItem = {
  id: string;
  brand: string;
  category: string;
  color: string;
};

type UploadMetadata = {
  caption: string;
  eventName: string;
  wornOn: string;
};

type ValidationErrors = {
  photo?: string;
  items?: string;
  form?: string;
  itemCategories: Record<string, string>;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["photo", "items", "context", "review"];

function createItem(): UploadItem {
  return {
    id: "item-0",
    brand: "",
    category: "",
    color: ""
  };
}

function createEmptyErrors(): ValidationErrors {
  return { itemCategories: {} };
}

export function UploadFlow() {
  const router = useRouter();
  const inputId = useId();
  const nextItemIdRef = useRef(1);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([createItem()]);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    caption: "",
    eventName: "",
    wornOn: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<ValidationErrors>(createEmptyErrors);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const isSubmittingRef = useRef(false); // synchronous guard against double-tap

  useEffect(() => {
    if (!photo) { setPhotoPreviewUrl(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function resetStatus() {
    if (submitState.status !== "idle") setSubmitState({ status: "idle" });
  }

  function setErrorState(next: Partial<ValidationErrors>) {
    setErrors({ ...createEmptyErrors(), ...next, itemCategories: next.itemCategories ?? {} });
  }

  function validateStep(step: Step): boolean {
    if (step === 1) {
      if (!photo) {
        setErrorState({ photo: "Choose a photo before continuing.", form: "A photo is required." });
        return false;
      }
      setErrors(createEmptyErrors());
      return true;
    }
    if (step === 2) {
      if (items.length === 0) {
        setErrorState({ items: "Add at least one item.", form: "Your outfit needs at least one tagged item." });
        return false;
      }
      const itemCategories = items.reduce<Record<string, string>>((acc, item) => {
        if (!item.category.trim()) acc[item.id] = "Category is required.";
        return acc;
      }, {});
      if (Object.keys(itemCategories).length > 0) {
        setErrorState({ items: "Every item needs a category.", form: "Fix the highlighted rows.", itemCategories });
        return false;
      }
      setErrors(createEmptyErrors());
      return true;
    }
    setErrors(createEmptyErrors());
    return true;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    resetStatus();
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    const isImage = nextFile.type.startsWith("image/") || nextFile.name.toLowerCase().endsWith(".heic") || nextFile.name.toLowerCase().endsWith(".heif");
    if (!isImage) {
      setErrorState({ photo: "Choose an image file.", form: "Only image files are supported." });
      event.target.value = "";
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setErrorState({ photo: "Photo is too large (max 20 MB).", form: "Choose a photo under 20 MB." });
      event.target.value = "";
      return;
    }
    // Normalize HEIC/HEIF (Live Photos) to JPEG before storing
    normalizeImageFile(nextFile).then((normalized) => {
      setPhoto(normalized);
      setErrors(createEmptyErrors());
    }).catch(() => {
      setPhoto(nextFile); // fallback: use original, let the server handle it
      setErrors(createEmptyErrors());
    });
  }

  function updateItem(itemId: string, field: keyof Omit<UploadItem, "id">, value: string) {
    resetStatus();
    setItems((cur) => cur.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
    setErrors((cur) => {
      if (field !== "category") return cur;
      const next = { ...cur.itemCategories };
      delete next[itemId];
      return { ...cur, items: undefined, form: undefined, itemCategories: next };
    });
  }

  function addItem() {
    resetStatus();
    setItems((cur) => [
      ...cur,
      {
        id: `item-${nextItemIdRef.current++}`,
        brand: "",
        category: "",
        color: ""
      }
    ]);
    setErrors((cur) => ({ ...cur, items: undefined, form: undefined }));
  }

  function removeItem(itemId: string) {
    resetStatus();
    setItems((cur) => cur.length === 1 ? cur : cur.filter((i) => i.id !== itemId));
    setErrors((cur) => {
      const next = { ...cur.itemCategories };
      delete next[itemId];
      return { ...cur, itemCategories: next };
    });
  }

  function updateMetadata(field: keyof UploadMetadata, value: string) {
    resetStatus();
    setMetadata((cur) => ({ ...cur, [field]: value }));
  }

  function goToStep(nextStep: Step) {
    setCurrentStep(nextStep);
    resetStatus();
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) goToStep((currentStep + 1) as Step);
  }

  function handleBack() {
    if (currentStep > 1) goToStep((currentStep - 1) as Step);
  }

  async function handleSubmit() {
    // Synchronous ref guard prevents double-submission from rapid taps
    if (isSubmittingRef.current) return;
    if (!validateStep(1) || !photo) { setCurrentStep(1); return; }
    if (!validateStep(2)) { setCurrentStep(2); return; }

    isSubmittingRef.current = true;
    setSubmitState({ status: "submitting" });

    try {
      const payload = {
        clothing_items: items.map((item, index) => {
          const nextItem: { brand?: string; category: string; color?: string; display_order: number } = {
            category: item.category.trim(),
            display_order: index
          };
          if (item.brand.trim()) nextItem.brand = item.brand.trim();
          if (item.color.trim()) nextItem.color = item.color.trim();
          return nextItem;
        })
      } as {
        caption?: string;
        event_name?: string;
        worn_on?: string;
        clothing_items: Array<{ brand?: string; category: string; color?: string; display_order: number }>;
      };

      if (metadata.caption.trim()) payload.caption = metadata.caption.trim();
      if (metadata.eventName.trim()) payload.event_name = metadata.eventName.trim();
      if (metadata.wornOn) payload.worn_on = metadata.wornOn;

      const result = await apiClient.outfits.create({ image: photo, metadata: { ...payload, save_to_vault: true } });
      if (!result.ok) throw new Error(result.message);

      setSubmitState({ status: "success", message: "Outfit uploaded!" });
      window.setTimeout(() => router.push("/vault"), 900);
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed. Please try again."
      });
      isSubmittingRef.current = false; // allow retry after error
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between border-b border-line bg-paper"
        style={{ padding: "0 20px", height: 56 }}
      >
        <Link
          href="/vault"
          className="text-mute transition hover:text-ink"
          style={{ fontSize: 14 }}
        >
          cancel
        </Link>

        {/* Step dots */}
        <div className="flex items-center" style={{ gap: 6 }}>
          {([1, 2, 3, 4] as Step[]).map((step) => (
            <span
              key={step}
              style={{
                width: step === currentStep ? 18 : 6,
                height: 6,
                borderRadius: 99,
                background: step === currentStep
                  ? "var(--pink-deep)"
                  : step < currentStep
                    ? "var(--ink)"
                    : "var(--line)",
                transition: "width 0.2s, background 0.2s",
                display: "block"
              }}
            />
          ))}
        </div>

        <span className="text-mute" style={{ fontSize: 13 }}>
          {currentStep}/4
        </span>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col" style={{ padding: "24px 20px 120px" }}>

        {/* Step heading */}
        <p
          className="font-display italic text-ink"
          style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 6 }}
        >
          {currentStep === 1 && "add your photo"}
          {currentStep === 2 && "tag what you wore"}
          {currentStep === 3 && "add context"}
          {currentStep === 4 && "review & post"}
        </p>
        <p className="text-mute" style={{ fontSize: 13, marginBottom: 20 }}>
          {currentStep === 1 && "pick the photo that best captures the look."}
          {currentStep === 2 && "add one row per item: brand, category, color."}
          {currentStep === 3 && "caption, event, and date are all optional."}
          {currentStep === 4 && "everything look right? go ahead and post it."}
        </p>

        {/* Error/success banners */}
        {errors.form ? (
          <div
            className="border border-pink-deep/25 bg-pink-soft text-error"
            style={{ borderRadius: "1rem", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
          >
            {errors.form}
          </div>
        ) : null}
        {submitState.status === "error" ? (
          <div
            className="border border-pink-deep/25 bg-pink-soft text-error"
            style={{ borderRadius: "1rem", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
          >
            {submitState.message}
          </div>
        ) : null}
        {submitState.status === "success" ? (
          <div
            className="border border-emerald-200 bg-emerald-50 text-emerald-900"
            style={{ borderRadius: "1rem", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
          >
            {submitState.message}
          </div>
        ) : null}

        {/* ── Step 1: Photo ────────────────────────────────────────────────── */}
        {currentStep === 1 ? (
          <div className="flex flex-col" style={{ gap: 12 }}>
            {/* Photo preview — compact height so it doesn't swamp the screen */}
            <label
              htmlFor={inputId}
              className="relative block overflow-hidden bg-pink-soft"
              style={{
                borderRadius: "1.25rem",
                border: "1.5px dashed var(--line)",
                height: 240,
                cursor: "pointer"
              }}
            >
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Outfit preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "var(--pink-soft)" }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-center gap-2">
                  <svg viewBox="0 0 24 24" style={{ width: 32, height: 32 }} className="text-pink-deep" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-ink" style={{ fontSize: 14, fontWeight: 500 }}>tap to add your photo</p>
                  <p className="text-mute" style={{ fontSize: 11 }}>JPG, PNG, WEBP or HEIC · max 20 MB</p>
                </div>
              )}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />

            {/* Replace / status row */}
            {photo ? (
              <label
                htmlFor={inputId}
                className="flex items-center justify-center border border-line bg-white text-ink-soft transition hover:border-ink hover:text-ink"
                style={{ borderRadius: "99px", height: 44, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                replace photo
              </label>
            ) : null}

            {photo ? (
              <div
                className="border border-line bg-white text-mute"
                style={{ borderRadius: "1rem", padding: "10px 14px", fontSize: 12 }}
              >
                <span className="text-ink" style={{ fontWeight: 500 }}>{photo.name}</span>
                {"  "}
                <span>{(photo.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : null}

            {errors.photo ? (
              <p style={{ fontSize: 13, color: "var(--error)" }}>{errors.photo}</p>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 2: Items ────────────────────────────────────────────────── */}
        {currentStep === 2 ? (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className="border border-line bg-white"
                style={{ borderRadius: "1.5rem", padding: "16px" }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <p className="text-mute" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    item {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="flex items-center justify-center border border-line text-mute transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderRadius: "99px", height: 28, padding: "0 12px", fontSize: 12 }}
                  >
                    remove
                  </button>
                </div>

                <div className="flex flex-col" style={{ gap: 10 }}>
                  <InputField
                    label="brand"
                    optional
                    value={item.brand}
                    placeholder="e.g. Zara, vintage, thrift"
                    onChange={(v) => updateItem(item.id, "brand", v)}
                  />
                  <InputField
                    label="category"
                    value={item.category}
                    placeholder="top, trousers, shoes, bag…"
                    error={errors.itemCategories[item.id]}
                    onChange={(v) => updateItem(item.id, "category", v)}
                  />
                  <InputField
                    label="color"
                    optional
                    value={item.color}
                    placeholder="black, ivory, blush…"
                    onChange={(v) => updateItem(item.id, "color", v)}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="flex items-center justify-center border border-dashed border-line text-mute transition hover:border-ink hover:text-ink"
              style={{ borderRadius: "1.5rem", height: 52, fontSize: 13, fontWeight: 500, gap: 6 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              add another item
            </button>

            {errors.items ? (
              <p style={{ fontSize: 13, color: "var(--error)" }}>{errors.items}</p>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 3: Context ──────────────────────────────────────────────── */}
        {currentStep === 3 ? (
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div>
              <p className="field-label">caption <span className="font-normal normal-case tracking-normal text-mute">(optional)</span></p>
              <textarea
                className="w-full resize-none rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pink-deep focus:ring-2 focus:ring-pink/40"
                style={{ minHeight: 96 }}
                value={metadata.caption}
                placeholder="What was the vibe? Where were you going?"
                onChange={(e) => updateMetadata("caption", e.target.value)}
              />
            </div>

            <InputField
              label="event"
              optional
              value={metadata.eventName}
              placeholder="birthday dinner, rooftop, Sunday coffee…"
              onChange={(v) => updateMetadata("eventName", v)}
            />

            <div>
              <p className="field-label">date worn <span className="ml-1 font-normal normal-case tracking-normal text-mute">(optional)</span></p>
              <EventDatePicker value={metadata.wornOn} onChange={(v) => updateMetadata("wornOn", v)} />
            </div>

          </div>
        ) : null}

        {/* ── Step 4: Review ───────────────────────────────────────────────── */}
        {currentStep === 4 ? (
          <div className="flex flex-col" style={{ gap: 12 }}>
            {/* Photo thumbnail */}
            <div
              className="overflow-hidden bg-pink-soft"
              style={{ borderRadius: "1.5rem", aspectRatio: "4/5", width: "100%", maxHeight: 320, objectFit: "cover" }}
            >
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Outfit review"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", maxHeight: 320 }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-mute" style={{ fontSize: 13 }}>
                  No photo
                </div>
              )}
            </div>

            {/* Items summary */}
            <div
              className="border border-line bg-white"
              style={{ borderRadius: "1.5rem", padding: "16px" }}
            >
              <p className="text-mute" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10 }}>
                tagged items
              </p>
              <div className="flex flex-col" style={{ gap: 6 }}>
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-line bg-paper"
                    style={{ borderRadius: "0.9rem", padding: "8px 12px" }}
                  >
                    <p style={{ fontSize: 11, color: "var(--mute)", marginBottom: 2 }}>item {index + 1}</p>
                    <p style={{ fontSize: 13, color: "var(--ink)" }}>
                      {[item.brand.trim(), item.category.trim(), item.color.trim()].filter(Boolean).join(" · ") || "missing details"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata summary */}
            {(metadata.caption || metadata.eventName || metadata.wornOn) ? (
              <div
                className="border border-line bg-white"
                style={{ borderRadius: "1.5rem", padding: "16px" }}
              >
                <p className="text-mute" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10 }}>
                  context
                </p>
                <div className="flex flex-col" style={{ gap: 4 }}>
                  {metadata.caption ? <p style={{ fontSize: 13, color: "var(--ink)" }}>"{metadata.caption}"</p> : null}
                  {metadata.eventName ? <p style={{ fontSize: 12, color: "var(--mute)" }}>{metadata.eventName}</p> : null}
                  {metadata.wornOn ? <p style={{ fontSize: 12, color: "var(--mute)" }}>{metadata.wornOn}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Bottom action bar ────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-line bg-paper"
        style={{ padding: "12px 20px 32px", display: "flex", gap: 10 }}
      >
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitState.status === "submitting"}
            className="flex items-center justify-center border border-line bg-white text-ink transition hover:border-ink disabled:opacity-40"
            style={{ borderRadius: "99px", height: 48, width: 48, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex flex-1 items-center justify-center bg-ink text-paper transition hover:opacity-90"
            style={{ borderRadius: "99px", height: 48, fontSize: 15, fontWeight: 600 }}
          >
            {currentStep === 1 ? "looks good" : currentStep === 2 ? "add context" : "review it"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitState.status === "submitting"}
            className="flex flex-1 items-center justify-center bg-ink text-paper transition hover:opacity-90 disabled:opacity-50"
            style={{ borderRadius: "99px", height: 48, fontSize: 15, fontWeight: 600 }}
          >
            {submitState.status === "submitting" ? "uploading…" : "post outfit"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared field helper ───────────────────────────────────────────────────────

function InputField({
  label,
  optional,
  value,
  placeholder,
  error,
  type = "text",
  onChange,
}: {
  label: string;
  optional?: boolean;
  value: string;
  placeholder?: string;
  error?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="field-label">
        {label}
        {optional ? <span className="ml-1 font-normal normal-case tracking-normal text-mute">(optional)</span> : null}
      </p>
      <div className={`field-shell ${error ? "border-error/60 bg-error/5" : ""}`}>
        <input
          type={type}
          className="field-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error ? (
        <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{error}</p>
      ) : null}
    </div>
  );
}
