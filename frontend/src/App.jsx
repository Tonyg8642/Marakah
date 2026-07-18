import AppRouter from "./router/AppRouter";
import RouteSeo from "./seo/RouteSeo";
import { useLanguagePreference } from "./contexts/LanguageContext";
import { useTranslation } from "react-i18next";

export default function App() {
  const { t } = useTranslation();
  const { isLanguageReady } = useLanguagePreference();

  if (!isLanguageReady) {
    return (
      <div className="page" role="status" aria-live="polite">
        {t("language.appLoading", {
          defaultValue: "Loading your preferred language...",
        })}
      </div>
    );
  }

  return (
    <>
      <RouteSeo />
      <AppRouter />
    </>
  );
}
