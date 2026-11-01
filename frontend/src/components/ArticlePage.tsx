import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { PageSeo } from '../seo/pages';
import LegalLinks from './LegalLinks';
import PageHeader from './PageHeader';
import SEO from './SEO';

/** A long-form page (Methodology, Legal): the app's header, a readable column
 * styled by `.article` in index.css, a close button, and the footer links. */
export default function ArticlePage({ seo, eyebrow, title, lead, children }: {
  seo: PageSeo;
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Back to where the reader came from on the site, or home when the page was opened directly
  const close = () => (location.key === 'default' ? navigate('/') : navigate(-1));

  return (
    <div className="data-zone" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <SEO page={seo} />
      <PageHeader />
      <main style={{ flex: 1 }}>
        <article className="article">
          <div className="article-top">
            <p className="eyebrow">{eyebrow}</p>
            <button type="button" className="article-close" onClick={close} aria-label="Close">
              <X size={16} />
            </button>
          </div>
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
