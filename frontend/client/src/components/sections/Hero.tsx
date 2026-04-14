import { useRef, useEffect, useState, Suspense } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import ObjectAssembly from "../three/ObjectAssembly";
import { useAuth } from "@/hooks/use-auth";
import { useMagnetic } from "@/lib/animations";

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
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // 3D canvas moves slower than scroll (parallax)
  const canvasY  = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY    = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="section-hero"
    >
      {/* 3D Holographic Backdrop — parallax */}
      <motion.div
        style={{ y: canvasY }}
        className="absolute inset-0 z-0 pointer-events-auto"
      >
        <Canvas camera={{ position: [0, 0, 18], fov: 60 }} style={{ background: 'transparent' }}>
          <ambientLight intensity={1.5} />
          <Suspense fallback={null}>
             <ObjectAssembly />
          </Suspense>
        </Canvas>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/30 to-obsidian z-[1] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-[120px] z-0 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] z-0 pointer-events-none" />

      {/* Text content — slower parallax */}
      <motion.div
        style={{ y: textY, opacity: bgOpacity }}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 sm:pt-24 pointer-events-none"
      >
        
        {/* We use pointer-events-none on the text container and pointer-events-auto on buttons so the user can hover the 3D background behind the text! */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mb-3 text-xs sm:text-sm font-mono text-white/30 tracking-[0.25em] uppercase"
        >
          ArchitectXpert — AI Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[2.5rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-display font-bold tracking-tight leading-[1.1] mb-6 whitespace-nowrap overflow-hidden"
        >
          <TypewriterSlogan />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="max-w-xl mx-auto text-sm sm:text-base md:text-lg text-white/60 mb-10 leading-relaxed font-normal"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          From floorplan generation to cost estimation — ArchitectXpert brings
          professional-grade AI tools to every architect, developer, and home builder in Pakistan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto"
        >
          <MagneticSpotlightButton />

          <motion.a
            href="#studio"
            whileHover={{ scale: 1.05, color: "rgba(255,255,255,1)" }}
            className="inline-flex items-center gap-2 px-6 py-4 text-sm font-medium text-white/70 transition-colors duration-300"
            data-testid="link-explore"
          >
            Explore Studio
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/40 text-[10px] sm:text-xs font-mono tracking-widest uppercase pointer-events-auto"
        >
          {[
            { dot: "bg-blue-500",    label: "50K+ Designs" },
            { dot: "bg-emerald-500", label: "98% Accuracy" },
            { dot: "bg-yellow-500",  label: "Real-time AI" },
          ].map(({ dot, label }) => (
            <motion.span
              key={label}
              whileHover={{ scale: 1.08, color: "rgba(255,255,255,0.7)" }}
              className="flex items-center gap-2 cursor-default"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function MagneticSpotlightButton() {
  const { x, y, onMouseMove, onMouseLeave } = useMagnetic(0.3);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const angle = Math.atan2(py - rect.height / 2, px - rect.width / 2) * (180 / Math.PI);
      btn.style.setProperty("--spotlight-angle", `${angle + 90}deg`);
    };
    btn.addEventListener("mousemove", handleMouseMove);
    return () => btn.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div style={{ x, y }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <motion.button
        ref={btnRef}
        onClick={() => navigate(user ? "/workspace" : "/auth")}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="spotlight-btn group inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-medium text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]"
        data-testid="button-enter-workspace"
      >
        <span>Enter Workspace</span>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="w-4 h-4" />
        </motion.div>
      </motion.button>
    </motion.div>
  );
}
