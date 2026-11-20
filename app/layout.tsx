import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed } from "next/font/google";
import { COMPANY, SEO, SITE_URL } from "@/lib/site";
import "./globals.css";

// Tall, heavy condensed display face for headlines.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
// Condensed companion for labels, buttons and UI.
const condensed = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-barlow-condensed" });
// Readable body face from the same family.
const sans = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-barlow" });

// Icons (favicon.ico, icon.png, apple-icon.png), the share image (opengraph-image.jpg),
// manifest, robots and sitemap are file conventions in this folder and are linked automatically.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SEO.title, template: `%s | ${COMPANY.name}` },
  description: SEO.description,
  keywords: [...SEO.keywords],
  applicationName: COMPANY.name,
  authors: [{ name: COMPANY.legalName }],
  creator: COMPANY.legalName,
  publisher: COMPANY.legalName,
  category: "health",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: COMPANY.name,
    title: SEO.title,
    description: SEO.description,
  },
  twitter: { card: "summary_large_image", title: SEO.title, description: SEO.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
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
