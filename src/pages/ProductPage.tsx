import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Search, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useApprovedProducts } from "@/hooks/use-products";
import type { Product, ProductScreenshot } from "@/lib/api/products";

function getMediaUrl(media: unknown): string | null {
  if (!media) return null;

  if (typeof media === "string") {
    return media.trim() || null;
  }

  if (typeof media === "object") {
    const typedMedia = media as { url?: unknown; thumbnailURL?: unknown };
    if (typeof typedMedia.url === "string" && typedMedia.url.trim()) {
      return typedMedia.url;
    }
    if (typeof typedMedia.thumbnailURL === "string" && typedMedia.thumbnailURL.trim()) {
      return typedMedia.thumbnailURL;
    }
  }

  return null;
}

function getProductCover(product: Product): string | null {
  const screenshots = product.screenshots || [];

  for (const screenshot of screenshots) {
    if (!screenshot || typeof screenshot !== "object") continue;
    const typedScreenshot = screenshot as ProductScreenshot;
    const url = getMediaUrl(typedScreenshot.image);
    if (url) return url;
  }

  return null;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const ProductPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: approvedProducts = [], isLoading, error } = useApprovedProducts();

  const products = useMemo(() => {
    return approvedProducts.map((product) => ({
      ...product,
      coverImage: getProductCover(product),
    }));
  }, [approvedProducts]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => (product.category || "Other").trim())
          .filter(Boolean)
      )
    );

    return uniqueCategories.sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (selectedCategory !== "all") {
      result = result.filter((product) => (product.category || "Other").trim() === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.title.toLowerCase().includes(q) ||
          (product.description || "").toLowerCase().includes(q) ||
          (product.ownerName || "Anonymous").toLowerCase().includes(q) ||
          (product.category || "Other").toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-4 mb-10 max-w-6xl mx-auto"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === "all"
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t(translations.showcase.filterAll)}
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground shadow-card"
                        : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {formatLabel(category)}
                  </button>
                ))}
              </div>

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
            </div>
          </motion.div>

          {isLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`product-skeleton-${index}`}
                  className="rounded-2xl bg-card border border-border/50 shadow-card overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-secondary/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-24 rounded bg-secondary/70" />
                    <div className="h-5 w-5/6 rounded bg-secondary/70" />
                    <div className="h-4 w-full rounded bg-secondary/70" />
                    <div className="h-4 w-11/12 rounded bg-secondary/70" />
                    <div className="h-8 w-full rounded bg-secondary/70" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-center text-sm text-red-500 max-w-2xl mx-auto">
              Failed to load products.
            </p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground mt-16 text-sm"
            >
              {t(translations.showcase.noResults)}
            </motion.p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/product/${product.id}`);
                    }
                  }}
                >
                  <div className="relative h-48 overflow-hidden bg-secondary/30">
                    {product.coverImage ? (
                      <img
                        src={product.coverImage}
                        alt={product.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card to-accent/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/75 via-transparent to-transparent opacity-90" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium">
                        {formatLabel(product.category || "Other")}
                      </span>
                      {product.screenshots?.length ? (
                        <span className="px-2.5 py-1 rounded-md bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium">
                          {product.screenshots.length} shots
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-display font-bold text-foreground text-base mb-2 leading-snug line-clamp-1 group-hover:text-accent transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                      {product.description || "No description available"}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {product.ownerName || "Anonymous"}
                        </span>
                      </div>

                      {product.productLink ? (
                        <a
                          href={product.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline transition-colors shrink-0"
                        >
                          {t(translations.showcase.viewProduct)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">No public link</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-10"
            >
              {t(translations.showcase.showing)} {filtered.length} {t(translations.showcase.productsText)}
            </motion.p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;

