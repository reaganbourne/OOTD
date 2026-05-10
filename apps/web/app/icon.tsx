import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#F9A8D4",
          borderRadius: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 100,
            fontSize: 148,
            color: "#FAF9F5",
            letterSpacing: "-4px",
            lineHeight: 1,
            marginTop: 8
          }}
        >
          c.
        </span>
      </div>
    ),
    { ...size }
  );
}
