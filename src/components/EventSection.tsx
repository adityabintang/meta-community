import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";

const EventSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const { t } = useLanguage();

  const cardsY = useTransform(scrollYProgress, [0, 1], ["6%", "-4%"]);

  const attendees = [85, 92, null];

  return (
    <section id="event" className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]) }}
        className="absolute top-1/2 right-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl -z-10"
      />

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
            {t(translations.events.subtitle)}
          </p>
        </motion.div>

        <motion.div style={{ y: cardsY }} className="max-w-3xl mx-auto flex flex-col gap-6">
          {translations.events.items.map((event, i) => (
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    event.status.id === "Selesai" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                  }`}>
                    {t(event.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t(event.date)}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {t(event.location)}</span>
                  {attendees[i] && (
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {attendees[i]} {t(translations.events.participants)}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default EventSection;
