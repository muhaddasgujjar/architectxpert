import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, Layers, Eye, EyeOff,
  PanelLeftClose, PanelLeft,
  BedDouble, Sofa, UtensilsCrossed, Bath, Armchair, Briefcase, TreePine,
  Square, Minus, DoorOpen, LayoutGrid,
} from "lucide-react";
import { useWorkstation, generateId, type RoomElement } from "@/lib/WorkstationContext";
import { furnitureLibrary, furnitureCategories, type FurnitureCategory } from "@/lib/furnitureLibrary";

const categoryIcons: Record<string, React.ElementType> = {
  Bedroom: BedDouble,
  "Living Room": Sofa,
  Kitchen: UtensilsCrossed,
  Bathroom: Bath,
  Dining: Armchair,
  Office: Briefcase,
  Outdoor: TreePine,
};

// Pre-defined room templates
const roomTemplates = [
  { name: "Living Room", width: 240, height: 192, color: "rgba(59,130,246,0.4)", fill: "rgba(59,130,246,0.04)" },
  { name: "Kitchen", width: 168, height: 144, color: "rgba(251,191,36,0.4)", fill: "rgba(251,191,36,0.04)" },
  { name: "Master Bedroom", width: 192, height: 168, color: "rgba(139,92,246,0.4)", fill: "rgba(139,92,246,0.04)" },
  { name: "Bedroom", width: 144, height: 144, color: "rgba(16,185,129,0.4)", fill: "rgba(16,185,129,0.04)" },
  { name: "Bathroom", width: 96, height: 96, color: "rgba(244,63,94,0.4)", fill: "rgba(244,63,94,0.04)" },
  { name: "Dining Room", width: 168, height: 144, color: "rgba(6,182,212,0.4)", fill: "rgba(6,182,212,0.04)" },
  { name: "Garage", width: 240, height: 240, color: "rgba(148,163,184,0.4)", fill: "rgba(148,163,184,0.03)" },
  { name: "Office", width: 120, height: 120, color: "rgba(34,197,94,0.4)", fill: "rgba(34,197,94,0.04)" },
  { name: "Hallway", width: 48, height: 168, color: "rgba(148,163,184,0.3)", fill: "rgba(148,163,184,0.02)" },
  { name: "Laundry", width: 72, height: 72, color: "rgba(168,85,247,0.4)", fill: "rgba(168,85,247,0.04)" },
];

export default function LeftPanel() {
  const { state, dispatch } = useWorkstation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Bedroom", "Living Room"]));
  const [activeTab, setActiveTab] = useState<"elements" | "layers">("elements");
  const [expandRooms, setExpandRooms] = useState(true);
  const [expandStructural, setExpandStructural] = useState(false);

  if (!state.leftPanelOpen) {
    return (
      <button
        onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
        className="absolute top-14 left-2 z-30 p-2 rounded-lg bg-[#0c0c14]/90 border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors backdrop-blur-xl"
        title="Open Panel"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
    );
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const placeFurniture = (furnitureId: string) => {
    dispatch({ type: "SET_PLACING_FURNITURE", furnitureId });
  };

  const placeRoom = (template: typeof roomTemplates[0]) => {
    const id = generateId();
    // Place rooms in a stacking grid — offset based on existing room count
    const existingRooms = state.elements.filter(e => e.type === "room");
    const col = existingRooms.length % 3;
    const row = Math.floor(existingRooms.length / 3);
    const baseX = 100 + col * 280;
    const baseY = 100 + row * 260;
    const room: RoomElement = {
      id,
      type: "room",
      x: baseX,
      y: baseY,
      width: template.width,
      height: template.height,
      rotation: 0,
      label: template.name,
      layer: "Rooms",
      locked: false,
      visible: true,
      color: template.color,
      opacity: 1,
      fillColor: template.fill,
      roomType: template.name,
    };
    dispatch({ type: "ADD_ELEMENT", element: room });
    dispatch({ type: "SELECT_ELEMENTS", ids: [id] });
  };

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-[260px] flex-shrink-0 bg-[#0c0c14]/95 border-r border-white/[0.06] flex flex-col h-full backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Element Library</span>
        <button
          onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
          className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(["elements", "layers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "text-accent-blue border-b-2 border-accent-blue"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {tab === "elements" ? <Square className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "elements" ? (
          <div className="p-2 space-y-1">
            {/* Structural section */}
            <button
              onClick={() => setExpandStructural(!expandStructural)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
            >
              {expandStructural ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Minus className="w-3 h-3" />
              Structural
            </button>
            <AnimatePresence>
              {expandStructural && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-4 space-y-0.5"
                >
                  {[
                    { label: "Wall", icon: Minus, tool: "wall" as const },
                    { label: "Door", icon: DoorOpen, tool: "door" as const },
                    { label: "Window", icon: LayoutGrid, tool: "window" as const },
                  ].map(({ label, icon: Icon, tool }) => (
                    <button
                      key={label}
                      onClick={() => dispatch({ type: "SET_TOOL", tool })}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                        state.activeTool === tool
                          ? "bg-accent-blue/15 text-accent-blue"
                          : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room templates */}
            <button
              onClick={() => setExpandRooms(!expandRooms)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
            >
              {expandRooms ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Square className="w-3 h-3" />
              Room Templates
            </button>
            <AnimatePresence>
              {expandRooms && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-4 space-y-0.5"
                >
                  {roomTemplates.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      onClick={() => placeRoom(tmpl)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors group"
                    >
                      <div
                        className="w-3 h-3 rounded-sm border"
                        style={{ borderColor: tmpl.color, background: tmpl.fill }}
                      />
                      <span className="flex-1 text-left">{tmpl.name}</span>
                      <span className="text-[9px] text-white/20 group-hover:text-white/30">
                        {Math.round(tmpl.width / 24)}'×{Math.round(tmpl.height / 24)}'
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Furniture categories */}
            {furnitureCategories.map((cat) => {
              const Icon = categoryIcons[cat] || Square;
              const items = furnitureLibrary.filter((f) => f.category === cat);
              const isExpanded = expandedCategories.has(cat);

              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Icon className="w-3 h-3" />
                    {cat}
                    <span className="ml-auto text-[9px] text-white/20">{items.length}</span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pl-4 space-y-0.5"
                      >
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => placeFurniture(item.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                              state.placingFurnitureId === item.id
                                ? "bg-accent-blue/15 text-accent-blue"
                                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                            }`}
                          >
                            <svg width="16" height="16" viewBox={`0 0 ${item.width} ${item.height}`} className="flex-shrink-0">
                              <g dangerouslySetInnerHTML={{ __html: item.svgContent }} />
                            </svg>
                            <span className="flex-1 text-left truncate">{item.name}</span>
                            <span className="text-[9px] text-white/20">
                              {Math.round(item.width / 24)}'×{Math.round(item.height / 24)}'
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* Layers panel */
          <div className="p-2 space-y-1">
            {state.layers.map((layer) => (
              <div
                key={layer.name}
                onClick={() => dispatch({ type: "SET_ACTIVE_LAYER", layerName: layer.name })}
                className={`flex items-center gap-2 px-2 py-2 rounded-md text-[11px] cursor-pointer transition-colors ${
                  state.activeLayer === layer.name
                    ? "bg-white/[0.05] text-white/70"
                    : "text-white/40 hover:bg-white/[0.03]"
                }`}
              >
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.color }} />
                <span className="flex-1">{layer.name}</span>
                <span className="text-[9px] text-white/20">
                  {state.elements.filter((el) => el.layer === layer.name).length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "SET_LAYER_VISIBILITY", layerName: layer.name, visible: !layer.visible });
                  }}
                  className="p-0.5 rounded text-white/25 hover:text-white/50 transition-colors"
                >
                  {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Element count footer */}
      <div className="px-3 py-2 border-t border-white/[0.06] text-[9px] font-mono text-white/20">
        {state.elements.length} elements · {state.selectedIds.length} selected
      </div>
    </motion.div>
  );
}
