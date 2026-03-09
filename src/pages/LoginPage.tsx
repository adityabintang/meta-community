import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, X, ArrowLeft } from "lucide-react";
import logoLight from "@/assets/meta-logo-light.png";
import logoDark from "@/assets/meta-logo-dark.png";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Check dark mode
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      {/* Background blobs matching hero */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/8 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/8 blur-3xl"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-6 z-10"
      >
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Beranda
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md relative"
      >
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-2xl p-8 shadow-card-hover relative">
          {/* Close */}
          <Link to="/" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </Link>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={isDark ? logoDark : logoLight} alt="Meta Community" className="h-10 w-10 object-contain" />
              <span className="font-display font-semibold text-foreground tracking-wide">Meta Community</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex rounded-full border border-border/60 p-1 bg-secondary/50 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab("login")}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === "login"
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Masuk
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === "register"
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Daftar
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            {activeTab === "login" ? "Selamat datang kembali" : "Buat akun baru"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {activeTab === "login"
              ? "Masuk ke akun Meta Community kamu"
              : "Bergabung dengan Meta Community sekarang"}
          </p>

          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {activeTab === "register" && (
              <div className="relative">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  className="w-full rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm pl-11 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {activeTab === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border accent-accent"
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button type="button" className="text-sm text-accent hover:underline transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition-opacity shadow-card"
            >
              {activeTab === "login" ? "Sign in" : "Sign up"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Or continue with</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {}}
              className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/80 hover:shadow-card transition-all"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              onClick={() => {}}
              className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/80 hover:shadow-card transition-all"
            >
              <GitHubIcon />
              GitHub
            </button>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link to="/syarat-layanan" className="text-accent hover:underline">Terms & Service</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
