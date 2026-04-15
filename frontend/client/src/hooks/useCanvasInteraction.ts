import { useCallback, useEffect, useRef } from "react";
import {
  useWorkstation,
  generateId,
  snapToGrid,
  type ToolType,
  type CanvasElement,
  type RoomElement,
  type WallElement,
  type DoorElement,
  type WindowElement,
  type FurnitureElement,
  type TextElement,
  type DimensionElement,
} from "@/lib/WorkstationContext";
import { getFurnitureById } from "@/lib/furnitureLibrary";

export function useCanvasInteraction(svgRef: React.RefObject<SVGSVGElement | null>) {
  const { state, dispatch, undo, redo } = useWorkstation();
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const drawPreviewRef = useRef<{ x: number; y: number } | null>(null);
  const spaceHeldRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; elementPositions: Map<string, { x: number; y: number }> } | null>(null);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - state.panX) / state.zoom;
      const y = (clientY - rect.top - state.panY) / state.zoom;
      return { x, y };
    },
    [state.zoom, state.panX, state.panY, svgRef]
  );

  const snap = useCallback(
    (v: number) => snapToGrid(v, state.gridSize, state.snapEnabled),
    [state.gridSize, state.snapEnabled]
  );

  // ── Mouse wheel → zoom ──────────────────────────────────────────────────
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newZoom = Math.max(0.1, Math.min(5, state.zoom + delta));
      dispatch({ type: "SET_ZOOM", zoom: newZoom });
    },
    [state.zoom, dispatch]
  );

  // ── Mouse down ──────────────────────────────────────────────────────────
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Middle-click or space-held → pan
      if (e.button === 1 || spaceHeldRef.current) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      const pos = screenToCanvas(e.clientX, e.clientY);
      const sx = snap(pos.x);
      const sy = snap(pos.y);

      // Check if clicking on an element
      const target = (e.target as SVGElement).closest("[data-element-id]");
      const clickedId = target?.getAttribute("data-element-id");

      switch (state.activeTool) {
        case "select": {
          if (clickedId) {
            if (e.shiftKey) {
              dispatch({ type: "ADD_TO_SELECTION", id: clickedId });
            } else if (!state.selectedIds.includes(clickedId)) {
              dispatch({ type: "SELECT_ELEMENTS", ids: [clickedId] });
            }
            // Start dragging
            const elementPositions = new Map<string, { x: number; y: number }>();
            const idsToMove = state.selectedIds.includes(clickedId)
              ? state.selectedIds
              : [clickedId];
            idsToMove.forEach(id => {
              const el = state.elements.find(e => e.id === id);
              if (el) elementPositions.set(id, { x: el.x, y: el.y });
            });
            dragStartRef.current = { x: pos.x, y: pos.y, elementPositions };
            dispatch({ type: "SET_DRAGGING", isDragging: true, offset: { x: 0, y: 0 } });
          } else {
            dispatch({ type: "CLEAR_SELECTION" });
          }
          break;
        }

        case "wall":
        case "dimension": {
          dispatch({ type: "SET_DRAWING", isDrawing: true, start: { x: sx, y: sy } });
          break;
        }

        case "room": {
          dispatch({ type: "SET_DRAWING", isDrawing: true, start: { x: sx, y: sy } });
          break;
        }

        case "door": {
          const id = generateId();
          const door: DoorElement = {
            id, type: "door", x: sx, y: sy, width: 30, height: 6,
            rotation: 0, label: "Door", layer: "Doors & Windows",
            locked: false, visible: true, color: "rgba(251,191,36,0.6)",
            opacity: 1, swingDirection: "left", doorStyle: "hinged",
          };
          dispatch({ type: "ADD_ELEMENT", element: door });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
          dispatch({ type: "SET_TOOL", tool: "select" });
          break;
        }

        case "window": {
          const id = generateId();
          const win: WindowElement = {
            id, type: "window", x: sx, y: sy, width: 36, height: 6,
            rotation: 0, label: "Window", layer: "Doors & Windows",
            locked: false, visible: true, color: "rgba(96,165,250,0.5)",
            opacity: 1, panes: 2,
          };
          dispatch({ type: "ADD_ELEMENT", element: win });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
          dispatch({ type: "SET_TOOL", tool: "select" });
          break;
        }

        case "furniture": {
          if (state.placingFurnitureId) {
            const item = getFurnitureById(state.placingFurnitureId);
            if (item) {
              const id = generateId();
              const furn: FurnitureElement = {
                id, type: "furniture", x: sx, y: sy,
                width: item.width, height: item.height,
                rotation: 0, label: item.name, layer: "Furniture",
                locked: false, visible: true, color: item.color,
                opacity: 0.85, furnitureId: item.id, category: item.category,
              };
              dispatch({ type: "ADD_ELEMENT", element: furn });
              dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
              // Stay in furniture placement mode for rapid placement
            }
          }
          break;
        }

        case "text": {
          const id = generateId();
          const txt: TextElement = {
            id, type: "text", x: sx, y: sy, width: 100, height: 20,
            rotation: 0, label: "Text", layer: "Annotations",
            locked: false, visible: true, color: "rgba(255,255,255,0.5)",
            opacity: 1, text: "Label", fontSize: 14,
          };
          dispatch({ type: "ADD_ELEMENT", element: txt });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
          dispatch({ type: "SET_TOOL", tool: "select" });
          break;
        }

        case "eraser": {
          if (clickedId) {
            dispatch({ type: "DELETE_ELEMENTS", ids: [clickedId] });
          }
          break;
        }
      }
    },
    [state, dispatch, screenToCanvas, snap]
  );

  // ── Mouse move ──────────────────────────────────────────────────────────
  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Panning
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        dispatch({ type: "SET_PAN", x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
        return;
      }

      const pos = screenToCanvas(e.clientX, e.clientY);
      drawPreviewRef.current = pos;

      // Dragging elements
      if (state.isDragging && dragStartRef.current) {
        const dx = snap(pos.x - dragStartRef.current.x);
        const dy = snap(pos.y - dragStartRef.current.y);

        if (state.orthoEnabled) {
          // Constrain to dominant axis
          if (Math.abs(dx) > Math.abs(dy)) {
            dragStartRef.current.elementPositions.forEach((origPos, id) => {
              dispatch({ type: "UPDATE_ELEMENT", id, updates: { x: snap(origPos.x + dx), y: origPos.y } });
            });
          } else {
            dragStartRef.current.elementPositions.forEach((origPos, id) => {
              dispatch({ type: "UPDATE_ELEMENT", id, updates: { x: origPos.x, y: snap(origPos.y + dy) } });
            });
          }
        } else {
          dragStartRef.current.elementPositions.forEach((origPos, id) => {
            dispatch({ type: "UPDATE_ELEMENT", id, updates: { x: snap(origPos.x + dx), y: snap(origPos.y + dy) } });
          });
        }
      }
    },
    [state.isDragging, state.orthoEnabled, dispatch, screenToCanvas, snap]
  );

  // ── Mouse up ────────────────────────────────────────────────────────────
  const onCanvasMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // End panning
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }

      // End dragging
      if (state.isDragging) {
        dispatch({ type: "SET_DRAGGING", isDragging: false, offset: null });
        dragStartRef.current = null;
        return;
      }

      // End drawing
      if (state.isDrawing && state.drawStart) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const sx = snap(pos.x);
        const sy = snap(pos.y);
        const startX = state.drawStart.x;
        const startY = state.drawStart.y;

        const w = Math.abs(sx - startX);
        const h = Math.abs(sy - startY);

        if (state.activeTool === "wall" && (w > 4 || h > 4)) {
          const id = generateId();
          let endX = sx;
          let endY = sy;
          // Ortho constraint for walls
          if (state.orthoEnabled) {
            if (Math.abs(sx - startX) > Math.abs(sy - startY)) {
              endY = startY;
            } else {
              endX = startX;
            }
          }
          const wall: WallElement = {
            id, type: "wall",
            x: startX, y: startY, x2: endX, y2: endY,
            width: 0, height: 0, thickness: 6,
            rotation: 0, label: "Wall", layer: "Walls",
            locked: false, visible: true, color: "rgba(255,255,255,0.7)",
            opacity: 1,
          };
          dispatch({ type: "ADD_ELEMENT", element: wall });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
        }

        if (state.activeTool === "room" && w > 12 && h > 12) {
          const id = generateId();
          const room: RoomElement = {
            id, type: "room",
            x: Math.min(startX, sx), y: Math.min(startY, sy),
            width: w, height: h,
            rotation: 0, label: "Room", layer: "Rooms",
            locked: false, visible: true, color: "rgba(59,130,246,0.4)",
            opacity: 1, fillColor: "rgba(59,130,246,0.04)", roomType: "Room",
          };
          dispatch({ type: "ADD_ELEMENT", element: room });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
        }

        if (state.activeTool === "dimension" && (w > 4 || h > 4)) {
          const id = generateId();
          const dim: DimensionElement = {
            id, type: "dimension",
            x: startX, y: startY, x2: sx, y2: sy,
            width: 0, height: 0,
            rotation: 0, label: "", layer: "Annotations",
            locked: false, visible: true, color: "rgba(251,191,36,0.5)",
            opacity: 1, measurement: "",
          };
          dispatch({ type: "ADD_ELEMENT", element: dim });
          dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
        }

        dispatch({ type: "SET_DRAWING", isDrawing: false, start: null });
      }
    },
    [state, dispatch, screenToCanvas, snap]
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update space ref
      if (e.code === "Space") {
        spaceHeldRef.current = true;
        e.preventDefault();
      }

      // Ctrl/Cmd combos
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === "z" && e.shiftKey)  { e.preventDefault(); redo(); }
        if (e.key === "y")                { e.preventDefault(); redo(); }
        if (e.key === "a")                { e.preventDefault(); dispatch({ type: "SELECT_ALL" }); }
        if (e.key === "s")                { e.preventDefault(); window.dispatchEvent(new CustomEvent("workstation:save")); }
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (state.selectedIds.length > 0) {
            dispatch({ type: "DELETE_ELEMENTS", ids: state.selectedIds });
          }
          break;
        case "Escape":
          dispatch({ type: "CLEAR_SELECTION" });
          dispatch({ type: "SET_TOOL", tool: "select" });
          dispatch({ type: "SET_DRAWING", isDrawing: false, start: null });
          dispatch({ type: "SET_PLACING_FURNITURE", furnitureId: null });
          break;
        case "g": dispatch({ type: "TOGGLE_GRID" }); break;
        case "s": if (!e.ctrlKey) dispatch({ type: "TOGGLE_SNAP" }); break;
        case "o": dispatch({ type: "TOGGLE_ORTHO" }); break;
        case "v": dispatch({ type: "SET_TOOL", tool: "select" }); break;
        case "w": dispatch({ type: "SET_TOOL", tool: "wall" }); break;
        case "r": dispatch({ type: "SET_TOOL", tool: "room" }); break;
        case "d": dispatch({ type: "SET_TOOL", tool: "door" }); break;
        case "t": dispatch({ type: "SET_TOOL", tool: "text" }); break;
        case "m": dispatch({ type: "SET_TOOL", tool: "dimension" }); break;
        case "e": dispatch({ type: "SET_TOOL", tool: "eraser" }); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [state.selectedIds, dispatch, undo, redo]);

  return {
    onWheel,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    screenToCanvas,
    drawPreviewRef,
  };
}
