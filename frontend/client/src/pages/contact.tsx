import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hexagon, Send, Mail, MessageSquare, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";
import emailjs from "@emailjs/browser";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID,
        { name, email, subject, message },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      toast({ title: "Message sent", description: "We'll get back to you within 24 hours." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
      console.error("EmailJS Error:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <Navbar />
      <PageParticles count={250} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.a
          href="/"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
          data-testid="link-contact-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </motion.a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6">
              <Mail className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Contact Us</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              <span className="gradient-text">Get in</span>
              <br />
              <span className="gradient-text-blue">touch.</span>
            </h1>

            <p className="text-white/40 text-base leading-relaxed mb-10 max-w-md">
              Have a question about our platform? Need help with your project? We're here to help and typically respond within 24 hours.
            </p>

            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email", value: "architectxpert2@gmail.com" },
                { icon: MessageSquare, label: "Live Chat", value: "Available Mon-Fri, 9am-6pm" },
                { icon: MapPin, label: "Office", value: "Sector C, DHA phase 6" },
                { icon: Clock, label: "Response Time", value: "Within 24 hours" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm text-white/70">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="glass-panel-strong rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                      data-testid="input-contact-email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
                    data-testid="input-contact-subject"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                    Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us more..."
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all resize-none"
                    data-testid="input-contact-message"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full group flex items-center justify-center gap-2 bg-accent-blue hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-blue/20"
                  data-testid="button-send-message"
                >
                  {sending ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Hexagon className="w-4 h-4" strokeWidth={1.5} />
                    </motion.div>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
