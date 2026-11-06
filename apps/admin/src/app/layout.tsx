import type { Metadata, Viewport } from "next";
import { Exo_2, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// All three families ship a Cyrillic subset — required for Mongolian text.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
  display: "swap",
});

const display = Exo_2({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Хүргэлтийн удирдлага", template: "%s · Хүргэлтийн удирдлага" },
  description: "Хүргэлтийн удирдлагын систем — админ",
};

export const viewport: Viewport = { themeColor: "#06050f", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`dark ${inter.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
