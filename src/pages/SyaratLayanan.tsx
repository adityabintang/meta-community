import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";

const SyaratLayanan = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> {t(translations.legal.backHome)}
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-8">{t(translations.legal.termsTitle)}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t(translations.legal.lastUpdated)}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          {translations.legal.termsSections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3">{t(section.title)}</h2>
              <p>{t(section.content)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SyaratLayanan;
