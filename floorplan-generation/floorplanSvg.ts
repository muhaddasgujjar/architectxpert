export interface Room {
  id: string;
  name: string;
  type: "living" | "bedroom" | "kitchen" | "bathroom" | "corridor" | "garage"
      | "study" | "dining" | "balcony" | "prayer" | "servant" | "store" | "other";
  px: number; py: number; pw: number; ph: number;
  doors: { wall: "top" | "bottom" | "left" | "right"; pos: number }[];
  windows: { wall: "top" | "bottom" | "left" | "right"; pos: number; len: number }[];
}

export interface FloorplanSpec {
  rooms: { name: string; area_sqft: number; type: string; priority: number }[];
  totalArea: number;
  floors: number;
  style: string;
  costEstimatePKR: number;
  layoutNotes: string;
}

// ─── Canvas constants ─────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 760;
const ML = 88;   // margin left  (space for left dim arrows)
const MT = 88;   // margin top   (space for top dim arrows)
const MR = 60;   // margin right
const MB = 52;   // margin bottom
const TITLE_H = 28;
const DRAW_W = CANVAS_W - ML - MR;
const DRAW_H = CANVAS_H - MT - MB - TITLE_H;
const WALL_OUTER = 8;
const WALL_INNER = 3;

// ─── Seed RNG ─────────────────────────────────────────────────────────────────
function seededRand(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ─── ft-inch label ────────────────────────────────────────────────────────────
function px2ft(px: number, pxPerFt: number): string {
  const total = Math.abs(px) / pxPerFt;
  const feet = Math.floor(total);
  const inches = Math.round((total - feet) * 12);
  if (inches === 12) return `${feet + 1}' 0"`;
  return `${feet}' ${inches}"`;
}

// ─── Local floor-plan data generator ─────────────────────────────────────────
export function generateLocalLayout(
  bedrooms: number,
  bathrooms: number,
  totalArea: number,
  extras: string[]
): FloorplanSpec {
  const rand = seededRand(bedrooms * 131 + bathrooms * 17 + Math.floor(totalArea / 80));
  const hasGarage  = extras.includes("garage");
  const hasStudy   = extras.includes("study");
  const hasPrayer  = extras.includes("prayer_room");
  const hasServant = extras.includes("servant_quarter");

  const rooms: FloorplanSpec["rooms"] = [];

  // Zone 1 — public
  rooms.push({ name: "Living Room", area_sqft: Math.round(totalArea * (0.16 + rand() * 0.03)), type: "living",  priority: 1 });
  rooms.push({ name: "Dining Room", area_sqft: Math.round(totalArea * (0.09 + rand() * 0.02)), type: "dining",  priority: 1 });
  rooms.push({ name: "Kitchen",     area_sqft: Math.round(totalArea * (0.08 + rand() * 0.02)), type: "kitchen", priority: 1 });
  rooms.push({ name: "Balcony",     area_sqft: Math.round(totalArea * 0.055),                  type: "balcony", priority: 1 });

  // Zone 2 — circulation only
  rooms.push({ name: "Hallway",     area_sqft: Math.round(totalArea * 0.05),                   type: "corridor", priority: 2 });
  if (hasGarage) rooms.push({ name: "Garage", area_sqft: Math.round(totalArea * 0.10), type: "garage", priority: 2 });

  // Zone 3 — private
  const bedroomBase = Math.round(totalArea * 0.36 / bedrooms);
  for (let i = 0; i < bedrooms; i++) {
    rooms.push({
      name: i === 0 ? "Master Bedroom" : `Bedroom ${i + 1}`,
      area_sqft: i === 0 ? Math.round(bedroomBase * 1.22) : bedroomBase,
      type: "bedroom", priority: 3,
    });
  }
  const bathA = Math.round(totalArea * 0.042);
  for (let i = 0; i < bathrooms; i++) {
    rooms.push({ name: i === 0 ? "Bathroom" : `Bathroom ${i + 1}`, area_sqft: bathA, type: "bathroom", priority: 3 });
  }
  if (hasPrayer)  rooms.push({ name: "Prayer Room",     area_sqft: Math.round(totalArea * 0.05),  type: "prayer",  priority: 3 });
  if (hasStudy)   rooms.push({ name: "Study",            area_sqft: Math.round(totalArea * 0.055), type: "study",   priority: 3 });
  if (hasServant) rooms.push({ name: "Servant Quarter",  area_sqft: Math.round(totalArea * 0.06),  type: "servant", priority: 3 });

  const costEstimatePKR = Math.round(totalArea * 4800 * (0.90 + rand() * 0.20));
  return { rooms, totalArea, floors: 1, style: "Modern", costEstimatePKR, layoutNotes: "" };
}

// ─── Zone-based layout ────────────────────────────────────────────────────────
export function layoutRooms(spec: FloorplanSpec): Room[] {
  const rand = seededRand(spec.rooms.length * 37 + Math.floor(spec.totalArea / 60));

  // Zone buckets
  const Z1_TYPES = new Set(["living", "dining", "kitchen", "balcony"]);
  const Z2_TYPES = new Set(["corridor", "garage"]);
  // everything else → zone 3
  const zone1 = spec.rooms.filter(r => Z1_TYPES.has(r.type));
  const zone2 = spec.rooms.filter(r => Z2_TYPES.has(r.type));
  const zone3 = spec.rooms.filter(r => !Z1_TYPES.has(r.type) && !Z2_TYPES.has(r.type));

  const total = spec.rooms.reduce((s, r) => s + r.area_sqft, 0) || spec.totalArea;
  const a1 = zone1.reduce((s, r) => s + r.area_sqft, 0);
  const a2 = zone2.reduce((s, r) => s + r.area_sqft, 0);
  const a3 = zone3.reduce((s, r) => s + r.area_sqft, 0);

  // Zone heights — proportional, with sensible minimums
  const minH = (zone: typeof zone1) => zone.length > 0 ? 90 : 0;
  let h1 = Math.max(Math.round(DRAW_H * a1 / total), minH(zone1));
  let h2 = zone2.length > 0 ? Math.max(Math.round(DRAW_H * a2 / total), 70) : 0;
  let h3 = Math.max(Math.round(DRAW_H * a3 / total), minH(zone3));

  // Normalise to DRAW_H
  const rawSum = h1 + h2 + h3;
  const scale  = DRAW_H / rawSum;
  h1 = Math.round(h1 * scale);
  h2 = Math.round(h2 * scale);
  h3 = DRAW_H - h1 - h2;

  // px-per-foot for dimension labels
  const ftW   = Math.sqrt(spec.totalArea * 1.5);
  const ftH   = spec.totalArea / ftW;
  const pxPFH = DRAW_W / ftW;   // horizontal
  const pxPFV = DRAW_H / ftH;   // vertical

  const result: Room[] = [];
  const sx = ML, sy = MT;

  function placeZone(
    zRooms: typeof spec.rooms,
    zoneY: number, zoneH: number,
    isTop: boolean, isBot: boolean
  ) {
    if (!zRooms.length) return;
    const zArea = zRooms.reduce((s, r) => s + r.area_sqft, 0);
    let curX = sx;

    zRooms.forEach((r, i) => {
      const isLast = i === zRooms.length - 1;
      const fraction = r.area_sqft / zArea;
      const rawW = Math.round(DRAW_W * fraction);
      // Last room takes all remaining width to avoid pixel rounding gaps
      const w = isLast ? (sx + DRAW_W - curX) : Math.max(rawW, 52);
      const h = zoneH;

      const doors: Room["doors"] = [];
      const windows: Room["windows"] = [];

      if (r.type !== "balcony") {
        doors.push({ wall: (isTop ? "bottom" : "top"), pos: 0.28 + rand() * 0.44 });
      }

      if (isTop) windows.push({ wall: "top",    pos: 0.18, len: Math.min(w * 0.44, 66) });
      if (isBot) windows.push({ wall: "bottom", pos: 0.18, len: Math.min(w * 0.44, 66) });
      if (curX === sx)           windows.push({ wall: "left",  pos: 0.20, len: Math.min(h * 0.44, 52) });
      if (isLast)                windows.push({ wall: "right", pos: 0.20, len: Math.min(h * 0.44, 52) });

      result.push({
        id:   `${r.type}_${i}`,
        name: r.name,
        type: r.type as Room["type"],
        px: curX, py: zoneY, pw: Math.max(w, 52), ph: Math.max(h, 50),
        doors, windows,
      });

      curX += Math.max(w, 52);
    });
  }

  placeZone(zone1, sy,          h1, true,  false);
  placeZone(zone2, sy + h1,     h2, false, false);
  placeZone(zone3, sy + h1 + h2, h3, false, true);

  return result;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function doorArcSvg(r: Room, door: { wall: "top"|"bottom"|"left"|"right"; pos: number }): string {
  // Door leaf size: 20-26px, constrained to room dimension
  const sz = Math.min(24, r.pw * 0.28, r.ph * 0.28);
  const { wall, pos } = door;

  let hx: number, hy: number, ex: number, ey: number, ax: number, ay: number, sweep: number;
  if (wall === "top") {
    hx = r.px + r.pw * pos; hy = r.py;
    ex = hx + sz; ey = hy;
    ax = hx; ay = hy + sz; sweep = 0;
  } else if (wall === "bottom") {
    hx = r.px + r.pw * pos; hy = r.py + r.ph;
    ex = hx + sz; ey = hy;
    ax = hx; ay = hy - sz; sweep = 1;
  } else if (wall === "left") {
    hx = r.px; hy = r.py + r.ph * pos;
    ex = hx; ey = hy + sz;
    ax = hx + sz; ay = hy; sweep = 1;
  } else {
    hx = r.px + r.pw; hy = r.py + r.ph * pos;
    ex = hx; ey = hy + sz;
    ax = hx - sz; ay = hy; sweep = 0;
  }

  // White gap to "open" the wall, then door line + arc
  return `
    <line x1="${hx}" y1="${hy}" x2="${ex}" y2="${ey}" stroke="white" stroke-width="${sz + 2}" stroke-linecap="butt"/>
    <line x1="${hx}" y1="${hy}" x2="${ex}" y2="${ey}" stroke="#111" stroke-width="1.8"/>
    <path d="M ${hx},${hy} A ${sz},${sz} 0 0,${sweep} ${ax},${ay}" fill="none" stroke="#111" stroke-width="1.1" stroke-dasharray="3,2"/>
  `;
}

function windowSvg(r: Room, win: { wall: "top"|"bottom"|"left"|"right"; pos: number; len: number }): string {
  const { wall, pos, len } = win;
  const T = 9; // thickness of wall gap
  if (wall === "top" || wall === "bottom") {
    const y  = wall === "top" ? r.py : r.py + r.ph;
    const x1 = r.px + r.pw * pos;
    const x2 = x1 + len;
    return `
      <rect x="${x1}" y="${y - T / 2}" width="${len}" height="${T}" fill="white"/>
      <line x1="${x1}" y1="${y - 3.5}" x2="${x2}" y2="${y - 3.5}" stroke="#333" stroke-width="1.5"/>
      <line x1="${x1}" y1="${y + 3.5}" x2="${x2}" y2="${y + 3.5}" stroke="#333" stroke-width="1.5"/>
      <line x1="${x1}" y1="${y - T/2}" x2="${x1}" y2="${y + T/2}" stroke="#333" stroke-width="2"/>
      <line x1="${x2}" y1="${y - T/2}" x2="${x2}" y2="${y + T/2}" stroke="#333" stroke-width="2"/>
    `;
  }
  const x  = wall === "left" ? r.px : r.px + r.pw;
  const y1 = r.py + r.ph * pos;
  const y2 = y1 + len;
  return `
    <rect x="${x - T/2}" y="${y1}" width="${T}" height="${len}" fill="white"/>
    <line x1="${x - 3.5}" y1="${y1}" x2="${x - 3.5}" y2="${y2}" stroke="#333" stroke-width="1.5"/>
    <line x1="${x + 3.5}" y1="${y1}" x2="${x + 3.5}" y2="${y2}" stroke="#333" stroke-width="1.5"/>
    <line x1="${x - T/2}" y1="${y1}" x2="${x + T/2}" y2="${y1}" stroke="#333" stroke-width="2"/>
    <line x1="${x - T/2}" y1="${y2}" x2="${x + T/2}" y2="${y2}" stroke="#333" stroke-width="2"/>
  `;
}

// ─── Furniture primitives ─────────────────────────────────────────────────────

function plant(cx: number, cy: number, r = 13): string {
  return `<g>
    ${Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const mx = cx + Math.cos(a) * r, my = cy + Math.sin(a) * r;
      const deg = (a * 180 / Math.PI) + 90;
      return `<ellipse cx="${mx}" cy="${my}" rx="${r*0.42}" ry="${r*0.2}"
        fill="none" stroke="#333" stroke-width="1" transform="rotate(${deg} ${mx} ${my})"/>`;
    }).join("")}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="white" stroke="#333" stroke-width="1"/>
  </g>`;
}

function sofa(x: number, y: number, w: number, d: number): string {
  const bh = d * 0.28, aw = w * 0.12;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${d}" rx="3" fill="white" stroke="#222" stroke-width="1.3"/>
    <rect x="${x+aw}" y="${y}" width="${w-aw*2}" height="${bh}" rx="2" fill="white" stroke="#222" stroke-width="1.1"/>
    <rect x="${x}" y="${y}" width="${aw}" height="${d}" rx="2" fill="white" stroke="#222" stroke-width="1.1"/>
    <rect x="${x+w-aw}" y="${y}" width="${aw}" height="${d}" rx="2" fill="white" stroke="#222" stroke-width="1.1"/>
    <line x1="${x+w/2}" y1="${y+bh}" x2="${x+w/2}" y2="${y+d}" stroke="#666" stroke-width="0.7"/>
  </g>`;
}

function armchair(x: number, y: number, sz: number): string {
  const bh = sz*0.28, sw = sz*0.15;
  return `<g>
    <rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="3" fill="white" stroke="#222" stroke-width="1.1"/>
    <rect x="${x+sw}" y="${y}" width="${sz-sw*2}" height="${bh}" rx="2" fill="white" stroke="#222" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${sw}" height="${sz}" rx="2" fill="white" stroke="#222" stroke-width="1"/>
    <rect x="${x+sz-sw}" y="${y}" width="${sw}" height="${sz}" rx="2" fill="white" stroke="#222" stroke-width="1"/>
  </g>`;
}

function coffeeTable(cx: number, cy: number, w: number, h: number): string {
  return `<g>
    <rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="2" fill="white" stroke="#222" stroke-width="1.1"/>
    <rect x="${cx-w/2+4}" y="${cy-h/2+4}" width="${w-8}" height="${h-8}" rx="1" fill="none" stroke="#666" stroke-width="0.7"/>
  </g>`;
}

function tvUnit(x: number, y: number, w: number, h: number): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#222" stroke-width="1.1"/>
    <rect x="${x+4}" y="${y+3}" width="${w-8}" height="${h-6}" rx="1" fill="none" stroke="#555" stroke-width="0.8"/>
  </g>`;
}

function diningTable(cx: number, cy: number, w: number, h: number): string {
  const cw = Math.min(22, w*0.34), ch = 12, gap = 5;
  const cols = Math.max(2, Math.round(w / 34));
  const rows2 = Math.max(1, Math.round(h / 38));
  let c = "";
  for (let i = 0; i < cols; i++) {
    const tx = cx - w/2 + (i+0.5)*(w/cols);
    c += `<rect x="${tx-cw/2}" y="${cy-h/2-ch-gap}" width="${cw}" height="${ch}" rx="2" fill="white" stroke="#222" stroke-width="1"/>`;
    c += `<rect x="${tx-cw/2}" y="${cy+h/2+gap}"    width="${cw}" height="${ch}" rx="2" fill="white" stroke="#222" stroke-width="1"/>`;
  }
  for (let i = 0; i < rows2; i++) {
    const ty = cy - h/2 + (i+0.5)*(h/rows2);
    c += `<rect x="${cx-w/2-ch-gap}" y="${ty-cw/2}" width="${ch}" height="${cw}" rx="2" fill="white" stroke="#222" stroke-width="1"/>`;
    c += `<rect x="${cx+w/2+gap}"    y="${ty-cw/2}" width="${ch}" height="${cw}" rx="2" fill="white" stroke="#222" stroke-width="1"/>`;
  }
  return `<g>${c}
    <rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="2" fill="white" stroke="#222" stroke-width="1.4"/>
    <rect x="${cx-w/2+5}" y="${cy-h/2+5}" width="${w-10}" height="${h-10}" rx="1" fill="none" stroke="#777" stroke-width="0.6"/>
  </g>`;
}

function bed(x: number, y: number, w: number, h: number): string {
  const headH = h * 0.24, pilW = w*0.38, pilH = headH*0.7;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="white" stroke="#222" stroke-width="1.4"/>
    <rect x="${x}" y="${y}" width="${w}" height="${headH}" rx="3" fill="none" stroke="#222" stroke-width="1.9"/>
    <rect x="${x+w*0.06}" y="${y+headH*0.15}" width="${pilW}" height="${pilH}" rx="2" fill="white" stroke="#333" stroke-width="1"/>
    <rect x="${x+w-pilW-w*0.06}" y="${y+headH*0.15}" width="${pilW}" height="${pilH}" rx="2" fill="white" stroke="#333" stroke-width="1"/>
    <rect x="${x+w*0.06}" y="${y+h*0.8}" width="${w*0.88}" height="${h*0.1}" rx="1" fill="none" stroke="#888" stroke-width="0.7"/>
  </g>`;
}

function wardrobe(x: number, y: number, w: number, h: number): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#222" stroke-width="1.3"/>
    <line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y+h}" stroke="#444" stroke-width="0.8"/>
    <circle cx="${x+w*0.25}" cy="${y+h/2}" r="2" fill="#333"/>
    <circle cx="${x+w*0.75}" cy="${y+h/2}" r="2" fill="#333"/>
  </g>`;
}

function toilet(x: number, y: number, w: number, h: number): string {
  const bh = h*0.35, bx = x+(w-w*0.88)/2;
  return `<g>
    <rect x="${bx}" y="${y}" width="${w*0.88}" height="${bh}" rx="3" fill="white" stroke="#222" stroke-width="1.2"/>
    <ellipse cx="${x+w/2}" cy="${y+bh+(h-bh)*0.52}" rx="${w*0.43}" ry="${(h-bh)*0.48}" fill="white" stroke="#222" stroke-width="1.2"/>
    <ellipse cx="${x+w/2}" cy="${y+bh+(h-bh)*0.52}" rx="${w*0.31}" ry="${(h-bh)*0.34}" fill="none" stroke="#888" stroke-width="0.7"/>
  </g>`;
}

function bathtub(x: number, y: number, w: number, h: number): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="white" stroke="#222" stroke-width="1.3"/>
    <rect x="${x+6}" y="${y+6}" width="${w-12}" height="${h-12}" rx="4" fill="none" stroke="#666" stroke-width="0.8"/>
    <circle cx="${x+w-12}" cy="${y+h/2}" r="4" fill="none" stroke="#333" stroke-width="1"/>
  </g>`;
}

function shower(x: number, y: number, w: number, h: number): string {
  const cols = 4, rows2 = 4;
  let grid = "";
  for (let i = 0; i <= cols; i++)  grid += `<line x1="${x+w/cols*i}" y1="${y}" x2="${x+w/cols*i}" y2="${y+h}" stroke="#ccc" stroke-width="0.5"/>`;
  for (let i = 0; i <= rows2; i++) grid += `<line x1="${x}" y1="${y+h/rows2*i}" x2="${x+w}" y2="${y+h/rows2*i}" stroke="#ccc" stroke-width="0.5"/>`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#222" stroke-width="1.2"/>
    ${grid}
    <circle cx="${x+w*0.22}" cy="${y+h*0.22}" r="5" fill="none" stroke="#333" stroke-width="1"/>
    <circle cx="${x+w*0.22}" cy="${y+h*0.22}" r="2" fill="#333"/>
  </g>`;
}

function sink(cx: number, cy: number, rx: number): string {
  return `<g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx*0.8}" fill="white" stroke="#222" stroke-width="1.2"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx*0.56}" ry="${rx*0.44}" fill="none" stroke="#888" stroke-width="0.7"/>
    <circle  cx="${cx}" cy="${cy}" r="1.8" fill="#333"/>
  </g>`;
}

function kitchenCounter(x: number, y: number, w: number, h: number): string {
  const cw = Math.min(h * 0.3, w * 0.28, 28);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${cw}" fill="white" stroke="#222" stroke-width="1.2"/>
    <circle cx="${x+cw*0.55}" cy="${y+cw/2}" r="${cw*0.28}" fill="none" stroke="#333" stroke-width="1"/>
    <circle cx="${x+cw*1.35}" cy="${y+cw/2}" r="${cw*0.28}" fill="none" stroke="#333" stroke-width="1"/>
    <rect x="${x+w-cw*1.75}" y="${y+cw*0.2}" width="${cw*1.5}" height="${cw*0.62}" rx="1" fill="none" stroke="#555" stroke-width="0.9"/>
    <rect x="${x}" y="${y+cw}" width="${cw}" height="${h-cw}" fill="white" stroke="#222" stroke-width="1.2"/>
    <ellipse cx="${x+cw/2}" cy="${y+cw+(h-cw)/2}" rx="${cw*0.35}" ry="${cw*0.28}" fill="none" stroke="#333" stroke-width="1"/>
  </g>`;
}

function patio(cx: number, cy: number, sz: number): string {
  const tr = sz * 0.22, cr = sz * 0.1, gap = tr + cr + 4;
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${tr}" fill="white" stroke="#222" stroke-width="1.3"/>
    <circle cx="${cx}" cy="${cy}" r="${tr*0.6}" fill="none" stroke="#777" stroke-width="0.7"/>
    ${[0, 1, 2, 3].map(i => {
      const a = (i / 4) * Math.PI * 2;
      const ox = Math.cos(a) * gap, oy = Math.sin(a) * gap;
      return `<circle cx="${cx+ox}" cy="${cy+oy}" r="${cr}" fill="white" stroke="#222" stroke-width="1.1"/>`;
    }).join("")}
  </g>`;
}

function desk(x: number, y: number, w: number, h: number): string {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#222" stroke-width="1.2"/>
    <rect x="${x+4}" y="${y+4}" width="${w*0.58}" height="${h-8}" rx="1" fill="none" stroke="#666" stroke-width="0.7"/>
    <rect x="${x+w*0.66}" y="${y+4}" width="${w*0.28}" height="${h-8}" rx="1" fill="none" stroke="#666" stroke-width="0.7"/>
  </g>`;
}

function chairSm(cx: number, cy: number, sz: number): string {
  const bh = sz*0.28;
  return `<g>
    <rect x="${cx-sz/2}" y="${cy-sz/2}" width="${sz}" height="${sz}" rx="2" fill="white" stroke="#222" stroke-width="1"/>
    <rect x="${cx-sz/2}" y="${cy-sz/2}" width="${sz}" height="${bh}" rx="2" fill="none" stroke="#333" stroke-width="1"/>
  </g>`;
}

// ─── Furniture dispatch ────────────────────────────────────────────────────────
function furnitureFor(room: Room): string {
  const { px: x, py: y, pw: w, ph: h, type } = room;
  const cx = x + w/2, cy = y + h/2;
  // Padding — keeps furniture away from walls
  const pad = Math.max(8, Math.min(w, h) * 0.08);

  if (type === "living") {
    const sw  = Math.min(w * 0.62, 100), sd = Math.min(h * 0.24, 34);
    const tvw = Math.min(w * 0.34, 55);
    const sofy = y + h - sd - pad;
    let o = tvUnit(cx - tvw/2, y + pad + 2, tvw, 10);
    o += sofa(cx - sw/2, sofy, sw, sd);
    o += coffeeTable(cx, sofy - 22, Math.min(w*0.28, 48), 18);
    if (w > 140) o += armchair(x + pad, sofy, Math.min(w*0.15, 28));
    if (w > 140) o += armchair(x + w - pad - 28, sofy, Math.min(w*0.15, 28));
    o += plant(x + pad + 9, y + h - pad - 11, 9);
    return o;
  }

  if (type === "dining") {
    const tw = Math.min(w*0.5, 88), th = Math.min(h*0.5, 56);
    return diningTable(cx, cy, tw, th);
  }

  if (type === "kitchen") {
    const kw = Math.min(w*0.80, 105), kh = Math.min(h*0.70, 80);
    return kitchenCounter(x + (w-kw)/2, y + (h-kh)/2, kw, kh);
  }

  if (type === "bedroom") {
    const bw = Math.min(w*0.68, 100), bh2 = Math.min(h*0.52, 72);
    let o = bed(cx - bw/2, y + pad, bw, bh2);
    const ww = Math.min(w*0.5, 70), wh = Math.min(h*0.13, 18);
    o += wardrobe(cx - ww/2, y + h - pad - wh, ww, wh);
    o += plant(x + w - pad - 9, y + h - pad - 9, 8);
    return o;
  }

  if (type === "bathroom") {
    const tW = Math.min(w*0.42, 28), tH = Math.min(h*0.4, 38);
    const bW = Math.min(w*0.44, 34), bH = Math.min(h*0.35, 32);
    const snkR = Math.min(w, h) * 0.11;
    if (w >= h) {
      return toilet(x + pad, cy - tH/2, tW, tH)
           + shower(x + w - bW - pad, cy - bH/2, bW, bH)
           + sink(cx, cy, snkR);
    }
    return toilet(cx - tW/2, y + pad, tW, tH)
         + (h > 100 ? bathtub : shower)(cx - bW/2, y + h - bH - pad, bW, bH)
         + sink(cx, cy, snkR);
  }

  if (type === "balcony") {
    const sz = Math.min(w, h);
    return patio(cx, cy, sz * 0.68)
         + plant(x + pad + 7, y + pad + 7, 8)
         + plant(x + w - pad - 7, y + h - pad - 7, 8);
  }

  if (type === "study" || type === "prayer") {
    const dw = Math.min(w*0.62, 82), dh2 = Math.min(h*0.36, 32);
    return desk(x + pad, y + pad, dw, dh2)
         + chairSm(x + pad + dw*0.4, y + pad + dh2 + 9, 17);
  }

  if (type === "garage") {
    // simple car outline
    const cw = Math.min(w*0.74, 125), ch2 = Math.min(h*0.54, 82);
    return `<g>
      <rect x="${cx-cw/2}" y="${cy-ch2/2}" width="${cw}" height="${ch2}" rx="5" fill="white" stroke="#333" stroke-width="1.3"/>
      ${[[-0.23,-0.3],[0.23,-0.3],[-0.23,0.3],[0.23,0.3]].map(([ox,oy]) =>
        `<ellipse cx="${cx+cw*ox}" cy="${cy+ch2*oy}" rx="${cw*0.12}" ry="${ch2*0.08}" fill="none" stroke="#555" stroke-width="0.9"/>`
      ).join("")}
      <rect x="${cx-cw*0.3}" y="${cy-ch2*0.18}" width="${cw*0.6}" height="${ch2*0.36}" rx="3" fill="none" stroke="#777" stroke-width="0.8"/>
    </g>`;
  }

  return "";
}

// ─── Dimension line helpers ────────────────────────────────────────────────────
function dimH(x1: number, x2: number, y: number, label: string, above: boolean): string {
  const ay = y + (above ? -26 : 26);
  const tk = 7;
  return `
    <line x1="${x1}" y1="${ay}" x2="${x2}" y2="${ay}" stroke="#555" stroke-width="0.9"/>
    <line x1="${x1}" y1="${ay-tk/2}" x2="${x1}" y2="${ay+tk/2}" stroke="#555" stroke-width="0.9"/>
    <line x1="${x2}" y1="${ay-tk/2}" x2="${x2}" y2="${ay+tk/2}" stroke="#555" stroke-width="0.9"/>
    <polygon points="${x1},${ay} ${x1+7},${ay-2.8} ${x1+7},${ay+2.8}" fill="#555"/>
    <polygon points="${x2},${ay} ${x2-7},${ay-2.8} ${x2-7},${ay+2.8}" fill="#555"/>
    <text x="${(x1+x2)/2}" y="${ay+(above?-6:14)}" text-anchor="middle"
      font-size="9" font-family="Arial,Helvetica,sans-serif" fill="#444">${label}</text>
  `;
}

function dimV(y1: number, y2: number, x: number, label: string, onLeft: boolean): string {
  const ax = x + (onLeft ? -28 : 28);
  const tk = 7, my = (y1+y2)/2;
  return `
    <line x1="${ax}" y1="${y1}" x2="${ax}" y2="${y2}" stroke="#555" stroke-width="0.9"/>
    <line x1="${ax-tk/2}" y1="${y1}" x2="${ax+tk/2}" y2="${y1}" stroke="#555" stroke-width="0.9"/>
    <line x1="${ax-tk/2}" y1="${y2}" x2="${ax+tk/2}" y2="${y2}" stroke="#555" stroke-width="0.9"/>
    <polygon points="${ax},${y1} ${ax-2.8},${y1+7} ${ax+2.8},${y1+7}" fill="#555"/>
    <polygon points="${ax},${y2} ${ax-2.8},${y2-7} ${ax+2.8},${y2-7}" fill="#555"/>
    <text x="${ax+(onLeft?-6:6)}" y="${my}" text-anchor="middle"
      font-size="9" font-family="Arial,Helvetica,sans-serif" fill="#444"
      transform="rotate(-90 ${ax+(onLeft?-6:6)} ${my})">${label}</text>
  `;
}

// ─── Main SVG assembly ────────────────────────────────────────────────────────
export function generateFloorplanSvg(rooms: Room[], spec: FloorplanSpec): string {
  if (!rooms.length) return "";

  const minX = Math.min(...rooms.map(r => r.px));
  const minY = Math.min(...rooms.map(r => r.py));
  const maxX = Math.max(...rooms.map(r => r.px + r.pw));
  const maxY = Math.max(...rooms.map(r => r.py + r.ph));
  const totalW = maxX - minX;
  const totalH = maxY - minY;

  // px-per-foot for labels
  const ftW = Math.sqrt(spec.totalArea * 1.48);
  const ftH = spec.totalArea / ftW;
  const pxPFH = totalW / ftW;
  const pxPFV = totalH / ftH;

  // ── clip paths (one per room so furniture stays inside walls) ──
  const clipDefs = rooms.map(r =>
    `<clipPath id="c${r.id}"><rect x="${r.px+WALL_INNER}" y="${r.py+WALL_INNER}" width="${r.pw-WALL_INNER*2}" height="${r.ph-WALL_INNER*2}"/></clipPath>`
  ).join("\n");

  // ── room rectangles, windows, doors, furniture, labels ──
  const roomEls = rooms.map(r => {
    const { px: x, py: y, pw: w, ph: h } = r;
    const cx = x + w/2, cy = y + h/2;
    const label = r.name.replace(/&/g, "&amp;");
    const fSize = w < 72 ? 8 : w < 110 ? 9.5 : 10.5;

    // Furniture clipped to room interior
    const furn = furnitureFor(r);
    const clippedFurn = furn
      ? `<g clip-path="url(#c${r.id})">${furn}</g>`
      : "";

    // Windows (drawn on top of wall rect, outside clip so they clear the wall)
    const wins = r.windows.map(w2 => windowSvg(r, w2)).join("");
    // Doors
    const drs  = r.doors.map(d => doorArcSvg(r, d)).join("");

    // Label with white background pill so it's always readable over furniture
    const lw = label.length * fSize * 0.58 + 12;
    const lh = fSize + 8;
    const labelBg  = `<rect x="${cx - lw/2}" y="${cy - lh/2}" width="${lw}" height="${lh}" rx="2" fill="white" fill-opacity="0.88"/>`;
    const labelTxt = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-size="${fSize}" font-family="Arial,Helvetica,sans-serif" font-weight="600" fill="#111">${label}</text>`;

    return `
      <!-- ${label} -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="${WALL_INNER}"/>
      ${clippedFurn}
      ${wins}${drs}
      ${labelBg}${labelTxt}
    `;
  }).join("\n");

  // ── outer boundary wall on top ──
  const outerWall = `<rect x="${minX}" y="${minY}" width="${totalW}" height="${totalH}"
    fill="none" stroke="#111" stroke-width="${WALL_OUTER}"/>`;

  // ── dimension annotations ──
  const dims: string[] = [];

  // Group by approximate row (top/bottom) and column (left/right)
  const topRooms  = rooms.filter(r => Math.abs(r.py - minY) < 4).sort((a, b) => a.px - b.px);
  const botRooms  = rooms.filter(r => Math.abs(r.py + r.ph - maxY) < 4).sort((a, b) => a.px - b.px);
  const leftRooms = rooms.filter(r => Math.abs(r.px - minX) < 4).sort((a, b) => a.py - b.py);
  const rightRooms = rooms.filter(r => Math.abs(r.px + r.pw - maxX) < 4).sort((a, b) => a.py - b.py);

  topRooms.forEach(r  => dims.push(dimH(r.px, r.px + r.pw, minY, px2ft(r.pw, pxPFH), true)));
  botRooms.forEach(r  => dims.push(dimH(r.px, r.px + r.pw, maxY, px2ft(r.pw, pxPFH), false)));
  leftRooms.forEach(r => dims.push(dimV(r.py, r.py + r.ph, minX, px2ft(r.ph, pxPFV), true)));
  rightRooms.filter(r => !leftRooms.includes(r))
            .forEach(r => dims.push(dimV(r.py, r.py + r.ph, maxX, px2ft(r.ph, pxPFV), false)));

  // ── north arrow ──
  const nax = CANVAS_W - MR + 14, nay = MT + 18;
  const northArrow = `<g transform="translate(${nax},${nay})">
    <circle cx="0" cy="0" r="13" fill="none" stroke="#444" stroke-width="1.2"/>
    <polygon points="0,-10 3,3 0,0 -3,3" fill="#111"/>
    <polygon points="0,10 3,-3 0,0 -3,-3" fill="#bbb"/>
    <text x="0" y="-15" text-anchor="middle" font-size="8" font-family="Arial" fill="#222" font-weight="bold">N</text>
  </g>`;

  // ── title ──
  const ty = CANVAS_H - MB + 8;
  const lac = (spec.costEstimatePKR / 100000).toFixed(1);
  const title = `
    <line x1="${ML-10}" y1="${ty-16}" x2="${CANVAS_W-MR+10}" y2="${ty-16}" stroke="#ccc" stroke-width="0.8"/>
    <text x="${ML-6}" y="${ty}" font-size="9.5" font-family="Arial,sans-serif" fill="#222" font-weight="bold">
      ArchitectXpert — 2D Floor Plan | ${spec.style} | Est. PKR ${lac} Lac
    </text>
    <text x="${CANVAS_W-MR+10}" y="${ty}" text-anchor="end" font-size="8.5" font-family="Arial,sans-serif" fill="#777">
      ${spec.totalArea.toLocaleString()} sq ft | ${new Date().toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})}
    </text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${CANVAS_W}" height="${CANVAS_H}">
  <defs>${clipDefs}</defs>
  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#ffffff"/>
  ${roomEls}
  ${outerWall}
  ${dims.join("\n")}
  ${northArrow}
  ${title}
</svg>`;
}
