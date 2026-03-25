export interface Room {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  textColor: string;
}

export interface FloorplanResult {
  rooms: Room[];
  totalWidth: number;
  totalHeight: number;
  totalArea: number;
}

const roomColors: Record<string, { bg: string; text: string }> = {
  "Living Room": { bg: "rgba(59,130,246,0.08)", text: "rgba(59,130,246,0.6)" },
  "Kitchen": { bg: "rgba(251,191,36,0.08)", text: "rgba(251,191,36,0.6)" },
  "Master Bedroom": { bg: "rgba(139,92,246,0.08)", text: "rgba(139,92,246,0.6)" },
  "Bedroom": { bg: "rgba(16,185,129,0.08)", text: "rgba(16,185,129,0.6)" },
  "Bedroom 2": { bg: "rgba(16,185,129,0.08)", text: "rgba(16,185,129,0.6)" },
  "Bedroom 3": { bg: "rgba(6,182,212,0.08)", text: "rgba(6,182,212,0.6)" },
  "Bathroom": { bg: "rgba(244,63,94,0.08)", text: "rgba(244,63,94,0.6)" },
  "Bathroom 2": { bg: "rgba(244,63,94,0.08)", text: "rgba(244,63,94,0.6)" },
  "Dining Room": { bg: "rgba(59,130,246,0.05)", text: "rgba(59,130,246,0.5)" },
  "Garage": { bg: "rgba(251,191,36,0.05)", text: "rgba(251,191,36,0.4)" },
  "Hallway": { bg: "rgba(148,163,184,0.05)", text: "rgba(148,163,184,0.4)" },
  "Laundry": { bg: "rgba(168,85,247,0.06)", text: "rgba(168,85,247,0.5)" },
  "Office": { bg: "rgba(34,197,94,0.06)", text: "rgba(34,197,94,0.5)" },
  "Balcony": { bg: "rgba(14,165,233,0.05)", text: "rgba(14,165,233,0.5)" },
  "Storage": { bg: "rgba(107,114,128,0.06)", text: "rgba(107,114,128,0.5)" },
  "Patio": { bg: "rgba(101,163,13,0.05)", text: "rgba(101,163,13,0.5)" },
};

function getColorForRoom(name: string) {
  return roomColors[name] || { bg: "rgba(148,163,184,0.06)", text: "rgba(148,163,184,0.5)" };
}

function parseRequirements(requirements: string): string[] {
  const lower = requirements.toLowerCase();
  const rooms: string[] = [];

  rooms.push("Living Room");
  rooms.push("Kitchen");
  rooms.push("Master Bedroom");
  rooms.push("Bathroom");

  if (lower.includes("2 bed") || lower.includes("two bed") || lower.includes("2bed")) {
    rooms.push("Bedroom 2");
  }
  if (lower.includes("3 bed") || lower.includes("three bed") || lower.includes("3bed")) {
    rooms.push("Bedroom 2");
    rooms.push("Bedroom 3");
  }
  if (lower.includes("2 bath") || lower.includes("two bath") || lower.includes("2bath")) {
    rooms.push("Bathroom 2");
  }
  if (lower.includes("dining") || lower.includes("formal")) {
    rooms.push("Dining Room");
  }
  if (lower.includes("garage")) {
    rooms.push("Garage");
  }
  if (lower.includes("office") || lower.includes("study") || lower.includes("work")) {
    rooms.push("Office");
  }
  if (lower.includes("laundry")) {
    rooms.push("Laundry");
  }
  if (lower.includes("balcony") || lower.includes("terrace")) {
    rooms.push("Balcony");
  }
  if (lower.includes("patio") || lower.includes("outdoor")) {
    rooms.push("Patio");
  }
  if (lower.includes("storage") || lower.includes("closet")) {
    rooms.push("Storage");
  }

  if (rooms.length <= 4 && !lower.includes("studio") && !lower.includes("small")) {
    rooms.push("Dining Room");
    rooms.push("Hallway");
  }

  return rooms;
}

function allocateRoomSizes(
  rooms: string[],
  totalWidth: number,
  totalHeight: number
): Room[] {
  const padding = 4;
  const usableW = totalWidth - padding * 2;
  const usableH = totalHeight - padding * 2;

  const totalArea = usableW * usableH;

  const weights: Record<string, number> = {
    "Living Room": 0.22,
    "Kitchen": 0.12,
    "Master Bedroom": 0.16,
    "Bedroom": 0.12,
    "Bedroom 2": 0.11,
    "Bedroom 3": 0.10,
    "Bathroom": 0.06,
    "Bathroom 2": 0.05,
    "Dining Room": 0.10,
    "Garage": 0.14,
    "Hallway": 0.05,
    "Laundry": 0.04,
    "Office": 0.08,
    "Balcony": 0.06,
    "Storage": 0.03,
    "Patio": 0.08,
  };

  const totalWeight = rooms.reduce((sum, r) => sum + (weights[r] || 0.08), 0);

  const result: Room[] = [];
  let currentX = padding;
  let currentY = padding;
  let rowHeight = 0;
  let remainingWidthInRow = usableW;

  const sorted = [...rooms].sort((a, b) => (weights[b] || 0.08) - (weights[a] || 0.08));

  for (let i = 0; i < sorted.length; i++) {
    const name = sorted[i];
    const weight = weights[name] || 0.08;
    const areaForRoom = (weight / totalWeight) * totalArea;

    let roomW: number;
    let roomH: number;

    if (i < 2) {
      roomW = Math.min(remainingWidthInRow, usableW * 0.55);
      roomH = areaForRoom / roomW;
    } else if (remainingWidthInRow < usableW * 0.25) {
      currentX = padding;
      currentY += rowHeight + 2;
      remainingWidthInRow = usableW;
      rowHeight = 0;
      roomW = Math.min(remainingWidthInRow * 0.5, usableW * 0.4);
      roomH = areaForRoom / roomW;
    } else {
      roomW = Math.min(remainingWidthInRow, usableW * 0.4);
      roomH = areaForRoom / roomW;
    }

    roomW = Math.max(roomW, 40);
    roomH = Math.max(roomH, 30);

    if (currentX + roomW > padding + usableW) {
      roomW = padding + usableW - currentX;
    }
    if (currentY + roomH > padding + usableH) {
      roomH = padding + usableH - currentY;
    }

    roomW = Math.round(roomW);
    roomH = Math.round(roomH);

    const colors = getColorForRoom(name);

    result.push({
      name,
      x: Math.round(currentX),
      y: Math.round(currentY),
      width: roomW,
      height: roomH,
      color: colors.bg,
      textColor: colors.text,
    });

    currentX += roomW + 2;
    remainingWidthInRow -= roomW + 2;
    rowHeight = Math.max(rowHeight, roomH);
  }

  return result;
}

export function generateFloorplan(
  width: number,
  height: number,
  requirements: string
): FloorplanResult {
  const rooms = parseRequirements(requirements);

  const svgWidth = 500;
  const svgHeight = Math.round((height / width) * svgWidth);

  const allocatedRooms = allocateRoomSizes(rooms, svgWidth, svgHeight);

  return {
    rooms: allocatedRooms,
    totalWidth: svgWidth,
    totalHeight: svgHeight,
    totalArea: width * height,
  };
}
