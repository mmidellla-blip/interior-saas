"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { RoomConfig } from "@/lib/types";

const Room3D = dynamic(() => import("./Room3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">3D 화면을 불러오는 중…</div>,
});

/**
 * 미니홈피의 방 보기. 처음엔 서버에서 그린 2D(children)를 보여 주고, 누르면 3D로 둘러본다.
 * id는 "이미지 저장"이 2D 그림을 찾을 때 쓴다.
 */
export default function ShowroomViewer({ id, room, children }: { id: string; room: RoomConfig; children: React.ReactNode }) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#f4efe6] to-[#ebe4d8]">
      <div className="absolute top-3 left-3 z-10 flex rounded-full bg-white/85 p-1 text-xs font-semibold shadow-sm backdrop-blur">
        {(["2d", "3d"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-3 py-1.5 ${view === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {v === "2d" ? "미니룸" : "3D로 둘러보기"}
          </button>
        ))}
      </div>
      <div id={id} className={view === "2d" ? "p-3 pt-14 sm:p-5 sm:pt-14" : "hidden"}>
        {children}
      </div>
      {view === "3d" && (
        <div className="aspect-[4/3] w-full">
          <Room3D room={room} preset="default" />
        </div>
      )}
    </div>
  );
}
