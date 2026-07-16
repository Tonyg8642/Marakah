import { StaticRouter } from "react-router";
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import App from "./App";
import AppProviders from "./AppProviders";
import "./i18n";
import { buildCanonical, getSeoForPath } from "./seo/seoConfig";

function renderAppToString(url) {
  return new Promise((resolve, reject) => {
    let appHtml = "";
    let didError = false;

    const stream = renderToPipeableStream(
      <StaticRouter location={url}>
        <AppProviders>
          <App />
        </AppProviders>
      </StaticRouter>,
      {
        onAllReady() {
          const sink = new Writable({
            write(chunk, _encoding, callback) {
              appHtml += chunk.toString();
              callback();
            },
          });

          sink.on("finish", () => {
            if (didError) {
              reject(new Error("SSR rendering completed with errors."));
              return;
            }

            resolve(appHtml);
          });

          sink.on("error", (error) => {
            reject(error);
          });

          stream.pipe(sink);
        },
        onShellError(error) {
          reject(error);
        },
        onError() {
          didError = true;
        },
      },
    );
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHeadTags(pathname, siteUrl) {
  const seo = getSeoForPath(pathname);
  const canonical = buildCanonical(siteUrl, pathname);
  const image = `${siteUrl}/og-image.svg`;
  const robots = seo.index ? "index,follow" : "noindex,nofollow";

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(seo.keywords || "")}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join("\n    ");
}

export async function render(url, siteUrl) {
  const appHtml = await renderAppToString(url);

  return {
    appHtml,
    headTags: buildHeadTags(url, siteUrl),
  };
}
