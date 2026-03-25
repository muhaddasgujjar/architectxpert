import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Target, Users, Lightbulb, Globe } from "lucide-react";

const stats = [
  { value: "10K+", label: "Floorplans Generated" },
  { value: "2,500+", label: "Architects & Designers" },
  { value: "98%", label: "Accuracy Rate" },
  { value: "45+", label: "Countries Served" },
];

const values = [
  {
    icon: Target,
    title: "Precision First",
    description: "Every floorplan we generate meets real-world architectural standards and building codes.",
  },
  {
    icon: Lightbulb,
    title: "Innovation Driven",
    description: "We push the boundaries of what AI can do for spatial design and architectural planning.",
  },
  {
    icon: Users,
    title: "Architect-Centered",
    description: "Built by architects, for architects. Our tools enhance your creativity, not replace it.",
  },
];

export default function AboutUs() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-about"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[11px] font-mono text-accent-blue uppercase tracking-widest mb-6">
                <Globe className="w-3 h-3" />
                About Us
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold gradient-text mb-6 leading-tight">
                Redefining Architecture with AI
              </h2>
              <p className="text-base text-white/50 leading-relaxed mb-4">
                ArchitectXpert was born from a simple idea: what if architects could generate, validate, and iterate on floorplans in minutes instead of weeks?
              </p>
              <p className="text-sm text-white/35 leading-relaxed">
                We combine cutting-edge artificial intelligence with deep architectural knowledge to create tools that empower designers to do their best work. Our platform handles the technical complexity so you can focus on what matters most — creating spaces where people thrive.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center group hover:border-accent-blue/20 transition-all duration-500"
                data-testid={`stat-${i}`}
              >
                <span className="text-2xl sm:text-3xl font-display font-bold gradient-text-blue mb-1">{stat.value}</span>
                <span className="text-[11px] text-white/30 uppercase tracking-wider font-mono">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-display font-bold text-white/90 mb-2">Our Values</h3>
            <p className="text-sm text-white/35">The principles that guide everything we build</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {values.map((val, i) => (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="glass-panel rounded-2xl p-6 sm:p-8 group hover:border-gold/20 transition-all duration-500"
                data-testid={`value-card-${i}`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 flex items-center justify-center border border-accent-blue/15 mb-4 group-hover:from-accent-blue/30 group-hover:border-accent-blue/25 transition-all duration-500">
                  <val.icon className="w-5 h-5 text-accent-blue" />
                </div>
                <h4 className="text-sm font-display font-semibold text-white/85 mb-2">{val.title}</h4>
                <p className="text-[13px] text-white/40 leading-relaxed group-hover:text-white/55 transition-colors duration-500">{val.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
