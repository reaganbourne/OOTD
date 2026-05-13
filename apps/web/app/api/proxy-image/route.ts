import { type NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

/**
 * GET /api/proxy-image?url=<encoded-url>
 *
 * Fetches an image server-side and returns it with CORS headers so the
 * client-side Canvas can draw it without being tainted. Needed because
 * S3 buckets don"t ship CORS headers by default, and setting
 * crossOrigin="anonymous" on an <img> causes the browser to reject the
 * response, firing onerror instead of onload.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return new NextResponse("Only HTTPS image URLs are allowed", { status: 400 });
  }

  if (parsed.username || parsed.password) {
    return new NextResponse("Image URL credentials are not allowed", { status: 400 });
  }

  const allowed =
    parsed.hostname.endsWith(".amazonaws.com") ||
    parsed.hostname.endsWith(".cloudfront.net");

  if (!allowed) {
    return new NextResponse("Origin not allowed", { status: 403 });
  }

  const abort = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), { cache: "force-cache", signal: abort });
  } catch {
    return new NextResponse("Upstream fetch timed out or failed", { status: 504 });
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return new NextResponse("Upstream response is not an image", { status: 415 });
  }

  const contentLength = Number(upstream.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_IMAGE_BYTES) {
    return new NextResponse("Image too large", { status: 413 });
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return new NextResponse("Image too large", { status: 413 });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, immutable"
    }
  });
}
