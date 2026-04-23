import { motion, useInView } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import { usePublishedEventCount, usePublishedEvents } from "@/hooks/use-events";
import type { Event } from "@/lib/api/events";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

function formatEventDate(value?: string | null, locale = "id-ID") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getEventDateValue(event: Event): number {
  const value = event.startAt || event.date || event.createdAt || event.created_at;
  const time = new Date(value || "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeLocation(event: Event, language: "id" | "en") {
  const location = (event.location || "").trim();
  if (!location) {
    return language === "id" ? "Online Event" : "Online Event";
  }

  if (/^https?:\/\//i.test(location)) {
    return language === "id" ? "Online Event" : "Online Event";
  }

  return location;
}

const EventSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t, language } = useLanguage();
  const { data: publishedEventCount = 0 } = usePublishedEventCount();
  const { data: publishedEvents = [] } = usePublishedEvents();
  const [participantsMap, setParticipantsMap] = useState<Record<string, number>>({});
  const locale = language === "id" ? "id-ID" : "en-US";
  const eventSummary =
    language === "id"
      ? `Sudah ada ${publishedEventCount} event yang telah diselenggarakan oleh Meta Community.`
      : `Meta Community has organized ${publishedEventCount} events so far.`;

  const lastThreeEvents = useMemo(() => {
    return [...publishedEvents]
      .filter((event) => getEventDateValue(event) > 0)
      .sort((a, b) => getEventDateValue(b) - getEventDateValue(a))
      .slice(0, 3);
  }, [publishedEvents]);

  useEffect(() => {
    if (lastThreeEvents.length === 0) {
      setParticipantsMap({});
      return;
    }

    let active = true;

    const loadParticipants = async () => {
      const results = await Promise.allSettled(
        lastThreeEvents.map(async (event) => {
          const response = await fetch(`${CMS_API}/events/${event.id}/registrations`);
          if (!response.ok) return [String(event.id), 0] as const;

          const data = await response.json();
          const registrations = Array.isArray(data.registrations) ? data.registrations : [];
          return [String(event.id), registrations.length] as const;
        }),
      );

      if (!active) return;

      const nextMap: Record<string, number> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          nextMap[result.value[0]] = result.value[1];
        }
      }

      setParticipantsMap(nextMap);
    };

    loadParticipants();

    return () => {
      active = false;
    };
  }, [lastThreeEvents]);

  return (
    <section id="event" className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      <div className="absolute top-1/2 right-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl -z-10" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            {t(translations.events.badge)}
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t(translations.events.title1)} <span className="text-accent">{t(translations.events.titleAccent)}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {eventSummary}
          </p>
        </motion.div>

        <motion.div className="max-w-3xl mx-auto flex flex-col gap-6">
          {lastThreeEvents.map((event, i) => {
            const participants = participantsMap[String(event.id)] || 0;
            const dateValue = event.startAt || event.date || event.createdAt || event.created_at;
            const eventTime = getEventDateValue(event);
            const isUpcoming = eventTime > Date.now();

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded-2xl bg-card shadow-card border border-border/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-display font-semibold text-foreground">{event.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
                      {isUpcoming ? t(translations.events.upcoming) : t(translations.events.completed)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatEventDate(dateValue, locale)}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {normalizeLocation(event, language)}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {participants} {t(translations.events.participants)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {lastThreeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              {language === "id" ? "Belum ada event." : "No events."}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-10"
        >
          <Link
            to="/event"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
          >
            {t(translations.events.viewAll)}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default EventSection;
