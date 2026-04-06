import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <div className="rounded-2xl p-8 sm:p-10 text-center relative bg-[#0a0a0f] border border-white/[0.06]">
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-accent-blue/10 via-transparent to-accent-gold/5 pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-5">
          <Mail className="w-3.5 h-3.5 text-accent-gold" />
          <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Newsletter</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-display font-semibold text-white mb-2">
          Stay in the loop
        </h3>
        <p className="text-sm text-white/30 max-w-sm mx-auto mb-6">
          Get the latest updates on new features, design tips, and AI architecture insights delivered to your inbox.
        </p>

        {subscribed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 text-green-400 py-3"
            data-testid="text-subscribed"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">You're subscribed! We'll be in touch.</span>
          </motion.div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                data-testid="input-newsletter-email"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-accent-blue hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/30 flex-shrink-0"
              data-testid="button-subscribe"
            >
              <span>Subscribe</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
