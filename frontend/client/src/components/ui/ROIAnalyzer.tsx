import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Map, Loader2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ROIFeatures {
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  city: string;
  property_type?: string;
  purpose?: string;
  house_age?: number;
}

interface MarketResult {
  predictedMarketValue: number;
  marketValueLow: number;
  marketValueHigh: number;
  pricePerSqft: number;
  modelInfo: {
    model: string;
    features: number;
    areaMarla: number;
    areaCategory: string;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `PKR ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000)    return `PKR ${(amount / 100_000).toFixed(2)} Lac`;
  return `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface ROIAnalyzerProps {
  /** Construction cost from the Neural Network prediction (PKR) */
  constructionCost: number;
  /** Property features forwarded to the market-value endpoint */
  features: ROIFeatures;
}

export default function ROIAnalyzer({ constructionCost, features }: ROIAnalyzerProps) {
  const [market, setMarket]   = useState<MarketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Fetch market value whenever constructionCost or features change
  useEffect(() => {
    if (!constructionCost || !features.area_sqft) return;

    let cancelled = false;
    setLoading(true);
    setMarket(null);
    setError(null);

    fetch("/api/tools/predict-market-value", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        area_sqft:     features.area_sqft,
        bedrooms:      features.bedrooms,
        bathrooms:     features.bathrooms,
        floors:        features.floors,
        city:          features.city,
        property_type: features.property_type ?? "house",
        purpose:       features.purpose       ?? "for sale",
        house_age:     features.house_age     ?? 0,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MarketResult) => {
        if (!cancelled) setMarket(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [constructionCost, features.area_sqft, features.bedrooms, features.bathrooms,
      features.floors, features.city, features.property_type, features.purpose, features.house_age]);

  // ── Derived ROI values ─────────────────────────────────────────────────────
  const marketValue  = market?.predictedMarketValue ?? 0;
  const profit       = marketValue - constructionCost;
  const roiPct       = constructionCost > 0 ? (profit / constructionCost) * 100 : 0;
  const isPositive   = profit >= 0;
  const hasResult    = !!market && constructionCost > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Row: Market Value card + ROI card ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Market Value Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-panel rounded-2xl p-6 h-full border border-emerald-500/10">
            <h2 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Zameen Market Valuation
              <span className="ml-auto text-[9px] font-mono text-white/20 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
                Random Forest · Zameen.com
              </span>
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-44">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-3 animate-spin" />
                  <p className="text-xs text-white/30">Querying market model…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-44">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 text-white/8 mx-auto mb-3" />
                  <p className="text-xs text-white/25">Market model unavailable</p>
                  <p className="text-[10px] text-white/15 mt-1">Ensure Python + joblib/scikit-learn are installed</p>
                </div>
              </div>
            ) : market ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Main value */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-emerald-400/50 font-mono uppercase mb-1">Predicted Market Value</p>
                  <p className="text-2xl font-display font-bold text-emerald-400">
                    {formatPKR(market.predictedMarketValue)}
                  </p>
                  <p className="text-[10px] text-white/20 mt-1">
                    PKR {market.pricePerSqft.toLocaleString()}/sq ft
                  </p>
                </div>

                {/* Confidence range */}
                <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[9px] text-white/25 font-mono uppercase mb-1.5">Confidence Range (±10%)</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-white/40">{formatPKR(market.marketValueLow)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500/30 via-emerald-400 to-emerald-500/30 rounded-full" />
                    </div>
                    <span className="text-[11px] font-mono text-white/40">{formatPKR(market.marketValueHigh)}</span>
                  </div>
                </div>

                {/* Meta stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Area",     value: `${market.modelInfo.areaMarla} Marla` },
                    { label: "Category", value: market.modelInfo.areaCategory },
                    { label: "Features", value: String(market.modelInfo.features) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04]">
                      <p className="text-[9px] text-white/25 mb-0.5">{label}</p>
                      <p className="text-[11px] font-display font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-white/15 leading-relaxed">
                  * Trained on Zameen.com listings. Actual sale price may vary by negotiation and property condition.
                </p>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-44">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 text-white/8 mx-auto mb-3" />
                  <p className="text-xs text-white/25">Market valuation ready</p>
                  <p className="text-[10px] text-white/15 mt-1">Select city and click Calculate</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ROI Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="glass-panel rounded-2xl p-6 h-full border border-yellow-500/10">
            <h2 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              Return on Investment (ROI)
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-44">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-yellow-400/40 mx-auto mb-3 animate-spin" />
                  <p className="text-xs text-white/30">Calculating ROI…</p>
                </div>
              </div>
            ) : hasResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                {/* Main profit/loss hero */}
                <div className={`rounded-xl p-5 text-center border ${
                  isPositive
                    ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                    : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
                }`}>
                  <p
                    className="text-[10px] font-mono uppercase mb-1"
                    style={{ color: isPositive ? "rgba(52,211,153,0.55)" : "rgba(248,113,113,0.55)" }}
                  >
                    Estimated Profit / Loss
                  </p>
                  <p className={`text-3xl font-display font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{formatPKR(profit)}
                  </p>
                  <p
                    className="text-[11px] mt-1.5 font-mono font-semibold"
                    style={{ color: isPositive ? "rgba(52,211,153,0.65)" : "rgba(248,113,113,0.65)" }}
                  >
                    ROI: {isPositive ? "+" : ""}{roiPct.toFixed(1)}%
                  </p>
                </div>

                {/* Breakdown rows */}
                <div className="space-y-0">
                  {[
                    { label: "Construction Cost (Neural Net)", value: constructionCost, color: "text-blue-400" },
                    { label: "Market Value (Zameen RF)",        value: marketValue,      color: "text-emerald-400" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2.5 border-b border-white/[0.04]"
                    >
                      <span className="text-[11px] text-white/40">{row.label}</span>
                      <span className={`text-[12px] font-mono font-semibold ${row.color}`}>
                        {formatPKR(row.value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2.5">
                    <span className="text-[11px] text-white/50 font-semibold">Net Difference</span>
                    <span className={`text-[13px] font-mono font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{formatPKR(profit)}
                    </span>
                  </div>
                </div>

                {/* Visual ROI progress bar */}
                <div>
                  <p className="text-[9px] text-white/25 font-mono uppercase mb-1.5">
                    Market Value vs. Build Cost
                  </p>
                  <div className="relative h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isPositive ? "bg-emerald-400/70" : "bg-red-400/70"
                      }`}
                      style={{ width: `${Math.min(100, Math.abs(roiPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-white/20">0%</span>
                    <span className="text-[9px] text-white/20">100%+</span>
                  </div>
                </div>

                <p className="text-[9px] text-white/15 leading-relaxed">
                  * ROI is indicative. Actual returns depend on location, finishing, and market timing.
                </p>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-44">
                <div className="text-center">
                  <DollarSign className="w-10 h-10 text-white/8 mx-auto mb-3" />
                  <p className="text-xs text-white/25">ROI will appear here</p>
                  <p className="text-[10px] text-white/15 mt-1">
                    Fill in details and click Calculate
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Interactive Zameen Market Map ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
            <Map className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-display font-semibold text-white">
              Pakistan Property Market Map
            </h2>
            <span className="ml-auto text-[9px] font-mono text-white/20 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
              Zameen.com · Folium · Interactive
            </span>
          </div>
          <div className="relative w-full" style={{ height: "520px" }}>
            <iframe
              src="/maps/house_price_map.html"
              title="Pakistan Property Market Map"
              className="absolute inset-0 w-full h-full border-none rounded-xl"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </motion.div>

    </div>
  );
}
