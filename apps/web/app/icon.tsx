import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const fraunces = await fetch(
    "https://fonts.gstatic.com/s/fraunces/v31/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemj--yRYibk.woff2"
  ).then((res) => res.arrayBuffer());

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
            fontFamily: "Fraunces",
            fontWeight: 100,
            fontSize: 148,
            color: "#FAF9F5",
            letterSpacing: "-2px",
            lineHeight: 1,
            marginTop: 8
          }}
        >
          checkd.
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces,
          weight: 100,
          style: "normal"
        }
      ]
    }
  );
}
