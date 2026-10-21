import ArticlePage from '../components/ArticlePage';
import { OUTLIER_MARGIN } from '../components/lapChart';
import { CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { sitePages, STATISTICS_SINCE, TELEMETRY_SINCE } from '../seo/pages';

export default function MethodologyPage() {
  return (
    <ArticlePage
      seo={sitePages(CURRENT_SEASON_YEAR).methodology}
      eyebrow="Methodology"
      title="How the numbers are made"
      lead="Where METRIK DELTA's data comes from, what is computed from it and how, and where that data has limits."
    >
      <h2>Sources</h2>
      <ul>
        <li><strong>{TELEMETRY_SINCE} to {CURRENT_SEASON_YEAR - 1}</strong> — laps, sectors, car telemetry and positions from FastF1, which reads Formula 1's live timing archive.</li>
        <li><strong>{CURRENT_SEASON_YEAR}</strong> — the same channels from OpenF1, stored in our database within about an hour of the end of each session.</li>
        <li><strong>Results and standings since {STATISTICS_SINCE}</strong> — races, qualifying, sprints and championship standings from Jolpica (Ergast).</li>
      </ul>

      <h2>Lap and sector times</h2>
      <p>
        Lap and sector times are the official timing, never recomputed. The gap at the end of a lap comparison
        is therefore the official gap between the two laps.
      </p>

      <h2>Telemetry</h2>
      <p>
        Each car sends its speed, throttle, brake, gear and RPM about four times a second, and its position on
        track separately. At 300 km/h, that is a sample every 20 metres or so.
      </p>
      <ul>
        <li>A lap is cut exactly between its two crossings of the line, from its official start time and duration.</li>
        <li>The distance along the lap is computed from the speed, sample by sample, and counted from the line.</li>
        <li>Laps of the same session are lined up on the first lap of the comparison by their positions on track, so a corner sits at the same distance for every driver.</li>
        <li>Every channel is then resampled onto a common grid of 1,000 points along the lap.</li>
      </ul>

      <h2>Time gap along the lap</h2>
      <p>
        For each lap, the time taken to reach every point is built up from its speed, then scaled so that the lap
        ends exactly on its official time. The gap is the difference between those times: above zero, the driver
        is behind the reference lap at that point of the track.
      </p>

      <h2>Corners, track dominance and mini-sectors</h2>
      <ul>
        <li><strong>Corner numbers</strong> are the official ones, from FastF1's circuit data, placed on the lap by their position. A circuit new to the calendar may have none yet.</li>
        <li><strong>Track dominance</strong> draws each point of the circuit in the colour of the driver going fastest there.</li>
        <li><strong>Mini-sectors</strong> split the lap into 24 equal lengths; each goes to the driver with the highest average speed in it.</li>
      </ul>

      <h2>Lap chart</h2>
      <p>
        Every timed lap of the session, each dot in the colour of its tyre. Laps more than {OUTLIER_MARGIN} seconds
        off the session's best (pit stops, safety car, red flags) are hidden by default so they don't flatten the
        chart: one click shows them, and the table always lists them.
      </p>

      <h2>Statistics</h2>
      <ul>
        <li><strong>Head to head</strong> counts who was classified ahead in every race, qualifying session and sprint both drivers took part in. Official classifications also rank drivers who retired, by distance covered, so a retirement still counts.</li>
        <li><strong>Sprint qualifying</strong> is compared from the sprint's starting grid.</li>
        <li><strong>Standings</strong> are the official driver and constructor standings.</li>
        <li><strong>Retirements</strong> are grouped by cause from the official status: accident, mechanical, disqualified, withdrew. Since 2023 the source often just says "Retired", and the site shows it as such.</li>
      </ul>

      <h2>Limits</h2>
      <ul>
        <li>At about four samples a second, braking points less than about 20 metres apart can't be told apart.</li>
        <li>The live feed sometimes drops out for a second or two and repeats its last values: the speed trace then shows a short flat line. The data is shown as received.</li>
        <li>Lap distances are computed, so they can differ from official circuit lengths by about 1%.</li>
        <li>Current-season sessions appear once they have ended and been processed, usually within the hour.</li>
        <li>Statistics follow the Jolpica database: corrections made there show up here.</li>
      </ul>
      <p>
        Spotted something that looks wrong? Write to <a href="mailto:contact@metrikdelta.com">contact@metrikdelta.com</a>.
      </p>
    </ArticlePage>
  );
}
