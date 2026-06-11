/**
 * Shared helpers for client-side image uploads: HEIC/HEIF normalization,
 * file-type validation, size formatting, and idempotency keys.
 *
 * Used by the main upload flow and the board upload page so the two stay in
 * sync.
 */

/** Max upload size enforced client-side (the server enforces its own limit too). */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Convert HEIC/HEIF photos (e.g. iOS Live Photos) to JPEG so browsers and the
 * server can handle them. Other formats pass through untouched.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif" || (type === "" && file.name.toLowerCase().endsWith(".heic"))) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
  }
  return file;
}

/**
 * Whether a file looks like an image we accept — any `image/*` MIME type, or a
 * `.heic` / `.heif` extension (some browsers report an empty type for those).
 */
export function isImageFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || name.endsWith(".heic") || name.endsWith(".heif");
}

/** Human-readable file size, e.g. "3.42 MB". */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Create a fresh idempotency key for an outfit-create request. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}
