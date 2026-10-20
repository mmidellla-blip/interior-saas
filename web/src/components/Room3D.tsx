"use client";

import { ContactShadows, Environment, Lightformer, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildRoomModel, WALL_HEIGHT, type FloorSpec, type Prim, type RoomModel } from "@/lib/room-model";
import type { RoomConfig } from "@/lib/types";

/**
 * 미니룸 3D 보기. lib/room-model.ts의 같은 장면을 three.js로 그린다.
 * 모델 좌표 (x, y, z: 높이) → three 좌표 (x, z, y).
 * 외부 파일 없이 질감은 캔버스로 만들고, 반사광은 Lightformer로 만든 환경맵을 쓴다.
 */
export type CameraPreset = "default" | "top" | "kitchen" | "living";

const H = WALL_HEIGHT;
/** 벽·바닥 단면 두께 (잘라 낸 모형처럼 보이게) */
const T = 0.3;
const SLAB = 0.4;
const BRAND = "#2f5d4a";

type OrbitLike = { target: THREE.Vector3; enabled: boolean; update(): void };
type Vec = [number, number, number];

/** 방 크기에 맞춘 카메라 위치. 기준은 10 × 10 방 */
function presets({ width: W, depth: D }: RoomModel["size"]): Record<CameraPreset, { position: Vec; target: Vec }> {
  const k = Math.max(W, D) / 10;
  return {
    default: { position: [W / 2 + 12 * k, 12 * k, D / 2 + 12 * k], target: [W / 2, 1.2, D / 2] },
    top: { position: [W / 2 + 7 * k, 24 * k, D / 2 + 7 * k], target: [W / 2, 0, D / 2] },
    kitchen: { position: [W + 0.5, 5.2, 12.5 * k], target: [W - 3.2, 2, 1.5] },
    living: { position: [11.5 * k, 5, D - 0.5], target: [1.2, 1.6, D * 0.58] },
  };
}

// ── 질감·재질 ─────────────────────────────────────────

/** 매번 같은 무늬가 나오도록 시드가 있는 난수 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tint(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

const textures = new Map<string, THREE.Texture>();

/** 흰색에 가까운 회색 무늬. 재질 색에 곱해져서 결만 남는다 */
function grainTexture(kind: "wood" | "fabric"): THREE.Texture {
  const cached = textures.get(kind);
  if (cached) return cached;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(kind === "wood" ? 7 : 13);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(0, 0, size, size);
  if (kind === "wood") {
    for (let i = 0; i < 70; i++) {
      const y = rand() * size;
      const shade = 200 + Math.floor(rand() * 45);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.55)`;
      ctx.lineWidth = 0.6 + rand() * 1.8;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 16) ctx.lineTo(x, y + Math.sin(x / 40 + i) * (2 + rand() * 3));
      ctx.stroke();
    }
  } else {
    // 짜임: 가는 가로·세로줄 + 점 노이즈
    for (let i = 0; i < size; i += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.025 + rand() * 0.03})`;
      ctx.fillRect(0, i, size, 1);
      ctx.fillRect(i, 0, 1, size);
    }
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(rand() * size, rand() * size, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  textures.set(kind, texture);
  return texture;
}

const materials = new Map<string, THREE.Material>();

/** 색·재질이 같은 도형끼리는 재질 객체를 같이 쓴다 */
function materialFor(prim: Prim): THREE.Material {
  const key = `${prim.color}|${prim.mat ?? "matte"}|${prim.emissive ? 1 : 0}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const color = new THREE.Color(prim.color);
  let material: THREE.MeshStandardMaterial;
  switch (prim.mat) {
    case "gloss":
      material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.25 });
      break;
    case "wood":
      material = new THREE.MeshStandardMaterial({ color, map: grainTexture("wood"), roughness: 0.55 });
      break;
    case "fabric":
      material = new THREE.MeshStandardMaterial({ color, map: grainTexture("fabric"), roughness: 0.95 });
      break;
    case "metal":
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.8 });
      break;
    case "glass":
      material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transparent: true, opacity: 0.4 });
      break;
    case "sky":
      // 창 너머 낮빛
      material = new THREE.MeshStandardMaterial({ color: "#eaf6ff", emissive: "#d3ebff", emissiveIntensity: 0.9 });
      break;
    case "leaf":
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      break;
    default:
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  }
  if (prim.emissive) {
    material.emissive = color;
    material.emissiveIntensity = 2.2;
  }
  materials.set(key, material);
  return material;
}

// ── 도형 ──────────────────────────────────────────────

type MeshHandlers = Pick<
  React.ComponentProps<"mesh">,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerOver" | "onPointerOut"
>;

function PrimMesh({ prim, handlers }: { prim: Prim; handlers?: MeshHandlers }) {
  const material = materialFor(prim);
  const cast = !prim.emissive && prim.mat !== "sky" && prim.mat !== "glass";
  if (prim.kind === "sphere") {
    const [x, y, z] = prim.center;
    return (
      <mesh position={[x, z, y]} material={material} castShadow={cast} receiveShadow {...handlers}>
        <sphereGeometry args={[prim.r, 32, 20]} />
      </mesh>
    );
  }
  if (prim.kind === "cyl") {
    const [x, y, z] = prim.at;
    return (
      <mesh position={[x, z + prim.h / 2, y]} material={material} castShadow={cast} receiveShadow {...handlers}>
        <cylinderGeometry args={[prim.r, prim.r, prim.h, 32]} />
      </mesh>
    );
  }
  const [x, y, z] = prim.at;
  const [sx, sy, sz] = prim.size;
  const position: Vec = [x + sx / 2, z + sz / 2, y + sy / 2];
  // 둥글기는 가장 얇은 변의 절반을 넘으면 안 된다
  const radius = prim.round ? Math.min(prim.round, sx / 2, sy / 2, sz / 2) * 0.98 : 0;
  if (radius > 0.004) {
    return (
      <RoundedBox
        args={[sx, sz, sy]}
        radius={radius}
        smoothness={3}
        position={position}
        material={material}
        castShadow={cast}
        receiveShadow
        {...handlers}
      />
    );
  }
  return (
    <mesh position={position} material={material} castShadow={cast} receiveShadow {...handlers}>
      <boxGeometry args={[sx, sz, sy]} />
    </mesh>
  );
}

// ── 바닥·벽 ───────────────────────────────────────────

/** 바닥 패턴을 캔버스로 그린다. 판재·타일마다 색을 조금씩 달리해서 실제 마감재처럼 */
function useFloorTexture(floor: FloorSpec, W: number, D: number) {
  return useMemo(() => {
    const unit = 2048 / Math.max(W, D);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * unit);
    canvas.height = Math.round(D * unit);
    const cw = canvas.width;
    const ch = canvas.height;
    const ctx = canvas.getContext("2d")!;
    const rand = seeded(42);
    const g = floor.gap * unit;
    ctx.fillStyle = floor.base;
    ctx.fillRect(0, 0, cw, ch);

    const grain = (x: number, y: number, w: number, h: number, alongX: boolean) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      for (let i = 0; i < (alongX ? h : w) / 3; i++) {
        ctx.strokeStyle = `rgba(${rand() > 0.5 ? "0,0,0" : "255,255,255"},${0.04 + rand() * 0.05})`;
        ctx.lineWidth = 0.5 + rand() * 1.5;
        const off = rand() * (alongX ? h : w);
        ctx.beginPath();
        if (alongX) {
          for (let t = 0; t <= w; t += 24) ctx.lineTo(x + t, y + off + Math.sin(t / 60 + i) * 1.5);
        } else {
          for (let t = 0; t <= h; t += 24) ctx.lineTo(x + off + Math.sin(t / 60 + i) * 1.5, y + t);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    if (floor.pattern === "plank") {
      for (let y = 0, row = 0; y < ch; y += g, row++) {
        let x = -rand() * g * 3;
        while (x < cw) {
          const len = g * (3 + rand() * 3);
          ctx.fillStyle = tint(floor.base, (rand() - 0.5) * 0.07);
          ctx.fillRect(x, y, len, g);
          grain(x, y, len, g, true);
          ctx.strokeStyle = floor.line;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, len, g);
          x += len;
        }
      }
    } else if (floor.pattern === "herringbone") {
      // 45도로 기울인 짧은 판재를 엇갈려 놓는다
      const w = g / 2;
      const len = g * 2;
      ctx.save();
      ctx.lineWidth = 1.5;
      for (let row = -2; row * len < ch + len * 2; row++) {
        for (let col = -2; col * w < cw + len; col++) {
          const flip = col % 2 === 0;
          const cx = col * w;
          const cy = row * len + (flip ? 0 : w);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
          ctx.fillStyle = tint(floor.base, (rand() - 0.5) * 0.08);
          ctx.fillRect(0, 0, len, w);
          grain(0, 0, len, w, true);
          ctx.strokeStyle = floor.line;
          ctx.strokeRect(0, 0, len, w);
          ctx.restore();
        }
      }
      ctx.restore();
    } else {
      // 대형 포세린: 타일마다 미세한 색 차이 + 옅은 결
      for (let y = 0; y < ch; y += g) {
        for (let x = 0; x < cw; x += g) {
          ctx.fillStyle = tint(floor.base, (rand() - 0.5) * 0.03);
          ctx.fillRect(x, y, g, g);
          ctx.strokeStyle = "rgba(120,110,100,0.08)";
          ctx.lineWidth = 1.2;
          for (let v = 0; v < 2; v++) {
            ctx.beginPath();
            let px = x + rand() * g;
            let py = y;
            ctx.moveTo(px, py);
            while (py < y + g) {
              px += (rand() - 0.5) * 40;
              py += 30 + rand() * 30;
              ctx.lineTo(px, Math.min(py, y + g));
            }
            ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = floor.line;
      ctx.lineWidth = 4;
      for (let t = 0; t <= Math.max(cw, ch); t += g) {
        ctx.beginPath();
        ctx.moveTo(t, 0);
        ctx.lineTo(t, ch);
        ctx.moveTo(0, t);
        ctx.lineTo(cw, t);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    // 바닥 도형의 uv는 (x, -y) 방 좌표라서 0~1로 맞춘다
    texture.repeat.set(1 / W, 1 / D);
    texture.offset.set(0, 1);
    return texture;
  }, [floor, W, D]);
}

/** 바닥 도형 (ㄱ자 구조면 앞 모서리가 빠짐). 눕히면 방 좌표 y가 three의 z가 되도록 (x, -y)로 그린다 */
function useFloorShape({ width: W, depth: D, notch }: RoomModel["size"]) {
  return useMemo(() => {
    const corners: [number, number][] = notch
      ? [[0, 0], [W, 0], [W, notch[1]], [notch[0], notch[1]], [notch[0], D], [0, D]]
      : [[0, 0], [W, 0], [W, D], [0, D]];
    return new THREE.Shape(corners.map(([x, y]) => new THREE.Vector2(x, -y)));
  }, [W, D, notch]);
}

/** 바닥판 두께와 두 벽. 단면이 보이는 모형집처럼 */
function Shell({ model, floorShape }: { model: RoomModel; floorShape: THREE.Shape }) {
  const { width: W, depth: D } = model.size;
  const slab = useMemo(() => new THREE.ExtrudeGeometry(floorShape, { depth: SLAB, bevelEnabled: false }), [floorShape]);
  return (
    <>
      <mesh geometry={slab} rotation={[-Math.PI / 2, 0, 0]} position={[0, -SLAB - 0.002, 0]} receiveShadow>
        <meshStandardMaterial color="#d6cbbb" roughness={0.9} />
      </mesh>
      <mesh position={[-T / 2, (H - SLAB) / 2, (D - T) / 2]} receiveShadow>
        <boxGeometry args={[T, H + SLAB, D + T]} />
        <meshStandardMaterial color={model.walls.left} roughness={0.92} />
      </mesh>
      <mesh position={[W / 2, (H - SLAB) / 2, -T / 2]} receiveShadow>
        <boxGeometry args={[W, H + SLAB, T]} />
        <meshStandardMaterial color={model.walls.right} roughness={0.92} />
      </mesh>
      {/* 벽 윗면 단면 */}
      <mesh position={[-T / 2, H + 0.005, (D - T) / 2]}>
        <boxGeometry args={[T, 0.01, D + T]} />
        <meshStandardMaterial color="#c9bfb0" roughness={1} />
      </mesh>
      <mesh position={[W / 2, H + 0.005, -T / 2]}>
        <boxGeometry args={[W, 0.01, T]} />
        <meshStandardMaterial color="#c9bfb0" roughness={1} />
      </mesh>
    </>
  );
}

function CameraRig({ preset, size }: { preset: CameraPreset; size: RoomModel["size"] }) {
  const { camera, controls } = useThree();
  const { width, depth } = size;
  useEffect(() => {
    const p = presets({ width, depth })[preset];
    camera.position.set(...p.position);
    const orbit = controls as unknown as OrbitLike | null;
    if (orbit) {
      orbit.target.set(...p.target);
      orbit.update();
    } else {
      camera.lookAt(...p.target);
    }
  }, [preset, camera, controls, width, depth]);
  return null;
}

/** 고른 가구 바닥에 그리는 테두리 */
function SelectionMark({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  const pad = 0.12;
  const points: Vec[] = [
    [x - pad, 0.02, y - pad],
    [x + w + pad, 0.02, y - pad],
    [x + w + pad, 0.02, y + d + pad],
    [x - pad, 0.02, y + d + pad],
    [x - pad, 0.02, y - pad],
  ];
  return (
    <>
      <mesh position={[x + w / 2, 0.015, y + d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + pad * 2, d + pad * 2]} />
        <meshBasicMaterial color={BRAND} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <Line points={points} color={BRAND} lineWidth={2.5} dashed dashSize={0.25} gapSize={0.15} />
    </>
  );
}

interface EditProps {
  /** 가구를 끌어서 옮길 수 있게 */
  editable?: boolean;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  /** 가구의 새 위치 (바닥 영역 안쪽 모서리) */
  onMove?: (index: number, x: number, y: number) => void;
}

function Scene({ room, preset, editable, selected, onSelect, onMove }: { room: RoomConfig; preset: CameraPreset } & EditProps) {
  const model = useMemo(() => buildRoomModel(room), [room]);
  const { width: W, depth: D } = model.size;
  const floorTexture = useFloorTexture(model.floor, W, D);
  const floorShape = useFloorShape(model.size);
  const { mode, spots, glow } = model.lighting;
  const reach = Math.max(W, D) * 1.3;
  const target = useMemo(() => new THREE.Vector3(W / 2, 1.6, D / 2), [W, D]);
  const warm = "#ffd9a0";
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  // ── 끌어서 옮기기: 포인터 광선이 바닥(y=0)과 만나는 점으로 움직인다
  const drag = useRef<{ index: number; start: [number, number]; origin: [number, number] } | null>(null);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const floorPoint = (e: ThreeEvent<PointerEvent>): [number, number] | null =>
    e.ray.intersectPlane(floorPlane, hit) ? [hit.x, hit.z] : null;

  function handlersFor(index: number): MeshHandlers {
    return {
      onPointerDown: (e) => {
        e.stopPropagation();
        const point = floorPoint(e);
        const item = room.furniture[index];
        if (!point || !item) return;
        drag.current = { index, start: point, origin: [item.x, item.y] };
        onSelect?.(index);
        if (controls) controls.enabled = false;
        (e.target as unknown as Element).setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        const d = drag.current;
        if (!d || d.index !== index) return;
        e.stopPropagation();
        const point = floorPoint(e);
        if (point) onMove?.(index, d.origin[0] + point[0] - d.start[0], d.origin[1] + point[1] - d.start[1]);
      },
      onPointerUp: (e) => {
        if (!drag.current) return;
        drag.current = null;
        if (controls) controls.enabled = true;
        (e.target as unknown as Element).releasePointerCapture(e.pointerId);
      },
      onPointerOver: () => (document.body.style.cursor = "grab"),
      onPointerOut: () => (document.body.style.cursor = ""),
    };
  }
  // 화면을 떠날 때 커서 원래대로
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const picked = selected != null ? model.furniture[selected] : undefined;

  return (
    <>
      <color attach="background" args={["#efe8dc"]} />
      {/* 반사·간접광용 환경: 위쪽 큰 확산광 + 창 쪽 밝은 면 + 앞쪽 따뜻한 반사 */}
      <Environment frames={1} resolution={256} environmentIntensity={mode === "flat" ? 0.55 : 0.4}>
        <Lightformer form="rect" intensity={1.6} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={3} color="#e8f3ff" position={[-10, 4, 3]} rotation-y={Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe6c4" position={[10, 3, 12]} rotation-y={-Math.PI / 4} scale={[14, 6, 1]} />
      </Environment>
      <hemisphereLight args={["#ffffff", "#d9cbb5", mode === "flat" ? 0.6 : 0.35]} />
      {/* 창 쪽(왼쪽 벽 바깥)에서 드는 햇빛 */}
      <directionalLight
        position={[-7, 13, D * 0.25]}
        intensity={mode === "flat" ? 2.2 : 1.6}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />

      <Shell model={model} floorShape={floorShape} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial map={floorTexture} roughness={model.floor.pattern === "tile" ? 0.22 : 0.6} />
      </mesh>
      {/* 가구가 바닥에 닿는 곳의 부드러운 그림자 */}
      <ContactShadows
        position={[W / 2, 0.004, D / 2]}
        scale={Math.max(W, D) + 1}
        resolution={1024}
        far={2.5}
        blur={2.4}
        opacity={0.55}
        color="#3b2a1a"
      />
      {picked && <SelectionMark {...picked} />}

      {model.prims.map((prim, i) => (
        <PrimMesh
          key={prim.key ?? i}
          prim={prim}
          handlers={editable && prim.item !== undefined ? handlersFor(prim.item) : undefined}
        />
      ))}

      {mode === "downlight" &&
        spots.map(([x, y]) => (
          <pointLight key={`${x}-${y}`} position={[x, H - 0.4, y]} intensity={8} distance={9} decay={1.6} color={warm} />
        ))}
      {glow && (
        <>
          <mesh position={[0.12, H - 0.12, D / 2]}>
            <boxGeometry args={[0.06, 0.06, D]} />
            <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={3} />
          </mesh>
          <mesh position={[W / 2, H - 0.12, 0.12]}>
            <boxGeometry args={[W, 0.06, 0.06]} />
            <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={3} />
          </mesh>
          {[0.2, 0.5, 0.8].map((t) => (
            <group key={t}>
              <pointLight position={[0.6, H - 0.5, t * D]} intensity={4} distance={6} decay={1.8} color={warm} />
              <pointLight position={[t * W, H - 0.5, 0.6]} intensity={4} distance={6} decay={1.8} color={warm} />
            </group>
          ))}
        </>
      )}
      {/* 스탠드·펜던트 (너무 많으면 앞의 몇 개만) */}
      {model.lights.slice(0, 6).map(([x, y, z], i) => (
        <pointLight key={i} position={[x, z, y]} intensity={4.5} distance={5} decay={1.8} color={warm} />
      ))}

      <OrbitControls
        makeDefault
        target={target}
        enablePan={false}
        minDistance={5}
        maxDistance={34 * (Math.max(W, D) / 10)}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={Math.PI / 2 + 0.15}
      />
      <CameraRig preset={preset} size={model.size} />
    </>
  );
}

export default function Room3D({
  room,
  preset,
  canvasRef,
  ...edit
}: {
  room: RoomConfig;
  preset: CameraPreset;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
} & EditProps) {
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  return (
    <Canvas
      ref={canvasRef ?? fallbackRef}
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [17, 12, 17], fov: 35, near: 0.1, far: 200 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        // 밝은 벽·바닥이 하얗게 날아가지 않게 조금 어둡게
        gl.toneMappingExposure = 0.88;
      }}
      onPointerMissed={() => edit.onSelect?.(null)}
      className="touch-none"
    >
      <Scene room={room} preset={preset} {...edit} />
    </Canvas>
  );
}
