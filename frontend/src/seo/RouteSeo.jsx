import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "./Seo";
import { buildCanonical, getSeoForPath, getSiteUrl } from "./seoConfig";

export default function RouteSeo() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const meta = useMemo(() => {
    const siteUrl = getSiteUrl();
    const seo = getSeoForPath(location.pathname);
    const canonical = buildCanonical(siteUrl, location.pathname);

    return {
      ...seo,
      title: seo.titleKey
        ? t(seo.titleKey, { defaultValue: seo.title })
        : seo.title,
      description: seo.descriptionKey
        ? t(seo.descriptionKey, { defaultValue: seo.description })
        : seo.description,
      canonical,
      image: `${siteUrl}/og-image.svg`,
    };
  }, [i18n.language, location.pathname, t]);

  return <Seo {...meta} />;
}
