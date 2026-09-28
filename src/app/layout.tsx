import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Literata } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Literata carries Cyrillic, which ACT's Newsreader does not: every heading
// here is Russian. It is also the serif of the «Образ жизни 40 → 80» page.
const literata = Literata({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Way of Life",
  description: "Образ жизни 40 → 80",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${literata.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
