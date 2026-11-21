import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: "42px",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 72% 68%, rgba(162, 198, 228, 0.92) 0%, rgba(124, 166, 204, 0.9) 54%, rgba(98, 142, 184, 0.95) 100%)",
        boxShadow:
          "inset 0 3px 4px rgba(255, 255, 255, 0.68), inset 0 -3px 6px rgba(255, 255, 255, 0.24)",
      }}
    >
      {/* Top Curved Glass Highlight */}
      <div
        style={{
          position: "absolute",
          top: "-39px",
          left: "-28px",
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
          left: "11px",
          right: "11px",
          bottom: "4px",
          height: "24%",
          borderBottomLeftRadius: "39px",
          borderBottomRightRadius: "39px",
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />

      {/* ~70% Coverage 2/3-Circle Arc & Needle */}
      <svg
        width="112"
        height="90"
        viewBox="0 0 36 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", zIndex: 10 }}
      >
        <path
          d="M6.5 22.5A12.5 12.5 0 1 1 29.5 22.5"
          stroke="#ffffff"
          strokeOpacity="0.88"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path
          d="M18 17.5L25.5 10.5"
          stroke="#ffffff"
          strokeOpacity="0.95"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </svg>

      {/* ATLAS Label */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "-4px",
          fontSize: "25px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: "rgba(255, 255, 255, 0.88)",
          lineHeight: 1,
        }}
      >
        ATLAS
      </div>
    </div>,
    { ...size },
  );
}
