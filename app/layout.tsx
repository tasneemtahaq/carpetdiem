import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Jost } from "next/font/google";
import "./gallery.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif",
});
const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-sans",
});
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bodoni",
});

export const metadata: Metadata = {
  title: "Carpet Diem — Gallery",
  description: "An immersive gallery of handmade carpet art.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${bodoni.variable}`}>{children}</body>
    </html>
  );
}