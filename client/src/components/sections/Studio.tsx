import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Play, Monitor, Cpu, Globe } from "lucide-react";
import floorplanImage from "@assets/floorplan_showcase.png";

export default function Studio() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section
      id="studio"
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-studio"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6"
            >
              <Monitor className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">
                Studio Preview
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6"
            >
              <span className="gradient-text">Design in a</span>
              <br />
              <span className="gradient-text-blue">new dimension.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/40 text-base leading-relaxed mb-8"
            >
              Our workspace combines the precision of CAD software with the
              intelligence of AI. Describe your vision, and watch it materialize
              in real-time 3D.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col gap-4"
            >
              {[
                { icon: Cpu, label: "Neural Architecture Engine", desc: "Processes 10,000 design iterations per second" },
                { icon: Globe, label: "Cloud-Native Platform", desc: "Access your projects from any device, anywhere" },
                { icon: Play, label: "One-Click Export", desc: "Export to AutoCAD, Revit, SketchUp, and more" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center flex-shrink-0 group-hover:shadow-proximity-glow transition-shadow duration-500">
                    <item.icon className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-0.5">{item.label}</h4>
                    <p className="text-xs text-white/30">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            style={{ scale, opacity }}
            className="relative"
          >
            <div className="glass-panel-strong rounded-2xl p-1 relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-accent-blue/20 via-transparent to-gold/10 opacity-60" />

              <div className="relative rounded-xl overflow-hidden bg-obsidian aspect-[4/3]">
                <img
                  src={floorplanImage}
                  alt="AI-generated architectural floor plan showcasing a modern luxury home layout"
                  className="w-full h-full object-cover"
                  data-testid="img-studio-floorplan"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-obsidian/20 pointer-events-none" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="glass-panel rounded-lg px-3 py-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-white/40">AI generating... 2,847 sq ft</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-blue/10 rounded-full blur-[60px]" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gold/5 rounded-full blur-[80px]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
