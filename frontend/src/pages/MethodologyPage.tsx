import ArticlePage from '../components/ArticlePage';
import GapFigure from '../components/methodology/GapFigure';
import TurnOneFigure from '../components/methodology/TurnOneFigure';
import { OUTLIER_MARGIN } from '../components/lapChart';
import { CURRENT_SEASON_YEAR } from '../utils/season';
import { sitePages, STATISTICS_SINCE, TELEMETRY_SINCE } from '../seo/pages';

const OPENF1_SINCE = 2023;

export default function MethodologyPage() {
  return (
    <ArticlePage
      seo={sitePages(CURRENT_SEASON_YEAR).methodology}
      eyebrow="Methodology"
      title="How to read the charts, and how they're made"
      lead="What each chart shows and what to look for in it, then how every number is computed from the raw data, worked through on a real pole lap down to where it stops being reliable."
    >
      <h2>How to read the telemetry</h2>
      <p>
        A telemetry comparison is the same lap told several times, against the distance from the start line:
        speed, throttle, brake, gear, the time gap and the engine revs. Read the charts top to bottom at the same
        point of the track, one corner at a time. The thin vertical lines are the corners, numbered on top.
      </p>

      <h3>A corner, step by step</h3>
      <p>
        Turn 1 in Mexico City, on the pole laps of Lewis Hamilton (red) and George Russell (teal) in qualifying,
        31 October 2026. Hamilton took pole by nine thousandths.
      </p>
      <TurnOneFigure />
      <ol>
        <li><strong>Braking.</strong> The braking point is where the speed line starts to fall. Russell's falls first, Hamilton's a few metres later.</li>
        <li><strong>Entry.</strong> A few metres are enough: 50 metres further on, Hamilton is still 17 km/h faster, 293 against 276 km/h.</li>
        <li><strong>Minimum speed.</strong> The bottom of the valley is the slowest point of the corner: about 100 km/h for both. Neither gains much there.</li>
        <li><strong>Exit.</strong> Where the line climbs again, the driver is back on the throttle. Both are flat out at the same point, around 1.4 km.</li>
        <li><strong>Straight.</strong> Down to turn 4, Russell is 2 to 3 km/h faster all the way.</li>
      </ol>
      <p>
        The gap line underneath tells the same story in time: it climbs through turn 1 while Russell loses time,
        then slopes down the straight while he takes some back. So Hamilton gains on the brakes and Russell on the
        straight. For how much, use the sector times: further down this page, the time gap explains why.
      </p>

      <h3>What each chart tells you</h3>
      <ul>
        <li><strong>Speed</strong> is the shape of the lap. Peaks are the ends of the straights, valleys the corners: the deeper the valley, the slower the corner. Most of what you need is here.</li>
        <li><strong>Throttle</strong> is how far the pedal is pressed, from 0 to 100%. After a corner, look at who gets back to 100 first, and whether the line climbs cleanly or in steps: steps often mean the car is sliding and the driver is catching it.</li>
        <li><strong>Brake</strong> is only on or off. It shows where a driver brakes, never how hard.</li>
        <li><strong>Gear</strong> tells you the kind of corner: first or second for a hairpin, seventh or eighth for a fast curve. When two drivers use different gears in the same corner, they are taking it differently.</li>
        <li><strong>Delta</strong> is the time gap to the fastest lap of the comparison, whose line is the zero. Above zero, a driver is behind at that point. Read the slope, not the level: where it climbs, time is lost; where it falls, time is gained. In slow corners it can jump and come back, so look at where it settles after the corner.</li>
        <li><strong>RPM</strong> is the engine revs. The saw-tooth along a straight is the gear changes.</li>
        <li><strong>The track map</strong> draws each point of the circuit in the colour of the faster driver there. Don't count the colours: a metre in a slow corner lasts four times longer than a metre on a fast straight. Hover it for the speed at each corner.</li>
        <li><strong>Mini-sectors</strong> cut the lap into 24 equal pieces, each in the colour of the driver who spent the least time in it.</li>
        <li><strong>Sector times</strong> are the official timing. They are the ones to trust for how big a gap is.</li>
      </ul>

      <h3>The lap chart</h3>
      <p>
        Every lap of the session, one dot each, coloured by tyre. In a race, dots that climb lap after lap are tyres
        wearing out, a sudden drop after a gap is a pit stop and fresh tyres, and slow laps for everyone at once are a
        safety car. To compare two drivers' pace, look at the same tyres over the same laps rather than at their
        single best lap. Laps more than {OUTLIER_MARGIN} seconds off the best on the same tyres are hidden at first so they
        don't flatten the chart; one click brings them back, and the table always lists them.
      </p>

      <h2>How to read the statistics</h2>
      <ul>
        <li><strong>Head to head</strong> says who finished ahead more often, not by how much.</li>
        <li><strong>Average race position</strong> and <strong>points per race</strong> only count the races a driver finished, so a driver with several retirements can look better than their season was. Read them next to <strong>Reliability</strong>.</li>
        <li><strong>Pole conversion</strong> is the races won from pole position, out of all poles.</li>
      </ul>

      <h2>Where the data comes from</h2>
      <table>
        <thead>
          <tr><th>Seasons</th><th>Laps and telemetry</th><th>Results and standings</th></tr>
        </thead>
        <tbody>
          <tr><td>{STATISTICS_SINCE}–{TELEMETRY_SINCE - 1}</td><td>none</td><td>Jolpica</td></tr>
          <tr><td>{TELEMETRY_SINCE}–{OPENF1_SINCE - 1}</td><td>FastF1</td><td>Jolpica</td></tr>
          <tr><td>{OPENF1_SINCE}–{CURRENT_SEASON_YEAR}</td><td>OpenF1</td><td>Jolpica</td></tr>
        </tbody>
      </table>
      <p>
        <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">OpenF1</a> is an open API of the
        live timing feed. <a href="https://github.com/theOehrly/Fast-F1" target="_blank" rel="noopener noreferrer">FastF1</a> reads
        Formula 1's timing archive, which has asked for an F1 TV login since October 2026; its maintainer keeps a
        mirror of 2021 and 2022, so that is where the telemetry starts. <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noopener noreferrer">Jolpica</a> is
        the community database that took over from Ergast. Thanks to the people who keep all three running.
      </p>
      <p>
        Every qualifying session, sprint and race since {TELEMETRY_SINCE} is stored with each driver's fastest lap;
        in the current season, every lap of them, within about an hour of the end of the session. Anything else,
        practice laps for instance, is read from the source the first time someone asks for it.
      </p>

      <h2>One lap, from the feed to the chart</h2>
      <p>
        The example all the way down is the same pole: Hamilton's 1:16.514 against Russell's 1:16.523.
      </p>

      <h3>What the feed sends</h3>
      <p>
        OpenF1 sends each car's speed, throttle, brake, gear and RPM and, in a separate stream, its position on
        track. Over Hamilton's 76.5 seconds there are 267 car samples: 3.5 a second, usually 0.28 s apart, and
        one gap of 1.2 s. At 350 km/h the car covers 27 metres between two samples, so every trace on the site is
        drawn between points that far apart. The brake comes as 0 or 100: there is no brake pressure in the
        public data.
      </p>

      <h3>Cutting the lap at the line</h3>
      <p>
        The first sample of Hamilton's lap arrives 0.229 s after he crosses the line, at 276 km/h: 17.6 metres
        in. Counting the distance from that sample would push his whole lap 17.6 m down the road. So the lap is
        cut at the exact times the official timing gives for its start and end, and the values on the line are
        interpolated from the samples either side.
      </p>

      <h3>Distance</h3>
      <p>
        Distance is the speed added up over time. It comes to 4,245 m for Hamilton's lap and 4,243 m for
        Russell's, where the official length of the circuit is 4,304 m. Part of the 1.4% is real (the official
        length follows the middle of the track, and a qualifying lap cuts every corner), part comes from the
        sampling. It is good enough to compare two laps; the charts are not a way to measure a circuit.
      </p>

      <h3>Putting two laps on top of each other</h3>
      <p>
        Measured separately, two laps drift apart: OpenF1's lap start times can be a tenth of a second out, and a
        hole in the data loses a few metres. So Russell's lap is laid onto Hamilton's by position. Each of his GPS
        points is matched to the nearest point of Hamilton's path, the difference with his own distance is
        smoothed over 200 m, and his distance is corrected by it. On this lap the correction is typically 4.5 m
        and 10.6 m at most, around turn 11. Ten metres is enough to invent a later braking point.
      </p>
      <p>
        This only works for laps of the same Grand Prix, and only when the positions agree to within 150 m. A lap
        from another year is stretched to the length of the first lap instead, which lines the corners up, but
        not to the metre. All the laps are then read at the same 1,000 points: every 4.25 m in Mexico.
      </p>

      <h3>The time gap, and how far to trust it</h3>
      <p>
        For each lap, the time to reach each of the 1,000 points comes from its speed. Added up, Hamilton's lap
        gives 76.562 s and Russell's 76.619 s, where the official times are 76.514 and 76.523. So each lap's
        times are scaled to end on its official time. Without that, the gap at the finish would read 0.057 s
        instead of 0.009.
      </p>
      <p>
        The scaling makes the finish exact, not the middle of the lap. Against the official sector times of the
        same two laps, the curve has Russell 0.067 s behind at the end of sector 1, where the timing says 0.025,
        and 0.031 s behind at the end of sector 2, where the timing says 0.003.
      </p>
      <GapFigure />
      <p>
        The big swings come from distance, not time. When two laps are 5 metres out of line, the gap is off by
        the time it takes to cover 5 metres: 0.06 s at 300 km/h, 0.18 s at 100 km/h. That is why the curve jumps
        in slow corners and comes back after them. Read it for where a driver gains or loses between two
        straights, and take the size of the gain from the official sector times.
      </p>

      <h3>Corners</h3>
      <p>
        Corner numbers are the official ones. Since {OPENF1_SINCE}, their positions come from MultiViewer's circuit
        maps, found through OpenF1; before that, from FastF1. Each corner is placed on the lap at the nearest point
        of the first lap's path, searching only forward from the previous corner: in Baku's castle section,
        corners far apart in the lap sit close together on the map.
      </p>
      <p>
        The corner speed shown when you hover the track map is the speed where the official corner marker
        stands, which is not always the slowest point. In Mexico, Hamilton passes the turn 1 marker at
        115 km/h and is down to 96 km/h in turn 2.
      </p>

      <h3>Track dominance and mini-sectors</h3>
      <p>
        In Mexico, the track map shows Hamilton faster on only 34% of the lap, and he still took pole: the points
        are spread evenly along the lap, but not along the time it takes.
      </p>
      <p>
        Mini-sectors are 177 m long in Mexico. Until November 2026 they went to the highest average speed rather
        than the least time; on this lap, that picked the wrong driver in 3 of the 24.
      </p>

      <h2>Statistics, in detail</h2>
      <p>
        Results, qualifying, sprints and standings come from Jolpica, one file per season, and every head-to-head
        is counted in your browser from it.
      </p>
      <p>
        A head-to-head counts who was classified ahead in each event both drivers took part in. The official
        classification ranks drivers who retired by the distance they covered, so a retirement counts as a
        defeat. Hamilton against Leclerc in 2026, after 18 races: 9 each, and 4 of those were settled by a
        retirement (Leclerc in Monaco, Barcelona and Monza, Hamilton in Madrid).
      </p>
      <p>
        Qualifying compares the qualifying result, not the starting grid. In Hungary, Hamilton qualified second
        and started fifth: it counts as a qualifying win over Leclerc, who qualified third. Sprint qualifying has
        no table of its own in Jolpica, so it is compared from the sprint's starting grid, penalties included.
      </p>
      <p>
        Retirement causes come from the official status. Up to 2022 it gives one (engine, collision, gearbox…).
        From 2023 it mostly just says "Retired", and in 2026 the only statuses are Finished, Lapped, Retired and
        Did not start. The site shows those as "Retired (unspecified)" rather than guess. Standings are the
        official ones, sprints included.
      </p>

      <h2>What the data can't tell you</h2>
      <ul>
        <li>The live feed sometimes freezes for a second or two and repeats its last values: the trace then shows a short flat line. It is shown as received.</li>
        <li>With 27 m between samples at top speed, two braking points less than about 25 m apart can't be told apart.</li>
        <li>There is no telemetry before {TELEMETRY_SINCE}.</li>
        <li>Current-season sessions appear once they have ended and been processed, usually within the hour.</li>
        <li>Statistics follow Jolpica: a correction made there shows up here.</li>
      </ul>

      <h2>Code and contact</h2>
      <p>
        The site is built with React and TypeScript, a Python (FastAPI) back end, PostgreSQL and Redis. The code
        is on <a href="https://github.com/cd6mcdm7tk-star/f1-metrics" target="_blank" rel="noopener noreferrer">GitHub</a> under
        the AGPL-3.0 license, and the calculations on this page are covered by automated tests.
      </p>
      <p>
        A question, an idea, or a number that looks wrong: <a href="mailto:contact@metrikdelta.com">contact@metrikdelta.com</a>,
        or @metrikdelta on X.
      </p>
    </ArticlePage>
  );
}
