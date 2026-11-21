"use client";

import React, { useEffect, useState } from "react";

type F1TeamId =
  | "default"
  | "ferrari"
  | "mercedes"
  | "redbull"
  | "mclaren"
  | "astonmartin";

const TEAM_CONFIG: Record<
  F1TeamId,
  {
    primary: string;
    secondary: string;
    orb1: string;
    orb2: string;
    orb3: string;
    label: string;
    imageSrc?: string;
  }
> = {
  default: {
    primary: "#0e84eb",
    secondary: "#025cbc",
    orb1: "#2A6F97",
    orb2: "#1B4965",
    orb3: "#468FAF",
    label: "ATLAS",
  },
  ferrari: {
    primary: "#dc0000",
    secondary: "#ffeb00",
    orb1: "#dc0000",
    orb2: "#990000",
    orb3: "#ff2800",
    label: "SCUDERIA FERRARI",
    imageSrc: "/watermarks/ferrari.png",
  },
  mercedes: {
    primary: "#00d2be",
    secondary: "#94a3b8",
    orb1: "#00d2be",
    orb2: "#0d9488",
    orb3: "#38bdf8",
    label: "MERCEDES-AMG",
    imageSrc: "/watermarks/mercedes.png",
  },
  redbull: {
    primary: "#1e41ff",
    secondary: "#facc15",
    orb1: "#1e41ff",
    orb2: "#101e82",
    orb3: "#ff1e00",
    label: "RED BULL RACING",
    imageSrc: "/watermarks/redbull.png",
  },
  mclaren: {
    primary: "#ff8000",
    secondary: "#00a0de",
    orb1: "#ff8000",
    orb2: "#d75500",
    orb3: "#00a0de",
    label: "MCLAREN F1",
    imageSrc: "/watermarks/mclaren.png",
  },
  astonmartin: {
    primary: "#006f62",
    secondary: "#cedc00",
    orb1: "#006f62",
    orb2: "#044c42",
    orb3: "#cedc00",
    label: "ASTON MARTIN",
    imageSrc: "/watermarks/astonmartin.png",
  },
};

const LOCKED_BG_CLASS =
  "fixed -inset-y-12 inset-x-0 pointer-events-none z-0 overflow-hidden select-none flex items-center justify-center [transform:translate3d(0,0,0)] [backface-visibility:hidden]";

function DefaultJapaneseWatermark() {
  return (
    <div aria-hidden="true" className={LOCKED_BG_CLASS}>
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

function F1TeamTopDownWatermark({ team }: { team: F1TeamId }) {
  const cfg = TEAM_CONFIG[team];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [team]);

  const showCustomRaster = Boolean(cfg.imageSrc) && !imageFailed;

  return (
    <div aria-hidden="true" className={LOCKED_BG_CLASS}>
      {/* Team-Colored Ambient Orbs */}
      <div
        style={{ backgroundColor: cfg.orb1 }}
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-[0.22] dark:opacity-[0.28] blur-3xl"
      />
      <div
        style={{ backgroundColor: cfg.orb2 }}
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-[0.20] dark:opacity-[0.26] blur-3xl"
      />
      <div
        style={{ backgroundColor: cfg.orb3 }}
        className="absolute bottom-8 left-10 w-72 h-72 rounded-full opacity-[0.18] dark:opacity-[0.22] blur-3xl"
      />

      {/* Full-Screen Vertical F1 Car Image */}
      {showCustomRaster ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
          <img
            src={cfg.imageSrc}
            alt=""
            onError={() => setImageFailed(true)}
            className="w-[115vh] h-[115vw] min-w-[115vh] min-h-[115vw] max-w-none object-cover -rotate-90 opacity-[0.34] dark:opacity-[0.38]"
          />
        </div>
      ) : (
        <svg
          viewBox="0 0 600 840"
          fill="none"
          className="relative z-0 h-[92vh] w-auto max-w-none opacity-[0.26] dark:opacity-[0.30]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={cfg.primary} strokeWidth="2.4" strokeLinejoin="round">
            <rect
              x="198"
              y="84"
              width="204"
              height="52"
              rx="8"
              fill={cfg.primary}
              fillOpacity="0.24"
            />
            <rect
              x="142"
              y="140"
              width="54"
              height="98"
              rx="14"
              fill={cfg.primary}
              fillOpacity="0.28"
            />
            <rect
              x="404"
              y="140"
              width="54"
              height="98"
              rx="14"
              fill={cfg.primary}
              fillOpacity="0.28"
            />
            <path
              d="M255 136H345L368 248L385 378L352 548L322 658H278L248 548L215 378L232 248L255 136Z"
              fill={cfg.primary}
              fillOpacity="0.16"
            />
            <rect
              x="154"
              y="534"
              width="46"
              height="88"
              rx="12"
              fill={cfg.primary}
              fillOpacity="0.28"
            />
            <rect
              x="400"
              y="534"
              width="46"
              height="88"
              rx="12"
              fill={cfg.primary}
              fillOpacity="0.28"
            />
            <path
              d="M148 674H452L464 716H395L382 698H218L205 716H136L148 674Z"
              fill={cfg.primary}
              fillOpacity="0.24"
            />
          </g>
        </svg>
      )}

      {/* Square Engineering Grid Layered ON TOP of the F1 Car */}
      <svg
        className="absolute inset-0 z-10 w-full h-full opacity-[0.22] dark:opacity-[0.20]"
        style={{ color: cfg.primary }}
        viewBox="0 0 600 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={`f1-square-grid-${team}`}
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 44 0 L 0 0 0 44"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <circle cx="0" cy="0" r="1.4" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="600" height="1000" fill={`url(#f1-square-grid-${team})`} />
      </svg>
    </div>
  );
}

export default function TelemetryWatermark() {
  const [f1Team, setF1Team] = useState<F1TeamId>("default");

  useEffect(() => {
    const readTeam = () => {
      const attr = document.documentElement.dataset.f1Team as
        | F1TeamId
        | undefined;
      if (attr && attr in TEAM_CONFIG) {
        setF1Team(attr);
      } else {
        const saved = localStorage.getItem(
          "atlas_f1_team_theme",
        ) as F1TeamId | null;
        if (saved && saved in TEAM_CONFIG) {
          setF1Team(saved);
        }
      }
    };

    readTeam();

    const observer = new MutationObserver(readTeam);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-f1-team"],
    });

    window.addEventListener("storage", readTeam);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", readTeam);
    };
  }, []);

  if (f1Team === "default") {
    return <DefaultJapaneseWatermark />;
  }

  return <F1TeamTopDownWatermark team={f1Team} />;
}
