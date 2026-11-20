import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import WalkieTalkie from "@/components/WalkieTalkie";
import TelemetryWatermark from "@/components/TelemetryWatermark";
import LaunchSplash from "@/components/LaunchSplash";

export const metadata: Metadata = {
  title: "Atlas — Telemetry, Mileage & Garage",
  description: "Minimal F1-inspired car telemetry, mileage & convoy app",
  applicationName: "Atlas",
  appleWebApp: {
    capable: true,
    title: "Atlas",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col relative">
        <AppProvider>
          <LaunchSplash />
          <TelemetryWatermark />
          <Navbar />
          <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-28">
            {children}
          </main>
          <WalkieTalkie />
        </AppProvider>
      </body>
    </html>
  );
}
