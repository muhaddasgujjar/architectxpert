import React, { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from "react";

// ── Element Types ─────────────────────────────────────────────────────────────
export type ElementType = "wall" | "room" | "door" | "window" | "furniture" | "text" | "dimension";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  layer: string;
  locked: boolean;
  visible: boolean;
  color: string;
  opacity: number;
}

export interface WallElement extends BaseElement {
  type: "wall";
  x2: number;
  y2: number;
  thickness: number;
}

export interface RoomElement extends BaseElement {
  type: "room";
  fillColor: string;
  roomType: string;
}

export interface DoorElement extends BaseElement {
  type: "door";
  swingDirection: "left" | "right" | "double";
  doorStyle: "hinged" | "sliding" | "pocket";
}

export interface WindowElement extends BaseElement {
  type: "window";
  panes: number;
}

export interface FurnitureElement extends BaseElement {
  type: "furniture";
  furnitureId: string;
  category: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
}

export interface DimensionElement extends BaseElement {
  type: "dimension";
  x2: number;
  y2: number;
  measurement: string;
}

export type CanvasElement =
  | WallElement
  | RoomElement
  | DoorElement
  | WindowElement
  | FurnitureElement
  | TextElement
  | DimensionElement;

// ── Tool Types ────────────────────────────────────────────────────────────────
export type ToolType = "select" | "wall" | "room" | "door" | "window" | "furniture" | "text" | "dimension" | "eraser";

// ── State ─────────────────────────────────────────────────────────────────────
export interface WorkstationState {
  elements: CanvasElement[];
  selectedIds: string[];
  activeTool: ToolType;
  gridSize: number;
  gridVisible: boolean;
  snapEnabled: boolean;
  orthoEnabled: boolean;
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  layers: { name: string; visible: boolean; locked: boolean; color: string }[];
  activeLayer: string;
  // Drawing state
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  // Drag state
  isDragging: boolean;
  dragOffset: { x: number; y: number } | null;
  // Furniture placement
  placingFurnitureId: string | null;
  // UI panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

const defaultLayers = [
  { name: "Walls", visible: true, locked: false, color: "rgba(255,255,255,0.8)" },
  { name: "Rooms", visible: true, locked: false, color: "rgba(59,130,246,0.6)" },
  { name: "Doors & Windows", visible: true, locked: false, color: "rgba(251,191,36,0.6)" },
  { name: "Furniture", visible: true, locked: false, color: "rgba(16,185,129,0.6)" },
  { name: "Annotations", visible: true, locked: false, color: "rgba(244,63,94,0.6)" },
];

export const initialState: WorkstationState = {
  elements: [],
  selectedIds: [],
  activeTool: "select",
  gridSize: 24,
  gridVisible: true,
  snapEnabled: true,
  orthoEnabled: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  canvasWidth: 2400,
  canvasHeight: 1600,
  layers: defaultLayers,
  activeLayer: "Walls",
  isDrawing: false,
  drawStart: null,
  isDragging: false,
  dragOffset: null,
  placingFurnitureId: null,
  leftPanelOpen: true,
  rightPanelOpen: false,
};

// ── Actions ───────────────────────────────────────────────────────────────────
type Action =
  | { type: "ADD_ELEMENT"; element: CanvasElement }
  | { type: "UPDATE_ELEMENT"; id: string; updates: Partial<CanvasElement> }
  | { type: "DELETE_ELEMENTS"; ids: string[] }
  | { type: "SELECT_ELEMENTS"; ids: string[] }
  | { type: "ADD_TO_SELECTION"; id: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_ALL" }
  | { type: "SET_TOOL"; tool: ToolType }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_SNAP" }
  | { type: "TOGGLE_ORTHO" }
  | { type: "SET_GRID_SIZE"; size: number }
  | { type: "SET_DRAWING"; isDrawing: boolean; start?: { x: number; y: number } | null }
  | { type: "SET_DRAGGING"; isDragging: boolean; offset?: { x: number; y: number } | null }
  | { type: "SET_PLACING_FURNITURE"; furnitureId: string | null }
  | { type: "MOVE_ELEMENTS"; ids: string[]; dx: number; dy: number }
  | { type: "TOGGLE_LEFT_PANEL" }
  | { type: "TOGGLE_RIGHT_PANEL" }
  | { type: "SET_LAYER_VISIBILITY"; layerName: string; visible: boolean }
  | { type: "SET_ACTIVE_LAYER"; layerName: string }
  | { type: "LOAD_ELEMENTS"; elements: CanvasElement[] }
  | { type: "CLEAR_CANVAS" }
  | { type: "RESTORE_STATE"; state: WorkstationState };

function reducer(state: WorkstationState, action: Action): WorkstationState {
  switch (action.type) {
    case "ADD_ELEMENT":
      return { ...state, elements: [...state.elements, action.element] };

    case "UPDATE_ELEMENT":
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.id ? { ...el, ...action.updates } as CanvasElement : el
        ),
      };

    case "DELETE_ELEMENTS":
      return {
        ...state,
        elements: state.elements.filter(el => !action.ids.includes(el.id)),
        selectedIds: state.selectedIds.filter(id => !action.ids.includes(id)),
      };

    case "SELECT_ELEMENTS":
      return { ...state, selectedIds: action.ids, rightPanelOpen: action.ids.length > 0 };

    case "ADD_TO_SELECTION":
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds
          : [...state.selectedIds, action.id],
        rightPanelOpen: true,
      };

    case "CLEAR_SELECTION":
      return { ...state, selectedIds: [], rightPanelOpen: false };

    case "SELECT_ALL":
      return { ...state, selectedIds: state.elements.map(el => el.id), rightPanelOpen: state.elements.length > 0 };

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, isDrawing: false, drawStart: null, placingFurnitureId: action.tool === "furniture" ? state.placingFurnitureId : null };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.1, Math.min(5, action.zoom)) };

    case "SET_PAN":
      return { ...state, panX: action.x, panY: action.y };

    case "TOGGLE_GRID":
      return { ...state, gridVisible: !state.gridVisible };

    case "TOGGLE_SNAP":
      return { ...state, snapEnabled: !state.snapEnabled };

    case "TOGGLE_ORTHO":
      return { ...state, orthoEnabled: !state.orthoEnabled };

    case "SET_GRID_SIZE":
      return { ...state, gridSize: action.size };

    case "SET_DRAWING":
      return { ...state, isDrawing: action.isDrawing, drawStart: action.start ?? state.drawStart };

    case "SET_DRAGGING":
      return { ...state, isDragging: action.isDragging, dragOffset: action.offset ?? state.dragOffset };

    case "SET_PLACING_FURNITURE":
      return { ...state, placingFurnitureId: action.furnitureId, activeTool: action.furnitureId ? "furniture" : state.activeTool };

    case "MOVE_ELEMENTS":
      return {
        ...state,
        elements: state.elements.map(el => {
          if (!action.ids.includes(el.id)) return el;
          const updated = { ...el, x: el.x + action.dx, y: el.y + action.dy };
          if ("x2" in el) {
            (updated as any).x2 = (el as any).x2 + action.dx;
            (updated as any).y2 = (el as any).y2 + action.dy;
          }
          return updated as CanvasElement;
        }),
      };

    case "TOGGLE_LEFT_PANEL":
      return { ...state, leftPanelOpen: !state.leftPanelOpen };

    case "TOGGLE_RIGHT_PANEL":
      return { ...state, rightPanelOpen: !state.rightPanelOpen };

    case "SET_LAYER_VISIBILITY":
      return {
        ...state,
        layers: state.layers.map(l => l.name === action.layerName ? { ...l, visible: action.visible } : l),
      };

    case "SET_ACTIVE_LAYER":
      return { ...state, activeLayer: action.layerName };

    case "LOAD_ELEMENTS":
      return { ...state, elements: action.elements, selectedIds: [] };

    case "CLEAR_CANVAS":
      return { ...state, elements: [], selectedIds: [], rightPanelOpen: false };

    case "RESTORE_STATE":
      return action.state;

    default:
      return state;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────
let idCounter = 0;
export function generateId(): string {
  return `el_${Date.now()}_${++idCounter}`;
}

export function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

// ── Context ───────────────────────────────────────────────────────────────────
interface WorkstationContextValue {
  state: WorkstationState;
  dispatch: React.Dispatch<Action>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

export function useWorkstation() {
  const ctx = useContext(WorkstationContext);
  if (!ctx) throw new Error("useWorkstation must be inside WorkstationProvider");
  return ctx;
}

// ── Provider with undo/redo ───────────────────────────────────────────────────
const MAX_HISTORY = 80;

export function WorkstationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const historyRef = useRef<WorkstationState[]>([initialState]);
  const historyIndexRef = useRef(0);

  // Track meaningful state changes for undo
  const wrappedDispatch = useCallback((action: Action) => {
    // Actions that modify elements are undoable
    const undoable = [
      "ADD_ELEMENT", "UPDATE_ELEMENT", "DELETE_ELEMENTS", "MOVE_ELEMENTS", "LOAD_ELEMENTS", "CLEAR_CANVAS",
    ].includes(action.type);

    dispatch(action);

    if (undoable) {
      // We need the next state — we'll capture it from the reducer
      // Since we can't get post-state synchronously from useReducer,
      // we'll compute it manually
      const nextState = reducer(
        historyRef.current[historyIndexRef.current] ?? initialState,
        action
      );

      // Trim future states
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(nextState);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prev = historyRef.current[historyIndexRef.current];
      dispatch({ type: "RESTORE_STATE", state: prev });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const next = historyRef.current[historyIndexRef.current];
      dispatch({ type: "RESTORE_STATE", state: next });
    }
  }, []);

  return (
    <WorkstationContext.Provider
      value={{
        state,
        dispatch: wrappedDispatch,
        undo,
        redo,
        canUndo: historyIndexRef.current > 0,
        canRedo: historyIndexRef.current < historyRef.current.length - 1,
      }}
    >
      {children}
    </WorkstationContext.Provider>
  );
}
