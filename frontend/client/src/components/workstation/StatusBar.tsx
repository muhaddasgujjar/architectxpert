import { useState, useEffect } from "react";
import {
  Grid3X3, Magnet, SquareSlash, MousePointer2, Minus, Square, DoorOpen,
  LayoutGrid, Type, Ruler, Eraser, Crosshair,
} from "lucide-react";
import { useWorkstation } from "@/lib/WorkstationContext";

const toolNames: Record<string, { label: string; icon: React.ElementType }> = {
  select: { label: "SELECT", icon: MousePointer2 },
  wall: { label: "WALL", icon: Minus },
  room: { label: "ROOM", icon: Square },
  door: { label: "DOOR", icon: DoorOpen },
  window: { label: "WINDOW", icon: LayoutGrid },
  text: { label: "TEXT", icon: Type },
  dimension: { label: "DIMENSION", icon: Ruler },
  furniture: { label: "FURNITURE", icon: Crosshair },
  eraser: { label: "ERASER", icon: Eraser },
};

export default function StatusBar() {
  const { state, dispatch } = useWorkstation();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Listen for mouse position events from canvas
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setMousePos(detail);
    };
    window.addEventListener("workstation:mousemove", handler);
    return () => window.removeEventListener("workstation:mousemove", handler);
  }, []);

  const toolInfo = toolNames[state.activeTool] || { label: "SELECT", icon: MousePointer2 };
  const ToolIcon = toolInfo.icon;

  return (
    <div className="h-7 flex items-center gap-0 px-2 bg-[#0c0c14]/95 border-t border-white/[0.06] backdrop-blur-xl text-[10px] font-mono select-none">
      {/* Coordinates */}
      <div className="flex items-center gap-3 px-2 text-white/30">
        <span>
          X: <span className="text-white/50">{Math.round(mousePos.x / 24)}'</span>
        </span>
        <span>
          Y: <span className="text-white/50">{Math.round(mousePos.y / 24)}'</span>
        </span>
      </div>

      <div className="w-px h-4 bg-white/[0.06] mx-2" />

      {/* Current tool */}
      <div className="flex items-center gap-1.5 px-2 text-accent-blue/70">
        <ToolIcon className="w-3 h-3" />
        <span>{toolInfo.label}</span>
      </div>

      <div className="w-px h-4 bg-white/[0.06] mx-2" />

      {/* Element count */}
      <div className="flex items-center gap-3 px-2 text-white/25">
        <span>{state.elements.length} elements</span>
        {state.selectedIds.length > 0 && (
          <span className="text-accent-blue/60">{state.selectedIds.length} selected</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Toggle buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            state.snapEnabled
              ? "text-accent-blue bg-accent-blue/10"
              : "text-white/25 hover:text-white/40"
          }`}
          title="Snap to Grid (S)"
        >
          <Magnet className="w-2.5 h-2.5" />
          SNAP
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_GRID" })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            state.gridVisible
              ? "text-accent-blue bg-accent-blue/10"
              : "text-white/25 hover:text-white/40"
          }`}
          title="Toggle Grid (G)"
        >
          <Grid3X3 className="w-2.5 h-2.5" />
          GRID
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_ORTHO" })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            state.orthoEnabled
              ? "text-accent-blue bg-accent-blue/10"
              : "text-white/25 hover:text-white/40"
          }`}
          title="Ortho Mode (O)"
        >
          <SquareSlash className="w-2.5 h-2.5" />
          ORTHO
        </button>
      </div>

      <div className="w-px h-4 bg-white/[0.06] mx-2" />

      {/* Zoom */}
      <div className="flex items-center gap-1.5 px-2 text-white/30">
        <span>
          Zoom: <span className="text-white/50">{Math.round(state.zoom * 100)}%</span>
        </span>
      </div>
    </div>
  );
}
