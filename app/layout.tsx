import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Real or Fake News — Headline Guessing Game",
  description: "Real headline or AI-generated fake? Trust your gut and build a streak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-neutral-950 font-display text-neutral-50 selection:bg-amber-400 selection:text-neutral-950">
        {children}
      </body>
    </html>
  );
}
