import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/Navbar";
import {
  Layers, Download, FileBarChart, RotateCcw, ZoomIn, ZoomOut, Maximize2,
  Loader2, BedDouble, Bath, Ruler, Building2, MapPin, Sparkles, CheckSquare,
  Square, ArrowRight, ChevronRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const STYLES = ["Modern", "Contemporary", "Traditional", "Minimalist", "Colonial"];
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];
const SPECIAL_ROOMS = [
  { id: "garage", label: "Garage" },
  { id: "study", label: "Study / Home Office" },
  { id: "prayer_room", label: "Prayer Room" },
  { id: "servant_quarter", label: "Servant Quarter" },
  { id: "storeroom", label: "Storeroom" },
  { id: "basement", label: "Basement" },
];

interface GeneratedFloorplan {
  svg: string;
  rooms: { name: string; area_sqft: number; type: string }[];
  totalArea: number;
  floors: number;
  style: string;
  location: string;
  costEstimatePKR: number;
  costFormatted: string;
  layoutNotes: string;
  generatedAt: string;
}

function FormField({ label, children, icon: Icon }: {
  label: string;
  children: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      {children}
    </div>
  );
}

function Stepper({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-0">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-10 h-10 rounded-l-xl border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors text-lg font-bold flex items-center justify-center"
        data-testid={`button-dec-${min}`}
      >−</button>
      <div className="w-12 h-10 border-y border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-white font-display font-bold text-base">
        {value}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-10 h-10 rounded-r-xl border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors text-lg font-bold flex items-center justify-center"
        data-testid={`button-inc-${max}`}
      >+</button>
    </div>
  );
}

export default function FloorplanGenerationPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [totalArea, setTotalArea] = useState(1800);
  const [floors, setFloors] = useState(1);
  const [style, setStyle] = useState("Modern");
  const [location, setLocation] = useState("Lahore");
  const [specialRooms, setSpecialRooms] = useState<string[]>([]);
  const [result, setResult] = useState<GeneratedFloorplan | null>(null);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  const toggleSpecial = (id: string) => {
    setSpecialRooms(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/generate-floorplan", {
        bedrooms, bathrooms, totalArea, floors, style, specialRooms, location,
      });
      return res.json();
    },
    onSuccess: (data: GeneratedFloorplan) => {
      setResult(data);
      setZoom(1);
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate floor plan. Please try again.", variant: "destructive" });
    },
  });

  const downloadSvg = () => {
    if (!result) return;
    const blob = new Blob([result.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ArchitectXpert_FloorPlan_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDxf = async () => {
    if (!result) return;
    try {
      const res = await apiRequest("POST", "/api/tools/generate-floorplan-dxf", {
        bedrooms, bathrooms, totalArea, floors, style, specialRooms, location,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ArchitectXpert_FloorPlan_${Date.now()}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "DXF downloaded", description: "Open it in AutoCAD/LibreCAD to edit and annotate." });
    } catch (e: any) {
      toast({ title: "DXF export failed", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  const downloadPng = () => {
    if (!result || !svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080 * 2;
    canvas.height = 760 * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    const img = new Image();
    const svgBlob = new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 900, 680);
      ctx.drawImage(img, 0, 0, 900, 680);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `ArchitectXpert_FloorPlan_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    img.src = url;
  };

  const goToReport = () => {
    if (!result) return;
    navigate("/tools/report-analysis");
    toast({ title: "Upload your floor plan", description: "Download the SVG first, then upload it to Report Analysis to get a full PDF report." });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Sign in to use the Floorplan Generator</p>
          <button onClick={() => navigate("/auth")} className="bg-accent-blue text-white px-6 py-3 rounded-full text-sm font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 pt-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center">
                <Layers className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Floorplan Generation</h1>
                <p className="text-xs font-mono text-white/30">GPT-4o Architectural Layout Engine</p>
              </div>
            </div>
            <p className="text-sm text-white/35 max-w-2xl">
              Describe your project and AI generates a professional 2D floor plan with rooms, dimensions, doors, and windows — download as PNG or SVG, then generate a full PDF report.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                <h2 className="text-sm font-display font-semibold text-white/70 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-accent-blue/60" />
                  Project Specifications
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Bedrooms" icon={BedDouble}>
                    <Stepper value={bedrooms} onChange={setBedrooms} min={1} max={8} />
                  </FormField>
                  <FormField label="Bathrooms" icon={Bath}>
                    <Stepper value={bathrooms} onChange={setBathrooms} min={1} max={6} />
                  </FormField>
                </div>

                <FormField label="Total Area (sq ft)" icon={Ruler}>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={400}
                      max={8000}
                      step={100}
                      value={totalArea}
                      onChange={(e) => setTotalArea(Number(e.target.value))}
                      className="flex-1 accent-accent-blue h-1.5"
                      data-testid="input-total-area"
                    />
                    <div className="w-20 text-center text-sm font-mono text-white bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5">
                      {totalArea.toLocaleString()}
                    </div>
                  </div>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Floors" icon={Layers}>
                    <Stepper value={floors} onChange={setFloors} min={1} max={3} />
                  </FormField>
                  <FormField label="Location" icon={MapPin}>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-accent-blue/40"
                      data-testid="select-location"
                    >
                      {CITIES.map(c => <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Architecture Style" icon={Sparkles}>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(s => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-mono transition-all duration-200 ${
                          style === s
                            ? "bg-accent-blue/15 border-accent-blue/40 text-accent-blue"
                            : "border-white/[0.07] text-white/30 hover:border-white/[0.15] hover:text-white/60"
                        }`}
                        data-testid={`button-style-${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h2 className="text-sm font-display font-semibold text-white/70 flex items-center gap-2 mb-4">
                  <CheckSquare className="w-4 h-4 text-gold/60" />
                  Additional Rooms
                </h2>
                <div className="space-y-2">
                  {SPECIAL_ROOMS.map(room => (
                    <button
                      key={room.id}
                      onClick={() => toggleSpecial(room.id)}
                      className="w-full flex items-center gap-3 text-left text-sm py-1.5"
                      data-testid={`checkbox-${room.id}`}
                    >
                      {specialRooms.includes(room.id)
                        ? <CheckSquare className="w-4 h-4 text-accent-blue flex-shrink-0" />
                        : <Square className="w-4 h-4 text-white/15 flex-shrink-0" />
                      }
                      <span className={`font-mono text-xs ${specialRooms.includes(room.id) ? "text-white/70" : "text-white/30"}`}>
                        {room.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full py-4 rounded-2xl bg-accent-blue text-white font-display font-bold text-base flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-accent-blue/90 transition-all duration-300"
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Floor Plan...
                  </>
                ) : (
                  <>
                    <Layers className="w-5 h-5" />
                    Generate Floor Plan
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {generateMutation.isPending && (
                <div className="rounded-2xl border border-accent-blue/15 bg-accent-blue/[0.04] p-4">
                  <div className="space-y-2">
                    {["Designing room layout with GPT-4o...", "Calculating Pakistani market costs...", "Rendering architectural SVG..."].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 1.5 }}
                        className="flex items-center gap-2 text-xs font-mono text-accent-blue/60"
                      >
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AnimatePresence mode="wait">
                {!result && !generateMutation.isPending && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full min-h-[500px] rounded-2xl border border-dashed border-white/[0.07] flex flex-col items-center justify-center gap-4 text-center p-8"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                      <Layers className="w-7 h-7 text-white/15" />
                    </div>
                    <div>
                      <p className="text-sm font-display text-white/30 font-semibold mb-1">Your floor plan will appear here</p>
                      <p className="text-xs font-mono text-white/15">Configure your project and click Generate</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {["Rooms labeled", "Doors & windows", "Dimensions", "North arrow", "Scale bar", "Download PNG/SVG"].map((f, i) => (
                        <span key={i} className="text-[10px] font-mono text-white/20 border border-white/[0.06] px-2.5 py-1 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {generateMutation.isPending && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full min-h-[500px] rounded-2xl border border-accent-blue/10 bg-accent-blue/[0.02] flex flex-col items-center justify-center gap-6"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="w-12 h-12 rounded-full border-2 border-accent-blue/20 border-t-accent-blue"
                    />
                    <div className="text-center">
                      <p className="text-sm font-display text-white/50 font-semibold">AI is designing your floor plan</p>
                      <p className="text-xs font-mono text-white/25 mt-1">This may take 10–20 seconds</p>
                    </div>
                  </motion.div>
                )}

                {result && !generateMutation.isPending && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl border border-white/[0.07] bg-white overflow-hidden" data-testid="floorplan-result">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400/60" />
                          <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                          <div className="w-3 h-3 rounded-full bg-green-400/60" />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          ArchitectXpert — 2D Floor Plan | {result.style} | {result.location}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors" data-testid="button-zoom-in">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors" data-testid="button-zoom-out">
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setZoom(1)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors" data-testid="button-zoom-reset">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="overflow-auto bg-white" style={{ minHeight: 480 }}>
                        <div
                          ref={svgRef}
                          style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s", display: "inline-block", minWidth: "100%" }}
                          dangerouslySetInnerHTML={{ __html: result.svg }}
                          data-testid="floorplan-svg-container"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total Area", value: `${result.totalArea.toLocaleString()} sq ft` },
                        { label: "Rooms", value: String(result.rooms.length) },
                        { label: "Est. Cost", value: result.costFormatted },
                        { label: "Style", value: result.style },
                      ].map((stat, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-center" data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
                          <div className="text-sm font-bold font-display gradient-text-blue">{stat.value}</div>
                          <div className="text-[9px] font-mono text-white/25 uppercase tracking-wider mt-0.5">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">Room Breakdown</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {result.rooms.map((room, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                            <span className="text-xs font-mono text-white/50 truncate">{room.name}</span>
                            <span className="text-xs font-mono text-accent-blue/70 ml-2 flex-shrink-0">{room.area_sqft} ft²</span>
                          </div>
                        ))}
                      </div>
                      {result.layoutNotes && (
                        <p className="mt-3 text-xs text-white/25 italic border-t border-white/[0.04] pt-3">{result.layoutNotes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={downloadPng}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-colors"
                        data-testid="button-download-png"
                      >
                        <Download className="w-4 h-4" />
                        Download PNG
                      </button>
                      <button
                        onClick={downloadSvg}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white text-sm font-medium hover:bg-white/[0.04] transition-colors"
                        data-testid="button-download-svg"
                      >
                        <Download className="w-4 h-4" />
                        Download SVG
                      </button>
                      <button
                        onClick={downloadDxf}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white text-sm font-medium hover:bg-white/[0.04] transition-colors"
                        data-testid="button-download-dxf"
                      >
                        <Download className="w-4 h-4" />
                        Download DXF (AutoCAD)
                      </button>
                      <button
                        onClick={goToReport}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/25 text-gold/70 hover:text-gold text-sm font-medium hover:bg-gold/[0.05] transition-colors"
                        data-testid="button-generate-report"
                      >
                        <FileBarChart className="w-4 h-4" />
                        Generate Full Report
                      </button>
                      <button
                        onClick={() => { setResult(null); generateMutation.reset(); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.06] text-white/30 hover:text-white/60 text-sm font-medium transition-colors"
                        data-testid="button-regenerate"
                      >
                        <RotateCcw className="w-4 h-4" />
                        New Plan
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
