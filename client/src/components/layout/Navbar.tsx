import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Hexagon, Menu, X, LogOut, User, ChevronDown, Layers, FileBarChart, Calculator, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";

function MagneticButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const navLinks = [
  { label: "Resources", href: "/resources" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Contact", href: "/contact" },
];

const toolItems = [
  { label: "Floorplan Generation", href: "/tools/floorplan-generation", icon: Layers, desc: "AI-powered 2D floor plans" },
  { label: "Report Analysis", href: "/tools/report-analysis", icon: FileBarChart, desc: "Upload & analyze plans" },
  { label: "Estimate Cost", href: "/tools/estimate-cost", icon: Calculator, desc: "Calculate building costs" },
  { label: "Architecture Advisor", href: "/tools/data-scientist", icon: Building2, desc: "AI project recommendations" },
];

function ToolsDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 rounded-full"
        data-testid="button-tools-dropdown"
      >
        <span>Tools</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#0c0c14]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            <div className="p-2">
              {toolItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05] transition-all duration-200 group"
                  data-testid={`link-tool-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 transition-all duration-200">
                    <item.icon className="w-4 h-4 text-white/30 group-hover:text-accent-blue transition-colors duration-200" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] text-white/25 group-hover:text-white/35 transition-colors">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
      data-testid="navbar"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass-panel rounded-full px-6 py-3 flex items-center justify-between gap-4">
          <motion.a
            href="/"
            className="flex items-center gap-2 text-white"
            data-testid="link-logo"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Hexagon className="w-7 h-7 text-accent-blue" strokeWidth={1.5} />
            <span className="font-display text-lg font-semibold tracking-tight">
              ArchitectXpert
            </span>
          </motion.a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <MagneticButton key={link.label}>
                <motion.a
                  href={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 rounded-full"
                  data-testid={`link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </motion.a>
              </MagneticButton>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <ToolsDropdown />
            </motion.div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex items-center gap-2 text-sm text-white/60 px-3 py-1.5"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
                    <User className="w-3 h-3 text-accent-blue" />
                  </div>
                  <span data-testid="text-username">{user.username}</span>
                </motion.div>
                <motion.a
                  href="/workspace"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="spotlight-btn rounded-full px-5 py-2 text-sm font-medium text-white"
                  data-testid="link-workspace"
                >
                  Workspace
                </motion.a>
                <motion.button
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  onClick={() => logout()}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-2"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.a
                  href="/auth"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 px-4 py-2"
                  data-testid="link-signin"
                >
                  Sign In
                </motion.a>
                <motion.a
                  href="/auth"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="spotlight-btn rounded-full px-5 py-2 text-sm font-medium text-white"
                  data-testid="link-get-started"
                >
                  Get Started
                </motion.a>
              </>
            )}
          </div>

          <button
            className="md:hidden text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-panel rounded-2xl mt-2 p-4 md:hidden"
            >
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block px-4 py-3 text-sm font-medium text-white/70 hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                  data-testid={`link-mobile-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-white/5 mt-2 pt-2">
                <p className="px-4 py-2 text-[10px] font-mono text-white/25 uppercase tracking-wider">Tools</p>
                {toolItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/70 hover:text-white transition-colors"
                    onClick={() => setMobileOpen(false)}
                    data-testid={`link-mobile-tool-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="w-4 h-4 text-white/30" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-white/5 mt-2 pt-2">
                {user ? (
                  <>
                    <div className="px-4 py-3 text-sm text-white/50 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{user.username}</span>
                    </div>
                    <a
                      href="/workspace"
                      className="block px-4 py-3 text-sm font-medium text-accent-blue"
                      onClick={() => setMobileOpen(false)}
                    >
                      Workspace
                    </a>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="block w-full text-left px-4 py-3 text-sm text-white/50 hover:text-white"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href="/auth"
                      className="block px-4 py-3 text-sm text-white/70 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </a>
                    <a
                      href="/auth"
                      className="block px-4 py-3 text-sm font-medium text-accent-blue"
                      onClick={() => setMobileOpen(false)}
                    >
                      Get Started
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
