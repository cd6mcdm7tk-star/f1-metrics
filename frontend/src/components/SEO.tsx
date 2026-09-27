import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  path?: string;
  structuredData?: object;
}

const BASE_URL = 'https://metrikdelta.com';

const DEFAULTS = {
  title: 'METRIK DELTA - Professional F1 Telemetry Analysis',
  description: 'Compare Formula 1 drivers lap by lap — speed, throttle, braking and gear telemetry, tire strategy and full head-to-head statistics from 2018 to 2026.',
  keywords: 'f1 telemetry, formula 1 analysis, f1 data, f1 standings, f1 results, grand prix results, f1 telemetry comparison, race strategy f1, télémétrie f1',
  image: `${BASE_URL}/og-image.png`,
};

export default function SEO({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  keywords = DEFAULTS.keywords,
  image = DEFAULTS.image,
  type = 'website',
  path = '',
  structuredData,
}: SEOProps) {
  const fullUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content="METRIK DELTA" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1000" />
      <meta property="og:image:height" content="1000" />
      <meta property="og:image:alt" content="METRIK DELTA — F1 telemetry and statistics platform" />
      <meta property="og:site_name" content="METRIK DELTA" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="METRIK DELTA — F1 telemetry and statistics platform" />

      {/* Page-specific JSON-LD */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
