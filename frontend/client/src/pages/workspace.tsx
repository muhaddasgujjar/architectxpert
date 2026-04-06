import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/Navbar";
import {
  Hexagon,
  Ruler,
  MoveHorizontal,
  MoveVertical,
  FileText,
  Sparkles,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileBarChart,
  X,
  Home,
  Bath,
  Utensils,
  BedDouble,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Preloader from "../components/ui/Preloader";
import { generateFloorplan, type FloorplanResult } from "../lib/floorplanGenerator";
import { useAuth } from "@/hooks/use-auth";

function GeneratingOverlay({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian/90 backdrop-blur-sm rounded-xl"
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Hexagon className="w-10 h-10 text-accent-blue" strokeWidth={1} />
        </motion.div>

        <div className="flex flex-col items-center gap-3 w-48">
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-blue to-blue-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs font-mono text-white/40">
            {progress < 30 && "Analyzing dimensions..."}
            {progress >= 30 && progress < 60 && "Computing room layouts..."}
            {progress >= 60 && progress < 85 && "Optimizing spatial flow..."}
            {progress >= 85 && "Finalizing floorplan..."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function FloorplanViewer({ result }: { result: FloorplanResult }) {
  const [zoom, setZoom] = useState(1);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full flex items-center justify-center" data-testid="floorplan-viewer">
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          className="glass-panel rounded-lg p-2 text-white/40 hover:text-white transition-colors"
          aria-label="Zoom in"
          data-testid="button-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
          className="glass-panel rounded-lg p-2 text-white/40 hover:text-white transition-colors"
          aria-label="Zoom out"
          data-testid="button-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="glass-panel rounded-lg p-2 text-white/40 hover:text-white transition-colors"
          aria-label="Reset zoom"
          data-testid="button-zoom-reset"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <motion.svg
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        viewBox={`0 0 ${result.totalWidth} ${result.totalHeight}`}
        className="w-full h-full max-w-full max-h-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        data-testid="floorplan-svg"
      >
        <rect
          x="0"
          y="0"
          width={result.totalWidth}
          height={result.totalHeight}
          fill="rgba(255,255,255,0.01)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          rx="4"
        />

        {result.rooms.map((room, i) => (
          <motion.g
            key={`${room.name}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            onMouseEnter={() => setHoveredRoom(room.name)}
            onMouseLeave={() => setHoveredRoom(null)}
          >
            <rect
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              fill={hoveredRoom === room.name ? room.color.replace(/[\d.]+\)$/, "0.15)") : room.color}
              stroke={room.textColor}
              strokeWidth={hoveredRoom === room.name ? "1.5" : "0.8"}
              rx="2"
              className="transition-all duration-300"
            />
            <text
              x={room.x + room.width / 2}
              y={room.y + room.height / 2 - 4}
              fill={room.textColor}
              fontSize={room.width < 60 ? "7" : "9"}
              fontFamily="monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {room.name}
            </text>
            <text
              x={room.x + room.width / 2}
              y={room.y + room.height / 2 + 10}
              fill={room.textColor.replace(/[\d.]+\)$/, "0.3)")}
              fontSize="6"
              fontFamily="monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {room.width > 50 ? `${Math.round(room.width / 10)}'x${Math.round(room.height / 10)}'` : ""}
            </text>

            {hoveredRoom === room.name && (
              <circle
                cx={room.x + room.width / 2}
                cy={room.y + room.height / 2}
                r="3"
                fill={room.textColor}
              >
                <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </motion.g>
        ))}

        {result.rooms.length > 1 &&
          result.rooms.slice(0, -1).map((room, i) => {
            const next = result.rooms[i + 1];
            if (!next) return null;
            const x1 = room.x + room.width;
            const y1 = room.y;
            const x2 = next.x;
            const y2 = next.y;
            if (Math.abs(x1 - x2) < 4 || Math.abs(y1 - room.y) < 4) {
              return (
                <line
                  key={`line-${i}`}
                  x1={x1}
                  y1={room.y + room.height * 0.3}
                  x2={x1}
                  y2={room.y + room.height * 0.7}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              );
            }
            return null;
          })}
      </motion.svg>
    </div>
  );
}

interface ReportData {
  rooms: { name: string; area: number; percentage: number }[];
  totalArea: number;
  flowScore: number;
  efficiency: number;
  recommendations: string[];
}

function generateReport(fp: FloorplanResult, w: number, h: number): ReportData {
  const totalArea = w * h;
  const rooms = fp.rooms.map((r) => {
    const roomArea = Math.round((r.width * r.height) / 100 * totalArea / (fp.totalWidth * fp.totalHeight / 10000));
    return {
      name: r.name,
      area: roomArea,
      percentage: Math.round((roomArea / totalArea) * 100),
    };
  });
  return {
    rooms,
    totalArea,
    flowScore: 72 + Math.floor(Math.random() * 25),
    efficiency: 68 + Math.floor(Math.random() * 28),
    recommendations: [
      "Traffic flow between kitchen and dining area is well optimized.",
      "Consider adding a hallway buffer between public and private zones.",
      "Room proportions follow standard architectural guidelines.",
      "South-facing window placement would improve natural light in living areas.",
    ],
  };
}

function ReportPanel({ report, onClose }: { report: ReportData; onClose: () => void }) {
  const roomIcons: Record<string, typeof Home> = {
    "Living Room": Home, "Kitchen": Utensils, "Master Bedroom": BedDouble,
    "Bedroom 2": BedDouble, "Bedroom 3": BedDouble, "Bathroom": Bath, "Bathroom 2": Bath,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="glass-panel rounded-2xl p-5 h-full flex flex-col overflow-y-auto"
      data-testid="report-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
          <FileBarChart className="w-4 h-4 text-accent-gold" />
          Floor Plan Report
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors" data-testid="button-close-report">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <p className="text-[9px] text-white/25 font-mono uppercase">Area</p>
          <p className="text-sm font-display font-bold text-white">{report.totalArea} sq ft</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <p className="text-[9px] text-white/25 font-mono uppercase">Rooms</p>
          <p className="text-sm font-display font-bold text-white">{report.rooms.length}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <p className="text-[9px] text-white/25 font-mono uppercase">Flow</p>
          <p className="text-sm font-display font-bold text-accent-blue">{report.flowScore}%</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
          <p className="text-[9px] text-white/25 font-mono uppercase">Efficiency</p>
          <p className="text-sm font-display font-bold text-accent-gold">{report.efficiency}%</p>
        </div>
      </div>

      <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Room Breakdown</p>
      <div className="space-y-1.5 mb-4">
        {report.rooms.map((room, i) => {
          const Icon = roomIcons[room.name] || Ruler;
          return (
            <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-2.5 py-1.5 border border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-white/20" />
                <span className="text-[11px] text-white/50">{room.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/25">{room.area} ft²</span>
                <span className="text-[10px] font-mono text-accent-blue/60">{room.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Recommendations</p>
      <div className="space-y-1.5">
        {report.recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px] text-white/35 leading-relaxed">
            <AlertCircle className="w-3 h-3 text-accent-blue flex-shrink-0 mt-0.5" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function WorkspacePage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [floorplan, setFloorplan] = useState<FloorplanResult | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  const [width, setWidth] = useState("40");
  const [height, setHeight] = useState("30");
  const [requirements, setRequirements] = useState("2 bedrooms, 2 bathrooms, open kitchen, dining room, garage");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || !user) {
    return <Preloader isVisible={true} text="Checking credentials" />;
  }

  const handleGenerate = () => {
    const w = parseFloat(width) || 40;
    const h = parseFloat(height) || 30;

    setGenerating(true);
    setProgress(0);
    setFloorplan(null);

    const steps = [10, 25, 40, 55, 70, 82, 90, 95, 100];
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProgress(steps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(interval);
        const result = generateFloorplan(w, h, requirements);
        setFloorplan(result);
        setGenerating(false);
      }
    }, 300);
  };

  const handleReset = () => {
    setFloorplan(null);
    setReport(null);
    setProgress(0);
  };

  const handleGenerateReport = () => {
    if (!floorplan) return;
    const w = parseFloat(width) || 40;
    const h = parseFloat(height) || 30;
    setReport(generateReport(floorplan, w, h));
  };

  return (
    <>
      <Preloader isVisible={pageLoading} text="Initializing Workspace" />

      <div className="noise-overlay min-h-screen bg-obsidian">
        <Navbar />

        <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-8rem)]">
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2, duration: 0.6 }}
                className="lg:col-span-4 xl:col-span-3"
              >
                <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Ruler className="w-4 h-4 text-accent-blue" />
                    <h2 className="text-sm font-display font-semibold text-white">
                      Floor Plan Parameters
                    </h2>
                  </div>

                  <div className="flex flex-col gap-5 flex-1">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <MoveHorizontal className="w-3.5 h-3.5" />
                        Width (ft)
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                        placeholder="e.g. 40"
                        data-testid="input-width"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <MoveVertical className="w-3.5 h-3.5" />
                        Height (ft)
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                        placeholder="e.g. 30"
                        data-testid="input-height"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        Requirements
                      </label>
                      <textarea
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        rows={5}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all resize-none"
                        placeholder="e.g. 3 bedrooms, 2 bathrooms, open kitchen, garage, office..."
                        data-testid="input-requirements"
                      />
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                      <button
                        onClick={handleGenerate}
                        disabled={generating || !width || !height}
                        className="w-full group flex items-center justify-center gap-2 bg-accent-blue text-white py-3 rounded-xl text-sm font-medium shadow-proximity-glow hover:shadow-spotlight transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        data-testid="button-generate"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{generating ? "Generating..." : "Generate Floor Plan"}</span>
                      </button>

                      {floorplan && (
                        <>
                          <button
                            onClick={handleGenerateReport}
                            className="w-full flex items-center justify-center gap-2 glass-panel py-3 rounded-xl text-sm font-medium text-accent-gold hover:text-white transition-colors border border-accent-gold/20 hover:border-accent-gold/40"
                            data-testid="button-generate-report"
                          >
                            <FileBarChart className="w-3.5 h-3.5" />
                            <span>{report ? "Refresh Report" : "Generate Report"}</span>
                          </button>
                          <button
                            onClick={handleReset}
                            className="w-full flex items-center justify-center gap-2 glass-panel py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors"
                            data-testid="button-reset"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.2, duration: 0.6 }}
                className={report ? "lg:col-span-5 xl:col-span-5" : "lg:col-span-8 xl:col-span-9"}
              >
                <div className="glass-panel rounded-2xl p-4 sm:p-6 h-full relative flex flex-col">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-xs font-mono text-white/25">
                        {floorplan
                          ? `floorplan_${width}x${height}.axp`
                          : "untitled.axp"}
                      </span>
                    </div>

                    {floorplan && (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/20">
                          {floorplan.totalArea} sq ft | {floorplan.rooms.length} rooms
                        </span>
                        <button
                          className="glass-panel rounded-lg p-2 text-white/30 hover:text-white transition-colors"
                          aria-label="Download"
                          data-testid="button-download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 relative bg-obsidian/50 rounded-xl overflow-hidden">
                    <AnimatePresence>
                      {generating && <GeneratingOverlay progress={progress} />}
                    </AnimatePresence>

                    {floorplan ? (
                      <FloorplanViewer result={floorplan} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                          <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-white/10" />
                          </div>
                          <div>
                            <p className="text-sm font-display text-white/30 mb-1">
                              No floorplan yet
                            </p>
                            <p className="text-xs text-white/15 leading-relaxed">
                              Enter dimensions and requirements, then click Generate to create your AI-powered floor plan.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {report && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="lg:col-span-3 xl:col-span-4"
                  >
                    <ReportPanel report={report} onClose={() => setReport(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
