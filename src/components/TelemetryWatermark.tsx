"use client";

import React from "react";

export default function TelemetryWatermark() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none flex items-center justify-center"
    >
      {/* Ambient Light Orbs Behind the Frosted Liquid Glass */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#2A6F97] opacity-[0.20] dark:opacity-[0.26] blur-3xl" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#1B4965] opacity-[0.16] dark:opacity-[0.22] blur-3xl" />
      <div className="absolute bottom-8 left-10 w-72 h-72 rounded-full bg-[#468FAF] opacity-[0.16] dark:opacity-[0.20] blur-3xl" />

      <svg
        className="w-full h-full text-[var(--text-main)] opacity-[0.16] dark:opacity-[0.15]"
        viewBox="0 0 600 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Fine Engineering Grid */}
        <defs>
          <pattern
            id="atlas-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="0" cy="0" r="1.3" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="600" height="1000" fill="url(#atlas-grid)" />

        {/* Vertical Wind-Tunnel Streamlines */}
        <path
          d="M95 -40 C95 240, 55 380, 70 620 C80 800, 105 920, 100 1040"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M505 -40 C505 240, 545 380, 530 620 C520 800, 495 920, 500 1040"
          stroke="currentColor"
          strokeWidth="2.2"
        />

        {/* Vertical Bold Japanese Watermark Centered for Mobile */}
        <g transform="translate(300, 500) rotate(90)">
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            fontSize="126"
            fontWeight="900"
            letterSpacing="12"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            アトラス // 01
          </text>
          <text
            x="0"
            y="82"
            textAnchor="middle"
            fill="currentColor"
            fontSize="19"
            fontWeight="800"
            letterSpacing="14"
          >
            AERO TELEMETRY
          </text>
        </g>

        {/* Subtle Circuit Curve (Bottom) */}
        <path
          d="M160 860 C210 810, 280 805, 320 845 C360 885, 420 840, 450 795"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="10 7"
        />
      </svg>
    </div>
  );
}
