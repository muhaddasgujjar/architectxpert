import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FileText, Cpu, Download, ArrowRight, CheckCircle2, Loader2, MessageSquare, ChevronRight,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    color: "blue" as const,
    badge: "Input",
    title: "Describe Your Project",
    description:
      "Type your requirements in plain language — room count, layout style, location, and budget. No technical knowledge needed.",
    bullets: ["Natural language input", "Upload existing floor plans", "Choose building type & location"],
    demo: "chat",
  },
  {
    number: "02",
    icon: Cpu,
    color: "gold" as const,
    badge: "Processing",
    title: "AI Analyzes & Generates",
    description:
      "Our trained models analyze thousands of real blueprints, estimate costs in PKR, and generate detailed architectural insights.",
    bullets: ["GPT-4o Vision analysis", "ML cost prediction", "K-Means layout clustering"],
    demo: "process",
  },
  {
    number: "03",
    icon: Download,
    color: "green" as const,
    badge: "Results",
    title: "Download & Build",
    description:
      "Get your professional PDF report, cost breakdown, and design recommendations — ready to share with contractors or architects.",
    bullets: ["2-page professional PDF", "PKR cost estimate", "AI recommendations"],
    demo: "result",
  },
];

const colorMap = {
  blue: {
    badge: "bg-accent-blue/10 border-accent-blue/20 text-accent-blue",
    icon: "bg-accent-blue/15 border-accent-blue/25 text-accent-blue shadow-[0_0_20px_rgba(59,130,246,0.12)]",
    num: "text-accent-blue/20",
    glow: "bg-accent-blue/[0.04]",
    active: "border-accent-blue/25 shadow-[0_0_40px_rgba(59,130,246,0.07)]",
    bullet: "bg-accent-blue/60",
    arrow: "text-accent-blue/25",
  },
  gold: {
    badge: "bg-gold/10 border-gold/20 text-gold",
    icon: "bg-gold/15 border-gold/25 text-gold shadow-[0_0_20px_rgba(251,191,36,0.12)]",
    num: "text-gold/20",
    glow: "bg-gold/[0.03]",
    active: "border-gold/25 shadow-[0_0_40px_rgba(251,191,36,0.07)]",
    bullet: "bg-gold/60",
    arrow: "text-gold/25",
  },
  green: {
    badge: "bg-green-400/10 border-green-400/20 text-green-400",
    icon: "bg-green-400/15 border-green-400/25 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.12)]",
    num: "text-green-400/20",
    glow: "bg-green-400/[0.03]",
    active: "border-green-400/25 shadow-[0_0_40px_rgba(74,222,128,0.07)]",
    bullet: "bg-green-400/60",
    arrow: "",
  },
};

function ChatDemoCard() {
  const [typed, setTyped] = useState("");
  const [showReply, setShowReply] = useState(false);
  const text = "3-bedroom house, Lahore, with garage";
  useEffect(() => {
    let i = 0;
    setTyped(""); setShowReply(false);
    const t = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setTimeout(() => setShowReply(true), 800); }
    }, 45);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <div className="bg-accent-blue/15 border border-accent-blue/25 rounded-2xl rounded-tr-sm px-3.5 py-2 text-[11px] text-white/70 max-w-[85%]">
          {typed}<span className="opacity-60 animate-pulse">|</span>
        </div>
      </div>
      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm px-3.5 py-2 text-[11px] text-white/50 max-w-[85%]">
              Generating your floor plan analysis in Lahore market rates...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-3 flex gap-1.5 flex-wrap">
        {["Residential", "Commercial", "Industrial"].map((t, i) => (
          <span key={i} className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${i === 0 ? "border-accent-blue/40 text-accent-blue/70 bg-accent-blue/10" : "border-white/[0.07] text-white/20"}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function ProcessDemoCard() {
  const items = [
    "Validating floor plan image",
    "Analyzing room layout",
    "Calculating PKR cost estimate",
    "Generating recommendations",
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    setDone(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDone(i);
      if (i >= items.length) clearInterval(t);
    }, 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-2">
      {items.map((label, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {done > i ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400/80" />
            ) : done === i ? (
              <Loader2 className="w-3.5 h-3.5 text-gold/70 animate-spin" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-white/10" />
            )}
          </div>
          <div className="flex-1 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              animate={{ width: done > i ? "100%" : done === i ? "60%" : "0%" }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${done > i ? "bg-green-400/60" : "bg-gold/50"}`}
            />
          </div>
          <span className={`text-[10px] font-mono flex-shrink-0 w-8 text-right ${done > i ? "text-green-400/60" : done === i ? "text-gold/60" : "text-white/15"}`}>
            {done > i ? "Done" : done === i ? "..." : "—"}
          </span>
        </div>
      ))}
      {done >= items.length && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-[10px] font-mono text-green-400/60 text-center pt-1"
        >
          ✓ Analysis complete in 4.2s
        </motion.div>
      )}
    </div>
  );
}

function ResultDemoCard() {
  const stats = [
    { label: "Total Area", value: "2,400 sq ft" },
    { label: "Est. Cost", value: "PKR 84L" },
    { label: "Rooms", value: "7" },
    { label: "Score", value: "87/100" },
  ];
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.12 }}
            className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center"
          >
            <div className="text-sm font-bold gradient-text-blue font-display">{s.value}</div>
            <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full mt-1 py-2 rounded-xl border border-green-500/25 bg-green-500/10 text-[11px] font-mono text-green-400/70 flex items-center justify-center gap-2"
      >
        <Download className="w-3 h-3" />
        Download PDF Report
      </motion.button>
    </div>
  );
}

function StepCard({ step, index, isActive, isInView, demoKey, onClick }: {
  step: typeof steps[0];
  index: number;
  isActive: boolean;
  isInView: boolean;
  demoKey: number;
  onClick: () => void;
}) {
  const c = colorMap[step.color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.3 + index * 0.15 }}
      onClick={onClick}
      className={`relative rounded-2xl p-6 cursor-pointer border transition-all duration-500 ${
        isActive
          ? `bg-white/[0.04] ${c.active}`
          : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.08]"
      }`}
      data-testid={`step-card-${index}`}
    >
      {isActive && (
        <div className={`absolute inset-0 rounded-2xl ${c.glow} pointer-events-none`} />
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-500 ${
            isActive ? c.icon : "bg-white/[0.03] border-white/[0.06] text-white/20"
          }`}>
            <step.icon className="w-5 h-5" />
          </div>
          <span className={`text-5xl font-display font-black leading-none transition-colors duration-500 ${
            isActive ? c.num : "text-white/[0.06]"
          }`}>
            {step.number}
          </span>
        </div>

        <span className={`inline-flex text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border mb-3 ${
          isActive ? c.badge : "bg-white/[0.02] border-white/[0.04] text-white/15"
        }`}>
          {step.badge}
        </span>

        <h3 className={`text-base sm:text-lg font-display font-bold mb-2 transition-colors duration-500 ${
          isActive ? "text-white" : "text-white/60"
        }`}>
          {step.title}
        </h3>
        <p className={`text-[12px] sm:text-[13px] leading-relaxed mb-4 transition-colors duration-500 ${
          isActive ? "text-white/45" : "text-white/20"
        }`}>
          {step.description}
        </p>

        <div className="space-y-1.5 mb-5">
          {step.bullets.map((b, j) => (
            <div key={j} className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full flex-shrink-0 transition-colors duration-500 ${
                isActive ? c.bullet : "bg-white/10"
              }`} />
              <span className={`text-[11px] font-mono transition-colors duration-500 ${
                isActive ? "text-white/40" : "text-white/15"
              }`}>{b}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isActive && (
            <motion.div
              key={`demo-${demoKey}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              {step.demo === "chat" && <ChatDemoCard />}
              {step.demo === "process" && <ProcessDemoCard />}
              {step.demo === "result" && <ResultDemoCard />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const [activeStep, setActiveStep] = useState(0);
  const [demoKey, setDemoKey] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveStep((p) => (p + 1) % 3);
      setDemoKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [isInView]);

  const handleClick = (i: number) => {
    setActiveStep(i);
    setDemoKey((k) => k + 1);
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      data-testid="section-how-it-works"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian via-transparent to-obsidian pointer-events-none z-[1]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent-blue/[0.025] rounded-full blur-[160px] z-0" />

      <div className="relative z-10 max-w-6xl mx-auto">

        <div className="text-center mb-16 sm:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[11px] font-mono text-accent-blue uppercase tracking-widest mb-6"
          >
            <FileText className="w-3 h-3" />
            How It Works
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-5 leading-tight"
          >
            <span className="gradient-text">From Idea to Blueprint</span>
            <br />
            <span className="gradient-text-blue">in Three Steps</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-white/35 max-w-md mx-auto leading-relaxed"
          >
            No architecture degree needed. Describe your vision, let AI do the work, and download your professional results.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_48px_1fr_48px_1fr] gap-4 lg:gap-0 mb-14 items-start">
          <StepCard step={steps[0]} index={0} isActive={activeStep === 0} isInView={isInView} demoKey={demoKey} onClick={() => handleClick(0)} />

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="hidden lg:flex items-start justify-center pt-7 text-accent-blue/30"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.div>

          <StepCard step={steps[1]} index={1} isActive={activeStep === 1} isInView={isInView} demoKey={demoKey} onClick={() => handleClick(1)} />

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="hidden lg:flex items-start justify-center pt-7 text-gold/30"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.div>

          <StepCard step={steps[2]} index={2} isActive={activeStep === 2} isInView={isInView} demoKey={demoKey} onClick={() => handleClick(2)} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <div className="flex gap-2 items-center">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`rounded-full transition-all duration-300 ${
                  activeStep === i
                    ? i === 0 ? "w-6 h-2 bg-accent-blue"
                    : i === 1 ? "w-6 h-2 bg-gold"
                    : "w-6 h-2 bg-green-400"
                    : "w-2 h-2 bg-white/15"
                }`}
                data-testid={`dot-step-${i}`}
              />
            ))}
          </div>

          <a
            href="/workspace"
            className="group inline-flex items-center gap-3 bg-accent-blue text-white px-7 py-3.5 rounded-full text-sm font-medium hover:bg-accent-blue/90 transition-all duration-300"
            data-testid="button-try-now"
          >
            <span>Start Your First Project</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
