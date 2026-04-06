import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Linkedin, Github, Globe, Mail } from "lucide-react";
import Newsletter from "./Newsletter";

const team = [
  {
    name: "Muhammad Muhaddas",
    role: "Founder & Lead Developer",
    initials: "MM",
    bio: "Full-stack engineer with deep expertise in AI systems and architectural software. Passionate about bridging the gap between technology and design.",
    links: { linkedin: "#", github: "#" },
    gradient: "from-accent-blue/40 to-blue-600/20",
    borderGlow: "group-hover:border-accent-blue/40 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]",
  },
  {
    name: "Huzaifa Tehseen",
    role: "Co-Founder & Design Lead",
    initials: "HT",
    bio: "Creative technologist blending architectural principles with modern UI/UX. Focused on making complex design tools feel intuitive and accessible.",
    links: { linkedin: "#", github: "#" },
    gradient: "from-gold/40 to-amber-600/20",
    borderGlow: "group-hover:border-gold/40 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.1)]",
  },
];

export default function CTA() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-cta"
    >
      <div className="max-w-5xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/3 rounded-full blur-[180px]" />

        <div className="relative text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/40 uppercase tracking-widest mb-6">
              The People Behind the Platform
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              <span className="gradient-text">Meet Our</span>{" "}
              <span className="gradient-text-blue">Team</span>
            </h2>
            <p className="text-white/30 max-w-lg mx-auto text-base leading-relaxed">
              A dedicated team of engineers and designers committed to transforming how the world approaches architectural design.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
              className={`glass-panel rounded-2xl p-8 sm:p-10 group transition-all duration-700 ${member.borderGlow}`}
              data-testid={`team-card-${i}`}
            >
              <div className="flex items-start gap-5 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center border border-white/[0.08] flex-shrink-0 group-hover:scale-105 transition-transform duration-500`}>
                  <span className="text-xl font-display font-bold text-white/90">{member.initials}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-display font-bold text-white/90 mb-1">{member.name}</h3>
                  <p className="text-[12px] font-mono text-accent-blue/70 uppercase tracking-wider">{member.role}</p>
                </div>
              </div>

              <p className="text-sm text-white/35 leading-relaxed mb-6 group-hover:text-white/50 transition-colors duration-500">
                {member.bio}
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
                <a
                  href={member.links.linkedin}
                  className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-accent-blue hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all duration-300"
                  aria-label={`${member.name} LinkedIn`}
                  data-testid={`link-team-linkedin-${i}`}
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a
                  href={member.links.github}
                  className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300"
                  aria-label={`${member.name} GitHub`}
                  data-testid={`link-team-github-${i}`}
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <Newsletter />
        </motion.div>
      </div>
    </section>
  );
}
