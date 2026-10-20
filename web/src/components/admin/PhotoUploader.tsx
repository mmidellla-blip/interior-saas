"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPhotos } from "@/lib/admin-actions";
import { PHOTO_KIND_LABEL, STAGES, type PhotoKind, type Stage } from "@/lib/types";

const MAX_SIDE = 1600;

/**
 * 캔버스에 다시 그려 JPEG로 만든다. 크기를 줄이고, EXIF(GPS 위치 포함)는 새 파일에 따라오지 않는다.
 * 폰 사진의 회전 정보는 createImageBitmap이 반영한다.
 */
async function resize(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/jpeg", 0.82),
  );
  return { blob, width, height };
}

export default function PhotoUploader({ projectId, defaultStage }: { projectId: string; defaultStage?: Stage }) {
  const [stage, setStage] = useState<Stage>(defaultStage ?? STAGES[0]);
  const [kind, setKind] = useState<PhotoKind>("progress");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const albumRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...added]);
    setMessage(null);
  }

  function upload() {
    startTransition(async () => {
      setMessage("사진을 줄이는 중…");
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("stage", stage);
      form.set("kind", kind);
      form.set("caption", caption);
      for (const { file } of files) {
        try {
          const { blob, width, height } = await resize(file);
          form.append("photos", blob, "photo.jpg");
          form.append("sizes", `${width}x${height}`);
        } catch {
          // 열 수 없는 형식(일부 HEIC 등)은 건너뛴다
        }
      }
      setMessage("올리는 중…");
      const result = await uploadPhotos(form);
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setCaption("");
      setMessage(result.error ? `${result.count}장 올림 · ${result.error}` : `${result.count}장 올렸습니다 ✓`);
    });
  }

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">사진 올리기</h2>
        <span className="text-xs text-muted">위치정보는 자동으로 지워집니다</span>
      </div>

      <div className="flex gap-1 rounded-xl bg-paper p-1">
        {(Object.keys(PHOTO_KIND_LABEL) as PhotoKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${kind === k ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {PHOTO_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div>
        <p className="label">공정</p>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                stage === s ? "border-brand bg-brand text-white" : "border-line bg-surface"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <input
        className="input"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="한 줄 설명 (예: 거실 배선 교체 완료)"
        maxLength={200}
      />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-outline py-3" onClick={() => cameraRef.current?.click()}>
          📷 바로 찍기
        </button>
        <button type="button" className="btn-outline py-3" onClick={() => albumRef.current?.click()}>
          🖼 앨범에서 고르기
        </button>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {files.map(({ file, url }, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white"
                aria-label="빼기"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn-primary w-full py-3 text-base" disabled={!files.length || pending} onClick={upload}>
        {pending ? "올리는 중…" : files.length ? `${files.length}장 올리기` : "사진을 골라 주세요"}
      </button>
      {message && <p className="text-center text-sm text-muted">{message}</p>}
    </div>
  );
}
