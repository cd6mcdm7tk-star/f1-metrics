// Each page's title, description and address: rendered by SEO.tsx once the
// app runs, and written into the page's HTML at build time (vite.config.ts)
// for crawlers and link previews that don't run JavaScript.

export const SITE_URL = 'https://metrikdelta.com';

/** The first season of each kind of data the site has */
export const TELEMETRY_SINCE = 2018;
export const STATISTICS_SINCE = 2003;

export interface PageSeo {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  /** Page-specific JSON-LD */
  structuredData?: object;
  /** Kept out of search results */
  noindex?: boolean;
}

const breadcrumb = (name: string, path: string) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
  ],
});

/** The pages search engines should find, as of the season `year` */
export function sitePages(year: number) {
  return {
    home: {
      path: '/',
      title: 'METRIK DELTA - Professional F1 Telemetry Analysis',
      description: `Compare Formula 1 drivers lap by lap — speed, throttle, braking and gear telemetry, tire strategy and full head-to-head statistics, ${TELEMETRY_SINCE} to ${year}.`,
      keywords: 'f1 telemetry, formula 1 analysis, f1 data, f1 standings, f1 results, grand prix results, f1 telemetry comparison, race strategy f1, télémétrie f1',
    },
    telemetry: {
      path: '/app',
      title: 'F1 Telemetry Comparison — Speed, Throttle & Brake Charts | METRIK DELTA',
      description: `Compare any two Formula 1 drivers' telemetry lap by lap: speed, throttle, braking, gear shifts, sector times and tire strategy for every session from ${TELEMETRY_SINCE} to ${year}.`,
      keywords: 'f1 telemetry comparison, formula 1 speed trace, f1 throttle brake data, f1 lap comparison, f1 sector times, f1 tire strategy, télémétrie f1',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'F1 Telemetry Comparison',
        description: "Compare Formula 1 drivers' telemetry lap by lap — speed, throttle, braking, gear and tire strategy.",
        url: `${SITE_URL}/app`,
        breadcrumb: breadcrumb('Telemetry', '/app'),
      },
    },
    statistics: {
      path: '/stats',
      title: 'F1 Driver Statistics & Head-to-Head Comparison - METRIK DELTA',
      description: `Compare Formula 1 drivers head-to-head season by season: wins, podiums, poles, qualifying and race results, with the driver and constructor standings, from ${STATISTICS_SINCE} to ${year}.`,
      keywords: 'f1 driver statistics, formula 1 h2h, f1 driver comparison, f1 qualifying stats, f1 race stats, f1 standings, compare f1 drivers',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'F1 Driver Statistics',
        description: 'Compare Formula 1 drivers head-to-head, season by season.',
        url: `${SITE_URL}/stats`,
        breadcrumb: breadcrumb('Statistics', '/stats'),
      },
    },
    about: {
      path: '/about',
      title: 'About METRIK DELTA — Independent F1 Telemetry & Statistics',
      description: 'Who builds METRIK DELTA, what it does, where its Formula 1 data comes from and how to get in touch.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About METRIK DELTA',
        url: `${SITE_URL}/about`,
        breadcrumb: breadcrumb('About', '/about'),
      },
    },
    methodology: {
      path: '/methodology',
      title: 'Methodology — How METRIK DELTA Computes F1 Telemetry & Statistics',
      description: `How lap times, telemetry, time deltas, track dominance and head-to-head statistics are computed on METRIK DELTA from FastF1, OpenF1 and Jolpica data, ${STATISTICS_SINCE} to ${year}, and where that data has limits.`,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'METRIK DELTA methodology',
        url: `${SITE_URL}/methodology`,
        breadcrumb: breadcrumb('Methodology', '/methodology'),
      },
    },
  } satisfies Record<string, PageSeo>;
}

export const NOT_FOUND: PageSeo = {
  path: '/404',
  title: 'Page not found | METRIK DELTA',
  description: "This page doesn't exist. Compare Formula 1 telemetry and driver statistics on METRIK DELTA.",
  noindex: true,
};

/** The image link previews show */
export const SHARE_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: 'METRIK DELTA — F1 telemetry and statistics, with its donkey mascot in a race-engineer headset',
};

export interface HeadTag {
  tag: 'meta' | 'link';
  attrs: Record<string, string>;
}

/** The page's tags under <head>, besides its title and JSON-LD */
export function headTags(page: PageSeo): HeadTag[] {
  const url = `${SITE_URL}${page.path}`;
  const meta = (attrs: Record<string, string>): HeadTag => ({ tag: 'meta', attrs });
  return [
    meta({ name: 'description', content: page.description }),
    ...(page.keywords ? [meta({ name: 'keywords', content: page.keywords })] : []),
    meta({ name: 'robots', content: page.noindex ? 'noindex, follow' : 'index, follow' }),
    meta({ name: 'author', content: 'METRIK DELTA' }),
    ...(page.noindex ? [] : [{ tag: 'link' as const, attrs: { rel: 'canonical', href: url } }]),
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:url', content: url }),
    meta({ property: 'og:title', content: page.title }),
    meta({ property: 'og:description', content: page.description }),
    meta({ property: 'og:image', content: SHARE_IMAGE.url }),
    meta({ property: 'og:image:width', content: String(SHARE_IMAGE.width) }),
    meta({ property: 'og:image:height', content: String(SHARE_IMAGE.height) }),
    meta({ property: 'og:image:alt', content: SHARE_IMAGE.alt }),
    meta({ property: 'og:site_name', content: 'METRIK DELTA' }),
    meta({ property: 'og:locale', content: 'en_US' }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:url', content: url }),
    meta({ name: 'twitter:title', content: page.title }),
    meta({ name: 'twitter:description', content: page.description }),
    meta({ name: 'twitter:image', content: SHARE_IMAGE.url }),
    meta({ name: 'twitter:image:alt', content: SHARE_IMAGE.alt }),
  ];
}
