import { useEffect, useState, createContext, useContext } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

// ── Cursor Mode Types ──────────────────────────────────────────────────────────
export type CursorMode = "default" | "hover" | "text" | "drag" | "view3d";

interface CursorContextValue {
  setMode: (mode: CursorMode) => void;
}

export const CursorContext = createContext<CursorContextValue>({ setMode: () => {} });

export function useCursor() {
  return useContext(CursorContext);
}

// ── Per-mode visual config ─────────────────────────────────────────────────────
const CURSOR_CONFIG: Record<
  CursorMode,
  {
    dotSize:      number;
    dotOpacity:   number;
    dotColor:     string;
    ringSize:     number;
    ringOpacity:  number;
    ringColor:    string;
    label?:       string;
    blendMode:    "normal" | "difference";
  }
> = {
  default: {
    dotSize: 8, dotOpacity: 0.85, dotColor: "#ffffff",
    ringSize: 36, ringOpacity: 0.12, ringColor: "rgba(255,255,255,0.5)",
    blendMode: "difference",
  },
  hover: {
    dotSize: 5, dotOpacity: 0.5, dotColor: "#ffffff",
    ringSize: 54, ringOpacity: 0.16, ringColor: "rgba(255,255,255,0.45)",
    blendMode: "difference",
  },
  text: {
    dotSize: 2, dotOpacity: 0.9, dotColor: "#ffffff",
    ringSize: 22, ringOpacity: 0.18, ringColor: "rgba(255,255,255,0.3)",
    blendMode: "difference",
  },
  drag: {
    dotSize: 10, dotOpacity: 0.75, dotColor: "#63b3ed",
    ringSize: 58, ringOpacity: 0.18, ringColor: "rgba(99,179,237,0.55)",
    label: "Drag",
    blendMode: "normal",
  },
  view3d: {
    dotSize: 6, dotOpacity: 0.8, dotColor: "#fbbf24",
    ringSize: 62, ringOpacity: 0.16, ringColor: "rgba(251,191,36,0.5)",
    label: "View",
    blendMode: "normal",
  },
};

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function CustomCursor() {
  const [mode, setMode]       = useState<CursorMode>("default");
  const [isVisible, setIsVisible] = useState(false);

  // Dot — fast
  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);
  const dotX = useSpring(cursorX, { damping: 22, stiffness: 300 });
  const dotY = useSpring(cursorY, { damping: 22, stiffness: 300 });

  // Ring — slower / more lag
  const ringX = useSpring(cursorX, { damping: 38, stiffness: 140 });
  const ringY = useSpring(cursorY, { damping: 38, stiffness: 140 });

  useEffect(() => {
    if ("ontouchstart" in window) return;

    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Explicit data-cursor-mode attribute on any ancestor or self
      const modeEl = target.closest("[data-cursor-mode]") as HTMLElement | null;
      if (modeEl?.dataset.cursorMode) {
        setMode(modeEl.dataset.cursorMode as CursorMode);
        return;
      }

      // Auto-detect from semantic element
      if (target.closest("button, a, [role='button'], [tabindex]")) {
        setMode("hover");
      } else if (target.closest("input, textarea, [contenteditable]")) {
        setMode("text");
      } else {
        setMode("default");
      }
    };

    const onLeave = () => setMode("default");

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover",  onOver);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover",  onOver);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [cursorX, cursorY, isVisible]);

  if (!isVisible) return null;

  const cfg = CURSOR_CONFIG[mode];

  return (
    <>
      {/* ── Dot (fast) ── */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10001]"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: cfg.blendMode,
        }}
      >
        <motion.div
          animate={{
            width:           cfg.dotSize,
            height:          cfg.dotSize,
            opacity:         cfg.dotOpacity,
            backgroundColor: cfg.dotColor,
          }}
          transition={{ duration: 0.22, ease: EASE }}
          className="rounded-full"
        />
      </motion.div>

      {/* ── Ring (lagging) ── */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000]"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      >
        <motion.div
          animate={{
            width:       cfg.ringSize,
            height:      cfg.ringSize,
            opacity:     cfg.ringOpacity,
            borderColor: cfg.ringColor,
          }}
          transition={{ duration: 0.35, ease: EASE }}
          className="rounded-full border relative flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {cfg.label && (
              <motion.span
                key={cfg.label}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="absolute text-[8px] font-mono uppercase tracking-widest"
                style={{ color: cfg.dotColor, opacity: 0.8 }}
              >
                {cfg.label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
