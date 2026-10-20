"use client";

import { useEffect, useState } from "react";

export interface GalleryPhoto {
  id: string;
  src: string;
  caption: string;
  label?: string;
}

/** 사진 격자 + 눌러서 크게 보기 */
export default function PhotoGallery({ photos, columns = 3 }: { photos: GalleryPhoto[]; columns?: 2 | 3 }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : Math.min(photos.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : Math.max(0, i - 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className={`grid grid-cols-2 gap-2 ${columns === 3 ? "sm:grid-cols-3" : ""}`}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.caption || "현장 사진"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {photo.label && <span className="chip absolute top-2 left-2 bg-black/55 text-white">{photo.label}</span>}
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.src} alt={current.caption} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          <p className="mt-3 text-center text-sm text-white/90">
            {current.label && <span className="mr-2 font-semibold">{current.label}</span>}
            {current.caption}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {open! + 1} / {photos.length} · 화면을 누르면 닫힙니다
          </p>
        </div>
      )}
    </>
  );
}
