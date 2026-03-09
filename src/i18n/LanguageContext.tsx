import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Language } from "./translations";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (obj: Record<Language, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "id";
  });

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "id" ? "en" : "id";
      localStorage.setItem("lang", next);
      return next;
    });
  }, []);

  const t = useCallback(
    (obj: Record<Language, string>) => obj[language],
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
