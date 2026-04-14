import { useCallback } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

// ── Variants ──────────────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  show:   { opacity: 1, x: 0 },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  show:   { opacity: 1, x: 0 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1 },
};

/** Wrap a list container with this; use fadeUp/fadeLeft etc. on children */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

export const staggerFast: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
};

// ── Transitions ───────────────────────────────────────────────────────────────

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 28,
};

/** Expo-out feel — matches the existing site aesthetic */
export const smoothTransition: Transition = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1],
};

export const fastTransition: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

// ── Viewport defaults ─────────────────────────────────────────────────────────

export const defaultViewport = { once: true, margin: "-60px" } as const;
export const lazyViewport    = { once: true, margin: "-100px" } as const;

// ── 3D Card-Tilt Hook ─────────────────────────────────────────────────────────
/**
 * Returns spring-smoothed rotateX / rotateY motion values and mouse event
 * handlers.  Attach to a `motion.div` with `style={{ rotateX, rotateY,
 * transformPerspective: 1200 }}` and spread `{ onMouseMove, onMouseLeave }`.
 *
 * @param strength  Max tilt in degrees (default 10)
 */
export function use3DTilt(strength = 10) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      rotateX.set(-dy * strength);
      rotateY.set(dx * strength);
    },
    [rotateX, rotateY, strength],
  );

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return {
    rotateX:     springRotateX,
    rotateY:     springRotateY,
    onMouseMove,
    onMouseLeave,
  };
}

// ── Magnetic Button Hook ──────────────────────────────────────────────────────
/**
 * Gives a button a subtle magnetic-pull effect toward the cursor.
 * Apply the returned `x` / `y` to a `motion.div` (or `motion.button`).
 * Wrap with `ref` returned from this hook.
 *
 * @param strength  Fraction of cursor-offset to apply (default 0.35)
 */
export function useMagnetic(strength = 0.35) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((e.clientX - cx) * strength);
      y.set((e.clientY - cy) * strength);
    },
    [x, y, strength],
  );

  const onMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { x: springX, y: springY, onMouseMove, onMouseLeave };
}
