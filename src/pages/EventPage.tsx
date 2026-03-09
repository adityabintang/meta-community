import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const EventPage = () => {
  const { t } = useLanguage();

  const completed = translations.events.items.filter((e) => e.status.id === "Selesai");
  const upcoming = translations.events.items.filter((e) => e.status.id !== "Selesai");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> {t(translations.legal.backHome)}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
              {t(translations.events.badge)}
            </span>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              {t(translations.events.pageTitle1)} <span className="text-accent">{t(translations.events.pageTitleAccent)}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t(translations.events.pageSubtitle)}
            </p>
          </motion.div>

          {/* Upcoming Events */}
          {upcoming.length > 0 && (
            <div className="max-w-3xl mx-auto mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {t(translations.events.upcoming)}
              </motion.h2>
              <div className="flex flex-col gap-5">
                {upcoming.map((event, i) => (
                  <motion.div
                    key={`upcoming-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                    className="p-6 rounded-2xl bg-card shadow-card border border-primary/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-60" />
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display font-semibold text-foreground text-lg">{t(event.title)}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                            {t(event.status)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t(event.description)}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t(event.date)}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {t(event.location)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Events */}
          <div className="max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-3"
            >
              <span className="w-2 h-2 rounded-full bg-accent" />
              {t(translations.events.completed)}
            </motion.h2>
            <div className="flex flex-col gap-5">
              {completed.map((event, i) => (
                <motion.div
                  key={`completed-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="p-6 rounded-2xl bg-card shadow-card border border-border/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-display font-semibold text-foreground text-lg">{t(event.title)}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
                          {t(event.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t(event.description)}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t(event.date)}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {t(event.location)}</span>
                        {event.attendees && (
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {event.attendees} {t(translations.events.participants)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
