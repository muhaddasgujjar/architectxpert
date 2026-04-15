import { useRef, useState, useCallback, useEffect } from "react";
import { useWorkstation } from "@/lib/WorkstationContext";
import { renderElement } from "./elementRenderers";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";

export default function Canvas() {
  const { state, dispatch } = useWorkstation();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    onWheel,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    screenToCanvas,
  } = useCanvasInteraction(svgRef);

  // Track mouse position for status bar
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      onCanvasMouseMove(e);
      const pos = screenToCanvas(e.clientX, e.clientY);
      setMousePos(pos);
      // Dispatch a custom event for status bar
      window.dispatchEvent(
        new CustomEvent("workstation:mousemove", { detail: pos })
      );
    },
    [onCanvasMouseMove, screenToCanvas]
  );

  // Start with canvas top-left near viewport top-left
  useEffect(() => {
    if (!containerRef.current) return;
    // Small offset so the grid origin is visible with some padding
    dispatch({ type: "SET_PAN", x: 40, y: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get visible layers
  const visibleLayers = new Set(
    state.layers.filter((l) => l.visible).map((l) => l.name)
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#0a0a0f] rounded-lg"
      style={{ cursor: state.activeTool === "select" ? "default" : "crosshair" }}
    >
      {/* Drawing mode crosshair preview */}
      {state.isDrawing && state.drawStart && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md bg-accent-blue/20 border border-accent-blue/30 text-[11px] font-mono text-accent-blue">
          Drawing from ({Math.round(state.drawStart.x / 24)}', {Math.round(state.drawStart.y / 24)}')
          → ({Math.round(mousePos.x / 24)}', {Math.round(mousePos.y / 24)}')
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full"
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={onCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: "none" }}
      >
        {/* Canvas transform group (pan + zoom) */}
        <g transform={`translate(${state.panX}, ${state.panY}) scale(${state.zoom})`}>
          {/* Background */}
          <rect
            x={0}
            y={0}
            width={state.canvasWidth}
            height={state.canvasHeight}
            fill="#0d0d12"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            rx={4}
          />

          {/* Grid */}
          {state.gridVisible && (
            <g opacity={0.25}>
              {/* Minor grid (small dots) */}
              <defs>
                <pattern
                  id="grid-minor"
                  width={state.gridSize}
                  height={state.gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx={state.gridSize / 2}
                    cy={state.gridSize / 2}
                    r={0.5}
                    fill="rgba(255,255,255,0.3)"
                  />
                </pattern>
                {/* Major grid (every 4 cells) */}
                <pattern
                  id="grid-major"
                  width={state.gridSize * 4}
                  height={state.gridSize * 4}
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width={state.gridSize * 4}
                    height={state.gridSize * 4}
                    fill="url(#grid-minor)"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={state.gridSize * 4}
                    y2={0}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={state.gridSize * 4}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                  />
                </pattern>
              </defs>
              <rect
                x={0}
                y={0}
                width={state.canvasWidth}
                height={state.canvasHeight}
                fill="url(#grid-major)"
              />
            </g>
          )}

          {/* Origin crosshair */}
          <line x1={-20} y1={0} x2={40} y2={0} stroke="rgba(59,130,246,0.2)" strokeWidth={0.5} />
          <line x1={0} y1={-20} x2={0} y2={40} stroke="rgba(59,130,246,0.2)" strokeWidth={0.5} />

          {/* Elements */}
          {state.elements
            .filter((el) => el.visible && visibleLayers.has(el.layer))
            .map((el) =>
              renderElement({
                element: el,
                isSelected: state.selectedIds.includes(el.id),
                isHovered: hoveredId === el.id,
                onMouseDown: () => {},
                onMouseEnter: () => setHoveredId(el.id),
                onMouseLeave: () => setHoveredId(null),
              })
            )}

          {/* Drawing preview (ghost shape) */}
          {state.isDrawing && state.drawStart && (
            <g opacity={0.4}>
              {state.activeTool === "room" && (
                <rect
                  x={Math.min(state.drawStart.x, mousePos.x)}
                  y={Math.min(state.drawStart.y, mousePos.y)}
                  width={Math.abs(mousePos.x - state.drawStart.x)}
                  height={Math.abs(mousePos.y - state.drawStart.y)}
                  fill="rgba(59,130,246,0.06)"
                  stroke="rgba(59,130,246,0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  rx={2}
                />
              )}
              {state.activeTool === "wall" && (
                <line
                  x1={state.drawStart.x}
                  y1={state.drawStart.y}
                  x2={state.orthoEnabled
                    ? (Math.abs(mousePos.x - state.drawStart.x) > Math.abs(mousePos.y - state.drawStart.y) ? mousePos.x : state.drawStart.x)
                    : mousePos.x}
                  y2={state.orthoEnabled
                    ? (Math.abs(mousePos.x - state.drawStart.x) > Math.abs(mousePos.y - state.drawStart.y) ? state.drawStart.y : mousePos.y)
                    : mousePos.y}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                />
              )}
              {state.activeTool === "dimension" && (
                <line
                  x1={state.drawStart.x}
                  y1={state.drawStart.y}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="rgba(251,191,36,0.5)"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}
            </g>
          )}

          {/* Cursor crosshair when drawing */}
          {(state.activeTool !== "select" && state.activeTool !== "eraser") && (
            <g opacity={0.3}>
              <line
                x1={mousePos.x - 12}
                y1={mousePos.y}
                x2={mousePos.x + 12}
                y2={mousePos.y}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.5}
              />
              <line
                x1={mousePos.x}
                y1={mousePos.y - 12}
                x2={mousePos.x}
                y2={mousePos.y + 12}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.5}
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
