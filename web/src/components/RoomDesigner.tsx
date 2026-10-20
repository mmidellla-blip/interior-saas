"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { clampArea, estimateByRoom, formatRange, formatWon } from "@/lib/estimate";
import {
  clampFurniture,
  DEFAULT_ROOM,
  defaultFurniture,
  findFurniture,
  findLayout,
  findOption,
  footprint,
  FURNITURE_GROUP_LABEL,
  FURNITURE_TYPES,
  LAYOUT_KIND_LABEL,
  MAX_FURNITURE,
  ROOM_ADDONS,
  ROOM_CATEGORIES,
  ROOM_LAYOUTS,
  type FurnitureGroup,
  type RoomCategoryId,
  type RoomLayout,
} from "@/lib/room";
import { GRADE_LABEL, type PlacedFurniture, type PriceItem, type RoomConfig } from "@/lib/types";
import LeadForm from "./LeadForm";
import type { CameraPreset } from "./Room3D";
import RoomScene, { FurnitureThumb, screenToFloor } from "./RoomScene";
import ShowroomPublish from "./ShowroomPublish";

// three.js는 무거우니 3D 보기를 누를 때만 불러온다.
const Room3D = dynamic(() => import("./Room3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">3D 화면을 불러오는 중…</div>,
});

const PRESET_LABEL: Record<CameraPreset, string> = {
  default: "전체",
  top: "위에서",
  kitchen: "주방",
  living: "거실",
};

type Tab = RoomCategoryId | "addons" | "layout" | "furniture";

/** 키보드 화살표: 화면에서 보이는 방향대로 움직이도록 방 좌표로 바꾼 값 */
const ARROW_STEP: Record<string, [number, number]> = {
  ArrowRight: [0.2, -0.2],
  ArrowLeft: [-0.2, 0.2],
  ArrowUp: [-0.2, -0.2],
  ArrowDown: [0.2, 0.2],
};

/** 구조 고르기 카드의 위에서 본 평면 */
function LayoutPlan({ layout }: { layout: RoomLayout }) {
  const { width: W, depth: D, notch } = layout;
  const k = 40 / 16;
  const corners = notch
    ? [
        [0, 0],
        [W, 0],
        [W, notch[1]],
        [notch[0], notch[1]],
        [notch[0], D],
        [0, D],
      ]
    : [
        [0, 0],
        [W, 0],
        [W, D],
        [0, D],
      ];
  return (
    <svg viewBox="-2 -2 44 44" className="mx-auto mb-2 h-12 w-12" aria-hidden>
      <polygon
        points={corners.map(([x, y]) => `${x * k},${y * k}`).join(" ")}
        fill="#e7d3bd"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RoomDesigner({
  slug,
  companyName,
  priceItems,
  initialRoom,
  fromId,
}: {
  slug: string;
  companyName: string;
  priceItems: PriceItem[];
  /** 집자랑에서 "따라 꾸미기"로 들어오면 그 방 */
  initialRoom?: RoomConfig;
  fromId?: string;
}) {
  const [room, setRoom] = useState<RoomConfig>(initialRoom ?? DEFAULT_ROOM);
  const [area, setArea] = useState(32);
  const [tab, setTab] = useState<Tab>(initialRoom ? "furniture" : "layout");
  const [group, setGroup] = useState<FurnitureGroup>(findLayout(room.layout).kind === "shop" ? "shop" : "living");
  const [panel, setPanel] = useState<"lead" | "show" | null>(null);
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [preset, setPreset] = useState<CameraPreset>("default");
  const [selected, setSelected] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    index: number;
    start: [number, number];
    origin: [number, number];
  } | null>(null);
  const result = useMemo(() => estimateByRoom(priceItems, area, room), [priceItems, area, room]);

  const category = ROOM_CATEGORIES.find((c) => c.id === tab) ?? null;

  const picked = selected != null ? room.furniture[selected] : undefined;

  function updateItem(index: number, patch: Partial<PlacedFurniture>) {
    setRoom((r) => ({
      ...r,
      furniture: r.furniture.map((f, i) => (i === index ? clampFurniture(r.layout, { ...f, ...patch }) : f)),
    }));
  }

  /** 제자리에서 90도 돌린다 */
  function rotateItem(index: number) {
    const item = room.furniture[index];
    const { x, y, w, d } = footprint(item);
    updateItem(index, {
      rot: item.rot + 1,
      x: x + w / 2 - d / 2,
      y: y + d / 2 - w / 2,
    });
  }

  function removeItem(index: number) {
    setRoom((r) => ({
      ...r,
      furniture: r.furniture.filter((_, i) => i !== index),
    }));
    setSelected(null);
  }

  function addItem(type: string) {
    if (room.furniture.length >= MAX_FURNITURE) return;
    const layout = findLayout(room.layout);
    const [w, d] = findFurniture(type)!.size;
    // 겹쳐 쌓이지 않게 조금씩 비켜서 방 가운데쯤에
    const shift = (room.furniture.length % 4) * 0.4;
    const item = clampFurniture(room.layout, {
      type,
      x: layout.width / 2 - w / 2 + shift,
      y: layout.depth / 2 - d / 2 + shift,
      rot: 0,
    });
    setRoom((r) => ({ ...r, furniture: [...r.furniture, item] }));
    setSelected(room.furniture.length);
    setView("2d");
  }

  /** 가구를 손대지 않았거나 집↔상가로 바뀌면 새 구조의 기본 배치로, 아니면 놓은 가구를 새 방에 맞춰 밀어 넣는다 */
  function changeLayout(id: string) {
    const next = findLayout(id);
    setRoom((r) => {
      const untouched = JSON.stringify(r.furniture) === JSON.stringify(defaultFurniture(r.layout));
      const furniture =
        untouched || findLayout(r.layout).kind !== next.kind
          ? defaultFurniture(id)
          : r.furniture.map((f) => clampFurniture(id, f));
      return { ...r, layout: id, furniture };
    });
    if (next.kind !== findLayout(room.layout).kind) setGroup(next.kind === "shop" ? "shop" : "living");
    setSelected(null);
  }

  function floorPoint(e: React.PointerEvent): [number, number] | null {
    const ctm = sceneRef.current?.querySelector("svg")?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return screenToFloor(p.x, p.y);
  }

  function onScenePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = (e.target as Element).closest("[data-item]");
    const point = floorPoint(e);
    if (!el || !point) {
      setSelected(null);
      return;
    }
    const index = Number(el.getAttribute("data-item"));
    const item = room.furniture[index];
    drag.current = { index, start: point, origin: [item.x, item.y] };
    setSelected(index);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onScenePointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const point = d && floorPoint(e);
    if (!d || !point) return;
    updateItem(d.index, {
      x: d.origin[0] + point[0] - d.start[0],
      y: d.origin[1] + point[1] - d.start[1],
    });
  }

  function onSceneKeyDown(e: React.KeyboardEvent) {
    if (selected == null || !picked) return;
    const step = ARROW_STEP[e.key];
    if (step) updateItem(selected, { x: picked.x + step[0], y: picked.y + step[1] });
    else if (e.key === "r" || e.key === "R") rotateItem(selected);
    else if (e.key === "Delete" || e.key === "Backspace") removeItem(selected);
    else if (e.key === "Escape") setSelected(null);
    else return;
    e.preventDefault();
  }

  function toggleAddon(id: string) {
    setRoom((r) => ({
      ...r,
      addons: r.addons.includes(id) ? r.addons.filter((a) => a !== id) : [...r.addons, id],
    }));
  }

  function saveImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${companyName}-미니룸.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // 가구를 골랐을 때 아래에 뜨는 도구 (2D·3D 공통)
  const toolbar = picked && selected != null && (
    <div className="absolute right-3 bottom-3 left-3 z-10 flex flex-wrap items-center gap-1 rounded-2xl bg-white/90 p-1.5 text-xs font-semibold shadow-sm backdrop-blur">
      <span className="px-2">{findFurniture(picked.type)?.label}</span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={() => rotateItem(selected)}
        className="rounded-full px-3 py-1.5 hover:bg-brand-soft"
      >
        ↻ 돌리기
      </button>
      <button
        type="button"
        onClick={() => removeItem(selected)}
        className="rounded-full px-3 py-1.5 text-red-700 hover:bg-red-50"
      >
        빼기
      </button>
      <button type="button" onClick={() => setSelected(null)} className="rounded-full bg-ink px-3 py-1.5 text-white">
        완료
      </button>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card relative overflow-hidden bg-gradient-to-b from-[#f4efe6] to-[#ebe4d8]">
          <div className="absolute top-3 left-3 z-10 flex rounded-full bg-white/85 p-1 text-xs font-semibold shadow-sm backdrop-blur">
            {(["3d", "2d"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1.5 ${view === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {v === "2d" ? "2D 미니룸" : "3D"}
              </button>
            ))}
          </div>

          {view === "2d" ? (
            <>
              <div
                ref={sceneRef}
                tabIndex={0}
                aria-label="미니룸. 가구를 끌어서 옮기고, 고른 가구는 화살표로 움직이거나 R로 돌리고 Delete로 뺄 수 있어요"
                onPointerDown={onScenePointerDown}
                onPointerMove={onScenePointerMove}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                onKeyDown={onSceneKeyDown}
                className={`p-4 pt-14 pb-16 outline-none select-none ${tab === "furniture" ? "touch-none" : ""}`}
              >
                <RoomScene
                  room={room}
                  selected={selected}
                  editable
                  className="mx-auto w-full max-w-[640px] drop-shadow-sm"
                />
              </div>
              <p className="pointer-events-none absolute top-4 right-4 text-[11px] text-muted">
                가구를 끌어서 옮겨 보세요
              </p>
              {toolbar}
            </>
          ) : (
            <>
              <div className="aspect-[4/3] w-full">
                <Room3D
                  room={room}
                  preset={preset}
                  canvasRef={canvasRef}
                  editable
                  selected={selected}
                  onSelect={setSelected}
                  onMove={(index, x, y) => updateItem(index, { x, y })}
                />
              </div>
              {toolbar}
              <div
                className={`absolute right-3 bottom-3 left-3 flex flex-wrap items-center justify-between gap-2 ${picked ? "invisible" : ""}`}
              >
                <div className="flex gap-1 rounded-full bg-white/85 p-1 text-xs font-semibold shadow-sm backdrop-blur">
                  {(Object.keys(PRESET_LABEL) as CameraPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreset(p)}
                      className={`rounded-full px-2.5 py-1 ${preset === p ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
                    >
                      {PRESET_LABEL[p]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={saveImage}
                  className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur hover:text-brand"
                >
                  이미지로 저장
                </button>
              </div>
              <p className="pointer-events-none absolute top-14 left-3 text-[11px] text-muted">
                가구는 끌어서 옮기고, 빈 곳을 끌면 화면이 돌아가요
              </p>
            </>
          )}
        </div>

        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ink p-5 text-white">
          <div>
            <p className="text-sm text-white/70">{area}평 · 거실·주방 마감 기준</p>
            <p className="text-2xl font-extrabold tracking-tight sm:text-3xl" aria-live="polite">
              약 {formatRange(result)}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            평수
            <input
              type="number"
              min={10}
              max={80}
              value={area}
              onChange={(e) => setArea(clampArea(e.target.value))}
              className="w-20 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-center text-white"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["layout", "구조"],
              ["furniture", "가구 배치"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                tab === id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40"
              }`}
            >
              {label}
              {id === "furniture" && ` (${room.furniture.length})`}
            </button>
          ))}
          {ROOM_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTab(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                tab === c.id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ background: findOption(c.id, room[c.id]).swatch }}
              />
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTab("addons")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
              tab === "addons" ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40"
            }`}
          >
            + 추가 {room.addons.length > 0 && `(${room.addons.length})`}
          </button>
        </div>

        {tab === "layout" ? (
          <section>
            {(["home", "shop"] as const).map((kind) => (
              <div key={kind} className="mb-4">
                <h2 className="mb-2 text-sm font-bold text-muted">
                  {LAYOUT_KIND_LABEL[kind]} 구조 <span className="ml-1 font-normal">· 그림에만 반영돼요</span>
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ROOM_LAYOUTS.filter((l) => l.kind === kind).map((layout) => {
                    const on = room.layout === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => changeLayout(layout.id)}
                        aria-pressed={on}
                        className={`rounded-xl border p-3 text-center transition-colors ${
                          on
                            ? "border-brand bg-brand-soft text-brand ring-2 ring-brand/20"
                            : "border-line bg-surface text-ink/50 hover:border-brand/50"
                        }`}
                      >
                        <LayoutPlan layout={layout} />
                        <span className="block text-sm font-semibold leading-tight text-ink">{layout.label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted">{layout.note}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ) : tab === "furniture" ? (
          <section>
            <h2 className="mb-2 text-sm font-bold text-muted">
              가구 놓기 <span className="ml-1 font-normal">· 눌러서 넣고, 미니룸에서 끌어 옮겨요</span>
            </h2>
            <div className="mb-2 flex flex-wrap gap-1">
              {(Object.keys(FURNITURE_GROUP_LABEL) as FurnitureGroup[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`chip px-3 py-1 ${group === g ? "bg-brand text-white" : "bg-surface text-muted hover:text-ink"}`}
                >
                  {FURNITURE_GROUP_LABEL[g]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {FURNITURE_TYPES.filter((f) => f.group === group).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addItem(f.id)}
                  disabled={room.furniture.length >= MAX_FURNITURE}
                  className="rounded-xl border border-line bg-surface p-2 text-center transition-colors hover:border-brand/50 disabled:opacity-40"
                >
                  <FurnitureThumb type={f.id} room={room} className="mx-auto mb-1 h-12 w-full" />
                  <span className="block text-xs font-semibold leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">
                {room.furniture.length}/{MAX_FURNITURE}개 놓음
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  setRoom((r) => ({
                    ...r,
                    furniture: defaultFurniture(r.layout),
                  }));
                  setSelected(null);
                }}
                className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-ink/40"
              >
                기본 배치로
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoom((r) => ({ ...r, furniture: [] }));
                  setSelected(null);
                }}
                className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-ink/40"
              >
                모두 치우기
              </button>
            </div>
          </section>
        ) : category ? (
          <section>
            <h2 className="mb-2 text-sm font-bold text-muted">
              {category.label}
              {category.pricing.type === "none" && <span className="ml-2 font-normal">· 견적에 들어가지 않아요</span>}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {category.options.map((option) => {
                const selected = room[category.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRoom((r) => ({ ...r, [category.id]: option.id }))}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-brand bg-brand-soft ring-2 ring-brand/20"
                        : "border-line bg-surface hover:border-brand/50"
                    }`}
                  >
                    <span
                      className="mb-2 block h-10 rounded-lg border border-black/5"
                      style={{ background: option.swatch }}
                    />
                    <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {option.grade && `${GRADE_LABEL[option.grade]} · `}
                      {option.price ? `+${formatWon(option.price)} 원 · ` : ""}
                      {option.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-muted">추가하고 싶은 것</h2>
            {ROOM_ADDONS.map((addon) => {
              const on = room.addons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                    on ? "border-brand bg-brand-soft" : "border-line bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleAddon(addon.id)}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{addon.label}</span>
                    <span className="block text-xs text-muted">
                      {addon.price ? `+${formatWon(addon.price)} 원 · ` : ""}
                      {addon.note}
                    </span>
                  </span>
                </label>
              );
            })}
          </section>
        )}

        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">견적 내역 보기 ({result.lines.length}개 항목)</summary>
          <ul className="mt-2 divide-y divide-line">
            {result.lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3 py-2">
                <span>{line.name}</span>
                <span className="font-semibold tabular-nums">{formatWon(line.amount)}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="card p-5">
          {panel === "lead" ? (
            <LeadForm
              slug={slug}
              companyName={companyName}
              hidden={{
                source: "room",
                area: String(area),
                room: JSON.stringify(room),
              }}
            />
          ) : panel === "show" ? (
            <ShowroomPublish slug={slug} room={room} fromId={fromId} />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                고르신 방 그림과 금액이 그대로 {companyName}에 전달됩니다. 친구들에게 미니홈피로 자랑할 수도 있어요.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="btn-primary py-3 text-base" onClick={() => setPanel("lead")}>
                  이대로 상담 요청하기
                </button>
                <button
                  type="button"
                  className="rounded-xl border-2 border-[#7fa3bf] bg-[#eef4f8] py-3 text-base font-bold text-[#36607e] hover:bg-[#e2edf4]"
                  onClick={() => setPanel("show")}
                >
                  미니홈피로 자랑하기 ✨
                </button>
              </div>
            </>
          )}
          {panel && (
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="mt-3 w-full text-center text-xs text-muted hover:text-ink"
            >
              ← 뒤로
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
