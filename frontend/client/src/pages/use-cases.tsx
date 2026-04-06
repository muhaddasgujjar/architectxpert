import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Building2, Home as HomeIcon, Landmark, Store, GraduationCap, Hospital, ArrowLeft } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import PageParticles from "@/components/ui/PageParticles";
import Footer from "@/components/sections/Footer";
import { useAuth } from "@/hooks/use-auth";

const useCases = [
  {
    icon: HomeIcon,
    title: "Residential Design",
    subtitle: "Homes, apartments & villas",
    description: "Generate optimized floorplans for single-family homes, multi-unit apartments, and luxury villas. Our AI considers natural light flow, room adjacency preferences, and local building codes to produce layouts that feel natural and livable.",
    features: ["Smart room adjacency", "Natural light optimization", "Code-compliant layouts", "Multi-story support"],
    color: "blue",
  },
  {
    icon: Building2,
    title: "Commercial Spaces",
    subtitle: "Offices, coworking & retail",
    description: "Design productive workspaces with AI-driven open floor plans, private offices, meeting rooms, and collaborative zones. Optimize foot traffic patterns and ensure accessibility compliance across every square meter.",
    features: ["Traffic flow analysis", "ADA compliance", "Flexible zoning", "Scalable layouts"],
    color: "gold",
  },
  {
    icon: Landmark,
    title: "Institutional Buildings",
    subtitle: "Government, civic & cultural",
    description: "Plan complex institutional facilities including courthouses, libraries, museums, and community centers. Handle multi-wing layouts, public vs. restricted zones, and high-capacity gathering spaces with precision.",
    features: ["Security zoning", "Public flow paths", "Multi-wing planning", "Acoustic design"],
    color: "blue",
  },
  {
    icon: Hospital,
    title: "Healthcare Facilities",
    subtitle: "Clinics, hospitals & labs",
    description: "Create efficient healthcare environments that prioritize patient flow, sterile zones, and emergency access. From small clinics to large hospital wings, our AI understands medical spatial requirements.",
    features: ["Patient flow optimization", "Sterile zone planning", "Emergency routes", "Equipment placement"],
    color: "gold",
  },
  {
    icon: GraduationCap,
    title: "Educational Campuses",
    subtitle: "Schools, universities & training centers",
    description: "Design learning environments that foster collaboration and focus. Generate classroom layouts, lecture halls, labs, and common areas that adapt to modern pedagogical approaches.",
    features: ["Classroom optimization", "Lab configurations", "Common area design", "Accessibility paths"],
    color: "blue",
  },
  {
    icon: Store,
    title: "Hospitality & Retail",
    subtitle: "Hotels, restaurants & shops",
    description: "Maximize guest experience and revenue per square foot with AI-generated layouts for hotels, restaurants, and retail spaces. Optimize check-in flows, dining configurations, and product display areas.",
    features: ["Revenue optimization", "Guest flow design", "Kitchen layout planning", "Display mapping"],
    color: "gold",
  },
];

function UseCaseCard({ useCase, index }: { useCase: typeof useCases[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const isGold = useCase.color === "gold";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass-panel rounded-2xl overflow-hidden group hover:border-white/[0.12] transition-all duration-500"
      data-testid={`card-usecase-${index}`}
    >
      <div className="p-8 sm:p-10">
        <div className="flex items-start gap-5 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all duration-500 ${
            isGold
              ? "bg-gradient-to-br from-gold/20 to-gold/5 border-gold/15 group-hover:from-gold/30 group-hover:border-gold/25"
              : "bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 border-accent-blue/15 group-hover:from-accent-blue/30 group-hover:border-accent-blue/25"
          }`}>
            <useCase.icon className={`w-6 h-6 ${isGold ? "text-gold" : "text-accent-blue"}`} />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-white/90 mb-1">{useCase.title}</h3>
            <p className="text-[12px] text-white/30 font-mono uppercase tracking-wider">{useCase.subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-white/45 leading-relaxed mb-6 group-hover:text-white/60 transition-colors duration-500">
          {useCase.description}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {useCase.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-[12px] text-white/35">
              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${isGold ? "bg-gold/50" : "bg-accent-blue/50"}`} />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <a
          href="/workspace"
          className={`inline-flex items-center gap-2 text-[13px] font-medium transition-colors duration-300 ${
            isGold ? "text-gold/60 hover:text-gold" : "text-accent-blue/60 hover:text-accent-blue"
          }`}
          data-testid={`link-usecase-try-${index}`}
        >
          Try it now <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

export default function UseCasesPage() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <Navbar />
      <PageParticles count={250} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.a
          href="/"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
          data-testid="link-usecases-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </motion.a>

        <div ref={sectionRef} className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[11px] font-mono text-accent-blue uppercase tracking-widest mb-6"
          >
            Use Cases
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold gradient-text mb-6"
          >
            Built for Every Space
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed"
          >
            From residential homes to complex healthcare facilities, ArchitectXpert adapts to your project's unique requirements with industry-leading AI precision.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {useCases.map((uc, i) => (
            <UseCaseCard key={uc.title} useCase={uc} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glass-panel-strong rounded-2xl p-10 sm:p-14 text-center"
          data-testid="section-usecases-cta"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold gradient-text mb-4">
            Ready to transform your workflow?
          </h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto mb-8 leading-relaxed">
            Join thousands of architects and designers who are already using ArchitectXpert to deliver better projects, faster.
          </p>
          <a
            href={user ? "/workspace" : "/auth"}
            className="spotlight-btn inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white"
            data-testid="link-usecases-cta"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
