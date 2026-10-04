import type { Metadata, Viewport } from "next";
import "./globals.css";
import DeviceSettings from "@/components/DeviceSettings";

export const metadata: Metadata = {
  title: "BookQuest",
  description: "A family reading quest with Buddy, your reading friend.",
  appleWebApp: { capable: true, title: "BookQuest", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fbf5ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DeviceSettings />
        {children}
      </body>
    </html>
  );
}
