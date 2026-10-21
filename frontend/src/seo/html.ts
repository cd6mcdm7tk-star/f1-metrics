// The build's side of the pages' SEO: their head written into the static
// HTML, and the sitemap. Tags carry react-helmet-async's own attribute, so
// SEO.tsx replaces them instead of adding a second copy once the app runs.
import { headTags, SITE_URL, type PageSeo } from './pages';

const HELMET = 'data-rh="true"';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The page's title, tags and JSON-LD as HTML */
export function headHtml(page: PageSeo): string {
  const tags = headTags(page).map(({ tag, attrs }) =>
    `<${tag} ${HELMET} ${Object.entries(attrs).map(([k, v]) => `${k}="${escape(v)}"`).join(' ')} />`);
  const jsonLd = page.structuredData
    ? [`<script ${HELMET} type="application/ld+json">${JSON.stringify(page.structuredData).replace(/</g, '\\u003c')}</script>`]
    : [];
  return [`<title ${HELMET}>${escape(page.title)}</title>`, ...tags, ...jsonLd].join('\n');
}

/** The app's HTML shell with the page's head in place of the generic title */
export function withHead(shell: string, page: PageSeo): string {
  if (!/<title>[^<]*<\/title>/.test(shell)) throw new Error('No <title> in the HTML shell');
  return shell.replace(/<title>[^<]*<\/title>/, headHtml(page));
}

/** The sitemap of the pages search engines should find */
export function sitemap(pages: PageSeo[], lastmod: string): string {
  const urls = pages.filter(p => !p.noindex).map(p => [
    '  <url>',
    `    <loc>${SITE_URL}${p.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '  </url>',
  ].join('\n'));
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}
