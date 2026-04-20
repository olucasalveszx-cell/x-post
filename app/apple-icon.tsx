import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
        }}
      >
        {/* Glow center */}
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Sparkle star */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 2 L18.2 13 L29 16 L18.2 19 L16 30 L13.8 19 L3 16 L13.8 13 Z"
            fill="white"
          />
        </svg>

        {/* Dot accents */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 28,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
