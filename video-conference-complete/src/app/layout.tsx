// ====================================
// Root Layout
// ====================================

import type { Metadata } from "next";
import { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "화상회의 솔루션",
  description: "WebRTC 기반 완전한 화상회의 플랫폼",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <meta name="description" content="화상회의 솔루션" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="bg-dark text-white">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
