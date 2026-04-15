import { useCallback } from "react";
import { motion } from "framer-motion";
import {
  X, Move, Maximize2, RotateCw, Palette, Tag, Lock, Unlock, Eye, EyeOff,
  PanelRightClose,
} from "lucide-react";
import { useWorkstation, type CanvasElement } from "@/lib/WorkstationContext";

export default function RightPanel() {
  const { state, dispatch } = useWorkstation();

  if (!state.rightPanelOpen || state.selectedIds.length === 0) return null;

  const selectedElements = state.elements.filter((el) =>
    state.selectedIds.includes(el.id)
  );
  const single = selectedElements.length === 1 ? selectedElements[0] : null;

  const updateProp = useCallback(
    (key: string, value: any) => {
      if (single) {
        dispatch({ type: "UPDATE_ELEMENT", id: single.id, updates: { [key]: value } });
      }
    },
    [single, dispatch]
  );

  const InputRow = ({
    label,
    value,
    type = "number",
    onChange,
  }: {
    label: string;
    value: string | number;
    type?: string;
    onChange: (v: string) => void;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/30 w-14 flex-shrink-0 font-mono">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-white/70 font-mono focus:outline-none focus:border-accent-blue/40 transition-colors"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ x: 280 }}
      animate={{ x: 0 }}
      exit={{ x: 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-[250px] flex-shrink-0 bg-[#0c0c14]/95 border-l border-white/[0.06] flex flex-col h-full backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Properties</span>
        <button
          onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
          className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {selectedElements.length > 1 ? (
          /* Multi-select info */
          <div className="text-center py-6">
            <p className="text-[13px] text-accent-blue font-display font-semibold">{selectedElements.length}</p>
            <p className="text-[10px] text-white/30 mt-1">elements selected</p>
            <button
              onClick={() => dispatch({ type: "DELETE_ELEMENTS", ids: state.selectedIds })}
              className="mt-4 px-3 py-1.5 rounded-md text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Delete All
            </button>
          </div>
        ) : single ? (
          <>
            {/* Element type badge */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: single.color }}
              />
              <span className="text-[11px] font-mono text-white/50 uppercase">
                {single.type}
              </span>
              <span className="ml-auto text-[9px] font-mono text-white/20">
                {single.id.slice(-8)}
              </span>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Tag className="w-3 h-3" /> Label
              </div>
              <input
                type="text"
                value={single.label}
                onChange={(e) => updateProp("label", e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-accent-blue/40 transition-colors"
              />
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Move className="w-3 h-3" /> Position
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputRow
                  label="X"
                  value={Math.round(single.x)}
                  onChange={(v) => updateProp("x", Number(v))}
                />
                <InputRow
                  label="Y"
                  value={Math.round(single.y)}
                  onChange={(v) => updateProp("y", Number(v))}
                />
              </div>
            </div>

            {/* Size (for room, furniture) */}
            {(single.type === "room" || single.type === "furniture" || single.type === "window") && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <Maximize2 className="w-3 h-3" /> Size
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputRow
                    label="W"
                    value={Math.round(single.width)}
                    onChange={(v) => updateProp("width", Math.max(12, Number(v)))}
                  />
                  <InputRow
                    label="H"
                    value={Math.round(single.height)}
                    onChange={(v) => updateProp("height", Math.max(12, Number(v)))}
                  />
                </div>
                <div className="text-[9px] text-white/20 font-mono">
                  {Math.round(single.width / 24)}' × {Math.round(single.height / 24)}' ({Math.round((single.width / 24) * (single.height / 24))} sq ft)
                </div>
              </div>
            )}

            {/* Wall thickness */}
            {single.type === "wall" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <Maximize2 className="w-3 h-3" /> Thickness
                </div>
                <InputRow
                  label="px"
                  value={(single as any).thickness || 6}
                  onChange={(v) => updateProp("thickness", Math.max(2, Math.min(20, Number(v))))}
                />
              </div>
            )}

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <RotateCw className="w-3 h-3" /> Rotation
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={single.rotation}
                  onChange={(e) => updateProp("rotation", Number(e.target.value))}
                  className="flex-1 h-1 accent-blue-500"
                />
                <span className="text-[10px] text-white/40 font-mono w-8 text-right">{single.rotation}°</span>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Palette className="w-3 h-3" /> Color
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  "rgba(59,130,246,0.5)",
                  "rgba(139,92,246,0.5)",
                  "rgba(16,185,129,0.5)",
                  "rgba(251,191,36,0.5)",
                  "rgba(244,63,94,0.5)",
                  "rgba(6,182,212,0.5)",
                  "rgba(255,255,255,0.7)",
                  "rgba(148,163,184,0.4)",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateProp("color", c)}
                    className={`w-5 h-5 rounded border transition-transform hover:scale-110 ${
                      single.color === c ? "border-white/40 scale-110" : "border-white/10"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Room type (for rooms) */}
            {single.type === "room" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <Tag className="w-3 h-3" /> Room Type
                </div>
                <select
                  value={(single as any).roomType || "Room"}
                  onChange={(e) => {
                    updateProp("roomType", e.target.value);
                    updateProp("label", e.target.value);
                  }}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-accent-blue/40 transition-colors"
                >
                  {["Room", "Living Room", "Kitchen", "Master Bedroom", "Bedroom", "Bathroom", "Dining Room", "Garage", "Office", "Hallway", "Laundry", "Balcony", "Storage"].map(
                    (t) => (
                      <option key={t} value={t} className="bg-[#0c0c14] text-white/70">
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Door swing direction */}
            {single.type === "door" && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-white/30">Swing Direction</div>
                <div className="flex gap-1">
                  {(["left", "right", "double"] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => updateProp("swingDirection", dir)}
                      className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                        (single as any).swingDirection === dir
                          ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                          : "text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]"
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text content */}
            {single.type === "text" && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-white/30">Text</div>
                <input
                  type="text"
                  value={(single as any).text || ""}
                  onChange={(e) => updateProp("text", e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-accent-blue/40 transition-colors"
                />
                <InputRow
                  label="Size"
                  value={(single as any).fontSize || 14}
                  onChange={(v) => updateProp("fontSize", Math.max(6, Math.min(72, Number(v))))}
                />
              </div>
            )}

            {/* Visibility / Lock */}
            <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => updateProp("visible", !single.visible)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] transition-colors ${
                  single.visible
                    ? "text-white/50 bg-white/[0.03] border border-white/[0.06]"
                    : "text-white/25 bg-white/[0.02] border border-white/[0.04]"
                }`}
              >
                {single.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {single.visible ? "Visible" : "Hidden"}
              </button>
              <button
                onClick={() => updateProp("locked", !single.locked)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] transition-colors ${
                  single.locked
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white/50 bg-white/[0.03] border border-white/[0.06]"
                }`}
              >
                {single.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {single.locked ? "Locked" : "Unlocked"}
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => dispatch({ type: "DELETE_ELEMENTS", ids: [single.id] })}
              className="w-full mt-2 px-3 py-1.5 rounded-md text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Delete Element
            </button>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
