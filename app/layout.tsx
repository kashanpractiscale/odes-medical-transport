import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Tall, heavy condensed display face for headlines.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
// Condensed companion for labels, buttons and UI.
const condensed = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-barlow-condensed" });
// Readable body face from the same family.
const sans = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Odes Medical Transportation",
  description:
    "Professional, compassionate non-emergency medical transportation from Odes Medical Transportation.",
};

export const viewport: Viewport = {
  themeColor: "#071211",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${condensed.variable} ${sans.variable} antialiased`}>
      <body className="min-h-full bg-ink font-sans text-white">{children}</body>
    </html>
  );
}
