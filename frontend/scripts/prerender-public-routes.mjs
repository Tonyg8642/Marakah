import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { ROUTE_SEO } from "../src/seo/seoConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

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
      `[SEO Build] VITE_SITE_URL cannot be localhost for production prerendering. Received: ${raw}`,
    );
  }

  return raw.replace(/\/$/, "");
}

function getPublicPrerenderRoutes() {
  return Object.entries(ROUTE_SEO)
    .filter(([, meta]) => meta.index)
    .map(([route]) => route)
    .filter((route) => route !== "/login" && route !== "/profile");
}

function injectHead(baseHtml, headTags) {
  return baseHtml.replace("<!-- SEO_HEAD -->", headTags);
}

function injectAppHtml(baseHtml, appHtml) {
  return baseHtml.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
  );
}

async function writeRouteHtml(route, html) {
  const outputPath =
    route === "/"
      ? path.join(distDir, "index.html")
      : path.join(distDir, route.slice(1), "index.html");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}

async function run() {
  const siteUrl = resolveSiteUrl();
  const routes = getPublicPrerenderRoutes();

  const vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
    logLevel: "error",
  });

  try {
    const template = await readFile(path.join(distDir, "index.html"), "utf8");
    const { render } = await vite.ssrLoadModule("/src/entry-server.jsx");

    for (const route of routes) {
      const { appHtml, headTags } = await render(route, siteUrl);
      const withHead = injectHead(template, headTags);
      const html = injectAppHtml(withHead, appHtml);
      await writeRouteHtml(route, html);
      console.log(`[prerender] ${route}`);
    }

    console.log("Prerender complete.");
  } finally {
    await vite.close();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
