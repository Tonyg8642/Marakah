import { I18nextProvider } from "react-i18next";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PageTranslationProvider } from "./contexts/PageTranslationContext";
import i18n from "./i18n";

export default function AppProviders({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <PageTranslationProvider>{children}</PageTranslationProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}
