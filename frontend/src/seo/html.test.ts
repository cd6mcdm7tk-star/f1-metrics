import { describe, expect, it } from 'vitest';
import { headHtml, sitemap, withHead } from './html';
import { NOT_FOUND, sitePages } from './pages';

const pages = sitePages(2026);
const shell = '<html><head><title>Generic</title><meta name="theme-color" content="#5e1018" /></head><body></body></html>';

describe('page heads written at build time', () => {
  it("writes the page's own title, description, canonical address and preview", () => {
    const html = withHead(shell, pages.telemetry);
    expect(html).not.toContain('Generic');
    expect(html).toContain('<title data-rh="true">F1 Telemetry Comparison — Speed, Throttle &amp; Brake Charts | METRIK DELTA</title>');
    expect(html).toContain('<link data-rh="true" rel="canonical" href="https://metrikdelta.com/app" />');
    expect(html).toContain('property="og:image" content="https://metrikdelta.com/og-image.png"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<meta name="theme-color" content="#5e1018" />');
  });

  it("marks every tag as react-helmet-async's own, so the app replaces them", () => {
    const tags = headHtml(pages.home).split('\n');
    expect(tags.every(tag => tag.includes('data-rh="true"'))).toBe(true);
  });

  it('escapes quotes and keeps the 404 page out of search results', () => {
    const html = headHtml(NOT_FOUND);
    expect(html).toContain("content=\"This page doesn't exist.");
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).not.toContain('rel="canonical"');
    expect(headHtml({ ...NOT_FOUND, description: 'A "quoted" <word>' })).toContain('A &quot;quoted&quot; &lt;word&gt;');
  });

  it('needs a title in the shell to replace', () => {
    expect(() => withHead('<html><head></head></html>', pages.home)).toThrow();
  });
});

describe('sitemap', () => {
  it('lists the indexable pages with the date given', () => {
    const xml = sitemap([...Object.values(pages), NOT_FOUND], '2026-10-21');
    expect(xml.match(/<loc>/g)).toHaveLength(5);
    expect(xml).toContain('<loc>https://metrikdelta.com/methodology</loc>');
    expect(xml).toContain('<loc>https://metrikdelta.com/stats</loc>');
    expect(xml).not.toContain('/404');
    expect(xml).toContain('<lastmod>2026-10-21</lastmod>');
  });
});
