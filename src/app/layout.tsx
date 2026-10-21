import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./molo.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import { VisitCounter } from "./analytics";

export const metadata: Metadata = {
  title: "Molaro",
  description: "Dental ordering made easy.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Molaro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2ede1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // "Paper, native" everywhere: the phone's own font, nothing to
    // download. Newsreader and Atkinson are retired.
    <html lang="en">
      <body className="ui-native antialiased">
        {children}
        <ServiceWorkerRegistration />
        <VisitCounter />
      </body>
    </html>
  );
}
