import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
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
import { use3DTilt, fadeUp, fadeLeft, fadeRight, staggerContainer, smoothTransition, defaultViewport } from "@/lib/animations";

// ── GeneratingOverlay ─────────────────────────────────────────────────────────
function GeneratingOverlay({ progress }: { progress: number }) {
  const smoothProgress = useSpring(progress, { stiffness: 60, damping: 15 });

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

        <div className="flex flex-col items-center gap-3 w-52">
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-blue to-blue-400 rounded-full"
              style={{ width: smoothProgress.get() + "%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs font-mono text-white/40">
            {progress < 30  && "Analyzing dimensions..."}
            {progress >= 30  && progress < 60 && "Computing room layouts..."}
            {progress >= 60  && progress < 85 && "Optimizing spatial flow..."}
            {progress >= 85  && "Finalizing floorplan..."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── FloorplanViewer ───────────────────────────────────────────────────────────
function FloorplanViewer({ result }: { result: FloorplanResult }) {
  const [zoom, setZoom]             = useState(1);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = use3DTilt(6);

  return (
    <motion.div
      className="relative w-full h-full flex items-center justify-center"
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      data-testid="floorplan-viewer"
      data-cursor-mode="view3d"
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        {[
          { icon: ZoomIn,   label: "Zoom in",    onClick: () => setZoom(z => Math.min(z + 0.2, 2)),   testid: "button-zoom-in" },
          { icon: ZoomOut,  label: "Zoom out",   onClick: () => setZoom(z => Math.max(z - 0.2, 0.5)), testid: "button-zoom-out" },
          { icon: Maximize2, label: "Reset zoom", onClick: () => setZoom(1),                            testid: "button-zoom-reset" },
        ].map(({ icon: Icon, label, onClick, testid }) => (
          <motion.button
            key={testid}
            onClick={onClick}
            whileHover={{ scale: 1.12, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.9 }}
            className="glass-panel rounded-lg p-2 text-white/40 hover:text-white transition-colors"
            aria-label={label}
            data-testid={testid}
          >
            <Icon className="w-4 h-4" />
          </motion.button>
        ))}
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
          x="0" y="0"
          width={result.totalWidth} height={result.totalHeight}
          fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.08)"
          strokeWidth="1" rx="4"
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
              x={room.x} y={room.y}
              width={room.width} height={room.height}
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
              <circle cx={room.x + room.width / 2} cy={room.y + room.height / 2} r="3" fill={room.textColor}>
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
            if (Math.abs(x1 - next.x) < 4 || Math.abs(room.y - next.y) < 4) {
              return (
                <line key={`line-${i}`}
                  x1={x1} y1={room.y + room.height * 0.3}
                  x2={x1} y2={room.y + room.height * 0.7}
                  stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4"
                />
              );
            }
            return null;
          })}
      </motion.svg>
    </motion.div>
  );
}

// ── Report helpers ────────────────────────────────────────────────────────────
interface ReportData {
  rooms: { name: string; area: number; percentage: number }[];
  totalArea: number;
  flowScore: number;
  efficiency: number;
  recommendations: string[];
}

function generateReport(fp: FloorplanResult, w: number, h: number): ReportData {
  const totalArea = w * h;
  const rooms = fp.rooms.map(r => {
    const roomArea = Math.round((r.width * r.height) / 100 * totalArea / (fp.totalWidth * fp.totalHeight / 10000));
    return { name: r.name, area: roomArea, percentage: Math.round((roomArea / totalArea) * 100) };
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

// ── ReportPanel ───────────────────────────────────────────────────────────────
function ReportPanel({ report, onClose }: { report: ReportData; onClose: () => void }) {
  const roomIcons: Record<string, typeof Home> = {
    "Living Room": Home, "Kitchen": Utensils, "Master Bedroom": BedDouble,
    "Bedroom 2": BedDouble, "Bedroom 3": BedDouble, "Bathroom": Bath, "Bathroom 2": Bath,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="glass-panel rounded-2xl p-5 h-full flex flex-col overflow-y-auto"
      data-testid="report-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
          <FileBarChart className="w-4 h-4 text-accent-gold" />
          Floor Plan Report
        </h3>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.88 }}
          className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
          data-testid="button-close-report"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Stats grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-2 mb-4"
      >
        {[
          { label: "Area",       value: `${report.totalArea} sq ft`,  color: "text-white" },
          { label: "Rooms",      value: String(report.rooms.length),  color: "text-white" },
          { label: "Flow",       value: `${report.flowScore}%`,       color: "text-accent-blue" },
          { label: "Efficiency", value: `${report.efficiency}%`,      color: "text-accent-gold" },
        ].map(({ label, value, color }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.05)" }}
            className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06] transition-colors"
          >
            <p className="text-[9px] text-white/25 font-mono uppercase">{label}</p>
            <p className={`text-sm font-display font-bold ${color}`}>{value}</p>
          </motion.div>
        ))}
      </motion.div>

      <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Room Breakdown</p>
      <div className="space-y-1.5 mb-4">
        {report.rooms.map((room, i) => {
          const Icon = roomIcons[room.name] || Ruler;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={{ x: 3, backgroundColor: "rgba(255,255,255,0.04)" }}
              className="flex items-center justify-between bg-white/[0.02] rounded-lg px-2.5 py-1.5 border border-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-white/20" />
                <span className="text-[11px] text-white/50">{room.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/25">{room.area} ft²</span>
                <span className="text-[10px] font-mono text-accent-blue/60">{room.percentage}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Recommendations</p>
      <div className="space-y-1.5">
        {report.recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
            className="flex items-start gap-1.5 text-[11px] text-white/35 leading-relaxed"
          >
            <AlertCircle className="w-3 h-3 text-accent-blue flex-shrink-0 mt-0.5" />
            <span>{rec}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── WorkspacePage ─────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const [, navigate]    = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [genIconSpin, setGenIconSpin] = useState(false);
  const [progress, setProgress]       = useState(0);
  const [floorplan, setFloorplan]     = useState<FloorplanResult | null>(null);
  const [report, setReport]           = useState<ReportData | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Parallax background
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  const [width, setWidth]       = useState("40");
  const [height, setHeight]     = useState("30");
  const [requirements, setRequirements] = useState(
    "2 bedrooms, 2 bathrooms, open kitchen, dining room, garage"
  );

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || !user) {
    return <Preloader isVisible={true} text="Checking credentials" />;
  }

  const handleGenerate = () => {
    const w = parseFloat(width)  || 40;
    const h = parseFloat(height) || 30;

    setGenIconSpin(true);
    setGenerating(true);
    setProgress(0);
    setFloorplan(null);
    setTimeout(() => setGenIconSpin(false), 900);

    const steps = [10, 25, 40, 55, 70, 82, 90, 95, 100];
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProgress(steps[stepIndex++]);
      } else {
        clearInterval(interval);
        setFloorplan(generateFloorplan(w, h, requirements));
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
    const w = parseFloat(width)  || 40;
    const h = parseFloat(height) || 30;
    setReport(generateReport(floorplan, w, h));
  };

  return (
    <>
      <Preloader isVisible={pageLoading} text="Initializing Workspace" />

      <div ref={pageRef} className="noise-overlay min-h-screen bg-obsidian overflow-hidden">
        {/* Parallax background glow */}
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-accent-blue/[0.04] rounded-full blur-[160px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-gold/[0.03] rounded-full blur-[140px]" />
        </motion.div>

        <Navbar />

        <div className="relative z-10 pt-24 pb-8 px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="max-w-7xl mx-auto">

            {/* Back button */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.9, duration: 0.5 }}
              className="mb-4"
            >
              <motion.button
                onClick={() => navigate("/")}
                whileHover={{ x: -3, color: "rgba(255,255,255,0.7)" }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </motion.button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-8rem)]">

              {/* ── Left Panel — Parameters ── */}
              <motion.div
                variants={fadeLeft}
                initial="hidden"
                animate="show"
                transition={{ delay: 2, ...smoothTransition }}
                className="lg:col-span-4 xl:col-span-3"
              >
                <motion.div
                  whileHover={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.12)" }}
                  transition={{ duration: 0.4 }}
                  className="glass-panel rounded-2xl p-6 h-full flex flex-col border border-white/[0.06]"
                >
                  <motion.div
                    className="flex items-center gap-2 mb-6"
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 20 }}
                    viewport={defaultViewport}
                    transition={{ duration: 0.5 }}
                  >
                    <Ruler className="w-4 h-4 text-accent-blue" />
                    <h2 className="text-sm font-display font-semibold text-white">Floor Plan Parameters</h2>
                  </motion.div>

                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    transition={{ delayChildren: 2.1 }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    {/* Width */}
                    <motion.div variants={fadeUp}>
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <MoveHorizontal className="w-3.5 h-3.5" />
                        Width (ft)
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={e => setWidth(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                        placeholder="e.g. 40"
                        data-testid="input-width"
                      />
                    </motion.div>

                    {/* Height */}
                    <motion.div variants={fadeUp}>
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <MoveVertical className="w-3.5 h-3.5" />
                        Height (ft)
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                        placeholder="e.g. 30"
                        data-testid="input-height"
                      />
                    </motion.div>

                    {/* Requirements */}
                    <motion.div variants={fadeUp} className="flex-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        Requirements
                      </label>
                      <textarea
                        value={requirements}
                        onChange={e => setRequirements(e.target.value)}
                        rows={5}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all resize-none"
                        placeholder="e.g. 3 bedrooms, 2 bathrooms, open kitchen, garage, office..."
                        data-testid="input-requirements"
                      />
                    </motion.div>

                    {/* Actions */}
                    <motion.div variants={fadeUp} className="flex flex-col gap-2 mt-auto">
                      <motion.button
                        onClick={handleGenerate}
                        disabled={generating || !width || !height}
                        whileHover={generating ? {} : { scale: 1.02, boxShadow: "0 0 30px rgba(59,130,246,0.5)" }}
                        whileTap={generating ? {} : { scale: 0.97 }}
                        className="w-full group flex items-center justify-center gap-2 bg-accent-blue text-white py-3 rounded-xl text-sm font-medium shadow-proximity-glow hover:shadow-spotlight transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        data-testid="button-generate"
                      >
                        <motion.div
                          animate={genIconSpin ? { rotate: 360 } : { rotate: 0 }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        <span>{generating ? "Generating..." : "Generate Floor Plan"}</span>
                      </motion.button>

                      <AnimatePresence>
                        {floorplan && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-2 overflow-hidden"
                          >
                            <motion.button
                              onClick={handleGenerateReport}
                              whileHover={{ scale: 1.02, borderColor: "rgba(251,191,36,0.4)" }}
                              whileTap={{ scale: 0.97 }}
                              className="w-full flex items-center justify-center gap-2 glass-panel py-3 rounded-xl text-sm font-medium text-accent-gold hover:text-white transition-colors border border-accent-gold/20"
                              data-testid="button-generate-report"
                            >
                              <FileBarChart className="w-3.5 h-3.5" />
                              <span>{report ? "Refresh Report" : "Generate Report"}</span>
                            </motion.button>

                            <motion.button
                              onClick={handleReset}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              className="w-full flex items-center justify-center gap-2 glass-panel py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors"
                              data-testid="button-reset"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Room count badge — pulses after generation */}
                    <AnimatePresence>
                      {floorplan && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="flex items-center justify-center gap-2 py-2 rounded-xl bg-accent-blue/[0.08] border border-accent-blue/20"
                        >
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-accent-blue font-display font-bold text-lg"
                          >
                            {floorplan.rooms.length}
                          </motion.span>
                          <span className="text-xs font-mono text-white/30 uppercase tracking-wider">rooms generated</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* ── Center — Viewer ── */}
              <motion.div
                variants={fadeRight}
                initial="hidden"
                animate="show"
                transition={{ delay: 2.2, ...smoothTransition }}
                className={report ? "lg:col-span-5 xl:col-span-5" : "lg:col-span-8 xl:col-span-9"}
              >
                <motion.div
                  whileHover={{ boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }}
                  transition={{ duration: 0.4 }}
                  className="glass-panel rounded-2xl p-4 sm:p-6 h-full relative flex flex-col border border-white/[0.06]"
                >
                  {/* Titlebar */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-xs font-mono text-white/25">
                        {floorplan ? `floorplan_${width}x${height}.axp` : "untitled.axp"}
                      </span>
                    </div>

                    <AnimatePresence>
                      {floorplan && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center gap-3"
                        >
                          <span className="text-[10px] font-mono text-white/20">
                            {floorplan.totalArea} sq ft | {floorplan.rooms.length} rooms
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.9 }}
                            className="glass-panel rounded-lg p-2 text-white/30 hover:text-white transition-colors"
                            aria-label="Download"
                            data-testid="button-download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Viewer area */}
                  <div className="flex-1 relative bg-obsidian/50 rounded-xl overflow-hidden">
                    <AnimatePresence>
                      {generating && <GeneratingOverlay progress={progress} />}
                    </AnimatePresence>

                    {floorplan ? (
                      <FloorplanViewer result={floorplan} />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center h-full"
                      >
                        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                          <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center"
                          >
                            <Sparkles className="w-7 h-7 text-white/10" />
                          </motion.div>
                          <div>
                            <p className="text-sm font-display text-white/30 mb-1">No floorplan yet</p>
                            <p className="text-xs text-white/15 leading-relaxed">
                              Enter dimensions and requirements, then click Generate to create your AI-powered floor plan.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>

              {/* ── Right — Report ── */}
              <AnimatePresence>
                {report && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
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
