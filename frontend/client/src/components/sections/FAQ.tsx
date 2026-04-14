import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import { staggerContainer, fadeUp, defaultViewport } from "@/lib/animations";

const faqs = [
  {
    question: "What is ArchitectXpert?",
    answer: "ArchitectXpert is an AI-powered architectural design platform that generates professional floor plans from simple text descriptions. Enter your desired dimensions and room requirements, and our AI engine creates optimized layouts in seconds.",
  },
  {
    question: "Do I need architectural experience to use it?",
    answer: "Not at all. ArchitectXpert is designed for everyone — from homeowners planning renovations to professional architects looking for rapid prototyping. Simply describe what you need (e.g., '3 bedrooms, 2 bathrooms, open kitchen') and the AI handles the spatial planning.",
  },
  {
    question: "How does the floor plan generation work?",
    answer: "Our Neural Architecture Engine analyzes your input dimensions and room requirements, then processes thousands of layout variations to find the optimal spatial arrangement. It considers factors like room adjacency, traffic flow, natural light, and building code compliance.",
  },
  {
    question: "Can I export my floor plans?",
    answer: "Yes. Generated floor plans can be downloaded as SVG files directly from the workspace. We support export to common architectural formats that work with AutoCAD, Revit, SketchUp, and other design tools.",
  },
  {
    question: "What's included in the free plan?",
    answer: "The free Starter plan includes up to 10 floor plan generations per month, basic room types, SVG export, and community support. Upgrade to Pro or Enterprise for unlimited generations, advanced room types, priority support, and team collaboration features.",
  },
];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      whileHover={open ? {} : { x: 3 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-xl overflow-hidden"
    >
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
        data-testid={`button-faq-${index}`}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors duration-300">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0, color: open ? "#3b82f6" : "rgba(255,255,255,0.3)" }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 transition-colors duration-300" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 pb-5 border-t border-white/5 pt-4">
              <p className="text-sm text-white/40 leading-relaxed" data-testid={`text-faq-answer-${index}`}>
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="relative py-32 px-4 sm:px-6 lg:px-8"
      data-testid="section-faq"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">FAQ</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Frequently asked</span>
            <br />
            <span className="gradient-text-blue">questions.</span>
          </h2>

          <p className="text-white/30 text-base max-w-md mx-auto">
            Everything you need to know about ArchitectXpert and our AI design platform.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
