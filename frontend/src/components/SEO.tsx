import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  path?: string;
}

export default function SEO({
  title,
  description,
  keywords,
  image = 'https://metrikdelta.com/og-image.png',
  type = 'website',
  path = ''
}: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const baseUrl = 'https://metrikdelta.com';
  const fullUrl = `${baseUrl}${path}`;

  // Titres par défaut par langue
  const defaultTitles: { [key: string]: string } = {
    fr: 'METRIK DELTA - Analyse Télémétrie F1 Professionnelle',
    en: 'METRIK DELTA - Professional F1 Telemetry Analysis',
    es: 'METRIK DELTA - Análisis Profesional Telemetría F1'
  };

  // Descriptions par défaut par langue
  const defaultDescriptions: { [key: string]: string } = {
    fr: 'Plateforme d\'analyse télémétrie F1 avec graphiques détaillés, animations GPS, stratégie pit wall et données championship 2018-2025. Requêtes illimitées avec METRIK+.',
    en: 'Professional F1 telemetry analysis platform with detailed charts, GPS animations, pit wall strategy and championship data 2018-2025. Unlimited requests with METRIK+.',
    es: 'Plataforma profesional de análisis de telemetría F1 con gráficos detallados, animaciones GPS, estrategia pit wall y datos campeonato 2018-2025. Solicitudes ilimitadas con METRIK+.'
  };

  // Keywords par défaut par langue
  const defaultKeywords: { [key: string]: string } = {
    fr: 'télémétrie f1, analyse f1, données f1, classement f1, résultat f1, grand prix f1 résultat, comparaison pilotes f1, stratégie course f1',
    en: 'f1 telemetry, formula 1 analysis, f1 data analysis, f1 standings, f1 results, grand prix results, f1 telemetry comparison, race strategy f1',
    es: 'telemetría f1, análisis f1, datos f1, clasificación f1, resultados f1, resultados gran premio f1, comparación pilotos f1, estrategia carrera f1'
  };

  const pageTitle = title || defaultTitles[currentLang] || defaultTitles.en;
  const pageDescription = description || defaultDescriptions[currentLang] || defaultDescriptions.en;
  const pageKeywords = keywords || defaultKeywords[currentLang] || defaultKeywords.en;

  // Langues alternatives pour hreflang
  const languages = ['fr', 'en', 'es'];
  const alternateUrls = languages.map(lang => ({
    lang,
    url: `${baseUrl}${lang !== 'en' ? `/${lang}` : ''}${path}`
  }));

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={currentLang} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={currentLang === 'fr' ? 'fr_FR' : currentLang === 'es' ? 'es_ES' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />

      {/* Hreflang Tags */}
      {alternateUrls.map(({ lang, url }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={url} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${path}`} />

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="METRIK DELTA" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
  );
}