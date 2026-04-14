import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { use3DTilt, fadeUp, fadeLeft, fadeRight, staggerContainer, defaultViewport } from "@/lib/animations";
import {
  ArrowLeft, Calculator, Layers, Ruler, Hammer, Paintbrush, Lightbulb,
  Droplets, Fence, Plus, Minus, Brain, Loader2, BedDouble, Bath,
  Car, ChevronDown, MapPin, Building2
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import ROIAnalyzer from "@/components/ui/ROIAnalyzer";

function formatPKR(amount: number): string {
  if (amount >= 10000000) return `PKR ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `PKR ${(amount / 100000).toFixed(2)} Lac`;
  return `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

interface MaterialItem {
  name: string;
  icon: typeof Hammer;
  unit: string;
  pricePerUnit: number;
  quantity: number;
}

interface MLPrediction {
  predictedCost: number;
  costPerSqft: number;
  confidenceLow: number;
  confidenceHigh: number;
  breakdown: {
    greyStructure: number;
    finishing: number;
    electrical: number;
    plumbing: number;
    fixtures: number;
  };
  modelInfo: {
    architecture: string;
    trainingDataPoints: number;
    features: string[];
  };
}

const CITY_OPTIONS = [
  { value: "islamabad",  label: "Islamabad" },
  { value: "lahore",     label: "Lahore" },
  { value: "karachi",    label: "Karachi" },
  { value: "rawalpindi", label: "Rawalpindi" },
  { value: "faisalabad", label: "Faisalabad" },
  { value: "multan",     label: "Multan" },
];

const defaultMaterials: MaterialItem[] = [
  { name: "Cement (OPC)", icon: Layers, unit: "bag (50kg)", pricePerUnit: 1350, quantity: 0 },
  { name: "Bricks (Class A)", icon: Fence, unit: "1000 pcs", pricePerUnit: 14000, quantity: 0 },
  { name: "Sand (Ravi)", icon: Layers, unit: "cu ft", pricePerUnit: 65, quantity: 0 },
  { name: "Crush / Aggregate", icon: Layers, unit: "cu ft", pricePerUnit: 85, quantity: 0 },
  { name: "Steel Bars (Grade 60)", icon: Hammer, unit: "kg", pricePerUnit: 280, quantity: 0 },
  { name: "Roofing (T-Iron Girder)", icon: Layers, unit: "piece", pricePerUnit: 4500, quantity: 0 },
  { name: "Drywall / Gypsum Board", icon: Ruler, unit: "sheet", pricePerUnit: 1200, quantity: 0 },
  { name: "Electrical Wiring (3/29)", icon: Lightbulb, unit: "coil (90m)", pricePerUnit: 5500, quantity: 0 },
  { name: "PVC Pipes (4 inch)", icon: Droplets, unit: "10 ft pipe", pricePerUnit: 650, quantity: 0 },
  { name: "Distemper Paint", icon: Paintbrush, unit: "gallon", pricePerUnit: 2800, quantity: 0 },
  { name: "Floor Tiles (China)", icon: Layers, unit: "sq ft", pricePerUnit: 120, quantity: 0 },
  { name: "Marble Flooring", icon: Layers, unit: "sq ft", pricePerUnit: 350, quantity: 0 },
  { name: "Aluminium Windows", icon: Ruler, unit: "sq ft", pricePerUnit: 950, quantity: 0 },
  { name: "Wooden Door (Diyar)", icon: Fence, unit: "unit", pricePerUnit: 35000, quantity: 0 },
  { name: "Kitchen Cabinets", icon: Layers, unit: "linear ft", pricePerUnit: 8500, quantity: 0 },
  { name: "Granite Countertop", icon: Hammer, unit: "sq ft", pricePerUnit: 1200, quantity: 0 },
];

const LOCATION_OPTIONS = [
  { value: "1", label: "Tier 1 — Islamabad, Lahore, Karachi" },
  { value: "2", label: "Tier 2 — Faisalabad, Rawalpindi, Multan" },
  { value: "3", label: "Tier 3 — Smaller Cities / Rural" },
];

const BREAKDOWN_COLORS = ["#3b82f6", "#60a5fa", "#fbbf24", "#818cf8", "#a78bfa"];
const BREAKDOWN_LABELS: Record<string, string> = {
  greyStructure: "Grey Structure",
  finishing: "Finishing",
  electrical: "Electrical",
  plumbing: "Plumbing",
  fixtures: "Fixtures & Fittings",
};

// Animated counter hook
function useCountUp(target: number, duration = 1.2) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = prevTarget.current;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (elapsed < 1) requestAnimationFrame(animate);
      else { setValue(target); prevTarget.current = target; }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

export default function EstimateCostPage() {
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const [sqft, setSqft] = useState("");
  const [stories, setStories] = useState("1");
  const [quality, setQuality] = useState<"standard" | "premium" | "luxury">("standard");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [hasBasement, setHasBasement] = useState(false);
  const [hasGarage, setHasGarage] = useState(false);
  const [locationTier, setLocationTier] = useState("2");
  const [materials, setMaterials] = useState<MaterialItem[]>(defaultMaterials);
  const [showEstimate, setShowEstimate] = useState(false);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [city, setCity] = useState("lahore");

  const baseCostPerSqft = quality === "luxury" ? 5500 : quality === "premium" ? 3800 : 2500;
  const totalSqft = parseFloat(sqft) || 0;
  const storyCount = parseInt(stories) || 1;

  const structuralCost = totalSqft * baseCostPerSqft * storyCount;
  const materialsCost = materials.reduce((sum, m) => sum + m.quantity * m.pricePerUnit, 0);
  const laborCost = structuralCost * 0.35;
  const permitsCost = totalSqft > 0 ? 50000 + totalSqft * 15 : 0;
  const contingency = (structuralCost + materialsCost + laborCost + permitsCost) * 0.1;
  const totalCost = structuralCost + materialsCost + laborCost + permitsCost + contingency;

  const updateQuantity = (index: number, delta: number) => {
    setMaterials((prev) =>
      prev.map((m, i) => i === index ? { ...m, quantity: Math.max(0, m.quantity + delta) } : m)
    );
  };

  const resetEstimate = () => {
    setShowEstimate(false);
    setMlPrediction(null);
  };

  const handleEstimate = async () => {
    if (totalSqft <= 0) return;
    setShowEstimate(true);
    setMlLoading(true);
    setMlPrediction(null);

    try {
      const res = await fetch("/api/tools/predict-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          area:         totalSqft,
          floors:       storyCount,
          quality,
          bedrooms:     parseInt(bedrooms)  || 3,
          bathrooms:    parseInt(bathrooms) || 2,
          hasBasement,
          hasGarage,
          locationTier: parseInt(locationTier) || 2,
        }),
      });

      if (res.ok) {
        const data: MLPrediction = await res.json();
        setMlPrediction(data);
      }
    } catch {
      // prediction error handled by empty state
    } finally {
      setMlLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Please sign in to access Cost Estimator</p>
          <Link href="/auth" className="text-accent-blue hover:underline" data-testid="link-signin-redirect">Sign In</Link>
        </div>
      </div>
    );
  }

  const totalCostAnimated   = useCountUp(showEstimate ? Math.round(totalCost) : 0);
  const { rotateX: mlRotX, rotateY: mlRotY, onMouseMove: mlMove, onMouseLeave: mlLeave } = use3DTilt(7);

  return (
    <div ref={pageRef} className="min-h-screen bg-obsidian relative overflow-hidden">
      <PageParticles count={350} />
      {/* Parallax background */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </motion.div>

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <motion.div whileHover={{ x: -3 }} className="inline-block">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors" data-testid="link-estimate-back">
              <ArrowLeft className="w-4 h-4" /><span>Back to home</span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5">
              <Calculator className="w-3.5 h-3.5 text-accent-gold" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Cost Estimator — Pakistan</span>
            </div>
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5">
              <Brain className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">ML-Powered Prediction</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Estimate</span>{" "}
            <span className="gradient-text-gold">building costs</span>
          </h1>
          <p className="text-white/40 text-base max-w-xl">
            Get dual estimates — formula-based calculation plus a trained neural network prediction using real Pakistani construction data.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={defaultViewport}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <motion.div
              whileHover={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
              transition={{ duration: 0.4 }}
              className="glass-panel rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                <Ruler className="w-4 h-4 text-accent-blue" />
                Project Details
              </h2>

              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">Total Area (sq ft)</label>
                <input
                  type="number"
                  value={sqft}
                  onChange={(e) => { setSqft(e.target.value); resetEstimate(); }}
                  placeholder="e.g. 1125"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 transition-all"
                  data-testid="input-sqft"
                />
                <p className="text-[9px] text-white/15 mt-1 font-mono">5M ≈ 1125 · 10M ≈ 2250 · 1K ≈ 4500</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Stories</label>
                  <select
                    value={stories}
                    onChange={(e) => { setStories(e.target.value); resetEstimate(); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-all appearance-none"
                    data-testid="select-stories"
                  >
                    <option value="1" className="bg-[#0c0c14]">1</option>
                    <option value="2" className="bg-[#0c0c14]">2</option>
                    <option value="3" className="bg-[#0c0c14]">3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Bedrooms</label>
                  <select
                    value={bedrooms}
                    onChange={(e) => { setBedrooms(e.target.value); resetEstimate(); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-all appearance-none"
                    data-testid="select-bedrooms"
                  >
                    {[2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n} className="bg-[#0c0c14]">{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Bathrooms</label>
                  <select
                    value={bathrooms}
                    onChange={(e) => { setBathrooms(e.target.value); resetEstimate(); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-all appearance-none"
                    data-testid="select-bathrooms"
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n} className="bg-[#0c0c14]">{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Location</label>
                  <select
                    value={locationTier}
                    onChange={(e) => { setLocationTier(e.target.value); resetEstimate(); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-all appearance-none"
                    data-testid="select-location"
                  >
                    {LOCATION_OPTIONS.map(l => (
                      <option key={l.value} value={l.value} className="bg-[#0c0c14]">{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 mb-2 block">Build Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["standard", "premium", "luxury"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuality(q); resetEstimate(); }}
                      className={`py-2 rounded-lg text-[11px] font-medium transition-all duration-200 border ${
                        quality === q
                          ? "bg-accent-blue/15 border-accent-blue/30 text-accent-blue"
                          : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60"
                      }`}
                      data-testid={`button-quality-${q}`}
                    >
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">City (for Market Value)</label>
                <select
                  value={city}
                  onChange={(e) => { setCity(e.target.value); resetEstimate(); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                >
                  {CITY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value} className="bg-[#0c0c14]">{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setHasBasement(!hasBasement); resetEstimate(); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                    hasBasement ? "bg-accent-blue/15 border-accent-blue/30 text-accent-blue" : "bg-white/[0.02] border-white/[0.06] text-white/40"
                  }`}
                  data-testid="button-basement"
                >
                  Basement
                </button>
                <button
                  onClick={() => { setHasGarage(!hasGarage); resetEstimate(); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                    hasGarage ? "bg-accent-blue/15 border-accent-blue/30 text-accent-blue" : "bg-white/[0.02] border-white/[0.06] text-white/40"
                  }`}
                  data-testid="button-garage"
                >
                  Garage
                </button>
              </div>

              <motion.button
                onClick={handleEstimate}
                disabled={totalSqft <= 0}
                whileHover={totalSqft > 0 ? { scale: 1.02, boxShadow: "0 0 28px rgba(59,130,246,0.45)" } : {}}
                whileTap={totalSqft > 0 ? { scale: 0.97 } : {}}
                className="w-full flex items-center justify-center gap-2 bg-accent-blue text-white py-3 rounded-xl text-sm font-medium shadow-proximity-glow hover:shadow-spotlight transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="button-calculate"
              >
                <Calculator className="w-4 h-4" />
                <span>Calculate & Predict</span>
              </motion.button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={defaultViewport}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <motion.div
              whileHover={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
              transition={{ duration: 0.4 }}
              className="glass-panel rounded-2xl p-6 h-full"
            >
              <h2 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Hammer className="w-4 h-4 text-accent-gold" />
                Materials & Quantities
              </h2>
              <div
                className="space-y-2 max-h-[300px] sm:max-h-[470px] overflow-y-auto pr-1 custom-scrollbar"
                data-cursor-mode="drag"
              >
                {materials.map((mat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03, duration: 0.35 }}
                    whileHover={{ x: 3, backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}
                    className="flex items-center justify-between gap-2 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <mat.icon className="w-3 h-3 text-white/20 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-white/60 truncate">{mat.name}</p>
                        <p className="text-[9px] text-white/20">PKR {mat.pricePerUnit.toLocaleString()}/{mat.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <motion.button
                        onClick={() => updateQuantity(i, -5)}
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.85 }}
                        className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                        data-testid={`button-decrease-${i}`}
                      >
                        <Minus className="w-3 h-3" />
                      </motion.button>
                      <input
                        type="number"
                        value={mat.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setMaterials((prev) => prev.map((m, j) => j === i ? { ...m, quantity: Math.max(0, val) } : m));
                          resetEstimate();
                        }}
                        className="w-14 text-center bg-white/[0.03] border border-white/[0.06] rounded px-1 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-accent-blue/30"
                        data-testid={`input-material-${i}`}
                      />
                      <motion.button
                        onClick={() => updateQuantity(i, 5)}
                        whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.85 }}
                        className="w-6 h-6 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                        data-testid={`button-increase-${i}`}
                      >
                        <Plus className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={defaultViewport}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3"
          >
            <motion.div
              whileHover={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
              transition={{ duration: 0.4 }}
              className="glass-panel rounded-2xl p-6 h-full"
            >
              <h2 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-green-400 font-bold text-sm">₨</span>
                Formula Estimate (PKR)
              </h2>

              {showEstimate && totalSqft > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" data-testid="cost-result">
                  <div className="space-y-2">
                    {[
                      { label: "Structural & Building", value: structuralCost },
                      { label: "Materials", value: materialsCost },
                      { label: "Labor (est. 35%)", value: laborCost },
                      { label: "Permits & NOC Fees", value: permitsCost },
                      { label: "Contingency (10%)", value: contingency },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-[11px] text-white/40">{item.label}</span>
                        <span className="text-[11px] font-mono text-white/60">{formatPKR(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl p-4 text-center"
                  >
                    <p className="text-[10px] text-white/25 font-mono uppercase mb-1">Formula Total</p>
                    <p className="text-2xl font-display font-bold text-accent-blue" data-testid="text-total-cost">
                      {formatPKR(totalCostAnimated)}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">
                      PKR {Math.round(totalCost / totalSqft).toLocaleString()}/sq ft
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                      <p className="text-[9px] text-white/25 mb-0.5">Area</p>
                      <p className="text-[12px] font-display font-semibold text-white">{totalSqft.toLocaleString()} sqft</p>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                      <p className="text-[9px] text-white/25 mb-0.5">Quality</p>
                      <p className="text-[12px] font-display font-semibold text-white capitalize">{quality}</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-white/15 leading-relaxed">
                    * Based on 2024-25 market rates (Punjab/Islamabad).
                  </p>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Calculator className="w-10 h-10 text-white/8 mx-auto mb-3" />
                    <p className="text-xs text-white/25">Enter details and click Calculate</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeRight}
            initial="hidden"
            whileInView="show"
            viewport={defaultViewport}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <motion.div
              style={{ rotateX: mlRotX, rotateY: mlRotY, transformPerspective: 1200 }}
              onMouseMove={mlMove}
              onMouseLeave={mlLeave}
              whileHover={{ boxShadow: "0 24px 70px rgba(59,130,246,0.15)" }}
              transition={{ duration: 0.4 }}
              className="glass-panel rounded-2xl p-6 h-full border-accent-blue/10"
            >
              <h2 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent-blue" />
                ML Prediction
              </h2>

              {mlLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-accent-blue/40 mx-auto mb-3 animate-spin" />
                    <p className="text-xs text-white/30">Running neural network...</p>
                  </div>
                </div>
              ) : mlPrediction ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" data-testid="ml-result">
                  <div className="bg-gradient-to-br from-accent-blue/10 to-accent-blue/5 border border-accent-blue/15 rounded-xl p-4 text-center">
                    <p className="text-[10px] text-accent-blue/50 font-mono uppercase mb-1">Neural Network Prediction</p>
                    <p className="text-2xl font-display font-bold text-accent-blue" data-testid="text-ml-cost">
                      {formatPKR(mlPrediction.predictedCost)}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">
                      PKR {mlPrediction.costPerSqft.toLocaleString()}/sq ft
                    </p>
                  </div>

                  <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Confidence Range (±12%)</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/40">{formatPKR(mlPrediction.confidenceLow)}</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/30 via-accent-blue to-accent-blue/30 rounded-full" />
                      </div>
                      <span className="text-[11px] font-mono text-white/40">{formatPKR(mlPrediction.confidenceHigh)}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-white/25 font-mono uppercase mb-2">AI Cost Breakdown</p>
                    <div className="h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(mlPrediction.breakdown).map(([key, val]) => ({
                            name: BREAKDOWN_LABELS[key] || key,
                            value: val,
                          }))}
                          layout="vertical"
                          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={80}
                            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(10,10,20,0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              fontSize: "10px",
                              color: "rgba(255,255,255,0.7)",
                            }}
                            formatter={(value: number) => formatPKR(value)}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                            {Object.keys(mlPrediction.breakdown).map((_, i) => (
                              <Cell key={i} fill={BREAKDOWN_COLORS[i]} fillOpacity={0.7} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <p className="text-[9px] text-white/20 font-mono uppercase mb-1.5">Model Info</p>
                    <p className="text-[10px] text-accent-blue/60 font-mono">{mlPrediction.modelInfo.architecture}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">Trained on {mlPrediction.modelInfo.trainingDataPoints.toLocaleString()} data points · MAPE: 7.11%</p>
                  </div>
                </motion.div>
              ) : showEstimate ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Brain className="w-10 h-10 text-white/8 mx-auto mb-3" />
                    <p className="text-xs text-white/25">ML prediction unavailable</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Brain className="w-10 h-10 text-white/8 mx-auto mb-3" />
                    <p className="text-xs text-white/25">Neural network ready</p>
                    <p className="text-[10px] text-white/15 mt-1">Fill details and click Calculate</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* ── ROI Analyzer: Market Value + ROI + Map ───────────────────────── */}
        {showEstimate && mlPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <ROIAnalyzer
              constructionCost={mlPrediction.predictedCost}
              features={{
                area_sqft: totalSqft,
                bedrooms:  parseInt(bedrooms)  || 3,
                bathrooms: parseInt(bathrooms) || 2,
                floors:    storyCount,
                city,
              }}
            />
          </motion.div>
        )}

      </div>
    </div>
  );
}
