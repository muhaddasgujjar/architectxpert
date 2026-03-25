import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, FileBarChart, CheckCircle, AlertCircle, Home, Bath,
  Utensils, Car, BedDouble, Ruler, Download, Loader2, Brain, Shield,
  Sun, Wind, Zap, Accessibility, BarChart3, Eye
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";

interface RoomInfo {
  name: string;
  area: number;
  rating: string;
}

interface AnalysisResult {
  clusterId: number;
  clusterLabel: string;
  layoutType: string;
  complexity: string;
  estimatedRooms: number;
  roomDistribution: RoomInfo[];
  flowScore: number;
  spaceEfficiency: number;
  ventilationScore: number;
  naturalLightScore: number;
  structuralIntegrity: number;
  accessibilityScore: number;
  energyEfficiency: string;
  recommendations: string[];
  warnings: string[];
  estimatedCostPKR: number;
  costPerSqft: number;
  totalArea: number;
  coveredArea: number;
}

function formatPKR(amount: number): string {
  if (amount >= 10000000) return `PKR ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `PKR ${(amount / 100000).toFixed(2)} Lac`;
  return `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "text-green-400";
  if (score >= 70) return "text-accent-blue";
  if (score >= 55) return "text-accent-gold";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 85) return "bg-green-400";
  if (score >= 70) return "bg-accent-blue";
  if (score >= 55) return "bg-accent-gold";
  return "bg-red-400";
}

const roomIcons: Record<string, typeof Home> = {
  "Living Room": Home,
  "Open Living & Dining": Home,
  "Drawing Room": Home,
  "Grand Living Hall": Home,
  "Lounge / TV Room": Home,
  "Master Bedroom": BedDouble,
  "Master Suite": BedDouble,
  "Master Suite + Walk-in": BedDouble,
  "Guest Suite": BedDouble,
  "Bedroom 2": BedDouble,
  "Bedroom 3": BedDouble,
  "Kitchen": Utensils,
  "Modern Kitchen": Utensils,
  "Modular Kitchen": Utensils,
  "Bathroom": Bath,
  "Bathroom 1": Bath,
  "Bathroom 2": Bath,
  "Garage": Car,
  "Washroom": Bath,
  "Home Office": Ruler,
  "Main Hall / Reception": Home,
  "Conference Room": Ruler,
  "Formal Dining": Utensils,
  "Dining Room": Utensils,
};

export default function ReportAnalysisPage() {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(0);
    setError(null);

    const steps = [
      { pct: 8, label: "Uploading image to AI..." },
      { pct: 18, label: "Validating architectural content..." },
      { pct: 30, label: "AI analyzing floor plan layout..." },
      { pct: 45, label: "Identifying rooms & dimensions..." },
      { pct: 58, label: "Computing performance scores..." },
      { pct: 70, label: "Running K-Means clustering..." },
      { pct: 80, label: "Estimating PKR construction costs..." },
      { pct: 90, label: "Generating recommendations..." },
      { pct: 95, label: "Compiling analysis report..." },
    ];

    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct);
        setProgressLabel(steps[stepIdx].label);
        stepIdx++;
      }
    }, 400);

    try {
      const formData = new FormData();
      formData.append("floorplan", file);

      const res = await fetch("/api/tools/analyze-floorplan", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        if (err.error === "not_architectural") {
          throw new Error(err.message || "This is not an architectural floor plan. Please upload a floor plan, blueprint, or architectural drawing.");
        }
        throw new Error(err.error || "Analysis failed");
      }

      setProgress(100);
      setProgressLabel("Complete!");
      const data: AnalysisResult = await res.json();

      await new Promise(r => setTimeout(r, 500));
      setResult(data);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || "Failed to analyze floor plan");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!file || !result) return;
    setDownloading(true);

    try {
      const res = await fetch("/api/tools/generate-report-pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: result, fileName: file.name }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ArchitectXpert_Report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate PDF report");
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Please sign in to access Report Analysis</p>
          <Link href="/auth" className="text-accent-blue hover:underline" data-testid="link-signin-redirect">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <PageParticles count={350} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors" data-testid="link-report-back">
            <ArrowLeft className="w-4 h-4" /><span>Back to home</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5">
              <FileBarChart className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Report Analysis</span>
            </div>
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5">
              <Brain className="w-3.5 h-3.5 text-accent-gold" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Unsupervised ML — K-Means Clustering</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Analyze your</span>{" "}
            <span className="gradient-text-blue">floor plan</span>
          </h1>
          <p className="text-white/40 text-base max-w-2xl">
            Upload your floor plan and get an AI-generated professional report with room analysis, performance scores, 
            cost estimation, and downloadable PDF — powered by unsupervised K-Means clustering.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-accent-blue" />
                Upload Floor Plan
              </h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                  dragActive ? "border-accent-blue/50 bg-accent-blue/5" : "border-white/10 hover:border-white/20"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
                data-testid="dropzone-upload"
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,.svg,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  data-testid="input-file-upload"
                />

                {preview ? (
                  <div className="space-y-3">
                    <img src={preview} alt="Floor plan preview" className="max-h-48 mx-auto rounded-lg border border-white/10 object-contain" />
                    <p className="text-xs text-white/40">{file?.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-white/15 mx-auto mb-3" />
                    <p className="text-sm text-white/40 mb-1">
                      {file ? file.name : "Drop your floor plan here"}
                    </p>
                    <p className="text-xs text-white/20">PNG, JPG, SVG, PDF — max 15MB</p>
                  </>
                )}
              </div>

              {file && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center gap-3 glass-panel rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 truncate">{file.name}</p>
                      <p className="text-[10px] text-white/25">{(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full flex items-center justify-center gap-2 bg-accent-blue text-white py-3 rounded-xl text-sm font-medium shadow-proximity-glow hover:shadow-spotlight transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="button-analyze"
                  >
                    {analyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span></>
                    ) : (
                      <><Brain className="w-4 h-4" /><span>Analyze with ML</span></>
                    )}
                  </button>

                  {analyzing && (
                    <div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-accent-blue to-blue-400 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-accent-blue/50 mt-1.5 text-center">{progressLabel}</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
                      </div>
                      <button
                        onClick={() => { setFile(null); setPreview(null); setError(null); }}
                        className="text-[10px] text-red-300/60 hover:text-red-300 underline transition-colors"
                        data-testid="button-try-again"
                      >
                        Upload a different image
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 bg-accent-gold/20 border border-accent-gold/30 text-accent-gold py-3 rounded-xl text-sm font-medium hover:bg-accent-gold/30 transition-all disabled:opacity-40"
                    data-testid="button-download-pdf"
                  >
                    {downloading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating PDF...</span></>
                    ) : (
                      <><Download className="w-4 h-4" /><span>Download PDF Report</span></>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-8">
            {result ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" data-testid="report-result">
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                      <FileBarChart className="w-4 h-4 text-accent-blue" />
                      ArchitectXpert Analysis Report
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/25 px-2 py-1 bg-white/[0.03] rounded">
                        Cluster #{result.clusterId}
                      </span>
                      <span className="text-[10px] font-mono text-accent-blue px-2 py-1 bg-accent-blue/10 rounded" data-testid="text-layout-type">
                        {result.clusterLabel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Total Area</p>
                      <p className="text-lg font-display font-bold text-white" data-testid="text-total-area">{result.totalArea.toLocaleString()} sqft</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Covered</p>
                      <p className="text-lg font-display font-bold text-white">{result.coveredArea.toLocaleString()} sqft</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Rooms</p>
                      <p className="text-lg font-display font-bold text-white" data-testid="text-room-count">{result.estimatedRooms}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Complexity</p>
                      <p className={`text-lg font-display font-bold ${
                        result.complexity === "Simple" ? "text-green-400" :
                        result.complexity === "Moderate" ? "text-accent-blue" :
                        result.complexity === "Complex" ? "text-accent-gold" : "text-red-400"
                      }`}>{result.complexity}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Performance Scores</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "Traffic Flow", score: result.flowScore, icon: BarChart3 },
                        { label: "Space Efficiency", score: result.spaceEfficiency, icon: Eye },
                        { label: "Ventilation", score: result.ventilationScore, icon: Wind },
                        { label: "Natural Light", score: result.naturalLightScore, icon: Sun },
                        { label: "Structural Integrity", score: result.structuralIntegrity, icon: Shield },
                        { label: "Accessibility", score: result.accessibilityScore, icon: Accessibility },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-3 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04]">
                          <s.icon className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-white/50">{s.label}</span>
                              <span className={`text-[11px] font-mono font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getScoreBg(s.score)}`} style={{ width: `${s.score}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl p-4 text-center">
                      <p className="text-[9px] text-white/25 font-mono uppercase mb-1">Estimated Cost</p>
                      <p className="text-xl font-display font-bold text-accent-blue" data-testid="text-estimated-cost">
                        {formatPKR(result.estimatedCostPKR)}
                      </p>
                      <p className="text-[10px] text-white/20 mt-0.5">PKR {result.costPerSqft.toLocaleString()}/sqft</p>
                    </div>
                    <div className="bg-accent-gold/5 border border-accent-gold/10 rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-accent-gold" />
                        <p className="text-[9px] text-white/25 font-mono uppercase">Energy Rating</p>
                      </div>
                      <p className="text-3xl font-display font-bold text-accent-gold">{result.energyEfficiency}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Room Distribution</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.roomDistribution.map((room, i) => {
                      const Icon = roomIcons[room.name] || Ruler;
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-white/25" />
                            <span className="text-xs text-white/60">{room.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-white/30">{room.area} sqft</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              room.rating === "Excellent" ? "text-green-400 bg-green-400/10" :
                              room.rating === "Good" ? "text-accent-blue bg-accent-blue/10" :
                              "text-accent-gold bg-accent-gold/10"
                            }`}>{room.rating}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">AI Recommendations</p>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-lg px-4 py-3 border border-white/[0.04]">
                        <div className="w-5 h-5 rounded-full bg-accent-blue/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-mono font-bold text-accent-blue">{i + 1}</span>
                        </div>
                        <span className="text-xs text-white/50 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="glass-panel rounded-2xl p-6 border-red-500/10">
                    <p className="text-xs font-mono text-red-400/60 uppercase tracking-wider mb-3">Warnings</p>
                    <div className="space-y-2">
                      {result.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-3 bg-red-500/5 rounded-lg px-4 py-3 border border-red-500/10">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-red-300/70 leading-relaxed">{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Brain className="w-4 h-4 text-white/20" />
                      <div>
                        <p className="text-[10px] text-white/25 font-mono">Model: K-Means Unsupervised Clustering (k=5)</p>
                        <p className="text-[9px] text-white/15 mt-0.5">Feature extraction from image metadata + pixel analysis · 5 layout categories</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={downloading}
                      className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent-gold/20 transition-all disabled:opacity-40"
                      data-testid="button-download-pdf-bottom"
                    >
                      {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel rounded-2xl p-6 h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <FileBarChart className="w-16 h-16 text-white/6 mx-auto mb-4" />
                  <p className="text-base text-white/25 font-display mb-2">Upload a floor plan to begin</p>
                  <p className="text-xs text-white/15 max-w-sm mx-auto">
                    Our unsupervised ML model will classify your layout, analyze room distribution, compute performance scores, and generate a professional PDF report.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
