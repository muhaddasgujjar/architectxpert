import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Building2, Loader2, Lightbulb, Leaf, Scale,
  AlertTriangle, Clock, Maximize2, Hammer, ChevronRight, Sparkles, Download
} from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

interface AdvisorResult {
  project_overview: string;
  design_recommendations: string[];
  material_suggestions: { name: string; use: string; benefit: string }[];
  sustainability_tips: string[];
  building_codes: string[];
  cost_breakdown: Record<string, number>;
  estimated_timeline: string;
  risk_factors: string[];
  space_optimization: string;
}

const PROJECT_TYPES = [
  "Residential Home", "Apartment Complex", "Commercial Office",
  "Retail Store", "Restaurant", "Warehouse", "Hospital / Clinic",
  "School / University", "Hotel", "Mixed-Use Development",
  "Religious Building", "Sports Facility",
];

const STYLE_OPTIONS = [
  "Modern / Contemporary", "Minimalist", "Industrial",
  "Traditional / Classical", "Mediterranean", "Art Deco",
  "Sustainable / Biophilic", "Brutalist", "Neo-Futurism", "Vernacular / Regional",
];

const BUDGET_OPTIONS = [
  "Under PKR 50 Lac", "PKR 50 Lac – 1 Cr", "PKR 1 – 3 Cr",
  "PKR 3 – 10 Cr", "PKR 10 – 50 Cr", "PKR 50 Cr+",
];

const PRIORITY_OPTIONS = [
  "Energy Efficiency", "Natural Light", "Space Optimization",
  "Accessibility (ADA)", "Seismic Safety", "Cost Optimization",
  "Aesthetic Impact", "Sustainability (LEED)",
];

const PIE_COLORS = ["#3b82f6", "#60a5fa", "#818cf8", "#fbbf24", "#a78bfa"];

const COST_LABELS: Record<string, string> = {
  structure: "Structure",
  interior: "Interior Finish",
  mechanical: "Mechanical / MEP",
  exterior: "Exterior / Envelope",
  permits_fees: "Permits & Fees",
};

export default function ArchitectureAdvisorPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [projectType, setProjectType] = useState("");
  const [area, setArea] = useState("");
  const [floors, setFloors] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const togglePriority = (p: string) => {
    setSelectedPriorities(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : prev.length < 3 ? [...prev, p] : prev
    );
  };

  const handleAnalyze = async () => {
    if (!projectType || !area) {
      setError("Please select a project type and enter the area.");
      return;
    }
    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/architecture-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectType, area, floors, location, budget, style,
          priorities: selectedPriorities.join(", "),
          description,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(errData.error || "Analysis failed");
      }

      const data: AdvisorResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    setDownloading(true);

    try {
      // Build a printable HTML document with all analysis data
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>ArchitectXpert Report — ${projectType}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a14; color: #e0e0f0; padding: 40px; }
    .header { background: #0d0d20; padding: 24px 32px; border-bottom: 3px solid #3b82f6; margin: -40px -40px 32px; }
    .header h1 { font-size: 22px; color: #f0f0f5; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #888; }
    .badge { display: inline-block; padding: 3px 10px; background: #3b82f6; color: white; border-radius: 12px; font-size: 10px; margin-right: 8px; }
    h2 { font-size: 15px; color: #3b82f6; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #222; }
    h3 { font-size: 13px; color: #fbbf24; margin: 16px 0 8px; }
    p, li { font-size: 12px; line-height: 1.7; color: #c0c0d0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .card { background: #111122; border: 1px solid #222; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta { font-size: 11px; color: #666; margin-top: 4px; }
    .cost-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1a1a2e; }
    .cost-label { color: #aaa; font-size: 12px; }
    .cost-value { color: #3b82f6; font-weight: bold; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #222; text-align: center; font-size: 10px; color: #555; }
    @media print { body { background: white; color: #222; } .card { border-color: #ddd; background: #f9f9f9; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>ArchitectXpert — Architecture Advisor Report</h1>
    <p>${projectType} · ${area} sq ft · ${floors || 1} Floor${Number(floors) > 1 ? 's' : ''} · ${location || 'Pakistan'} · Generated ${new Date().toLocaleDateString()}</p>
  </div>

  <h2>📋 Project Overview</h2>
  <div class="card"><p>${result.project_overview}</p></div>

  <h2>💡 Design Recommendations</h2>
  <div class="card"><ul>${(result.design_recommendations || []).map((r: string, i: number) => `<li><strong>${i + 1}.</strong> ${r}</li>`).join('')}</ul></div>

  <h2>🔨 Material Suggestions</h2>
  ${(result.material_suggestions || []).map((m: any) => `<div class="card"><h3>${m.name} <span class="badge">${m.use}</span></h3><p>${m.benefit}</p></div>`).join('')}

  <h2>🌱 Sustainability Tips</h2>
  <div class="card"><ul>${(result.sustainability_tips || []).map((t: string) => `<li>${t}</li>`).join('')}</ul></div>

  <h2>📐 Building Codes</h2>
  <div class="card"><ul>${(result.building_codes || []).map((c: string) => `<li>${c}</li>`).join('')}</ul></div>

  ${result.cost_breakdown ? `<h2>💰 Cost Breakdown</h2><div class="card">${Object.entries(result.cost_breakdown).map(([k, v]) => `<div class="cost-row"><span class="cost-label">${k.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span><span class="cost-value">${v}%</span></div>`).join('')}</div>` : ''}

  <h2>⏱️ Estimated Timeline</h2>
  <div class="card"><p>${result.estimated_timeline}</p></div>

  <h2>⚠️ Risk Factors</h2>
  <div class="card"><ul>${(result.risk_factors || []).map((r: string) => `<li>${r}</li>`).join('')}</ul></div>

  <h2>📐 Space Optimization</h2>
  <div class="card"><p>${result.space_optimization}</p></div>

  <div class="footer">
    <p>ArchitectXpert — AI-Powered Architectural Analysis Platform</p>
    <p>Auto-generated report. Consult a licensed architect for final decisions.</p>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, '_blank');
      if (printWin) {
        printWin.addEventListener('load', () => {
          printWin.print();
          URL.revokeObjectURL(url);
        });
      } else {
        // Fallback: direct download as HTML
        const a = document.createElement('a');
        a.href = url;
        a.download = `ArchitectXpert_Advisor_Report_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to generate PDF report');
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <div className="noise-overlay min-h-screen bg-obsidian">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-accent-blue/40 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-white/80 mb-2">Sign In Required</h2>
            <p className="text-sm text-white/40 mb-6">Sign in to use the AI Architecture Advisor</p>
            <Link href="/auth" className="inline-flex items-center gap-2 bg-accent-blue text-white px-6 py-3 rounded-full text-sm font-medium" data-testid="link-sign-in">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="noise-overlay min-h-screen bg-obsidian relative overflow-hidden">
      <PageParticles />
      <Navbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-6">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[11px] font-mono text-accent-blue uppercase tracking-widest mb-4">
            <Building2 className="w-3 h-3" />
            AI Architecture Advisor
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold gradient-text mb-3" data-testid="heading-title">
            Describe. Analyze. Build.
          </h1>
          <p className="text-sm text-white/35 max-w-md mx-auto">
            Tell us about your building project and get AI-powered architectural recommendations, material suggestions, and code compliance insights.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto">
              <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Project Type *</label>
                    <select
                      value={projectType}
                      onChange={e => setProjectType(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 focus:outline-none focus:border-accent-blue/30 appearance-none cursor-pointer"
                      data-testid="select-project-type"
                    >
                      <option value="" className="bg-obsidian text-white/40">Select type...</option>
                      {PROJECT_TYPES.map(t => (
                        <option key={t} value={t} className="bg-obsidian text-white">{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Total Area (sq ft) *</label>
                    <input
                      type="number"
                      value={area}
                      onChange={e => setArea(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-accent-blue/30"
                      data-testid="input-area"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Number of Floors</label>
                    <input
                      type="number"
                      value={floors}
                      onChange={e => setFloors(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-accent-blue/30"
                      data-testid="input-floors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Location / Climate</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Lahore, Punjab (hot humid)"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-accent-blue/30"
                      data-testid="input-location"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Budget Range</label>
                    <select
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 focus:outline-none focus:border-accent-blue/30 appearance-none cursor-pointer"
                      data-testid="select-budget"
                    >
                      <option value="" className="bg-obsidian text-white/40">Select budget...</option>
                      {BUDGET_OPTIONS.map(b => (
                        <option key={b} value={b} className="bg-obsidian text-white">{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Preferred Style</label>
                    <select
                      value={style}
                      onChange={e => setStyle(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 focus:outline-none focus:border-accent-blue/30 appearance-none cursor-pointer"
                      data-testid="select-style"
                    >
                      <option value="" className="bg-obsidian text-white/40">Select style...</option>
                      {STYLE_OPTIONS.map(s => (
                        <option key={s} value={s} className="bg-obsidian text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Priorities (select up to 3)</label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePriority(p)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-300 ${
                          selectedPriorities.includes(p)
                            ? "bg-accent-blue/15 border-accent-blue/30 text-accent-blue"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.12]"
                        }`}
                        data-testid={`priority-${p.toLowerCase().replace(/[\s()\/]/g, "-")}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">Additional Notes</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Any specific requirements, constraints, or design goals..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-accent-blue/30 resize-none"
                    data-testid="textarea-description"
                  />
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400/80 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span data-testid="text-error">{error}</span>
                  </motion.div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={!projectType || !area || analyzing}
                    className="inline-flex items-center gap-2 bg-accent-blue text-white px-7 py-3 rounded-full text-sm font-medium shadow-proximity-glow hover:shadow-spotlight transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="button-analyze"
                  >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {analyzing ? "Generating Analysis..." : "Get AI Recommendations"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-accent-blue" />
                  <div>
                    <h2 className="text-lg font-display font-semibold text-white/80">{projectType}</h2>
                    <p className="text-[11px] font-mono text-white/30">{area} sq ft{floors ? ` · ${floors} floor${Number(floors) > 1 ? "s" : ""}` : ""}{location ? ` · ${location}` : ""}</p>
                  </div>
                </div>
                <button onClick={handleReset} className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors" data-testid="button-new-analysis">
                  <ChevronRight className="w-4 h-4" />
                  New Project
                </button>
              </div>

              <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-6" data-testid="section-overview">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-display font-semibold text-white/80">Project Overview</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed" data-testid="text-overview">{result.project_overview}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-recommendations">
                  <div className="flex items-center gap-2 mb-5">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Design Recommendations</h3>
                  </div>
                  <div className="space-y-3">
                    {(result.design_recommendations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3" data-testid={`recommendation-${i}`}>
                        <span className="text-[10px] font-mono text-gold/60 bg-gold/10 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[12px] text-white/45 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-materials">
                  <div className="flex items-center gap-2 mb-5">
                    <Hammer className="w-4 h-4 text-accent-blue" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Material Suggestions</h3>
                  </div>
                  <div className="space-y-3">
                    {(result.material_suggestions || []).map((mat, i) => (
                      <div key={i} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3" data-testid={`material-${i}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-display font-semibold text-white/60">{mat.name}</span>
                          <span className="text-[10px] font-mono text-accent-blue/50 bg-accent-blue/10 px-2 py-0.5 rounded-full">{mat.use}</span>
                        </div>
                        <p className="text-[11px] text-white/30 leading-relaxed">{mat.benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {result.cost_breakdown && Object.keys(result.cost_breakdown).length > 0 && (
                <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-6" data-testid="section-cost">
                  <div className="flex items-center gap-2 mb-5">
                    <Scale className="w-4 h-4 text-accent-blue" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Cost Breakdown</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-48 h-48 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(result.cost_breakdown).map(([key, val]) => ({
                              name: COST_LABELS[key] || key,
                              value: val,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth={1}
                          >
                            {Object.keys(result.cost_breakdown).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.7} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(10,10,20,0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.7)",
                            }}
                            formatter={(value: number) => `${value}%`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {Object.entries(result.cost_breakdown).map(([key, val], i) => (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length], opacity: 0.7 }} />
                          <span className="text-[12px] text-white/50 flex-1">{COST_LABELS[key] || key}</span>
                          <div className="w-20 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length], opacity: 0.7 }} />
                          </div>
                          <span className="text-[11px] font-mono text-white/40 w-8 text-right">{val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-sustainability">
                  <div className="flex items-center gap-2 mb-5">
                    <Leaf className="w-4 h-4 text-green-400/70" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Sustainability</h3>
                  </div>
                  <div className="space-y-2">
                    {(result.sustainability_tips || []).map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-green-500/[0.03] border border-green-500/10 p-3" data-testid={`sustainability-${i}`}>
                        <Leaf className="w-3.5 h-3.5 text-green-400/40 flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] text-white/40 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-codes">
                  <div className="flex items-center gap-2 mb-5">
                    <Scale className="w-4 h-4 text-accent-blue" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Building Codes</h3>
                  </div>
                  <div className="space-y-2">
                    {(result.building_codes || []).map((code, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3" data-testid={`code-${i}`}>
                        <span className="text-[10px] font-mono text-accent-blue/50 bg-accent-blue/10 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">IBC</span>
                        <p className="text-[12px] text-white/40 leading-relaxed">{code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-timeline">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Estimated Timeline</h3>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed" data-testid="text-timeline">{result.estimated_timeline}</p>
                </div>

                <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-risks">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-400/60" />
                    <h3 className="text-sm font-display font-semibold text-white/80">Risk Factors</h3>
                  </div>
                  <div className="space-y-2">
                    {(result.risk_factors || []).map((risk, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-red-500/[0.03] border border-red-500/10 p-3" data-testid={`risk-${i}`}>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400/40 flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] text-white/35 leading-relaxed">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6 sm:p-8" data-testid="section-space">
                <div className="flex items-center gap-2 mb-4">
                  <Maximize2 className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-display font-semibold text-white/80">Space Optimization</h3>
                </div>
                <p className="text-[13px] text-white/45 leading-relaxed" data-testid="text-space">{result.space_optimization}</p>
              </div>

              {/* Download PDF Report */}
              <div className="glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-white/20" />
                    <div>
                      <p className="text-[10px] text-white/25 font-mono">AI Architecture Advisor — Expert System Analysis</p>
                      <p className="text-[9px] text-white/15 mt-0.5">Rule-based expert system with Pakistani construction standards</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-accent-gold/20 transition-all disabled:opacity-40"
                    data-testid="button-download-pdf"
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
