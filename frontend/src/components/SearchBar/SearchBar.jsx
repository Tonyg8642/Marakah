import "./SearchBar.css";
import { useTranslation } from "react-i18next";

export default function SearchBar() {
  const { t } = useTranslation();

  return (
    <div className="searchbar">
      <label className="sr-only" htmlFor="global-search">
        {t("search.label")}
      </label>
      <input
        id="global-search"
        type="search"
        placeholder={t("search.placeholder")}
      />
    </div>
  );
}
