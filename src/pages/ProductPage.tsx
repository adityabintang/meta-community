import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const categories = [
  { id: "all", label: translations.showcase.filterAll },
  { id: "web", label: translations.showcase.catWeb },
  { id: "mobile", label: translations.showcase.catMobile },
  { id: "landing", label: translations.showcase.catLanding },
  { id: "ecommerce", label: translations.showcase.catEcommerce },
  { id: "dashboard", label: translations.showcase.catDashboard },
];

const ProductPage = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const products = [...translations.showcase.items];

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          t(p.title).toLowerCase().includes(q) ||
          t(p.description).toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedCategory, searchQuery, t]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold tracking-wide uppercase mb-4">
              {t(translations.showcase.badge)}
            </span>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              {t(translations.showcase.title1)}{" "}
              <span className="text-accent">{t(translations.showcase.titleAccent)}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t(translations.showcase.subtitle)}
            </p>
          </motion.div>

          {/* Filters + Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 max-w-6xl mx-auto"
          >
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t(cat.label)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(translations.showcase.searchPlaceholder)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              />
            </div>
          </motion.div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={project.image}
                    alt={t(project.title)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Category badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium">
                    {t(project.category)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-display font-bold text-foreground text-base mb-2 leading-snug line-clamp-1 group-hover:text-accent transition-colors">
                    {t(project.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                    {t(project.description)}
                  </p>

                  {/* Author + CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{project.author}</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline transition-colors">
                      {t(translations.showcase.viewProject)}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground mt-16 text-sm"
            >
              {t(translations.showcase.noResults)}
            </motion.p>
          )}

          {/* Count */}
          {filtered.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-10"
            >
              {t(translations.showcase.showing)} {filtered.length} {t(translations.showcase.projectsText)}
            </motion.p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;
