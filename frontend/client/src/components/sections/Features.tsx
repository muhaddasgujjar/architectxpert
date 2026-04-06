import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Brain,
  Layers,
  Zap,
  Ruler,
  Palette,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Floor Planning",
    description: "Generate optimal floor plans from natural language descriptions. Our AI understands spatial relationships and room adjacencies.",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-400",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Layers,
    title: "Multi-Story Design",
    description: "Seamlessly design connected multi-level structures with intelligent staircase and elevator placement.",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-400",
    span: "col-span-1",
  },
  {
    icon: Zap,
    title: "Real-time Rendering",
    description: "Watch your designs come to life instantly with GPU-accelerated 3D visualization.",
    color: "from-amber-500/20 to-amber-600/5",
    iconColor: "text-amber-400",
    span: "col-span-1",
  },
  {
    icon: Ruler,
    title: "Building Code Compliance",
    description: "Automatic validation against local building codes, ADA requirements, and fire safety regulations.",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Palette,
    title: "Material Library",
    description: "Access thousands of materials, textures, and finishes to bring your designs to photorealistic quality.",
    color: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-rose-400",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Share2,
    title: "Collaboration",
    description: "Share designs with clients and team members. Real-time co-editing with version control.",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    span: "col-span-1",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: typeof features[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [30 + index * 10, -20 - index * 5]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`${feature.span} group relative`}
    >
      <div className="glass-panel rounded-2xl p-6 sm:p-8 h-full relative overflow-hidden transition-all duration-500 hover:border-amber-400/20">
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-5 group-hover:shadow-gold-glow transition-shadow duration-500">
            <feature.icon className={`w-5 h-5 ${feature.iconColor} group-hover:text-gold transition-colors duration-500`} />
          </div>

          <h3 className="text-lg font-display font-semibold text-white mb-3 group-hover:text-gold transition-colors duration-500">
            {feature.title}
          </h3>

          <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-500">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Features() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-features"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6"
          >
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">
              Capabilities
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold gradient-text mb-4"
          >
            Everything you need to design
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/30 max-w-lg mx-auto text-base"
          >
            From concept to construction-ready blueprints, powered by cutting-edge artificial intelligence.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
