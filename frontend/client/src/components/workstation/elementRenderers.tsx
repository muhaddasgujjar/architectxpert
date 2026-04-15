// ── SVG Element Renderers ──────────────────────────────────────────────────────
// Pure render functions for each element type on the canvas.

import type {
  CanvasElement, WallElement, RoomElement, DoorElement,
  WindowElement, FurnitureElement, TextElement, DimensionElement,
} from "@/lib/WorkstationContext";
import { getFurnitureById } from "@/lib/furnitureLibrary";

interface RenderProps {
  element: CanvasElement;
  isSelected: boolean;
  isHovered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

// ── Wall ──────────────────────────────────────────────────────────────────────
function renderWall(el: WallElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const strokeColor = isSelected ? "#3b82f6" : isHovered ? "rgba(255,255,255,0.8)" : el.color || "rgba(255,255,255,0.7)";
  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: "move" }}>
      <line
        x1={el.x} y1={el.y} x2={el.x2} y2={el.y2}
        stroke={strokeColor}
        strokeWidth={el.thickness || 6}
        strokeLinecap="round"
      />
      {/* Hit area for easier selection */}
      <line
        x1={el.x} y1={el.y} x2={el.x2} y2={el.y2}
        stroke="transparent"
        strokeWidth={Math.max(el.thickness + 8, 14)}
      />
      {isSelected && (
        <>
          <circle cx={el.x} cy={el.y} r={4} fill="#3b82f6" stroke="#1e3a5f" strokeWidth={1.5} />
          <circle cx={el.x2} cy={el.y2} r={4} fill="#3b82f6" stroke="#1e3a5f" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

// ── Room ──────────────────────────────────────────────────────────────────────
function renderRoom(el: RoomElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const strokeColor = isSelected ? "#3b82f6" : isHovered ? "rgba(255,255,255,0.5)" : el.color || "rgba(59,130,246,0.4)";

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}
       transform={el.rotation ? `rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})` : undefined}>
      <rect
        x={el.x} y={el.y} width={el.width} height={el.height}
        fill={el.fillColor || "rgba(59,130,246,0.04)"}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1.5}
        rx={2}
      />
      {/* Room label */}
      <text
        x={el.x + el.width / 2} y={el.y + el.height / 2 - 6}
        fill={isSelected ? "#3b82f6" : "rgba(255,255,255,0.5)"}
        fontSize={Math.min(12, el.width / 6)}
        fontFamily="'Space Grotesk', monospace"
        textAnchor="middle" dominantBaseline="middle"
      >
        {el.label || el.roomType || "Room"}
      </text>
      {/* Dimensions */}
      <text
        x={el.x + el.width / 2} y={el.y + el.height / 2 + 10}
        fill="rgba(255,255,255,0.2)"
        fontSize={Math.min(9, el.width / 8)}
        fontFamily="'JetBrains Mono', monospace"
        textAnchor="middle" dominantBaseline="middle"
      >
        {`${Math.round(el.width / 24)}'×${Math.round(el.height / 24)}'`}
      </text>

      {/* Selection handles */}
      {isSelected && (
        <>
          {/* Corner handles */}
          {[
            [el.x, el.y], [el.x + el.width, el.y],
            [el.x, el.y + el.height], [el.x + el.width, el.y + el.height],
          ].map(([cx, cy], i) => (
            <rect key={i} x={cx - 4} y={cy - 4} width={8} height={8} rx={1}
              fill="#3b82f6" stroke="#1e3a5f" strokeWidth={1}
              style={{ cursor: ["nw-resize", "ne-resize", "sw-resize", "se-resize"][i] }}
            />
          ))}
          {/* Selection border dash */}
          <rect x={el.x - 1} y={el.y - 1} width={el.width + 2} height={el.height + 2}
            fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" rx={2} opacity={0.5}
          />
        </>
      )}
    </g>
  );
}

// ── Door ──────────────────────────────────────────────────────────────────────
function renderDoor(el: DoorElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const color = isSelected ? "#fbbf24" : isHovered ? "rgba(251,191,36,0.8)" : "rgba(251,191,36,0.6)";
  const w = el.width || 30;
  const h = el.height || 6;

  // Door swing arc
  const arcRadius = w;
  const isLeft = el.swingDirection === "left";

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}
       transform={el.rotation ? `rotate(${el.rotation} ${el.x + w / 2} ${el.y + h / 2})` : undefined}>
      {/* Door opening (gap in wall) */}
      <rect x={el.x} y={el.y} width={w} height={h} fill="rgba(0,0,0,0.8)" stroke="none" />
      {/* Door leaf */}
      <line x1={el.x} y1={el.y} x2={isLeft ? el.x : el.x + w} y2={el.y - arcRadius * 0.6}
        stroke={color} strokeWidth={1.5}
      />
      {/* Swing arc */}
      <path
        d={isLeft
          ? `M ${el.x} ${el.y - arcRadius * 0.6} A ${arcRadius * 0.6} ${arcRadius * 0.6} 0 0 1 ${el.x + w} ${el.y}`
          : `M ${el.x + w} ${el.y - arcRadius * 0.6} A ${arcRadius * 0.6} ${arcRadius * 0.6} 0 0 0 ${el.x} ${el.y}`}
        fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.5}
      />
      {/* Hit area */}
      <rect x={el.x - 4} y={el.y - arcRadius * 0.6 - 4} width={w + 8} height={arcRadius * 0.6 + h + 8}
        fill="transparent"
      />
      {isSelected && (
        <rect x={el.x - 2} y={el.y - 2} width={w + 4} height={h + 4}
          fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 2"
        />
      )}
    </g>
  );
}

// ── Window ────────────────────────────────────────────────────────────────────
function renderWindow(el: WindowElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const color = isSelected ? "#60a5fa" : isHovered ? "rgba(96,165,250,0.8)" : "rgba(96,165,250,0.5)";
  const w = el.width || 36;
  const h = el.height || 6;

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}
       transform={el.rotation ? `rotate(${el.rotation} ${el.x + w / 2} ${el.y + h / 2})` : undefined}>
      {/* Glass panes */}
      <rect x={el.x} y={el.y} width={w} height={h} fill="rgba(96,165,250,0.08)" stroke={color} strokeWidth={1.5} />
      {/* Center line(s) */}
      {el.panes >= 2 && (
        <line x1={el.x + w / 2} y1={el.y} x2={el.x + w / 2} y2={el.y + h} stroke={color} strokeWidth={1} />
      )}
      {/* Sill lines */}
      <line x1={el.x} y1={el.y + h / 2} x2={el.x + w} y2={el.y + h / 2} stroke={color} strokeWidth={0.5} opacity={0.5} />
      {isSelected && (
        <rect x={el.x - 2} y={el.y - 2} width={w + 4} height={h + 4}
          fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 2"
        />
      )}
    </g>
  );
}

// ── Furniture ─────────────────────────────────────────────────────────────────
function renderFurniture(el: FurnitureElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const item = getFurnitureById(el.furnitureId);

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}
       transform={`translate(${el.x},${el.y})${el.rotation ? ` rotate(${el.rotation} ${el.width / 2} ${el.height / 2})` : ""}`}
       opacity={isHovered ? 1 : el.opacity || 0.85}>
      {item ? (
        <g dangerouslySetInnerHTML={{ __html: item.svgContent }} />
      ) : (
        <rect x={0} y={0} width={el.width} height={el.height} rx={2}
          fill="rgba(148,163,184,0.08)" stroke="rgba(148,163,184,0.4)" strokeWidth={1.5}
        />
      )}
      {/* Label */}
      <text x={el.width / 2} y={el.height + 12}
        fill="rgba(255,255,255,0.25)" fontSize="8"
        fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
      >
        {el.label || item?.name || ""}
      </text>
      {isSelected && (
        <>
          <rect x={-2} y={-2} width={el.width + 4} height={el.height + 4}
            fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" rx={2}
          />
          {/* Resize handles */}
          {[
            [0, 0], [el.width, 0], [0, el.height], [el.width, el.height],
          ].map(([cx, cy], i) => (
            <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} rx={1}
              fill="#3b82f6" stroke="#1e3a5f" strokeWidth={1}
            />
          ))}
        </>
      )}
    </g>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────────
function renderText(el: TextElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const color = isSelected ? "#f8fafc" : isHovered ? "rgba(255,255,255,0.7)" : el.color || "rgba(255,255,255,0.5)";

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}>
      <text
        x={el.x} y={el.y}
        fill={color} fontSize={el.fontSize || 14}
        fontFamily="'Space Grotesk', sans-serif"
      >
        {el.text || el.label || "Text"}
      </text>
      {isSelected && (
        <rect x={el.x - 4} y={el.y - (el.fontSize || 14) - 2}
          width={el.width || 100} height={(el.fontSize || 14) + 8}
          fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 2"
        />
      )}
    </g>
  );
}

// ── Dimension ─────────────────────────────────────────────────────────────────
function renderDimension(el: DimensionElement, props: RenderProps) {
  const { isSelected, isHovered, onMouseDown, onMouseEnter, onMouseLeave } = props;
  const color = isSelected ? "#fbbf24" : isHovered ? "rgba(251,191,36,0.8)" : "rgba(251,191,36,0.5)";
  const midX = (el.x + el.x2) / 2;
  const midY = (el.y + el.y2) / 2;
  const dx = el.x2 - el.x;
  const dy = el.y2 - el.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const displayLength = `${(length / 24).toFixed(1)}'`;

  return (
    <g key={el.id} data-element-id={el.id} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
       style={{ cursor: "move" }}>
      <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={1} />
      {/* End ticks */}
      <line x1={el.x} y1={el.y - 6} x2={el.x} y2={el.y + 6} stroke={color} strokeWidth={1} />
      <line x1={el.x2} y1={el.y2 - 6} x2={el.x2} y2={el.y2 + 6} stroke={color} strokeWidth={1} />
      {/* Measurement text */}
      <rect x={midX - 18} y={midY - 8} width={36} height={14} rx={2} fill="#0a0a0a" />
      <text x={midX} y={midY + 2}
        fill={color} fontSize="9"
        fontFamily="'JetBrains Mono', monospace"
        textAnchor="middle" dominantBaseline="middle"
      >
        {el.measurement || displayLength}
      </text>
      {/* Hit area */}
      <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke="transparent" strokeWidth={12} />
      {isSelected && (
        <>
          <circle cx={el.x} cy={el.y} r={4} fill="#fbbf24" stroke="#7c3800" strokeWidth={1.5} />
          <circle cx={el.x2} cy={el.y2} r={4} fill="#fbbf24" stroke="#7c3800" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

// ── Main Render Dispatcher ────────────────────────────────────────────────────
export function renderElement(props: RenderProps) {
  const { element } = props;
  switch (element.type) {
    case "wall":       return renderWall(element as WallElement, props);
    case "room":       return renderRoom(element as RoomElement, props);
    case "door":       return renderDoor(element as DoorElement, props);
    case "window":     return renderWindow(element as WindowElement, props);
    case "furniture":  return renderFurniture(element as FurnitureElement, props);
    case "text":       return renderText(element as TextElement, props);
    case "dimension":  return renderDimension(element as DimensionElement, props);
    default:           return null;
  }
}
