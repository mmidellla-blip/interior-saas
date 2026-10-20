import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({
  variable: "--font-noto",
  weight: ["400", "500", "700", "800"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "집공방 — 수수료 없는 내 고객 관리",
    template: "%s",
  },
  description:
    "소규모 인테리어 업체가 플랫폼 수수료 없이 내 고객을 직접 받고, 계약하고, 관리하는 도구. 견적 계산기, 미니룸 꾸미기, 현장 공유, 포트폴리오.",
};

export const viewport: Viewport = {
  themeColor: "#2f5d4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${noto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
