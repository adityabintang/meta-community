import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, ExternalLink, ChevronDown, Grid3X3, List } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePublishedEvents } from "@/hooks/use-events";
import type { Event } from "@/lib/api/events";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

type EventRegistrant = {
  name: string;
};

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

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null, locale = "id-ID") {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(event: Event) {
  const startAt = event.startAt || event.date;
  const endAt = event.endAt;

  if (!startAt) return "";

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return startAt;

  const startText = start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!endAt) return startText;

  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return startText;

  return `${startText} - ${end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

const EventPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [registrantMap, setRegistrantMap] = useState<Record<string, EventRegistrant[]>>({});
  const { data: publishedEvents = [], isLoading, error } = usePublishedEvents();
  const token = localStorage.getItem("auth_token");

  const isPublicEvent = (event: Event) => {
    const status = typeof event.status === "string" ? event.status.toLowerCase().trim() : "";
    return status !== "draft";
  };

  const allEvents = useMemo(() => {
    return publishedEvents
      .filter(isPublicEvent)
      .map((event) => ({
        ...event,
        coverImage: getMediaUrl(event.thumbnail || event.image),
      }));
  }, [publishedEvents]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        allEvents
          .map((event) => (typeof event.category === "string" ? event.category.trim() : "general"))
          .filter(Boolean)
      )
    );

    return uniqueCategories.sort((a, b) => a.localeCompare(b));
  }, [allEvents]);

  const filtered = useMemo(() => {
    const base = selectedCategory === "all"
      ? allEvents
      : allEvents.filter((event) => (event.category || "general").trim() === selectedCategory);

    return [...base].sort((a, b) => {
      const aTime = new Date(a.startAt || a.date || a.createdAt).getTime();
      const bTime = new Date(b.startAt || b.date || b.createdAt).getTime();

      if (sortOrder === "newest") {
        return bTime - aTime;
      }

      return aTime - bTime;
    });
  }, [allEvents, selectedCategory, sortOrder]);

  const locale = language === "id" ? "id-ID" : "en-US";

  useEffect(() => {
    if (allEvents.length === 0) {
      setRegistrantMap({});
      return;
    }

    let active = true;

    const loadRegistrants = async () => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const results = await Promise.allSettled(
        allEvents.map(async (event) => {
          const response = await fetch(`${CMS_API}/events/${event.id}/registrations`, { headers });
          if (!response.ok) {
            return [String(event.id), []] as const;
          }

          const data = await response.json();
          const registrants = Array.isArray(data.registrations) ? data.registrations : [];
          return [String(event.id), registrants] as const;
        }),
      );

      if (!active) return;

      const nextMap: Record<string, EventRegistrant[]> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          nextMap[result.value[0]] = result.value[1] as EventRegistrant[];
        }
      }

      setRegistrantMap(nextMap);
    };

    loadRegistrants();

    return () => {
      active = false;
    };
  }, [allEvents, token]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            <div className="relative">
              <button
                onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowSortDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {t(translations.events.filterCategory)}: {selectedCategory === "all" ? t(translations.events.filterAll) : formatLabel(selectedCategory)}
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
                      {formatLabel(cat)}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

          {isLoading && (
            <div className={viewMode === "grid"
              ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
              : "flex flex-col gap-5 max-w-3xl mx-auto"
            }>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`event-skeleton-${index}`}
                  className={`rounded-2xl bg-card border border-border/50 shadow-card overflow-hidden animate-pulse ${
                    viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                  }`}
                >
                  <div className={`relative overflow-hidden bg-secondary/60 ${viewMode === "list" ? "sm:w-72 shrink-0 h-48 sm:h-auto" : "h-48"}`} />
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div className="h-3 w-24 rounded bg-secondary/70" />
                    <div className="h-5 w-5/6 rounded bg-secondary/70" />
                    <div className="h-4 w-full rounded bg-secondary/70" />
                    <div className="h-4 w-11/12 rounded bg-secondary/70" />
                    <div className="h-10 w-full rounded bg-secondary/70" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-center text-sm text-red-500 max-w-2xl mx-auto">
              Failed to load events.
            </p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-10">
              {t(translations.events.showingEvents)} 0 {t(translations.events.eventsText)}
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className={viewMode === "grid"
              ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
              : "flex flex-col gap-5 max-w-3xl mx-auto"
            }>
              {filtered.map((event, i) => {
                const eventDate = new Date(event.startAt || event.date || event.createdAt);
                const isUpcoming = !Number.isNaN(eventDate.getTime()) && eventDate.getTime() >= Date.now();
                const publicLink = event.locationLink || event.embedLink || "";
                const registrants = registrantMap[String(event.id)] || [];

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className={`rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group cursor-pointer ${
                      viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                    }`}
                    onClick={() => navigate(`/event/${event.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/event/${event.id}`);
                      }
                    }}
                  >
                    <div className={`relative overflow-hidden ${viewMode === "list" ? "sm:w-72 shrink-0 h-48 sm:h-auto" : "h-48"}`}>
                      {event.coverImage ? (
                        <img src={event.coverImage} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-accent/15" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-transparent to-black/35" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_60%)]" />
                      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
                        <span className="px-2.5 py-1 rounded-md bg-background/90 text-foreground text-xs font-medium backdrop-blur-sm">
                          {formatLabel(event.category || "general")}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                          isUpcoming ? "bg-emerald-500/20 text-emerald-100" : "bg-background/90 text-foreground"
                        }`}>
                          {isUpcoming ? t(translations.events.upcoming) : t(translations.events.completed)}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(event.startAt || event.date || event.createdAt, locale)}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display font-bold text-foreground text-base mb-3 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                        {event.title}
                      </h3>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatTimeRange(event) || "TBA"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{event.location || "Online"}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
                        {typeof event.description === "string" ? event.description : ""}
                      </p>

                      <div className="mb-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500 text-white text-xs font-semibold">
                          Going
                        </div>
                        {registrants.length > 0 ? (
                          <div className="flex items-center -space-x-2 mt-2">
                            {registrants.slice(0, 5).map((person, index) => (
                              <div
                                key={`${person.name}-${index}`}
                                className="w-7 h-7 rounded-full border-2 border-card bg-secondary text-foreground text-[10px] font-semibold flex items-center justify-center"
                                title={person.name}
                              >
                                {(person.name || "A").slice(0, 1).toUpperCase()}
                              </div>
                            ))}
                            {registrants.length > 5 ? (
                              <span
                                className="ml-2 w-7 h-7 rounded-full border-2 border-card bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center"
                                title={`${registrants.length - 5} peserta lainnya`}
                              >
                                +{registrants.length - 5}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-2">Belum ada peserta.</p>
                        )}
                      </div>

                      {publicLink ? (
                        <a
                          href={publicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          {t(translations.events.registerNow)}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-60 cursor-not-allowed" disabled>
                          {t(translations.events.registerNow)}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-10"
            >
              {t(translations.events.showingEvents)} {filtered.length} {t(translations.events.eventsText)}
            </motion.p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
