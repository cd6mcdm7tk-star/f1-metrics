import { Link } from 'react-router-dom';
import ArticlePage from '../components/ArticlePage';
import { CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { sitePages, STATISTICS_SINCE, TELEMETRY_SINCE } from '../seo/pages';

export default function AboutPage() {
  return (
    <ArticlePage
      seo={sitePages(CURRENT_SEASON_YEAR).about}
      eyebrow="About"
      title="METRIK DELTA"
      lead="Formula 1 timing and telemetry, turned into charts you can read: two laps side by side, corner by corner, and two drivers' seasons head to head."
    >
      <h2>Who's behind it</h2>
      <p>
        METRIK DELTA is built and run by one independent developer in France, as a sole proprietorship
        (SIRET 993 106 186 00014). It has no team, investor or sponsor behind it, and it isn't affiliated
        with Formula 1.
      </p>

      <h2>What you can do</h2>
      <ul>
        <li>
          <strong><Link to="/app">Telemetry</Link></strong> — every lap of every session since {TELEMETRY_SINCE}, and up
          to 10 laps compared: speed, throttle, brake, gear, RPM, the time gap along the lap, track dominance
          and the speed through each corner. Charts export as high-resolution images.
        </li>
        <li>
          <strong><Link to="/stats">Statistics</Link></strong> — two drivers' season head to head since {STATISTICS_SINCE}:
          races, qualifying and sprints, with the driver and constructor standings.
        </li>
        <li>
          <strong>PRO</strong> — every past season is free. PRO adds the current season and HD chart export,
          for €1.99 a month or €14.99 a year.
        </li>
      </ul>

      <h2>Where the data comes from</h2>
      <ul>
        <li>
          <a href="https://github.com/theOehrly/Fast-F1" target="_blank" rel="noopener noreferrer">FastF1</a> — the
          open-source library that reads Formula 1's live timing archive: laps and telemetry from {TELEMETRY_SINCE}.
        </li>
        <li>
          <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">OpenF1</a> — an open API of the live
          timing data: the current season.
        </li>
        <li>
          <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noopener noreferrer">Jolpica</a>, the
          successor of the Ergast API — results, qualifying, sprints and standings.
        </li>
      </ul>
      <p>
        Thanks to the people who maintain them. How each number on the site is computed from this data, and
        where it has limits, is on the <Link to="/methodology">Methodology</Link> page.
      </p>

      <h2>How it's built</h2>
      <p>
        A React and TypeScript front end, and a Python (FastAPI) back end with a PostgreSQL database. Each session
        of the current season is stored within about an hour of its end; earlier seasons are read from the
        archive. The calculations behind the charts are covered by automated tests.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, ideas, or a number that looks wrong: <a href="mailto:contact@metrikdelta.com">contact@metrikdelta.com</a>,
        or @metrikdelta on X.
      </p>
      <p>
        Formula 1 trademarks, names and official data belong to Formula One World Championship Limited.
      </p>
    </ArticlePage>
  );
}
