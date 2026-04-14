"use client";

import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

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

const steps: Array<{ id: Step; label: string; title: string; hint: string }> = [
  {
    id: 1,
    label: "Photo",
    title: "Start with the fit photo",
    hint: "Pick the image that will anchor the whole outfit record."
  },
  {
    id: 2,
    label: "Items",
    title: "Tag what you wore",
    hint: "Add one row per item so future search, AI, and feed cards have structure."
  },
  {
    id: 3,
    label: "Context",
    title: "Add optional context",
    hint: "Caption, event name, and date worn make the archive more useful later."
  },
  {
    id: 4,
    label: "Review",
    title: "Review before you submit",
    hint: "Confirm the image, order, and metadata before the upload gets staged."
  }
];

function createItem(): UploadItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    brand: "",
    category: "",
    color: ""
  };
}

function createEmptyErrors(): ValidationErrors {
  return {
    itemCategories: {}
  };
}

export function UploadFlow() {
  const router = useRouter();
  const inputId = useId();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([createItem()]);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    caption: "",
    eventName: "",
    wornOn: ""
  });
  const [errors, setErrors] = useState<ValidationErrors>(createEmptyErrors);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  function resetStatus() {
    if (submitState.status !== "idle") {
      setSubmitState({ status: "idle" });
    }
  }

  function setErrorState(next: Partial<ValidationErrors>) {
    setErrors({
      ...createEmptyErrors(),
      ...next,
      itemCategories: next.itemCategories ?? {}
    });
  }

  function validateStep(step: Step): boolean {
    if (step === 1) {
      if (!photo) {
        setErrorState({
          photo: "Choose a fit photo before you move to the next step.",
          form: "A photo is required to create an outfit post."
        });
        return false;
      }

      setErrors(createEmptyErrors());
      return true;
    }

    if (step === 2) {
      if (items.length === 0) {
        setErrorState({
          items: "Add at least one clothing item before you continue.",
          form: "Your outfit needs at least one tagged item."
        });
        return false;
      }

      const itemCategories = items.reduce<Record<string, string>>((accumulator, item) => {
        if (!item.category.trim()) {
          accumulator[item.id] = "Category is required.";
        }
        return accumulator;
      }, {});

      if (Object.keys(itemCategories).length > 0) {
        setErrorState({
          items: "Every item needs a category before you continue.",
          form: "Fix the highlighted item rows before moving on.",
          itemCategories
        });
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

    if (!nextFile) {
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setErrorState({
        photo: "Choose an image file so the preview and upload flow can continue.",
        form: "Only image files are supported in this upload flow."
      });
      event.target.value = "";
      return;
    }

    setPhoto(nextFile);
    setErrors(createEmptyErrors());
  }

  function updateItem(itemId: string, field: keyof Omit<UploadItem, "id">, value: string) {
    resetStatus();
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );

    setErrors((current) => {
      if (field !== "category") {
        return current;
      }

      const nextItemCategories = { ...current.itemCategories };
      delete nextItemCategories[itemId];

      return {
        ...current,
        items: undefined,
        form: undefined,
        itemCategories: nextItemCategories
      };
    });
  }

  function addItem() {
    resetStatus();
    setItems((current) => [...current, createItem()]);
    setErrors((current) => ({
      ...current,
      items: undefined,
      form: undefined
    }));
  }

  function removeItem(itemId: string) {
    resetStatus();
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== itemId)
    );
    setErrors((current) => {
      const nextItemCategories = { ...current.itemCategories };
      delete nextItemCategories[itemId];

      return {
        ...current,
        itemCategories: nextItemCategories
      };
    });
  }

  function updateMetadata(field: keyof UploadMetadata, value: string) {
    resetStatus();
    setMetadata((current) => ({
      ...current,
      [field]: value
    }));
  }

  function goToStep(nextStep: Step) {
    setCurrentStep(nextStep);
    resetStatus();
  }

  function handleNext() {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 4) {
      goToStep((currentStep + 1) as Step);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as Step);
    }
  }

  async function handleSubmit() {
    if (!validateStep(1) || !photo) {
      setCurrentStep(1);
      setSubmitState({
        status: "error",
        message: "Fix the required photo and item tags before you submit."
      });
      return;
    }

    if (!validateStep(2)) {
      setCurrentStep(2);
      setSubmitState({
        status: "error",
        message: "Fix the required photo and item tags before you submit."
      });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const payload = {
        clothing_items: items.map((item, index) => {
          const nextItem: {
            brand?: string;
            category: string;
            color?: string;
            display_order: number;
          } = {
            category: item.category.trim(),
            display_order: index
          };

          if (item.brand.trim()) {
            nextItem.brand = item.brand.trim();
          }

          if (item.color.trim()) {
            nextItem.color = item.color.trim();
          }

          return nextItem;
        })
      } as {
        caption?: string;
        event_name?: string;
        worn_on?: string;
        clothing_items: Array<{
          brand?: string;
          category: string;
          color?: string;
          display_order: number;
        }>;
      };

      if (metadata.caption.trim()) {
        payload.caption = metadata.caption.trim();
      }

      if (metadata.eventName.trim()) {
        payload.event_name = metadata.eventName.trim();
      }

      if (metadata.wornOn) {
        payload.worn_on = metadata.wornOn;
      }

      const result = await apiClient.outfits.create({
        image: photo,
        metadata: payload
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      setSubmitState({
        status: "success",
        message: "Outfit uploaded. Your vault is ready for the new look."
      });
      window.setTimeout(() => {
        router.push("/vault");
      }, 900);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't upload this outfit right now. Please try again.";

      setSubmitState({
        status: "error",
        message
      });
    }
  }

  const currentConfig = steps.find((step) => step.id === currentStep) ?? steps[0];

  return (
    <section className="soft-panel overflow-hidden">
      <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
        <aside className="bg-brand-glow px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-10">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
            Four-step flow
          </p>
          <h2 className="mt-3 text-4xl leading-tight text-ink">
            Build the outfit once, then reuse it everywhere.
          </h2>
          <p className="mt-4 text-sm leading-6 text-plum/82">
            This upload flow posts the same structured payload the backend uses for the
            vault, feed, event boards, and AI features.
          </p>

          <div className="mt-8 grid gap-3">
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep) {
                      goToStep(step.id);
                    }
                  }}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-plum/30 bg-white/85 shadow-card"
                      : isComplete
                        ? "border-plum/12 bg-white/70"
                        : "border-plum/10 bg-white/45"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-plum/72">
                      Step {step.id}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${
                        isActive
                          ? "bg-plum text-white"
                          : isComplete
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-white/75 text-plum/70"
                      }`}
                    >
                      {isComplete ? "Done" : step.label}
                    </span>
                  </div>
                  <p className="mt-3 text-lg text-ink">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-plum/80">{step.hint}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                {currentConfig.label}
              </p>
              <h3 className="mt-2 text-4xl text-ink">{currentConfig.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-plum/82">
                {currentConfig.hint}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-plum/12 bg-cream/70 px-4 py-3 text-xs leading-5 text-plum/78">
              Mobile-first layout with real multipart upload wiring to the backend outfit
              contract.
            </div>
          </div>

          {errors.form ? <StatusBanner tone="error" message={errors.form} className="mt-6" /> : null}
          {submitState.status === "success" ? (
            <StatusBanner tone="success" message={submitState.message} className="mt-6" />
          ) : null}
          {submitState.status === "error" ? (
            <StatusBanner tone="error" message={submitState.message} className="mt-6" />
          ) : null}

          <div className="mt-6">
            {currentStep === 1 ? (
              <div className="grid gap-5 lg:grid-cols-[0.7fr_0.3fr]">
                <div className="rounded-[1.75rem] border border-dashed border-plum/20 bg-cream/55 p-4 sm:p-5">
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-white/80 shadow-card">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Outfit preview"
                        className="aspect-[4/5] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(230,170,184,0.2),_transparent_45%),linear-gradient(180deg,_#fff8f5_0%,_#f8eef1_100%)] px-8 text-center">
                        <div>
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
                            Step 1
                          </p>
                          <h4 className="mt-3 text-3xl text-ink">Choose the hero image</h4>
                          <p className="mt-3 text-sm leading-6 text-plum/80">
                            Pick the photo that best captures the whole look. You can swap
                            it later before submitting.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor={inputId}
                      className="rounded-[1.25rem] bg-plum px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                    >
                      {photo ? "Replace photo" : "Choose photo"}
                    </label>
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                    <span className="text-xs leading-5 text-plum/74">
                      JPG, PNG, or HEIC-style camera uploads work best.
                    </span>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-plum/12 bg-white/75 p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                    Photo note
                  </p>
                  <h4 className="mt-3 text-2xl text-ink">Use the version you would actually post</h4>
                  <p className="mt-3 text-sm leading-6 text-plum/80">
                    The preview here drives the later review card, feed card, and story
                    export surfaces.
                  </p>

                  {photo ? (
                    <div className="mt-5 rounded-[1.25rem] border border-plum/12 bg-cream/70 px-4 py-4 text-sm leading-6 text-plum/82">
                      <p className="font-semibold text-ink">{photo.name}</p>
                      <p>{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : null}

                  {errors.photo ? (
                    <p className="mt-4 text-sm leading-6 text-[#9c425d]">{errors.photo}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-4">
                {items.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-[1.75rem] border border-plum/12 bg-white/78 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                          Item {index + 1}
                        </p>
                        <p className="mt-1 text-sm text-plum/78">display_order: {index}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="rounded-[1rem] border border-plum/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-plum/75 transition hover:bg-cream/65 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="field-shell">
                        <span className="field-label">Brand</span>
                        <input
                          className="field-input"
                          value={item.brand}
                          placeholder="Optional"
                          onChange={(event) => updateItem(item.id, "brand", event.target.value)}
                        />
                      </label>

                      <label
                        className={`field-shell ${
                          errors.itemCategories[item.id] ? "border-rose/80 bg-rose/10" : ""
                        }`}
                      >
                        <span className="field-label">Category</span>
                        <input
                          className="field-input"
                          value={item.category}
                          placeholder="Required"
                          onChange={(event) => updateItem(item.id, "category", event.target.value)}
                        />
                        {errors.itemCategories[item.id] ? (
                          <span className="mt-2 block text-xs text-[#9c425d]">
                            {errors.itemCategories[item.id]}
                          </span>
                        ) : null}
                      </label>

                      <label className="field-shell">
                        <span className="field-label">Color</span>
                        <input
                          className="field-input"
                          value={item.color}
                          placeholder="Optional"
                          onChange={(event) => updateItem(item.id, "color", event.target.value)}
                        />
                      </label>
                    </div>
                  </article>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-dashed border-plum/18 bg-cream/55 px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Need another row?</p>
                    <p className="text-sm leading-6 text-plum/78">
                      Add one item per tag so the order stays clean for the final payload.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-[1.25rem] bg-plum px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5c3049]"
                  >
                    Add item
                  </button>
                </div>

                {errors.items ? (
                  <p className="text-sm leading-6 text-[#9c425d]">{errors.items}</p>
                ) : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="grid gap-4">
                <label className="field-shell">
                  <span className="field-label">Caption</span>
                  <textarea
                    className="field-input min-h-32 resize-none"
                    value={metadata.caption}
                    placeholder="Optional caption for the post, memory, or story card."
                    onChange={(event) => updateMetadata("caption", event.target.value)}
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="field-shell">
                    <span className="field-label">Event name</span>
                    <input
                      className="field-input"
                      value={metadata.eventName}
                      placeholder="Birthday dinner, rooftop night, Sunday coffee..."
                      onChange={(event) => updateMetadata("eventName", event.target.value)}
                    />
                  </label>

                  <label className="field-shell">
                    <span className="field-label">Date worn</span>
                    <input
                      type="date"
                      className="field-input"
                      value={metadata.wornOn}
                      onChange={(event) => updateMetadata("wornOn", event.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-[1.5rem] border border-plum/12 bg-cream/55 px-4 py-4 text-sm leading-6 text-plum/80">
                  Context is optional now, but these fields make the vault, event boards,
                  and AI features much more useful later.
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="grid gap-5 lg:grid-cols-[0.52fr_0.48fr]">
                <div className="rounded-[1.75rem] border border-plum/12 bg-white/80 p-4 sm:p-5">
                  <div className="overflow-hidden rounded-[1.5rem] bg-cream/55 shadow-card">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Outfit review preview"
                        className="aspect-[4/5] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm leading-6 text-plum/78">
                        Add a photo in Step 1 to unlock the full review card.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <section className="rounded-[1.75rem] border border-plum/12 bg-white/78 p-5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                      Tagged items
                    </p>
                    <div className="mt-4 grid gap-3">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-[1.25rem] border border-plum/10 bg-cream/55 px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-plum/70">
                            Item {index + 1}
                          </p>
                          <p className="mt-2 text-sm text-ink">
                            {[item.brand.trim(), item.category.trim(), item.color.trim()]
                              .filter(Boolean)
                              .join(" / ") || "Missing details"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-plum/12 bg-white/78 p-5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                      Metadata
                    </p>
                    <div className="mt-4 grid gap-3 text-sm leading-6 text-plum/82">
                      <p>
                        <span className="font-semibold text-ink">Caption:</span>{" "}
                        {metadata.caption.trim() || "None yet"}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">Event:</span>{" "}
                        {metadata.eventName.trim() || "None yet"}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">Date worn:</span>{" "}
                        {metadata.wornOn || "Not set"}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-plum/12 bg-cream/65 p-5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-plum/70">
                      Submit mode
                    </p>
                    <p className="mt-3 text-sm leading-6 text-plum/82">
                      Submitting sends your image plus structured metadata to the real
                      create-outfit endpoint.
                    </p>
                  </section>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-plum/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1 || submitState.status === "submitting"}
                className="rounded-[1.25rem] border border-plum/15 bg-white/80 px-4 py-3 text-sm font-semibold text-plum transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back
              </button>

              <Link
                href="/vault"
                className="rounded-[1.25rem] border border-transparent px-4 py-3 text-sm font-semibold text-plum/78 transition hover:bg-cream/60"
              >
                Cancel
              </Link>
            </div>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-[1.35rem] bg-plum px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5c3049]"
              >
                Continue to {steps[currentStep].label}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={submitState.status === "submitting"}
                className="rounded-[1.35rem] bg-plum px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5c3049] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {submitState.status === "submitting" ? "Uploading outfit..." : "Submit outfit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBanner({
  tone,
  message,
  className = ""
}: {
  tone: "success" | "error";
  message: string;
  className?: string;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose/25 bg-rose/10 text-[#7f2947]";

  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${toneClasses} ${className}`}>
      {message}
    </div>
  );
}
