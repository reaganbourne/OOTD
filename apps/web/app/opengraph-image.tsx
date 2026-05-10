import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#F9A8D4",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 400,
            fontSize: 160,
            color: "#FAF9F5",
            letterSpacing: "-4px",
            lineHeight: 1
          }}
        >
          checkd.
        </span>
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 400,
            fontSize: 32,
            color: "#FAF9F5",
            opacity: 0.8,
            letterSpacing: "0.5px"
          }}
        >
          your daily fit, kept close, shared with the girls.
        </span>
      </div>
    ),
    { ...size }
  );
}
