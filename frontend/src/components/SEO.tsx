import { Helmet } from 'react-helmet-async';
import { headTags, type PageSeo } from '../seo/pages';

/** The page's title, description, canonical address, link preview and JSON-LD
 * (seo/pages.ts). The build writes the same tags into each page's HTML. */
export default function SEO({ page }: { page: PageSeo }) {
  return (
    <Helmet>
      <html lang="en" />
      <title>{page.title}</title>
      {headTags(page).map(({ tag: Tag, attrs }) => <Tag key={`${Tag}-${attrs.name ?? attrs.property ?? attrs.rel}`} {...attrs} />)}
      {page.structuredData && <script type="application/ld+json">{JSON.stringify(page.structuredData)}</script>}
    </Helmet>
  );
}
