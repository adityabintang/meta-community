import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import logoLight from "@/assets/meta-logo-light.png";
import logoDark from "@/assets/meta-logo-dark.png";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const navItems = [
    { label: t(translations.nav.home), href: "#home" },
    { label: t(translations.nav.product), href: "#product" },
    { label: t(translations.nav.news), href: "#news" },
    { label: t(translations.nav.event), href: "/event", isRoute: true },
  ];

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-4 left-4 right-4 z-50 transition-all duration-500 rounded-2xl ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl shadow-card-hover border border-border/60"
          : "bg-background/40 backdrop-blur-xl border border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between h-14 md:h-16">
        <Link to={isHome ? "#home" : "/"} className="flex items-center gap-2">
          <img src={isDark ? logoDark : logoLight} alt="Meta Community" className="h-12 w-12 object-contain" />
          <span className="font-display font-semibold text-base tracking-wide text-foreground">Meta Community</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) =>
            item.isRoute ? (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full" />
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full" />
              </a>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-sm font-medium"
            aria-label="Toggle language"
          >
            <Globe size={16} />
            {language.toUpperCase()}
          </button>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href="#home" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            {t(translations.nav.join)}
          </a>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40"
          >
            <nav className="px-6 py-4 flex flex-col gap-4">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="text-foreground font-medium py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-foreground font-medium py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground text-sm font-medium"
                >
                  <Globe size={16} />
                  {language.toUpperCase()}
                </button>
                <button
                  onClick={toggleDark}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <a href="#home" className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center">
                  {t(translations.nav.join)}
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
