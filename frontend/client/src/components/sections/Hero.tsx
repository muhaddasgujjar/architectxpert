import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import ParticleField from "../three/ParticleField";
import { useAuth } from "@/hooks/use-auth";

const PHRASES = ["Design Smarter.", "Build Faster.", "Architect Better."];
const TYPE_SPEED = 70;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1800;
const PAUSE_AFTER_DELETE = 400;

function TypewriterSlogan() {
  const [displayed, setDisplayed] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startDelay = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (!started) return;

    const current = PHRASES[phraseIndex];

    if (!isDeleting && displayed === current) {
      const t = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(t);
    }

    if (isDeleting && displayed === "") {
      const t = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % PHRASES.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(t);
    }

    const speed = isDeleting ? DELETE_SPEED : TYPE_SPEED;
    const t = setTimeout(() => {
      setDisplayed(isDeleting ? current.slice(0, displayed.length - 1) : current.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [displayed, isDeleting, phraseIndex, started]);

  const isBlue = PHRASES[phraseIndex] === "Architect Better.";

  return (
    <span
      className={`inline-block ${isBlue ? "gradient-text-blue" : "gradient-text"} transition-all duration-300`}
      style={{ minHeight: "1.2em" }}
    >
      {displayed}
      <span
        className="inline-block w-[3px] ml-1 align-middle rounded-sm animate-pulse"
        style={{
          height: "0.85em",
          background: isBlue ? "#3b82f6" : "rgba(255,255,255,0.7)",
          verticalAlign: "middle",
          position: "relative",
          top: "-0.05em",
        }}
      />
    </span>
  );
}

function SpotlightButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI);
      btn.style.setProperty("--spotlight-angle", `${angle + 90}deg`);
    };
    btn.addEventListener("mousemove", handleMouseMove);
    return () => btn.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={() => navigate(user ? "/workspace" : "/auth")}
      className={`spotlight-btn rounded-full ${className}`}
      data-testid="button-enter-workspace"
    >
      {children}
    </button>
  );
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="section-hero"
    >
      <ParticleField />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-obsidian z-[1]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/5 rounded-full blur-[120px] z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px] z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 sm:pt-24">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mb-3 text-xs sm:text-sm font-mono text-white/25 tracking-[0.25em] uppercase"
        >
          ArchitectXpert — AI Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[2rem] sm:text-[2.8rem] md:text-[3.8rem] lg:text-[4.8rem] font-display font-bold tracking-tight leading-[1.15] mb-6 sm:mb-8 whitespace-nowrap overflow-hidden"
        >
          <TypewriterSlogan />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="max-w-lg mx-auto text-sm sm:text-base md:text-lg text-white/40 mb-10 sm:mb-12 leading-relaxed font-light"
        >
          From floorplan generation to cost estimation — ArchitectXpert brings
          professional-grade AI tools to every architect, developer, and home builder in Pakistan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <SpotlightButton className="group inline-flex items-center gap-3 px-8 py-4 text-base font-medium text-white">
            <span>Enter Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </SpotlightButton>

          <motion.a
            href="#studio"
            className="inline-flex items-center gap-2 px-6 py-4 text-sm font-medium text-white/50 hover:text-white/80 transition-colors duration-300"
            data-testid="link-explore"
          >
            Explore Studio
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white/20 text-[10px] sm:text-xs font-mono tracking-widest uppercase"
        >
          <span>50K+ Designs</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>98% Accuracy</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>Real-time AI</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-1 h-2 bg-white/40 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
