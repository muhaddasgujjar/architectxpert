import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer2, Minus, Square, DoorOpen, LayoutGrid, Type, Ruler, Eraser,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Grid3X3, Magnet, SquareSlash,
  Download, Upload, FilePlus, Trash2,
  ChevronDown, Home, ArrowLeft, Save, Check, FolderOpen, Image, FileJson,
} from "lucide-react";
import { useWorkstation, type ToolType } from "@/lib/WorkstationContext";

interface ToolButton {
  id: ToolType | string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

export default function TopToolbar() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useWorkstation();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Close file menu on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFileMenu(false);
    };
    if (showFileMenu) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showFileMenu]);

  // Listen for Ctrl+S keyboard shortcut from canvas
  useEffect(() => {
    const handleSave = () => handleSavePNG();
    window.addEventListener("workstation:save", handleSave);
    return () => window.removeEventListener("workstation:save", handleSave);
  });

  const tools: ToolButton[] = [
    { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
    { id: "wall", label: "Wall", icon: Minus, shortcut: "W" },
    { id: "room", label: "Room", icon: Square, shortcut: "R" },
    { id: "door", label: "Door", icon: DoorOpen, shortcut: "D" },
    { id: "window", label: "Window", icon: LayoutGrid },
    { id: "text", label: "Text", icon: Type, shortcut: "T" },
    { id: "dimension", label: "Dimension", icon: Ruler, shortcut: "M" },
    { id: "eraser", label: "Eraser", icon: Eraser, shortcut: "E" },
  ];

  const handleToolClick = (toolId: string) => {
    dispatch({ type: "SET_TOOL", tool: toolId as ToolType });
  };

  const handleExportSVG = () => {
    const svgEl = document.querySelector("svg.w-full.h-full");
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floorplan.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = (filename?: string) => {
    const svgEl = document.querySelector("svg.w-full.h-full") as SVGSVGElement;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#0d0d12";
        ctx.fillRect(0, 0, 2400, 1600);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = filename || "floorplan.png";
        a.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ★ Main save — exports as PNG
  const handleSavePNG = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    handleExportPNG(`floorplan_${timestamp}.png`);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleSaveJSON = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const data = JSON.stringify({
      name: `Floorplan_${timestamp}`,
      savedAt: new Date().toISOString(),
      elements: state.elements,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `floorplan_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Flash the save indicator
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleLoadJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.elements) {
            dispatch({ type: "LOAD_ELEMENTS", elements: data.elements });
          }
        } catch { /* ignore parse errors */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const fileMenuItems = [
    { icon: FilePlus, label: "New Canvas", shortcut: "", action: () => { dispatch({ type: "CLEAR_CANVAS" }); setShowFileMenu(false); } },
    { icon: FolderOpen, label: "Open Project...", shortcut: "", action: () => { handleLoadJSON(); setShowFileMenu(false); } },
    { divider: true },
    { icon: Image, label: "Save as PNG", shortcut: "Ctrl+S", action: () => { handleSavePNG(); setShowFileMenu(false); } },
    { icon: FileJson, label: "Save as SVG", shortcut: "", action: () => { handleExportSVG(); setShowFileMenu(false); } },
    { divider: true },
    { icon: Save, label: "Save Project (JSON)", shortcut: "", action: () => { handleSaveJSON(); setShowFileMenu(false); } },
  ];

  return (
    <div className="h-12 flex items-center gap-1 px-3 bg-[#0c0c14] border-b border-white/[0.06] relative z-50">
      {/* Back / Logo */}
      <a
        href="/"
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mr-1 px-2 py-1.5 rounded-md hover:bg-white/[0.05]"
        data-testid="link-back-home"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <Home className="w-3.5 h-3.5" />
      </a>

      <div className="w-px h-6 bg-white/[0.08] mx-1" />

      {/* File dropdown */}
      <div className="relative" ref={fileMenuRef}>
        <button
          onClick={() => setShowFileMenu(!showFileMenu)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono rounded-md transition-colors ${
            showFileMenu
              ? "bg-white/[0.08] text-white"
              : "text-white/50 hover:text-white hover:bg-white/[0.05]"
          }`}
          data-testid="button-file-menu"
        >
          File <ChevronDown className={`w-3 h-3 transition-transform ${showFileMenu ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* File dropdown rendered as fixed overlay via portal */}
      {showFileMenu && ReactDOM.createPortal(
        <div
          className="fixed inset-0"
          style={{ zIndex: 99999 }}
          onClick={() => setShowFileMenu(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="w-56 rounded-xl shadow-2xl shadow-black/80"
            style={{
              position: "fixed",
              top: fileMenuRef.current ? fileMenuRef.current.getBoundingClientRect().bottom + 4 : 52,
              left: fileMenuRef.current ? fileMenuRef.current.getBoundingClientRect().left : 100,
              background: "#15151f",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1.5">
              {fileMenuItems.map((item, i) => {
                if ('divider' in item) {
                  return <div key={`divider-${i}`} className="h-px bg-white/[0.08] my-1.5 mx-3" />;
                }
                const Icon = item.icon!;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors group"
                    data-testid={`button-file-${item.label!.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="w-4 h-4 text-white/35 group-hover:text-white/70 transition-colors" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[9px] text-white/20 group-hover:text-white/40 font-mono">{item.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      <div className="w-px h-6 bg-white/[0.08] mx-1" />

      {/* ★ PROMINENT SAVE BUTTON */}
      <motion.button
        onClick={handleSavePNG}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300 ${
          saveFlash
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : "bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]"
        }`}
        title="Save Floorplan (Ctrl+S)"
        data-testid="button-save-floorplan"
      >
        {saveFlash ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Saved!</span>
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </>
        )}
      </motion.button>

      <div className="w-px h-6 bg-white/[0.08] mx-1" />

      {/* Drawing tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = state.activeTool === tool.id;
          return (
            <motion.button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className={`
                relative flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-mono transition-all duration-200
                ${isActive
                  ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent"}
              `}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{tool.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-tool"
                  className="absolute inset-0 rounded-md border border-accent-blue/30 bg-accent-blue/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-white/[0.08] mx-1" />

      {/* Delete */}
      <button
        onClick={() => state.selectedIds.length > 0 && dispatch({ type: "DELETE_ELEMENTS", ids: state.selectedIds })}
        disabled={state.selectedIds.length === 0}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-mono text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Delete (Del)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-6 bg-white/[0.08] mx-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* View tools (right side) */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.15 })}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-white/30 w-10 text-center">
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.15 })}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: 1 })}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-white/[0.06] mx-1" />

        <button
          onClick={() => dispatch({ type: "TOGGLE_GRID" })}
          className={`p-1.5 rounded-md transition-colors ${state.gridVisible ? "text-accent-blue bg-accent-blue/10" : "text-white/30 hover:text-white/50"}`}
          title="Toggle Grid (G)"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
          className={`p-1.5 rounded-md transition-colors ${state.snapEnabled ? "text-accent-blue bg-accent-blue/10" : "text-white/30 hover:text-white/50"}`}
          title="Toggle Snap (S)"
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => dispatch({ type: "TOGGLE_ORTHO" })}
          className={`p-1.5 rounded-md transition-colors ${state.orthoEnabled ? "text-accent-blue bg-accent-blue/10" : "text-white/30 hover:text-white/50"}`}
          title="Toggle Ortho (O)"
        >
          <SquareSlash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
