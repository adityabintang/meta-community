import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import { usePublishedEventCount } from "@/hooks/use-events";

const EventSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t, language } = useLanguage();
  const { data: publishedEventCount = 0 } = usePublishedEventCount();
  const eventSummary =
    language === "id"
      ? `Sudah ada ${publishedEventCount} event yang telah diselenggarakan oleh Meta Community.`
      : `Meta Community has organized ${publishedEventCount} events so far.`;

  // Only show last 3 completed events on home
  const completedEvents = translations.events.items.filter((e) => e.status.id === translations.events.completed.id);
  const lastThree = completedEvents.slice(-3);

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
          {lastThree.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded-2xl bg-card shadow-card border border-border/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-display font-semibold text-foreground">{t(event.title)}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
                    {t(event.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t(event.date)}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {t(event.location)}</span>
                  {event.attendees && (
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {event.attendees} {t(translations.events.participants)}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
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
