"use client";

import { useState } from "react";

/** 공사 전·후 사진을 겹쳐 놓고 손잡이를 끌어 비교한다. */
export default function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] select-none overflow-hidden rounded-2xl bg-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} 완공 후`} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} 공사 전`} className="h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-bold text-ink shadow-lg">
          ⇆
        </div>
      </div>
      <span className="chip absolute top-3 left-3 bg-black/60 text-white">공사 전</span>
      <span className="chip absolute top-3 right-3 bg-brand text-white">완공 후</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        aria-label="공사 전후 비교 위치"
      />
    </div>
  );
}
