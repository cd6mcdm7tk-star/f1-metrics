import { Link } from 'react-router-dom';
import ArticlePage from '../components/ArticlePage';
import { CURRENT_SEASON_YEAR } from '../utils/season';
import { sitePages } from '../seo/pages';

const external = { target: '_blank', rel: 'noopener noreferrer' };

export default function LegalPage() {
  return (
    <ArticlePage
      seo={sitePages(CURRENT_SEASON_YEAR).legal}
      eyebrow="Legal"
      title="Legal notice, data and terms"
      lead="Who publishes METRIK DELTA, where it is hosted, what a visit leaves behind, and the few rules for using it. Last updated on 1 November 2026."
    >
      <h2>Publisher</h2>
      <p>
        METRIK DELTA, sole proprietorship (entrepreneur individuel), France.<br />
        SIRET: 993 106 186 00014<br />
        Address: France<br />
        Email: <a href="mailto:contact@metrikdelta.com">contact@metrikdelta.com</a><br />
        Publication director: the sole proprietor of METRIK DELTA.
      </p>

      <h2>Hosting</h2>
      <ul>
        <li>
          <strong>Website:</strong> Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States
          (<a href="https://vercel.com/legal" {...external}>vercel.com/legal</a>).
        </li>
        <li>
          <strong>API and database:</strong> Railway Corporation, 548 Market St PMB 68956, San Francisco, CA 94104,
          United States (<a href="https://railway.com/legal" {...external}>railway.com/legal</a>).
        </li>
      </ul>

      <h2>Personal data</h2>
      <p>There are no accounts and no cookies, and the site asks you for nothing. What a visit leaves behind:</p>
      <ul>
        <li>your IP address, in the hosting providers' technical logs, kept for their standard periods;</li>
        <li>a count of pages visited, with browser, device type and country, from Vercel and Cloudflare Web Analytics, which use no cookies;</li>
        <li>your email, if you write to us, kept as long as the conversation needs it;</li>
        <li>
          what you send with the Feedback form: your message, the page you were on, and your email if you give it,
          kept in our database for twelve months at most.
        </li>
      </ul>
      <p>
        The site keeps its data cache and your last page in your browser's local storage, which never leaves your
        device. Vercel, Railway and Cloudflare (DNS and protection against attacks) may process data in the United
        States, under the European Commission's Standard Contractual Clauses. Our mailbox is hosted by Infomaniak, in
        Switzerland.
      </p>
      <p>
        You can ask for access to or deletion of your data, or object to its use, at the email above, and complain to
        the CNIL (<a href="https://www.cnil.fr" {...external}>cnil.fr</a>).
      </p>

      <h2>Terms of use</h2>
      <ul>
        <li>
          The site is free. Please don't scrape it or send it automated traffic that slows it down for others, and
          don't resell its data: it belongs to its sources (FastF1, OpenF1, Jolpica) and stays under their terms.
        </li>
        <li>
          The <a href="https://github.com/cd6mcdm7tk-star/f1-metrics" {...external}>source code</a> is published under the
          GNU Affero General Public License v3.0: you can use, study, change and share it, and if you run a changed
          version as a service, you publish your changes too. The license covers the code only, not the METRIK DELTA
          name, logo, mascot or videos.
        </li>
        <li>
          METRIK DELTA is independent and not affiliated with Formula 1. Formula 1 trademarks, names and official data
          belong to Formula One World Championship Limited.
        </li>
        <li>
          The data is shown as received and can be incomplete, late or wrong at the source; how far to trust each
          number is explained on the <Link to="/methodology">Methodology</Link> page. The site comes without warranty,
          and is not meant for betting.
        </li>
        <li>These terms are governed by French law, and disputes go to the French courts.</li>
      </ul>
    </ArticlePage>
  );
}
