import React from 'react';
import { Link } from 'react-router-dom';

const text = '#f2e6d8';
const text3 = 'rgba(242,230,216,0.32)';
const link: React.CSSProperties = { color: text, textDecoration: 'underline' };

const h3: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16,
  letterSpacing: '0.02em', textTransform: 'uppercase', color: text, margin: '0 0 8px',
};
const p: React.CSSProperties = { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6 };
const ul: React.CSSProperties = { margin: '4px 0 8px', paddingLeft: 20, fontSize: 13, lineHeight: 1.7, listStyle: 'disc' };
const strong: React.CSSProperties = { color: text, fontWeight: 700 };
const section: React.CSSProperties = { marginBottom: 22 };

const external = { target: '_blank', rel: 'noopener noreferrer', style: link };

/** Legal notice, personal data and terms of use, in one document */
const LegalContent: React.FC = () => {
  return (
    <div>
      <p style={{ ...p, color: text3, fontSize: 'var(--fs-11)' }}>Last updated: November 1, 2026</p>

      <section style={section}>
        <h3 style={h3}>Publisher</h3>
        <p style={p}><span style={strong}>METRIK DELTA</span>, sole proprietorship (entrepreneur individuel), France</p>
        <p style={p}>SIRET: 993 106 186 00014</p>
        <p style={p}>Address: France</p>
        <p style={p}>Email: <a href="mailto:contact@metrikdelta.com" style={link}>contact@metrikdelta.com</a></p>
        <p style={p}>Publication director: the sole proprietor of METRIK DELTA.</p>
      </section>

      <section style={section}>
        <h3 style={h3}>Hosting</h3>
        <p style={p}>
          <span style={strong}>Website:</span> Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723,
          United States (<a href="https://vercel.com/legal" {...external}>vercel.com/legal</a>)
        </p>
        <p style={p}>
          <span style={strong}>API and database:</span> Railway Corporation, 548 Market St PMB 68956, San Francisco,
          CA 94104, United States (<a href="https://railway.com/legal" {...external}>railway.com/legal</a>)
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>Personal data</h3>
        <p style={p}>
          There are no accounts and no cookies, and the site asks you for nothing. What a visit leaves behind:
        </p>
        <ul style={ul}>
          <li>your IP address, in the hosting providers' technical logs, kept for their standard periods;</li>
          <li>a count of pages visited, with browser, device type and country, from Vercel and Cloudflare Web Analytics, which use no cookies;</li>
          <li>your email, if you write to us, kept as long as the conversation needs it.</li>
        </ul>
        <p style={p}>
          The site keeps its data cache and your last page in your browser's local storage, which never leaves
          your device. Vercel, Railway and Cloudflare (DNS and protection against attacks) may process data in
          the United States, under the European Commission's Standard Contractual Clauses.
        </p>
        <p style={p}>
          You can ask for access to or deletion of your data, or object to its use, at the email above, and complain
          to the CNIL (<a href="https://www.cnil.fr" {...external}>cnil.fr</a>).
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>Terms of use</h3>
        <ul style={ul}>
          <li>
            The site is free. Please don't scrape it or send it automated traffic that slows it down for others,
            and don't resell its data: it belongs to its sources (FastF1, OpenF1, Jolpica) and stays under their terms.
          </li>
          <li>
            The <a href="https://github.com/cd6mcdm7tk-star/f1-metrics" {...external}>source code</a> is published under
            the GNU Affero General Public License v3.0: you can use, study, change and share it, and if you run a
            changed version as a service, you publish your changes too. The license covers the code only, not the
            METRIK DELTA name, logo, mascot or videos.
          </li>
          <li>
            METRIK DELTA is independent and not affiliated with Formula 1. Formula 1 trademarks, names and official
            data belong to Formula One World Championship Limited.
          </li>
          <li>
            The data is shown as received and can be incomplete, late or wrong at the source; how far to trust each
            number is explained on the <Link to="/methodology" style={link}>Methodology</Link> page. The site comes
            without warranty, and is not meant for betting.
          </li>
          <li>These terms are governed by French law, and disputes go to the French courts.</li>
        </ul>
      </section>
    </div>
  );
};

export default LegalContent;
