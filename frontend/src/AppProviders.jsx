import { I18nextProvider } from "react-i18next";
import { LanguageProvider } from "./contexts/LanguageContext";
import i18n from "./i18n";

export default function AppProviders({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
}
