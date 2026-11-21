import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import TelemetryWatermark from "@/components/TelemetryWatermark";
import LaunchSplash from "@/components/LaunchSplash";

export const metadata: Metadata = {
  title: "Atlas — Telemetry, Mileage & Garage",
  description: "Minimal F1-inspired car telemetry, mileage & garage app",
  applicationName: "Atlas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Atlas",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e2edf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b151e" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-f1-team="default">
      <body className="fixed inset-0 overflow-hidden select-none sm:select-auto">
        <AppProvider>
          <LaunchSplash />
          <TelemetryWatermark />
          <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain flex flex-col [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
            <Navbar />
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-28">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
