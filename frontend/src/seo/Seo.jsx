import { useEffect } from "react";

function upsertMetaAttribute(attrName, attrValue, content) {
  const selector = `meta[${attrName}="${attrValue}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", href);
}

export default function Seo({
  title,
  description,
  keywords,
  canonical,
  image,
  index = true,
}) {
  useEffect(() => {
    const robots = index ? "index,follow" : "noindex,nofollow";

    document.title = title;
    upsertMetaAttribute("name", "description", description);
    upsertMetaAttribute("name", "keywords", keywords || "");
    upsertMetaAttribute("name", "robots", robots);
    upsertCanonical(canonical);

    upsertMetaAttribute("property", "og:type", "website");
    upsertMetaAttribute("property", "og:title", title);
    upsertMetaAttribute("property", "og:description", description);
    upsertMetaAttribute("property", "og:url", canonical);
    upsertMetaAttribute("property", "og:image", image);

    upsertMetaAttribute("name", "twitter:card", "summary_large_image");
    upsertMetaAttribute("name", "twitter:title", title);
    upsertMetaAttribute("name", "twitter:description", description);
    upsertMetaAttribute("name", "twitter:image", image);
  }, [canonical, description, image, index, keywords, title]);

  return null;
}
