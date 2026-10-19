import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三角洲装备商店 · 商品客服",
  description: "固定价格商品目录、数据库管理与只读商品客服。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
