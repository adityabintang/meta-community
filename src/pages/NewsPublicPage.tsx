import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import emptyNewsImage from "@/assets/empty-news.svg";
import { usePublishedNews } from "@/hooks/use-news";
import type { NewsArticle } from "@/lib/api/news";

const PAGE_SIZE = 10;

function extractPlainText(content: unknown): string {
  if (!content) return "";

  if (typeof content === "string") {
    return content
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (typeof content === "object") {
    const contentObj = content as { root?: { children?: unknown[] } };
    const children = contentObj.root?.children;

    if (!Array.isArray(children)) return "";

    const walk = (nodes: unknown[]): string => {
      return nodes
        .map((node) => {
          if (!node || typeof node !== "object") return "";

          const typedNode = node as { text?: string; children?: unknown[] };
          const ownText = typeof typedNode.text === "string" ? typedNode.text : "";
          const childText = Array.isArray(typedNode.children) ? walk(typedNode.children) : "";

          return `${ownText} ${childText}`.trim();
        })
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    };

    return walk(children);
  }

  return "";
}

function formatArticleDate(value?: string | null) {
  if (!value) return "Tanggal tidak tersedia";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak tersedia";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeAssetUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") return null;

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return null;

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith("/")) {
    return trimmedUrl;
  }

  return `/${trimmedUrl}`;
}

function resolveImageUrl(article: NewsArticle): string | null {
  const directThumbnail = normalizeAssetUrl(article.thumbnail);
  if (directThumbnail) return directThumbnail;

  const ogImage = article.ogImage;
  if (!ogImage || typeof ogImage === "number") return null;

  const mediaUrl = normalizeAssetUrl(ogImage.url);
  if (mediaUrl) return mediaUrl;

  return normalizeAssetUrl(ogImage.thumbnailURL);
}

export default function NewsPublicPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get("page") || "1"));
  const searchQuery = searchParams.get("search") || "";

  const { data: newsResponse, isLoading: loading, error } = usePublishedNews(currentPage, PAGE_SIZE, searchQuery);

  const articles = newsResponse?.docs || [];
  const totalPages = newsResponse?.totalPages || 1;

  const cards = useMemo(() => {
    return articles.map((article: NewsArticle) => {
      const excerpt =
        article.metaDescription?.trim() ||
        extractPlainText(article.content).slice(0, 180) ||
        "Read full article";

      const imageUrl = resolveImageUrl(article);

      return {
        ...article,
        excerpt,
        imageUrl,
      };
    });
  }, [articles]);

  useEffect(() => {
    const pageParam = Number(searchParams.get("page") || "1");
    if (!Number.isFinite(pageParam) || pageParam < 1) {
      setSearchParams((current) => {
        current.set("page", "1");
        return current;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set("search", value);
    } else {
      nextParams.delete("search");
    }
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(safePage));
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3">
              Community News
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Artikel terbaru yang sudah dipublish dari dashboard admin.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="max-w-2xl mx-auto mb-10"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari artikel, kata kunci, atau isi artikel"
                className="w-full rounded-2xl border border-border/60 bg-card/90 px-11 py-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-card focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </motion.div>

          {loading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-2xl bg-card border border-border/50 shadow-card overflow-hidden animate-pulse"
                >
                  <div className="h-44 w-full bg-secondary/60" />
                  <div className="p-5">
                    <div className="h-3.5 w-28 bg-secondary/70 rounded mb-4" />
                    <div className="h-5 w-5/6 bg-secondary/70 rounded mb-2" />
                    <div className="h-4 w-full bg-secondary/70 rounded mb-2" />
                    <div className="h-4 w-11/12 bg-secondary/70 rounded mb-2" />
                    <div className="h-4 w-4/6 bg-secondary/70 rounded mb-6" />
                    <div className="h-4 w-24 bg-secondary/70 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="max-w-4xl mx-auto text-center text-red-500">
              {error instanceof Error ? error.message : "Unable to load articles"}
            </div>
          )}

          {!loading && !error && cards.length === 0 && (
            <div className="max-w-2xl mx-auto text-center">
              <img
                src={emptyNewsImage}
                alt="Belum ada artikel"
                className="w-full max-w-md mx-auto mb-6"
              />
              <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground mb-2">
                Belum Ada Artikel
              </h2>
              <p className="text-muted-foreground">
                Artikel yang sudah dipublish dari dashboard akan muncul di sini.
              </p>
            </div>
          )}

          {!loading && !error && cards.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {cards.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
                >
                  {article.imageUrl ? (
                    <div className="h-44 w-full overflow-hidden bg-secondary/40">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-44 w-full bg-secondary/40" />
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatArticleDate(article.createdAt || article.updatedAt || article.created_at)}
                    </div>

                    <h2 className="font-display text-lg font-semibold text-foreground line-clamp-2 mb-2">
                      {article.title}
                    </h2>

                    <p className="text-sm text-muted-foreground line-clamp-4 mb-5">{article.excerpt}</p>

                    <Link
                      to={`/news/${article.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                    >
                      Baca artikel
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {!loading && !error && cards.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                Prev
              </Button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  onClick={() => goToPage(page)}
                  className="min-w-10"
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
