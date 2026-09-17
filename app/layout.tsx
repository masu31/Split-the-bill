import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "./theme";

export const metadata: Metadata = {
  title: "割り勘アプリ（研究室用）",
  description:
    "グループごとに負担の重みを変えられる割り勘アプリ。立替額から各自の負担と送金額を自動計算します。",
  applicationName: "割り勘アプリ",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f16" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/*
          描画前に data-theme を立てて、テーマのちらつきを防ぐ。
          中身は theme.ts の固定文字列のみで、外部入力は混ざらない。
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
