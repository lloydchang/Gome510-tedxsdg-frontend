// File: src/app/layout.tsx
import ObservabilityWrapper from "./components/ObservabilityWrapper";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TEDxSDG: Non-profit Tool Advancing the United Nations Sustainable Development Goals (SDGs)",
  description: "Contribute to the UN's SDGs by providing AI-powered tools for inspiration, planning, and funding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ObservabilityWrapper />
        {children}
      </body>
    </html>
  );
}
