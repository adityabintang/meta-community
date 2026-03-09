import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users as UsersIcon, ExternalLink, ChevronDown, Grid3X3, List } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const EventPage = () => {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const allEvents = translations.events.items;

  // Get unique categories
  const categories = Array.from(new Set(allEvents.map((e) => e.category[language])));

  // Filter
  const filtered = selectedCategory === "all"
    ? allEvents
    : allEvents.filter((e) => e.category[language] === selectedCategory);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "newest") {
      return allEvents.indexOf(b) - allEvents.indexOf(a);
    }
    return allEvents.indexOf(a) - allEvents.indexOf(b);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t(translations.legal.backHome)}
            </Link>
          </motion.div>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              {t(translations.events.pageTitle1)} <span className="text-accent">{t(translations.events.pageTitleAccent)}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t(translations.events.pageSubtitle)}
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSortDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {t(translations.events.filterCategory)}: {selectedCategory === "all" ? t(translations.events.filterAll) : selectedCategory}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full mt-1 left-0 min-w-[180px] rounded-lg border border-border bg-card shadow-card-hover z-20 py-1">
                  <button
                    onClick={() => { setSelectedCategory("all"); setShowCategoryDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${selectedCategory === "all" ? "text-accent font-medium" : "text-foreground"}`}
                  >
                    {t(translations.events.filterAll)}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${selectedCategory === cat ? "text-accent font-medium" : "text-foreground"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowSortDropdown(!showSortDropdown); setShowCategoryDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {t(translations.events.filterSort)}: {sortOrder === "newest" ? t(translations.events.sortNewest) : t(translations.events.sortOldest)}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full mt-1 left-0 min-w-[150px] rounded-lg border border-border bg-card shadow-card-hover z-20 py-1">
                  <button
                    onClick={() => { setSortOrder("newest"); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${sortOrder === "newest" ? "text-accent font-medium" : "text-foreground"}`}
                  >
                    {t(translations.events.sortNewest)}
                  </button>
                  <button
                    onClick={() => { setSortOrder("oldest"); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${sortOrder === "oldest" ? "text-accent font-medium" : "text-foreground"}`}
                  >
                    {t(translations.events.sortOldest)}
                  </button>
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Events Grid/List */}
          <div className={viewMode === "grid"
            ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
            : "flex flex-col gap-5 max-w-3xl mx-auto"
          }>
            {sorted.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group ${
                  viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                }`}
              >
                {/* Banner */}
                <div className={`relative overflow-hidden ${viewMode === "list" ? "sm:w-72 shrink-0 h-48 sm:h-auto" : "h-48"}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-90`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
                  {/* Category + Status badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-background/90 text-foreground text-xs font-medium backdrop-blur-sm">
                      {t(event.category)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                      event.status.id === "Selesai"
                        ? "bg-accent/20 text-accent-foreground"
                        : "bg-background/90 text-foreground"
                    }`}>
                      {t(event.status)}
                    </span>
                  </div>
                  {/* Date on banner */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {t(event.date)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-foreground text-base mb-3 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {t(event.title)}
                  </h3>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{t(event.location)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UsersIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{t(translations.events.organizer)}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
                    {t(event.description)}
                  </p>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    {t(translations.events.registerNow)}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Count */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-10"
          >
            {t(translations.events.showingEvents)} {sorted.length} {t(translations.events.eventsText)}
          </motion.p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
