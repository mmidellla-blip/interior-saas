// 데모 현장용 일러스트 "사진"을 만든다. 실제 사진 대신 쓰는 정면 원근 방 그림.
// 실행: node scripts/generate-seed-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "seed");
mkdirSync(OUT, { recursive: true });

const W = 1200;
const H = 900;
// 뒷벽 사각형
const B = { x0: 330, y0: 210, x1: 870, y1: 600 };

function room({ back, side, ceiling, floor, floorLines = "none", lineColor = "#0002", extra = "" }) {
  let lines = "";
  if (floorLines === "plank") {
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const xb = B.x0 + (B.x1 - B.x0) * t;
      const xf = -200 + (W + 400) * t;
      lines += `<line x1="${xb}" y1="${B.y1}" x2="${xf}" y2="${H}" stroke="${lineColor}" stroke-width="2"/>`;
    }
  }
  if (floorLines === "tile") {
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      lines += `<line x1="${B.x0 + (B.x1 - B.x0) * t}" y1="${B.y1}" x2="${-200 + (W + 400) * t}" y2="${H}" stroke="${lineColor}" stroke-width="2"/>`;
    }
    for (const y of [640, 700, 785]) {
      lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${lineColor}" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${back}"/>
<polygon points="0,0 ${W},0 ${B.x1},${B.y0} ${B.x0},${B.y0}" fill="${ceiling}"/>
<polygon points="0,0 ${B.x0},${B.y0} ${B.x0},${B.y1} 0,${H}" fill="${side}"/>
<polygon points="${W},0 ${B.x1},${B.y0} ${B.x1},${B.y1} ${W},${H}" fill="${side}" opacity="0.92"/>
<rect x="${B.x0}" y="${B.y0}" width="${B.x1 - B.x0}" height="${B.y1 - B.y0}" fill="${back}"/>
<polygon points="0,${H} ${B.x0},${B.y1} ${B.x1},${B.y1} ${W},${H}" fill="${floor}"/>
${lines}
${extra}
</svg>`;
}

const window_ = (frame = "#fff") =>
  `<rect x="470" y="270" width="260" height="190" fill="#cfe3ec" stroke="${frame}" stroke-width="10"/><line x1="600" y1="270" x2="600" y2="460" stroke="${frame}" stroke-width="8"/>`;

const images = {
  "before-living": room({
    back: "#e3d6b4", side: "#d6c79f", ceiling: "#ece4cc", floor: "#8a5a3a", floorLines: "plank", lineColor: "#6e4529",
    extra: `${window_("#7a3b24")}
<rect x="${B.x0}" y="590" width="540" height="12" fill="#7a3b24"/>
<rect x="560" y="120" width="80" height="18" fill="#f5f5f0" stroke="#bbb"/>
<rect x="380" y="500" width="150" height="100" fill="#6d4b37"/><rect x="390" y="470" width="130" height="35" fill="#5a3c2c"/>
<circle cx="760" cy="300" r="22" fill="none" stroke="#a89060" stroke-width="3"/>`,
  }),
  "before-house": room({
    back: "#b9bfae", side: "#a7ad9b", ceiling: "#c8ccbf", floor: "#5e5a52",
    extra: `${window_("#555")}
<path d="M360 240 l30 60 l-15 40 l25 50" stroke="#6b6b5f" stroke-width="3" fill="none"/>
<path d="M820 300 l-20 50 l10 40" stroke="#6b6b5f" stroke-width="3" fill="none"/>
<rect x="700" y="520" width="120" height="80" fill="#7c6a55"/><ellipse cx="500" cy="760" rx="160" ry="30" fill="#4a463f"/>`,
  }),
  "before-villa": room({
    back: "#eadfca", side: "#ddd0b6", ceiling: "#f0e9da", floor: "#a77c55", floorLines: "plank", lineColor: "#8a6342",
    extra: `${window_("#c9b48f")}${Array.from({ length: 30 }, (_, i) => `<circle cx="${350 + (i % 10) * 55}" cy="${240 + Math.floor(i / 10) * 120}" r="6" fill="#d4bf98"/>`).join("")}`,
  }),
  demolition: room({
    back: "#b7b4ad", side: "#a4a19a", ceiling: "#c4c1ba", floor: "#9a968e",
    extra: `<rect x="470" y="270" width="260" height="190" fill="#cfe3ec"/>
<polygon points="200,900 330,760 470,820 520,900" fill="#77736b"/><polygon points="760,900 850,780 980,830 1050,900" fill="#6b675f"/>
<rect x="620" y="700" width="110" height="120" rx="12" fill="#e9e3d0"/><rect x="740" y="720" width="90" height="100" rx="12" fill="#ddd6c0"/>
<line x1="360" y1="230" x2="840" y2="230" stroke="#8d8a83" stroke-width="4" stroke-dasharray="14 10"/>`,
  }),
  electric: room({
    back: "#bab7b0", side: "#a9a69f", ceiling: "#c7c4bd", floor: "#9d9991",
    extra: `<path d="M360 600 V330 H560 V230" stroke="#f08a24" stroke-width="10" fill="none"/>
<path d="M840 600 V380 H650 V230" stroke="#f08a24" stroke-width="10" fill="none"/>
<path d="M600 0 V230" stroke="#f08a24" stroke-width="10"/><rect x="345" y="420" width="32" height="44" fill="#444"/>
<rect x="825" y="470" width="32" height="44" fill="#444"/>${[420, 600, 780].map((x) => `<circle cx="${x}" cy="90" r="16" fill="#333"/>`).join("")}`,
  }),
  carpentry: room({
    back: "#c9c3b8", side: "#bab4a9", ceiling: "#d6d0c5", floor: "#a8a296",
    extra: `${Array.from({ length: 9 }, (_, i) => `<rect x="${345 + i * 62}" y="${B.y0}" width="16" height="${B.y1 - B.y0}" fill="#d9b27a" stroke="#b48d55"/>`).join("")}
<rect x="${B.x0}" y="${B.y0}" width="540" height="16" fill="#d9b27a"/><rect x="${B.x0}" y="${B.y1 - 16}" width="540" height="16" fill="#d9b27a"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="${i * 200 + 50}" y1="0" x2="${B.x0 + i * 100 + 30}" y2="${B.y0}" stroke="#d9b27a" stroke-width="12"/>`).join("")}
<rect x="380" y="640" width="400" height="30" fill="#e4c38f"/><rect x="420" y="680" width="380" height="30" fill="#d6b07a"/>`,
  }),
  tile: room({
    back: "#e4e2dd", side: "#d8d6d0", ceiling: "#c8c5be", floor: "#d9d6cf", floorLines: "tile", lineColor: "#bdb9b0",
    extra: `${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${B.x0 + c * 135}" y="${B.y0 + r * 130}" width="135" height="130" fill="none" stroke="#c9c6bf" stroke-width="3"/>`).join("")).join("")}
<rect x="760" y="700" width="140" height="70" fill="#8d8a83"/><rect x="300" y="760" width="60" height="110" fill="#5d7f9c"/>`,
  }),
  wallpaper: room({
    back: "#f4f1ec", side: "#e9e5de", ceiling: "#fafaf8", floor: "#b3ada2",
    extra: `${window_()}
<rect x="${B.x0}" y="${B.y0}" width="200" height="${B.y1 - B.y0}" fill="#e9e6e0"/>
<polygon points="760,900 800,420 830,420 800,900" fill="#c99a5e"/><polygon points="900,900 860,420 890,420 940,900" fill="#c99a5e"/>
${[520, 600, 680, 760].map((y) => `<line x1="790" y1="${y}" x2="900" y2="${y}" stroke="#b07f45" stroke-width="10"/>`).join("")}
<rect x="400" y="740" width="200" height="40" rx="20" fill="#f7f4ee" stroke="#ddd"/>`,
  }),
  "after-oak": room({
    back: "#f6f3ee", side: "#ece8e1", ceiling: "#fbfaf8", floor: "#c08c5f", floorLines: "plank", lineColor: "#a5764c",
    extra: `${window_()}
<rect x="${B.x0}" y="592" width="540" height="10" fill="#fff"/>
${[420, 600, 780].map((x) => `<circle cx="${x}" cy="90" r="12" fill="#fff6d8"/><ellipse cx="${x}" cy="760" rx="120" ry="30" fill="#ffe8b0" opacity="0.35"/>`).join("")}
<rect x="370" y="500" width="300" height="70" rx="14" fill="#8a9a8e"/><rect x="370" y="455" width="300" height="55" rx="14" fill="#7d8e82"/>
<rect x="430" y="610" width="180" height="30" rx="6" fill="#d0ab84"/>
<rect x="760" y="470" width="50" height="120" fill="#e7d3bd"/><circle cx="785" cy="430" r="55" fill="#5f9a5c"/><circle cx="805" cy="395" r="34" fill="#78b26f"/>`,
  }),
  "after-kitchen": room({
    back: "#f4f1ea", side: "#ebe6dd", ceiling: "#fbfaf8", floor: "#c08c5f", floorLines: "plank", lineColor: "#a5764c",
    extra: `<rect x="${B.x0}" y="250" width="540" height="110" fill="#fdfcf9" stroke="#ddd8cf"/>
<rect x="${B.x0}" y="470" width="540" height="130" fill="#fdfcf9" stroke="#ddd8cf"/><rect x="${B.x0 - 6}" y="458" width="552" height="16" fill="#b98a5e"/>
${[0, 1, 2, 3].map((i) => `<line x1="${B.x0 + 135 * i}" y1="474" x2="${B.x0 + 135 * i}" y2="600" stroke="#e2ddd3" stroke-width="3"/>`).join("")}
<rect x="380" y="640" width="440" height="160" fill="#b98a5e"/><rect x="365" y="625" width="470" height="22" fill="#e8e6e1"/>
${[480, 720].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="250" stroke="#444" stroke-width="3"/><path d="M${x - 30},280 L${x},245 L${x + 30},280 Z" fill="#333"/><circle cx="${x}" cy="290" r="14" fill="#ffd680"/>`).join("")}`,
  }),
  "after-greige": room({
    back: "#ddd6cb", side: "#d1c9bd", ceiling: "#efebe5", floor: "#e1ded8", floorLines: "tile", lineColor: "#cac6be",
    extra: `<rect x="0" y="0" width="${W}" height="14" fill="#ffd27a" opacity="0.7"/>
<line x1="${B.x0}" y1="${B.y0 + 6}" x2="${B.x1}" y2="${B.y0 + 6}" stroke="#ffcf6b" stroke-width="16" opacity="0.8"/>
${window_("#f4f1ec")}
<rect x="380" y="510" width="280" height="70" rx="12" fill="#6f6a63"/><rect x="380" y="470" width="280" height="50" rx="12" fill="#625d57"/>
<rect x="720" y="520" width="90" height="80" fill="#2f2c29"/><rect x="420" y="620" width="200" height="16" rx="8" fill="#a99f92"/>`,
  }),
};

for (const [name, svg] of Object.entries(images)) {
  writeFileSync(path.join(OUT, `${name}.svg`), svg);
}
console.log(`${Object.keys(images).length} images → ${OUT}`);
