import type { Metadata, Viewport } from "next";
import { outfit, spaceGrotesk, caveat, playfair } from "@/lib/fonts";
import AppProviders from "@/components/providers/AppProviders";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sonara.app"),
  title: {
    default: "SONARA — Your Music. Your Aura.",
    template: "%s · SONARA",
  },
  description:
    "Turn your songs, playlists, and listening history into shareable visual auras — story cards, grids, stickers and more.",
  applicationName: "SONARA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SONARA",
  },
  openGraph: {
    title: "SONARA — Your Music. Your Aura.",
    description:
      "Turn your songs, playlists, and listening history into shareable visual auras.",
    type: "website",
    siteName: "SONARA",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceGrotesk.variable} ${caveat.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Loaded in addition to next/font: the canvas renderer needs the literal
            font-family names below (next/font only exposes hashed CSS vars) so
            exported PNGs use the same Caveat/Space Grotesk/Playfair as the DOM. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Caveat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>
          <Navbar />
          <div className="flex-1">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
