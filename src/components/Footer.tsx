import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="py-6 border-t border-border bg-card">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Meta Community. {t(translations.footer.copyright)}</span>
        <div className="flex gap-6">
          <Link to="/kebijakan-privasi" className="hover:text-foreground transition-colors">{t(translations.footer.privacy)}</Link>
          <Link to="/syarat-layanan" className="hover:text-foreground transition-colors">{t(translations.footer.terms)}</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
