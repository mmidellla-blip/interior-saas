import type { MetadataRoute } from "next";

/** 사장님 폰 홈 화면에 추가해 현장 앱처럼 쓰는 PWA */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "집공방 현장 관리",
    short_name: "집공방",
    description: "문의·현장 사진·포트폴리오를 폰으로 관리",
    start_url: "/admin",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#2f5d4a",
    lang: "ko",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
