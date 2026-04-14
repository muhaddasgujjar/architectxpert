import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, Eye, EyeOff, ArrowRight, ArrowLeft, User, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { use3DTilt, fadeUp, staggerContainer } from "@/lib/animations";

// ── Focus-animated input wrapper ──────────────────────────────────────────────
function AnimatedInput({
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  suffix,
  testId,
  autoComplete,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ElementType;
  suffix?: React.ReactNode;
  testId: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <motion.div
        animate={{ opacity: focused ? 0.8 : 0.3 }}
        transition={{ duration: 0.2 }}
      >
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white z-10 pointer-events-none" />
      </motion.div>

      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
        data-testid={testId}
        autoComplete={autoComplete}
        style={{
          borderColor: focused ? "rgba(59,130,246,0.5)" : undefined,
          boxShadow: focused ? "0 0 0 1px rgba(59,130,246,0.2)" : undefined,
        }}
      />

      {/* Animated bottom-border accent */}
      <motion.div
        className="absolute bottom-0 left-4 right-4 h-[1px] bg-accent-blue rounded-full"
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        initial={{ scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ originX: 0.5 }}
      />

      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}

// ── AuthPage ──────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode]               = useState<"login" | "register">("login");
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation]               = useLocation();
  const { login, register, user }     = useAuth();

  // 3D tilt on the card
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = use3DTilt(5);

  useEffect(() => {
    if (user) setLocation("/workspace");
  }, [user, setLocation]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.05, 0.07, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl"
        />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Page entrance */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Back link */}
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ x: -3, color: "rgba(255,255,255,0.7)" }}
            className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors mb-6"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </motion.a>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.a
              href="/"
              className="flex items-center gap-2 text-white mb-2"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              data-testid="link-auth-logo"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Hexagon className="w-8 h-8 text-accent-blue" strokeWidth={1.5} />
              </motion.div>
              <span className="font-display text-xl font-semibold tracking-tight">ArchitectXpert</span>
            </motion.a>
            <AnimatePresence mode="wait">
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-white/40 text-sm mt-1"
              >
                {mode === "login" ? "Welcome back" : "Create your account"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Card with 3D tilt */}
          <motion.div
            style={{ rotateX, rotateY, transformPerspective: 1400 }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            whileHover={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
            transition={{ duration: 0.4 }}
            className="glass-panel-strong rounded-2xl p-8"
          >
            {/* Mode tabs */}
            <div className="flex mb-8 rounded-full bg-white/5 p-1">
              {(["login", "register"] as const).map(m => (
                <motion.button
                  key={m}
                  onClick={() => { setMode(m); setError(""); setConfirmPassword(""); }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    mode === m
                      ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20"
                      : "text-white/50 hover:text-white/70"
                  }`}
                  data-testid={m === "login" ? "tab-login" : "tab-register"}
                >
                  {m === "login" ? "Sign In" : "Sign Up"}
                </motion.button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <motion.div variants={fadeUp} initial="hidden" animate="show">
                <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                  Username
                </label>
                <AnimatedInput
                  type="text"
                  value={username}
                  onChange={setUsername}
                  placeholder="Enter username"
                  icon={User}
                  testId="input-username"
                  autoComplete="username"
                />
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.06 }}>
                <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <AnimatedInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter password"
                  icon={Lock}
                  testId="input-password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  suffix={
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.88 }}
                      className="text-white/30 hover:text-white/60 transition-colors"
                      data-testid="button-toggle-password"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </motion.button>
                  }
                />
              </motion.div>

              {/* Confirm Password */}
              <AnimatePresence mode="wait">
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <AnimatedInput
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm password"
                      icon={Lock}
                      testId="input-confirm-password"
                      autoComplete="new-password"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-400 text-xs font-mono"
                    data-testid="text-error"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={isSubmitting ? {} : { scale: 1.02, boxShadow: "0 0 28px rgba(59,130,246,0.45)" }}
                whileTap={isSubmitting ? {} : { scale: 0.97 }}
                className="w-full group flex items-center justify-center gap-2 bg-accent-blue hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-blue/20"
                data-testid="button-submit-auth"
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.div
                      key="spinner"
                      initial={{ opacity: 0, rotate: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                      transition={{ rotate: { repeat: Infinity, duration: 1, ease: "linear" }, opacity: { duration: 0.15 } }}
                    >
                      <Hexagon className="w-4 h-4" strokeWidth={1.5} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <motion.button
                onClick={switchMode}
                whileHover={{ color: "rgba(255,255,255,0.6)" }}
                className="text-xs text-white/40 transition-colors"
                data-testid="button-switch-mode"
              >
                {mode === "login"
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Sign In"}
              </motion.button>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-white/20 text-xs mt-6"
          >
            By continuing, you agree to our Terms of Service
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
