import { motion, AnimatePresence } from "framer-motion";
import { Hexagon } from "lucide-react";

interface PreloaderProps {
  isVisible: boolean;
  text?: string;
}

export default function Preloader({ isVisible, text = "Loading" }: PreloaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-obsidian"
          data-testid="preloader"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            >
              <Hexagon className="w-12 h-12 text-accent-blue" strokeWidth={1} />
            </motion.div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 rounded-full bg-accent-blue/60"
                    animate={{
                      scaleY: [1, 2.5, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <motion.p
                className="text-sm font-display text-white/40 tracking-wider"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                {text}
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
