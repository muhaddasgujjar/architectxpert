import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for exploring AI architecture",
    features: [
      "5 floor plan generations per month",
      "Basic 2D export",
      "Community support",
      "Standard templates",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "PKR 12,999",
    period: "/mo",
    description: "For architects and designers",
    features: [
      "Unlimited generations",
      "3D visualization & walkthrough",
      "AutoCAD & Revit export",
      "Building code validation",
      "Priority support",
      "Custom material library",
    ],
    cta: "Start Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For firms and organizations",
    features: [
      "Everything in Professional",
      "Team collaboration tools",
      "API access",
      "Custom AI training",
      "Dedicated account manager",
      "SLA & compliance",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-pricing"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6"
          >
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">
              Pricing
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold gradient-text mb-4"
          >
            Invest in precision
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/30 max-w-lg mx-auto"
          >
            Start free, scale as you grow. No hidden fees.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              className={`relative group ${plan.popular ? "md:-mt-4 md:mb-[-16px]" : ""}`}
              data-testid={`card-pricing-${plan.name.toLowerCase()}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-1.5 bg-accent-blue/20 border border-accent-blue/30 rounded-full px-3 py-1">
                    <Sparkles className="w-3 h-3 text-accent-blue" />
                    <span className="text-[10px] font-medium text-accent-blue tracking-wider uppercase">Most Popular</span>
                  </div>
                </div>
              )}

              <div className={`glass-panel rounded-2xl p-6 sm:p-8 h-full relative overflow-hidden transition-all duration-500 ${
                plan.popular
                  ? "border-accent-blue/20 hover:border-accent-blue/40"
                  : "hover:border-white/15"
              }`}>
                {plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/5 to-transparent" />
                )}

                <div className="relative z-10">
                  <h3 className="text-sm font-medium text-white/60 mb-2">{plan.name}</h3>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`font-display font-bold text-white ${plan.price.length > 8 ? "text-2xl sm:text-3xl" : "text-4xl"}`}>{plan.price}</span>
                    {plan.period && <span className="text-sm text-white/30">{plan.period}</span>}
                  </div>

                  <p className="text-xs text-white/30 mb-6">{plan.description}</p>

                  <a
                    href="/auth"
                    className={`block w-full text-center py-3 rounded-full text-sm font-medium transition-all duration-300 mb-6 ${
                      plan.popular
                        ? "bg-accent-blue text-white hover:bg-blue-600 shadow-proximity-glow"
                        : "glass-panel text-white/70 hover:text-white hover:border-white/20"
                    }`}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </a>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/40">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
