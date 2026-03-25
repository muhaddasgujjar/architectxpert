import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "ArchitectXpert reduced our design iteration time from weeks to hours. The AI understands spatial flow better than most junior architects.",
    name: "Sarah Chen",
    role: "Principal Architect, Skyline Studios",
    initials: "SC",
  },
  {
    quote: "The building code validation alone has saved us from countless costly revisions. This is the future of architectural design.",
    name: "Marcus Rivera",
    role: "Director of Design, BuildCorp",
    initials: "MR",
  },
  {
    quote: "We've integrated ArchitectXpert into our workflow for residential projects. Clients love seeing AI-generated options in real-time.",
    name: "Yuki Tanaka",
    role: "Lead Designer, NeoSpace Architecture",
    initials: "YT",
  },
];

export default function Testimonials() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-testimonials"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-display font-bold gradient-text mb-4"
          >
            Trusted by industry leaders
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="glass-panel rounded-2xl p-6 sm:p-8 group hover:border-gold/20 transition-all duration-500"
              data-testid={`card-testimonial-${i}`}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-gold/60 text-gold/60" />
                ))}
              </div>

              <p className="text-sm text-white/50 leading-relaxed mb-6 group-hover:text-white/70 transition-colors duration-500">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue/30 to-gold/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-white/70">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">{t.name}</p>
                  <p className="text-[11px] text-white/25">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
