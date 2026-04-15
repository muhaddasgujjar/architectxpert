// ── Furniture Library ──────────────────────────────────────────────────────────
// SVG path data for all draggable furniture / fixture items.

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  width: number;   // grid units
  height: number;  // grid units
  color: string;
  svgContent: string; // SVG inner content (inside a <g>)
}

export const furnitureCategories = [
  "Bedroom",
  "Living Room",
  "Kitchen",
  "Bathroom",
  "Dining",
  "Office",
  "Outdoor",
] as const;

export type FurnitureCategory = (typeof furnitureCategories)[number];

export const furnitureLibrary: FurnitureItem[] = [
  // ── Bedroom ─────────────────────────────────────────────────────────────
  {
    id: "bed-single",
    name: "Single Bed",
    category: "Bedroom",
    width: 48, height: 96,
    color: "rgba(139,92,246,0.5)",
    svgContent: `<rect x="2" y="2" width="44" height="92" rx="3" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
      <rect x="6" y="6" width="36" height="16" rx="2" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>
      <line x1="6" y1="30" x2="42" y2="30" stroke="rgba(139,92,246,0.2)" stroke-width="1"/>`,
  },
  {
    id: "bed-double",
    name: "Double Bed",
    category: "Bedroom",
    width: 72, height: 96,
    color: "rgba(139,92,246,0.5)",
    svgContent: `<rect x="2" y="2" width="68" height="92" rx="3" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
      <rect x="6" y="6" width="28" height="16" rx="2" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>
      <rect x="38" y="6" width="28" height="16" rx="2" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>
      <line x1="36" y1="6" x2="36" y2="90" stroke="rgba(139,92,246,0.15)" stroke-width="1" stroke-dasharray="4"/>`,
  },
  {
    id: "bed-king",
    name: "King Bed",
    category: "Bedroom",
    width: 96, height: 96,
    color: "rgba(139,92,246,0.5)",
    svgContent: `<rect x="2" y="2" width="92" height="92" rx="3" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
      <rect x="6" y="6" width="38" height="18" rx="2" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>
      <rect x="50" y="6" width="38" height="18" rx="2" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>
      <line x1="48" y1="6" x2="48" y2="90" stroke="rgba(139,92,246,0.15)" stroke-width="1" stroke-dasharray="4"/>`,
  },
  {
    id: "wardrobe",
    name: "Wardrobe",
    category: "Bedroom",
    width: 72, height: 24,
    color: "rgba(139,92,246,0.5)",
    svgContent: `<rect x="2" y="2" width="68" height="20" rx="2" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
      <line x1="36" y1="2" x2="36" y2="22" stroke="rgba(139,92,246,0.4)" stroke-width="1"/>
      <circle cx="32" cy="12" r="1.5" fill="rgba(139,92,246,0.5)"/>
      <circle cx="40" cy="12" r="1.5" fill="rgba(139,92,246,0.5)"/>`,
  },
  {
    id: "nightstand",
    name: "Nightstand",
    category: "Bedroom",
    width: 24, height: 24,
    color: "rgba(139,92,246,0.5)",
    svgContent: `<rect x="2" y="2" width="20" height="20" rx="2" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="none" stroke="rgba(139,92,246,0.3)" stroke-width="1"/>`,
  },

  // ── Living Room ─────────────────────────────────────────────────────────
  {
    id: "sofa-3seat",
    name: "3-Seat Sofa",
    category: "Living Room",
    width: 96, height: 36,
    color: "rgba(59,130,246,0.5)",
    svgContent: `<rect x="2" y="2" width="92" height="32" rx="4" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.5)" stroke-width="1.5"/>
      <rect x="2" y="24" width="92" height="10" rx="3" fill="rgba(59,130,246,0.05)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
      <line x1="32" y1="4" x2="32" y2="22" stroke="rgba(59,130,246,0.2)" stroke-width="1"/>
      <line x1="64" y1="4" x2="64" y2="22" stroke="rgba(59,130,246,0.2)" stroke-width="1"/>`,
  },
  {
    id: "sofa-2seat",
    name: "2-Seat Sofa",
    category: "Living Room",
    width: 72, height: 36,
    color: "rgba(59,130,246,0.5)",
    svgContent: `<rect x="2" y="2" width="68" height="32" rx="4" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.5)" stroke-width="1.5"/>
      <rect x="2" y="24" width="68" height="10" rx="3" fill="rgba(59,130,246,0.05)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
      <line x1="36" y1="4" x2="36" y2="22" stroke="rgba(59,130,246,0.2)" stroke-width="1"/>`,
  },
  {
    id: "armchair",
    name: "Armchair",
    category: "Living Room",
    width: 36, height: 36,
    color: "rgba(59,130,246,0.5)",
    svgContent: `<rect x="2" y="2" width="32" height="32" rx="4" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.5)" stroke-width="1.5"/>
      <rect x="2" y="24" width="32" height="10" rx="3" fill="rgba(59,130,246,0.05)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>`,
  },
  {
    id: "coffee-table",
    name: "Coffee Table",
    category: "Living Room",
    width: 48, height: 24,
    color: "rgba(59,130,246,0.5)",
    svgContent: `<rect x="2" y="2" width="44" height="20" rx="2" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.4)" stroke-width="1.5"/>
      <circle cx="8" cy="8" r="2" fill="rgba(59,130,246,0.2)"/>
      <circle cx="40" cy="8" r="2" fill="rgba(59,130,246,0.2)"/>`,
  },
  {
    id: "tv-stand",
    name: "TV Stand",
    category: "Living Room",
    width: 72, height: 18,
    color: "rgba(59,130,246,0.5)",
    svgContent: `<rect x="2" y="2" width="68" height="14" rx="2" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.4)" stroke-width="1.5"/>
      <rect x="20" y="0" width="32" height="4" rx="1" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>`,
  },

  // ── Kitchen ─────────────────────────────────────────────────────────────
  {
    id: "stove",
    name: "Stove",
    category: "Kitchen",
    width: 30, height: 24,
    color: "rgba(251,191,36,0.5)",
    svgContent: `<rect x="2" y="2" width="26" height="20" rx="2" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.5)" stroke-width="1.5"/>
      <circle cx="10" cy="9" r="3" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="1"/>
      <circle cx="22" cy="9" r="3" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="1"/>
      <circle cx="10" cy="17" r="3" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="1"/>
      <circle cx="22" cy="17" r="3" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="1"/>`,
  },
  {
    id: "fridge",
    name: "Refrigerator",
    category: "Kitchen",
    width: 30, height: 30,
    color: "rgba(251,191,36,0.5)",
    svgContent: `<rect x="2" y="2" width="26" height="26" rx="2" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.5)" stroke-width="1.5"/>
      <line x1="2" y1="16" x2="28" y2="16" stroke="rgba(251,191,36,0.3)" stroke-width="1"/>
      <circle cx="24" cy="10" r="1.5" fill="rgba(251,191,36,0.4)"/>
      <circle cx="24" cy="22" r="1.5" fill="rgba(251,191,36,0.4)"/>`,
  },
  {
    id: "sink-kitchen",
    name: "Kitchen Sink",
    category: "Kitchen",
    width: 30, height: 24,
    color: "rgba(251,191,36,0.5)",
    svgContent: `<rect x="2" y="2" width="26" height="20" rx="3" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.5)" stroke-width="1.5"/>
      <rect x="5" y="5" width="9" height="14" rx="2" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="1"/>
      <rect x="16" y="5" width="9" height="14" rx="2" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="1"/>
      <circle cx="15" cy="3" r="1.5" fill="rgba(251,191,36,0.4)"/>`,
  },
  {
    id: "counter",
    name: "Counter",
    category: "Kitchen",
    width: 72, height: 24,
    color: "rgba(251,191,36,0.5)",
    svgContent: `<rect x="2" y="2" width="68" height="20" rx="2" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.4)" stroke-width="1.5"/>`,
  },

  // ── Bathroom ────────────────────────────────────────────────────────────
  {
    id: "toilet",
    name: "Toilet",
    category: "Bathroom",
    width: 24, height: 30,
    color: "rgba(244,63,94,0.5)",
    svgContent: `<rect x="4" y="2" width="16" height="10" rx="2" fill="rgba(244,63,94,0.08)" stroke="rgba(244,63,94,0.5)" stroke-width="1.5"/>
      <ellipse cx="12" cy="20" rx="10" ry="8" fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.5)" stroke-width="1.5"/>`,
  },
  {
    id: "bathtub",
    name: "Bathtub",
    category: "Bathroom",
    width: 36, height: 72,
    color: "rgba(244,63,94,0.5)",
    svgContent: `<rect x="2" y="2" width="32" height="68" rx="6" fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.5)" stroke-width="1.5"/>
      <rect x="6" y="6" width="24" height="60" rx="4" fill="none" stroke="rgba(244,63,94,0.25)" stroke-width="1"/>
      <circle cx="18" cy="12" r="3" fill="none" stroke="rgba(244,63,94,0.3)" stroke-width="1"/>`,
  },
  {
    id: "shower",
    name: "Shower",
    category: "Bathroom",
    width: 36, height: 36,
    color: "rgba(244,63,94,0.5)",
    svgContent: `<rect x="2" y="2" width="32" height="32" rx="2" fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.5)" stroke-width="1.5"/>
      <circle cx="18" cy="18" r="8" fill="none" stroke="rgba(244,63,94,0.2)" stroke-width="1"/>
      <circle cx="18" cy="18" r="3" fill="rgba(244,63,94,0.15)" stroke="rgba(244,63,94,0.3)" stroke-width="1"/>`,
  },
  {
    id: "basin",
    name: "Wash Basin",
    category: "Bathroom",
    width: 24, height: 18,
    color: "rgba(244,63,94,0.5)",
    svgContent: `<ellipse cx="12" cy="9" rx="10" ry="7" fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.5)" stroke-width="1.5"/>
      <circle cx="12" cy="8" r="2" fill="none" stroke="rgba(244,63,94,0.3)" stroke-width="1"/>
      <line x1="12" y1="0" x2="12" y2="3" stroke="rgba(244,63,94,0.4)" stroke-width="1.5"/>`,
  },

  // ── Dining ──────────────────────────────────────────────────────────────
  {
    id: "dining-table-6",
    name: "Dining Table (6)",
    category: "Dining",
    width: 72, height: 36,
    color: "rgba(6,182,212,0.5)",
    svgContent: `<rect x="6" y="6" width="60" height="24" rx="2" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.5)" stroke-width="1.5"/>
      <rect x="10" y="0" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="32" y="0" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="54" y="0" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="10" y="30" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="32" y="30" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="54" y="30" width="8" height="6" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>`,
  },
  {
    id: "dining-table-4",
    name: "Dining Table (4)",
    category: "Dining",
    width: 48, height: 48,
    color: "rgba(6,182,212,0.5)",
    svgContent: `<rect x="8" y="8" width="32" height="32" rx="2" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.5)" stroke-width="1.5"/>
      <rect x="16" y="0" width="16" height="8" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="16" y="40" width="16" height="8" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="0" y="16" width="8" height="16" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <rect x="40" y="16" width="8" height="16" rx="2" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>`,
  },

  // ── Office ──────────────────────────────────────────────────────────────
  {
    id: "desk",
    name: "Office Desk",
    category: "Office",
    width: 60, height: 30,
    color: "rgba(34,197,94,0.5)",
    svgContent: `<rect x="2" y="2" width="56" height="26" rx="2" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
      <rect x="6" y="18" width="20" height="8" rx="1" fill="none" stroke="rgba(34,197,94,0.25)" stroke-width="1"/>`,
  },
  {
    id: "office-chair",
    name: "Office Chair",
    category: "Office",
    width: 24, height: 24,
    color: "rgba(34,197,94,0.5)",
    svgContent: `<circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.3)" stroke-width="1"/>`,
  },
  {
    id: "bookshelf",
    name: "Bookshelf",
    category: "Office",
    width: 48, height: 18,
    color: "rgba(34,197,94,0.5)",
    svgContent: `<rect x="2" y="2" width="44" height="14" rx="1" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
      <line x1="14" y1="2" x2="14" y2="16" stroke="rgba(34,197,94,0.3)" stroke-width="1"/>
      <line x1="26" y1="2" x2="26" y2="16" stroke="rgba(34,197,94,0.3)" stroke-width="1"/>
      <line x1="38" y1="2" x2="38" y2="16" stroke="rgba(34,197,94,0.3)" stroke-width="1"/>`,
  },

  // ── Outdoor ─────────────────────────────────────────────────────────────
  {
    id: "car",
    name: "Car",
    category: "Outdoor",
    width: 48, height: 96,
    color: "rgba(239,68,68,0.5)",
    svgContent: `<rect x="4" y="2" width="40" height="92" rx="8" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.5)" stroke-width="1.5"/>
      <rect x="8" y="16" width="32" height="18" rx="3" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)" stroke-width="1"/>
      <rect x="8" y="60" width="32" height="18" rx="3" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)" stroke-width="1"/>
      <circle cx="12" cy="10" r="3" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" stroke-width="1"/>
      <circle cx="36" cy="10" r="3" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" stroke-width="1"/>`,
  },
  {
    id: "plant",
    name: "Plant/Tree",
    category: "Outdoor",
    width: 24, height: 24,
    color: "rgba(34,197,94,0.5)",
    svgContent: `<circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.3)" stroke-width="1"/>
      <circle cx="12" cy="12" r="2" fill="rgba(34,197,94,0.2)"/>`,
  },
];

export function getFurnitureById(id: string): FurnitureItem | undefined {
  return furnitureLibrary.find(f => f.id === id);
}

export function getFurnitureByCategory(category: string): FurnitureItem[] {
  return furnitureLibrary.filter(f => f.category === category);
}
