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
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(145deg, #0b2942 0%, #025cbc 55%, #0e84eb 100%)",
        borderRadius: "40px",
      }}
    >
      <svg
        width="116"
        height="116"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.5 24.5A11 11 0 1 1 27.5 24.5"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M11 13.5L12.6 15.1"
          stroke="#bae0fd"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M18 10V12.2"
          stroke="#bae0fd"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M25 13.5L23.4 15.1"
          stroke="#bae0fd"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M18 21.5L24.5 14"
          stroke="#ffffff"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <circle cx="18" cy="21.5" r="2.5" fill="#ffffff" />
        <path
          d="M12.5 26.5H23.5"
          stroke="#ffffff"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
