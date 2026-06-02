import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/Navbar";
import PageParticles from "@/components/ui/PageParticles";
import {
  Layers, Download, FileBarChart, RotateCcw, ZoomIn, ZoomOut, Maximize2,
  Loader2, BedDouble, Bath, Ruler, Building2, MapPin, Sparkles,
  ArrowRight, ChevronRight, X, PenLine,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const STYLES = ["Modern", "Contemporary", "Traditional", "Minimalist", "Colonial"];
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

interface GeneratedFloorplan {
  svg?: string;
  image_base64?: string;
  image_format?: string;
  source?: string;
  confidence?: number;
  rooms: { name: string; area_sqft?: number; area?: number; type?: string; dimensions?: string }[];
  totalArea: number;
  floors: number;
  style: string;
  location: string;
  costEstimatePKR: number;
  costFormatted: string;
  layoutNotes?: string;
  generatedAt: string;
  bedroom_count?: number;
  bathroom_count?: number;
  generation_time_ms?: number;
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
      >−</button>
      <div className="w-12 h-10 border-y border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-white font-display font-bold text-base">
        {value}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-10 h-10 rounded-r-xl border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors text-lg font-bold flex items-center justify-center"
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
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<GeneratedFloorplan | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsZoom, setFsZoom] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const openFullscreen = useCallback(() => {
    setFsZoom(1);
    setFullscreen(true);
  }, []);

  const proMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/generate-floorplan-pro", {
        bedrooms, bathrooms, totalArea, floors, style, location, description,
        specialRooms: [],
        quality: "high", size: "1024x1536",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: GeneratedFloorplan) => {
      setResult(data);
      setZoom(1);
      toast({ title: "Floor Plan Ready", description: `Generated in ${data.generation_time_ms ? (data.generation_time_ms / 1000).toFixed(1) + 's' : '?'}` });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err?.message || "Could not generate floor plan. Please try again.", variant: "destructive" });
    },
  });

  const downloadPng = () => {
    if (!result?.image_base64) return;
    const byteString = atob(result.image_base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ArchitectXpert_FloorPlan_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDxf = async () => {
    if (!result) return;
    try {
      const res = await apiRequest("POST", "/api/tools/generate-floorplan-dxf", {
        bedrooms, bathrooms, totalArea, floors, style, location,
        specialRooms: [],
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
      toast({ title: "DXF downloaded", description: "Open it in AutoCAD or LibreCAD to edit." });
    } catch (e: any) {
      toast({ title: "DXF export failed", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  const goToReport = () => {
    if (!result) return;
    navigate("/tools/report-analysis");
    toast({ title: "Upload your floor plan", description: "Download the PNG first, then upload it to Report Analysis." });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Sign in to use the Floor Plan Generator</p>
          <button onClick={() => navigate("/auth")} className="bg-accent-blue text-white px-6 py-3 rounded-full text-sm font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-obsidian relative overflow-hidden">
      <PageParticles count={300} />
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </motion.div>
      <Navbar />
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 pb-16">
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
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Floor Plan Generator</h1>
                <p className="text-xs font-mono text-white/30">Powered by ArchitectXpert ML Engine</p>
              </div>
            </div>
            <p className="text-sm text-white/35 max-w-2xl">
              Enter your house details and our AI generates a professional architectural floor plan (naqsha) with room labels, dimensions, and door placements — ready for your architect or contractor.
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
                  House Details
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Bedrooms" icon={BedDouble}>
                    <Stepper value={bedrooms} onChange={setBedrooms} min={1} max={8} />
                  </FormField>
                  <FormField label="Bathrooms" icon={Bath}>
                    <Stepper value={bathrooms} onChange={setBathrooms} min={1} max={6} />
                  </FormField>
                </div>

                <FormField label="Plot Size (sq ft)" icon={Ruler}>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={400}
                      max={8000}
                      step={100}
                      value={totalArea}
                      onChange={(e) => setTotalArea(Number(e.target.value))}
                      className="flex-1 accent-accent-blue h-1.5"
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
                  <FormField label="City" icon={MapPin}>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-accent-blue/40"
                    >
                      {CITIES.map(c => <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="House Style" icon={Sparkles}>
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
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label="Additional Instructions (optional)" icon={PenLine}>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., I want a large drawing room near the entrance, kitchen should face the backyard, add servant quarter at back..."
                    rows={3}
                    maxLength={500}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-accent-blue/40 resize-none placeholder:text-white/20"
                  />
                  <div className="text-right mt-1">
                    <span className="text-[10px] font-mono text-white/20">{description.length}/500</span>
                  </div>
                </FormField>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => proMutation.mutate()}
                disabled={proMutation.isPending}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-blue-600 text-white font-display font-bold text-base flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-300 shadow-lg shadow-accent-blue/20"
              >
                {proMutation.isPending ? (
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

              {proMutation.isPending && (
                <div className="rounded-2xl border border-accent-blue/15 bg-accent-blue/[0.04] p-4">
                  <div className="space-y-2">
                    {["Analyzing house specifications...", "Running ML layout optimization...", "Generating architectural floor plan...", "Applying Pakistani building standards..."].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 2.5 }}
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
                {!result && !proMutation.isPending && (
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
                      <p className="text-xs font-mono text-white/15">Fill in your house details and click Generate</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {["Room labels", "Door swings", "Dimensions (ft)", "Car porch", "Pakistani naqsha style"].map((f, i) => (
                        <span key={i} className="text-[10px] font-mono text-white/20 border border-white/[0.06] px-2.5 py-1 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {proMutation.isPending && (
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
                      <p className="text-sm font-display text-white/50 font-semibold">
                        Generating your floor plan
                      </p>
                      <p className="text-xs font-mono text-white/25 mt-1">
                        Our ML model is designing your layout (~20-40 seconds)
                      </p>
                    </div>
                  </motion.div>
                )}

                {result && !proMutation.isPending && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl border border-white/[0.07] bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400/60" />
                          <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                          <div className="w-3 h-3 rounded-full bg-green-400/60" />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          ArchitectXpert — {result.style} | {result.location} | {result.totalArea.toLocaleString()} sq ft
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors">
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setZoom(1)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div
                        className="bg-white flex items-center justify-center cursor-pointer p-4"
                        onClick={openFullscreen}
                        title="Click to view full screen"
                      >
                        {result.image_base64 ? (
                          <img
                            ref={svgRef as any}
                            src={`data:image/${result.image_format || "png"};base64,${result.image_base64}`}
                            alt="Generated floor plan"
                            className="w-full h-auto"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
                          />
                        ) : result.svg ? (
                          <div
                            ref={svgRef}
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s", display: "inline-block", minWidth: "100%" }}
                            dangerouslySetInnerHTML={{ __html: result.svg }}
                          />
                        ) : (
                          <div className="text-gray-400 text-sm p-8">No image generated</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Plot Size", value: `${result.totalArea.toLocaleString()} sq ft` },
                        { label: "Bedrooms", value: `${result.bedroom_count || bedrooms}` },
                        { label: "Bathrooms", value: `${result.bathroom_count || bathrooms}` },
                        { label: "Generated In", value: result.generation_time_ms ? `${(result.generation_time_ms / 1000).toFixed(1)}s` : "—" },
                      ].map((stat, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-center">
                          <div className="text-sm font-bold font-display gradient-text-blue">{stat.value}</div>
                          <div className="text-[9px] font-mono text-white/25 uppercase tracking-wider mt-0.5">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={downloadPng}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download PNG
                      </button>
                      <button
                        onClick={downloadDxf}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white text-sm font-medium hover:bg-white/[0.04] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download DXF (AutoCAD)
                      </button>
                      <button
                        onClick={goToReport}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/25 text-gold/70 hover:text-gold text-sm font-medium hover:bg-gold/[0.05] transition-colors"
                      >
                        <FileBarChart className="w-4 h-4" />
                        Generate Report
                      </button>
                      <button
                        onClick={() => { setResult(null); proMutation.reset(); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.06] text-white/30 hover:text-white/60 text-sm font-medium transition-colors"
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

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreen && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            onClick={() => setFullscreen(false)}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-black/50 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-accent-blue" />
                <span className="text-sm font-display text-white/80">
                  Floor Plan — {result.style} | {result.location} | {result.totalArea.toLocaleString()} sq ft
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setFsZoom(z => Math.max(z - 0.25, 0.25)); }}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-white/50 w-12 text-center">{Math.round(fsZoom * 100)}%</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFsZoom(z => Math.min(z + 0.25, 4)); }}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setFsZoom(1); }}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadPng(); }}
                  className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFullscreen(false)}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-red-500/30 transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-auto flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {result.image_base64 ? (
                <img
                  src={`data:image/${result.image_format || "png"};base64,${result.image_base64}`}
                  alt="Floor plan full view"
                  className="max-w-none"
                  style={{ transform: `scale(${fsZoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
                />
              ) : result.svg ? (
                <div
                  style={{ transform: `scale(${fsZoom})`, transformOrigin: "center", transition: "transform 0.2s", background: "white", padding: 24, borderRadius: 8 }}
                  dangerouslySetInnerHTML={{ __html: result.svg }}
                />
              ) : null}
            </div>
            <div className="px-6 py-3 bg-black/50 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono text-white/30">
                {result.totalArea.toLocaleString()} sq ft | {result.bedroom_count || bedrooms} bed | {result.bathroom_count || bathrooms} bath | {result.style}
              </span>
              <span className="text-xs font-mono text-white/30">Click outside or press × to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
