import type { Metadata, Viewport } from "next";
import { Newsreader, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

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
    // The font variables must land on <html>, not <body>: globals.css
    // maps them into the Tailwind theme from :root, and a variable
    // defined one level lower resolves to nothing there — which silently
    // renders the whole app in fallback serif.
    <html lang="en" className={`${newsreader.variable} ${atkinson.variable}`}>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
