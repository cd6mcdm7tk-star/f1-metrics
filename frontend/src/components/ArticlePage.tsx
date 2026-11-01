import type { ReactNode } from 'react';
import type { PageSeo } from '../seo/pages';
import LegalLinks from './LegalLinks';
import PageHeader from './PageHeader';
import SEO from './SEO';

/** A long-form page (Methodology): the app's header, a readable column
 * styled by `.article` in index.css, and the footer links. */
export default function ArticlePage({ seo, eyebrow, title, lead, children }: {
  seo: PageSeo;
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="data-zone" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <SEO page={seo} />
      <PageHeader />
      <main style={{ flex: 1 }}>
        <article className="article">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {children}
        </article>
      </main>
      <footer style={{ display: 'flex', justifyContent: 'center', padding: '16px 20px 24px', borderTop: '1px solid var(--border)' }}>
        <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize="var(--fs-9)" />
      </footer>
    </div>
  );
}
