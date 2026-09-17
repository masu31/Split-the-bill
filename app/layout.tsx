import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "割り勘アプリ（研究室用）",
  description: "研究室向けの学年重み付き割り勘アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
