import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 72% 68%, rgba(162, 198, 228, 0.92) 0%, rgba(124, 166, 204, 0.9) 54%, rgba(98, 142, 184, 0.95) 100%)",
        boxShadow:
          "inset 0 1.5px 2px rgba(255, 255, 255, 0.68), inset 0 -1.5px 3px rgba(255, 255, 255, 0.24)",
      }}
    >
      {/* Top Curved Glass Highlight */}
      <div
        style={{
          position: "absolute",
          top: "-14px",
          left: "-10px",
          width: "135%",
          height: "68%",
          borderRadius: "100%",
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.05) 100%)",
        }}
      />

      {/* Soft Bottom Glass Glint */}
      <div
        style={{
          position: "absolute",
          left: "4px",
          right: "4px",
          bottom: "1.5px",
          height: "24%",
          borderBottomLeftRadius: "14px",
          borderBottomRightRadius: "14px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />

      {/* ~70% Coverage 2/3-Circle Translucent Liquid-Glass Arc, Needle & ATLAS */}
      <svg
        width="45"
        height="45"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", zIndex: 10 }}
      >
        <defs>
          <linearGradient
            id="faviconArc"
            x1="7.43"
            y1="5.3"
            x2="28.57"
            y2="23.6"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.84)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.36)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.68)" />
          </linearGradient>

          <linearGradient
            id="faviconNeedle"
            x1="18"
            y1="17.5"
            x2="25.9"
            y2="10.4"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.46)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.9)" />
          </linearGradient>
        </defs>

        <path
          d="M7.43 23.6A12.2 12.2 0 1 1 28.57 23.6"
          stroke="url(#faviconArc)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        <path
          d="M18 17.5L25.9 10.4"
          stroke="url(#faviconNeedle)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        <text
          x="18"
          y="29.2"
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.8)"
          fontSize="4.5"
          fontWeight="800"
          letterSpacing="0.55"
        >
          ATLAS
        </text>
      </svg>
    </div>,
    { ...size },
  );
}
