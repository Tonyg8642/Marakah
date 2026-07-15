import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_SEO } from "../src/seo/seoConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

function resolveSiteUrl() {
  const raw = process.env.VITE_SITE_URL || "";

  if (!raw.trim()) {
    throw new Error(
      "[SEO Build] Missing VITE_SITE_URL. Set VITE_SITE_URL to your deployed frontend URL, e.g. https://marakah.com",
    );
  }

  if (!/^https:\/\//i.test(raw)) {
    throw new Error(
      `[SEO Build] VITE_SITE_URL must start with https://. Received: ${raw}`,
    );
  }

  if (/localhost|127\.0\.0\.1/i.test(raw)) {
    throw new Error(
      `[SEO Build] VITE_SITE_URL cannot be localhost for production sitemap generation. Received: ${raw}`,
    );
  }

  return raw.replace(/\/$/, "");
}

const SITE_URL = resolveSiteUrl();
const today = new Date().toISOString();

const entries = Object.entries(ROUTE_SEO)
  .filter(([, meta]) => meta.index)
  .map(([route, meta]) => {
    const loc = `${SITE_URL}${route}`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${meta.changefreq}</changefreq>`,
      `    <priority>${meta.priority}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  entries,
  "</urlset>",
  "",
].join("\n");

await writeFile(path.join(publicDir, "sitemap.xml"), xml, "utf8");

const robots = [
  "User-agent: *",
  "Allow: /",
  "",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  "",
].join("\n");

await writeFile(path.join(publicDir, "robots.txt"), robots, "utf8");
console.log("Generated public/sitemap.xml and public/robots.txt");
