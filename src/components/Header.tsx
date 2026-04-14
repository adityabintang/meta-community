import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Globe, LayoutDashboard, LogOut, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import logoLight from "@/assets/meta-logo-light.png";
import logoDark from "@/assets/meta-logo-dark.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    return storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem("auth_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserFromStorage();
  const isLoggedIn = !!user;
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_remember_me");
    navigate("/");
  };

  const navItems = [
    { label: t(translations.nav.home), href: "#home" },
    { label: t(translations.nav.product), href: "/product", isRoute: true },
    { label: t(translations.nav.news), href: "/news", isRoute: true },
    { label: t(translations.nav.event), href: "/event", isRoute: true },
  ];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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
          {navItems.map((item) => {
            const isRouteLink = item.isRoute || (!isHome && !item.isRoute);
            const target = item.isRoute ? item.href : (!isHome ? `/${item.href}` : item.href);
            return isRouteLink ? (
              <Link
                key={item.href}
                to={target}
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
            );
          })}
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
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">{userInitials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || user?.email}</span>
                    <span className="text-xs text-muted-foreground font-normal capitalize">
                      {user?.role || "member"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center">
                    <LayoutDashboard className="mr-2" size={16} />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="flex items-center">
                    <User className="mr-2" size={16} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut className="mr-2" size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {t(translations.nav.join)}
            </Link>
          )}
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
              {navItems.map((item) => {
                const isRouteLink = item.isRoute || (!isHome && !item.isRoute);
                const target = item.isRoute ? item.href : (!isHome ? `/${item.href}` : item.href);
                return isRouteLink ? (
                  <Link
                    key={item.href}
                    to={target}
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
                );
              })}
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
                {isLoggedIn ? (
                  <>
                    <Link to="/dashboard" className="flex-1 px-5 py-2.5 rounded-lg bg-secondary text-sm font-medium text-center" onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </Link>
                    <button onClick={handleLogout} className="px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium">
                      Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="flex-1 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center" onClick={() => setMobileOpen(false)}>
                    {t(translations.nav.join)}
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
