import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Trophy, Target, Zap, Flag, Users } from 'lucide-react';
import SEO from '../components/SEO';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription, CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from '../components/UpgradeModal';
import AuthModal from '../components/AuthModal';
import LegalLinks from '../components/LegalLinks';
import { useIsMobile } from '../hooks/useIsMobile';
import { getApiBase } from '../config';

interface DriverStats {
  wins: number;
  podiums: number;
  poles: number;
  poleWins: number;
  points: number;
  racePoints: number;
  dnfs: number;
  dnfCauses: string[];
  avgRacePosition: number;
  avgQualiPosition: number;
  qualiWins: number;
  raceWins: number;
  fastestLaps: number;
  raceFinishes: number[];
  qualiPositions: number[];
}

interface ConstructorStanding {
  position: number;
  name: string;
  points: number;
}

interface SprintH2H {
  sqWins1: number; sqWins2: number;
  sWins1: number; sWins2: number;
  totalSprints: number;
}

interface DriverInfo {
  code: string;
  name: string;
  team: string;
  stats: DriverStats;
}

interface RaceLogEntry {
  round: number;
  raceName: string;
  pos1: number | null; // null = DNF
  pos2: number | null;
}

interface H2HData {
  year: number;
  totalRaces: number;
  driver1: DriverInfo;
  driver2: DriverInfo;
  raceLog: RaceLogEntry[];
}

// 🏎️ GRILLE 2026 - Fallback statique quand l'API n'a pas encore de données (avant la 1ère course)
const DRIVERS_2026: Record<string, { team: string; fullName: string; number: string }> = {
  VER: { team: 'Red Bull Racing', fullName: 'Max Verstappen',        number: '1'  },
  HAD: { team: 'Red Bull Racing', fullName: 'Isack Hadjar',          number: '6'  },
  LEC: { team: 'Ferrari',         fullName: 'Charles Leclerc',       number: '16' },
  HAM: { team: 'Ferrari',         fullName: 'Lewis Hamilton',         number: '44' },
  RUS: { team: 'Mercedes',        fullName: 'George Russell',         number: '63' },
  ANT: { team: 'Mercedes',        fullName: 'Andrea Kimi Antonelli',  number: '12' },
  NOR: { team: 'McLaren',         fullName: 'Lando Norris',           number: '4'  },
  PIA: { team: 'McLaren',         fullName: 'Oscar Piastri',          number: '81' },
  ALO: { team: 'Aston Martin',    fullName: 'Fernando Alonso',        number: '14' },
  STR: { team: 'Aston Martin',    fullName: 'Lance Stroll',           number: '18' },
  GAS: { team: 'Alpine',          fullName: 'Pierre Gasly',           number: '10' },
  COL: { team: 'Alpine',          fullName: 'Franco Colapinto',       number: '43' },
  ALB: { team: 'Williams',        fullName: 'Alex Albon',             number: '23' },
  SAI: { team: 'Williams',        fullName: 'Carlos Sainz',           number: '55' },
  OCO: { team: 'Haas',            fullName: 'Esteban Ocon',           number: '31' },
  BEA: { team: 'Haas',            fullName: 'Oliver Bearman',         number: '87' },
  LAW: { team: 'Racing Bulls',    fullName: 'Liam Lawson',            number: '30' },
  LIN: { team: 'Racing Bulls',    fullName: 'Arvid Lindblad',         number: '8'  },
  HUL: { team: 'Audi',            fullName: 'Nico Hülkenberg',        number: '27' },
  BOR: { team: 'Audi',            fullName: 'Gabriel Bortoleto',      number: '5'  },
  PER: { team: 'Cadillac',        fullName: 'Sergio Perez',           number: '11' },
  BOT: { team: 'Cadillac',        fullName: 'Valtteri Bottas',        number: '77' },
};

// 🌐 ERGAST API HELPER — only for the rare season with no race results yet
// (see loadDriversForYear); everything else comes from the season bundle.
const fetchErgastAPI = async (url: string, retries = 4): Promise<any> => {
  const retryBackoff = async (): Promise<any> => {
    // Jolpica rate-limits bursts, and a short linear backoff (1-3s) wasn't
    // enough room for the limit window to actually clear, so retries kept
    // colliding. Exponential instead.
    const waitTime = Math.min(2000 * 2 ** (4 - retries), 10000);
    console.log(`⏳ Rate limit, retrying in ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return fetchErgastAPI(url, retries - 1);
  };

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429 && retries > 0) return retryBackoff();
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.MRData) return null;
    return data;
  } catch (error) {
    // Jolpica's 429 response is missing CORS headers, so the browser
    // reports it as a blocked/failed fetch (TypeError) rather than a
    // readable 429 response — the `response.ok` branch above never even
    // sees it. Retrying here too is the only way to recover from that
    // specific case instead of silently giving up on the first burst.
    if (retries > 0) return retryBackoff();
    console.error('Ergast API error:', url, error);
    return null;
  }
};

// Everything the page needs for one season, assembled by the backend from
// Jolpica (every page of results, qualifying and sprints, plus both final
// standings) and shared through its cache — same Jolpica field names, cut
// down to the fields read here. The page used to fetch all this straight
// from Jolpica itself: ~7 requests per season change, ~7 more per driver
// pair, and each visitor running into Jolpica's rate limit on their own.
// Now one request per season, and every head-to-head is computed locally.
interface SeasonBundle {
  year: number;
  results: any[];       // races, each with every driver's entry in Results
  qualifying: any[];    // races, each with QualifyingResults
  sprints: any[];       // sprint races, each with SprintResults
  driverStandings: any[];
  constructorStandings: any[];
}

// Kept for the whole visit, so going back to a season already seen is instant.
const seasonCache = new Map<number, Promise<SeasonBundle>>();
const fetchSeason = (year: number): Promise<SeasonBundle> => {
  let pending = seasonCache.get(year);
  if (!pending) {
    pending = fetch(`${getApiBase()}/season/${year}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    pending.catch(() => seasonCache.delete(year)); // a failure is retried next time
    seasonCache.set(year, pending);
  }
  return pending;
};

// One driver's races in the shape Jolpica's per-driver endpoints
// (drivers/{id}/results.json, …/qualifying.json) return — each race they
// took part in, with `key` holding only their own entry — derived from
// the season-wide data.
const racesOf = (races: any[], key: 'Results' | 'QualifyingResults', driverId: string): any[] =>
  races.flatMap(race => {
    const own = (race[key] ?? []).filter((r: any) => r.Driver.driverId === driverId);
    return own.length ? [{ ...race, [key]: own }] : [];
  });

// Official championship points (sprints included) by driverId.
const officialPoints = (season: SeasonBundle): Record<string, number> =>
  Object.fromEntries(season.driverStandings.map((s: any) => [s.Driver.driverId, parseFloat(s.points)]));

export default function StatisticsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccessYear, isPremium, isReady: subscriptionReady } = useSubscription();
  const { user, signOut } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Selection states — restored from the URL so a refresh (or a shared
  // link) reproduces the same comparison instead of losing it, same fix
  // as TelemetryPage's earlier multi-driver persistence bug.
  const [year, setYear] = useState(() => parseInt(searchParams.get('y') || String(CURRENT_SEASON_YEAR - 1)));
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driver1, setDriver1] = useState(() => searchParams.get('d1') || '');
  const [driver2, setDriver2] = useState(() => searchParams.get('d2') || '');
  
  // Data states
  const [loading, setLoading] = useState(false);
  const [h2hData, setH2HData] = useState<H2HData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Individual driver stats
  const [driver1Data, setDriver1Data] = useState<DriverInfo | null>(null);
  const [driver2Data, setDriver2Data] = useState<DriverInfo | null>(null);

  // The selected season's full data (null while it loads) — every
  // comparison below is computed from it, without any further request.
  const [season, setSeason] = useState<SeasonBundle | null>(null);
  // Full ordered championship standings for the sidebar widget — same fetch
  // as standingsMap, just keeping the whole list instead of only the points.
  const [standingsList, setStandingsList] = useState<{ code: string; name: string; team: string; points: number; position: number }[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [sprintH2H, setSprintH2H] = useState<SprintH2H | null>(null);
  // Full classification (every driver, not just the 2 compared) for each
  // round — powers the dynamic card's "hover a Grand Prix" view. Captured
  // once per year change alongside the driver-list fetch (same API
  // response), not a separate fetch per hover.
  const [raceClassifications, setRaceClassifications] = useState<
    Record<number, { raceName: string; results: { position: number; code: string; name: string; team: string }[] }>
  >({});
  // What the dynamic card (in the left sidebar) currently shows — null means
  // its default placeholder. 'stat' covers every row of the comparison
  // card (statKey identifies which) — always shows both drivers, so no
  // per-side distinction. 'race' is a hovered Grand Prix column header in
  // the race log table.
  const [hoveredMetric, setHoveredMetric] = useState<
    { kind: 'stat'; statKey: string } | { kind: 'race'; round: number } | null
  >(null);

  // Couleurs par écurie (pas par pilote) — same OKLCH-calibrated palette as
  // TelemetryPage's TEAM_COLORS (contrast >=4.5:1 against the cream bg, since
  // these render as bold text here, not just chart marks), extended with two
  // historical-only teams (Racing Point, Renault) calibrated the same way.
  // Racing Point sits close to Mercedes and Renault close to Alfa Romeo/Audi
  // under red-green color blindness — an intrinsic limit of a light bg
  // forcing every hue toward the same darkened band, same trade-off already
  // accepted for the current team palette. Mitigated by the team name/driver
  // code always being shown as text alongside the color.
  const teamColors: { [key: string]: string } = {
    'Red Bull': '#3671C6',
    'Red Bull Racing': '#3671C6',
    'McLaren': '#EA4E00',
    'Ferrari': '#E8002D',
    'Mercedes': '#008E87',
    'Aston Martin': '#006A3D',
    'Alpine': '#CE5C91',
    'Williams': '#0088DE',
    'RB': '#527AFF',
    'Racing Bulls': '#527AFF',
    'AlphaTauri': '#527AFF',
    'Toro Rosso': '#527AFF',
    'Haas': '#555555',
    'Haas F1 Team': '#555555',
    'Kick Sauber': '#008D00',
    'Sauber': '#008D00',
    'Audi': '#BB0A30',
    'Alfa Romeo': '#C92D4B',
    'Racing Point': '#c40086',
    'Renault': '#796600',
    'Cadillac': '#0E49B1',
  };

  const getDriverColor = (teamName: string) => {
    if (teamColors[teamName]) return teamColors[teamName];

    const teamLower = teamName.toLowerCase();
    if (teamLower.includes('red bull')) return '#3671C6';
    if (teamLower.includes('mclaren')) return '#EA4E00';
    if (teamLower.includes('ferrari')) return '#E8002D';
    if (teamLower.includes('mercedes')) return '#008E87';
    if (teamLower.includes('aston martin')) return '#006A3D';
    if (teamLower.includes('alpine')) return '#CE5C91';
    if (teamLower.includes('williams')) return '#0088DE';
    if (teamLower.includes('racing bulls') || teamLower.includes('alphatauri') || teamLower.includes('toro rosso')) return '#527AFF';
    if (teamLower.includes('haas')) return '#555555';
    if (teamLower.includes('audi')) return '#BB0A30';
    if (teamLower.includes('alfa romeo')) return '#C92D4B';
    if (teamLower.includes('sauber')) return '#008D00';
    if (teamLower.includes('cadillac')) return '#0E49B1';
    if (teamLower.includes('racing point')) return '#c40086';
    if (teamLower.includes('renault')) return '#796600';

    return '#555555';
  };
  
  const areTeammates = (team1: string, team2: string) => {
    return team1.toLowerCase() === team2.toLowerCase();
  };

  // Shared by the driver grid and the championship standings list — same
  // pick-two-drivers behavior everywhere a driver code can be clicked.
  const toggleDriverSelection = (code: string) => {
    if (driver1 === code) setDriver1('');
    else if (driver2 === code) setDriver2('');
    else if (!driver1) setDriver1(code);
    else if (!driver2) setDriver2(code);
    else setDriver1(code);
  };

  // ── URL sync ─────────────────────────────────────────────────────────────
  const urlSyncReady = useRef(false);
  useEffect(() => {
    if (!urlSyncReady.current) { urlSyncReady.current = true; return; }
    const p: Record<string, string> = { y: String(year) };
    if (driver1) p.d1 = driver1;
    if (driver2) p.d2 = driver2;
    setSearchParams(p, { replace: true });
  }, [year, driver1, driver2]); // eslint-disable-line react-hooks/exhaustive-deps

  // A `y=<current season>` URL restores straight into state before any
  // paywall check — once the subscription status is actually known,
  // bounce back to the latest free year if it turns out this viewer isn't
  // entitled to it (waits for `subscriptionReady` so a genuinely premium
  // user's own link isn't wrongly bounced first).
  useEffect(() => {
    if (subscriptionReady && !canAccessYear(year)) {
      setYear(CURRENT_SEASON_YEAR - 1);
      setShowUpgradeModal(true);
    }
  }, [subscriptionReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tracks the last year this effect actually loaded, so a year change
  // (not the initial mount) resets the driver selection. Comparing against
  // the previous value (rather than a boolean flag toggled inside the
  // effect body) keeps this correct under StrictMode's dev-only double
  // invocation of effects — a flag would get flipped by the first,
  // throwaway invocation and wrongly look like a "real" year change on
  // the second one, wiping out driver1/driver2 right after a deep link
  // (?d1=...&d2=...) had set them.
  const prevYearRef = useRef(year);
  useEffect(() => {
    const isYearChange = prevYearRef.current !== year;
    prevYearRef.current = year;
    loadDriversForYear(isYearChange);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recomputed from the loaded season whenever the pair (or the season)
  // changes — synchronous, so switching drivers is instant.
  useEffect(() => {
    if (!season) {
      setH2HData(null);
      setDriver1Data(null);
      setDriver2Data(null);
      return;
    }
    if (driver1 && driver2 && driver1 !== driver2) {
      setError(null);
      computeH2H(season);
    } else if (driver1 && !driver2) {
      setH2HData(null);
      setDriver2Data(null);
      setDriver1Data(computeDriverStats(season, driver1));
    } else if (driver2 && !driver1) {
      setH2HData(null);
      setDriver1Data(null);
      setDriver2Data(computeDriverStats(season, driver2));
    } else {
      setH2HData(null);
      setDriver1Data(null);
      setDriver2Data(null);
      setError(null);
    }
  }, [driver1, driver2, season]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔥 HELPER: Générer un code à 3 lettres pour les pilotes sans code
  const generateDriverCode = (driver: any): string => {
    if (driver.code) return driver.code;
    const lastName = driver.familyName.toUpperCase();
    return lastName.substring(0, 3);
  };

  // `name` is already "GivenName FamilyName" everywhere it's stored —
  // last whitespace-separated token is the surname. Used where a full
  // name reads better than the 3-letter code (comparison card header,
  // driver standings), not in the tight spots (sidebar driver grid, race
  // log table, dynamic card) that are sized for the short code.
  const getLastName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1];
  };

  // 🔥 LOAD DRIVERS AVEC ERGAST DIRECT (ONLY DRIVERS WHO RACED)
  // `resetSelection` is false only for the very first call (page load) so a
  // driver1/driver2 restored from the URL isn't wiped out before it's ever
  // used — same fix as TelemetryPage's mount-wipe bug.
  const loadDriversForYear = async (resetSelection: boolean = true) => {
    const requestedYear = year;
    try {
      setDrivers([]);
      setSeason(null);
      setError(null);
      setLoading(true);
      if (resetSelection) {
        setDriver1('');
        setDriver2('');
      }

      const jolpica_base = 'https://api.jolpi.ca/ergast/f1';
      const bundle = await fetchSeason(requestedYear);
      // Switched to another season while this one was loading — that one's
      // own load takes over; this result would overwrite it.
      if (prevYearRef.current !== requestedYear) return;
      const races = bundle.results;

      const driverCodesSet = new Set<string>();
      const driverInfoMap = new Map<string, any>();
      const classifications: Record<number, { raceName: string; results: { position: number; code: string; name: string; team: string }[] }> = {};

      if (races.length > 0) {
        // Season has started: build list from actual race results
        races.forEach((race: any) => {
          if (race.Results) {
            race.Results.forEach((result: any) => {
              const driver = result.Driver;
              const code = generateDriverCode(driver);
              if (!driverCodesSet.has(code)) {
                driverCodesSet.add(code);
                driverInfoMap.set(code, {
                  abbreviation: code,
                  number: driver.permanentNumber || '?',
                  team: result.Constructor?.name || 'Unknown',
                  fullName: `${driver.givenName} ${driver.familyName}`
                });
              }
            });

            // Full classification for this round — every driver, not just
            // the 2 currently compared — for the dynamic card's "hover a
            // Grand Prix" view. Same response as above, just captured too.
            classifications[parseInt(race.round)] = {
              raceName: race.raceName,
              results: race.Results
                .map((result: any) => ({
                  position: parseInt(result.position),
                  code: generateDriverCode(result.Driver),
                  name: `${result.Driver.givenName} ${result.Driver.familyName}`,
                  team: result.Constructor?.name || 'Unknown',
                }))
                .sort((a: any, b: any) => a.position - b.position),
            };
          }
        });
        setRaceClassifications(classifications);
      } else {
        // Season hasn't started yet: use static 2026 grid if available, else drivers.json
        console.log(`No race results for ${year}, using fallback driver list`);
        if (year === 2026) {
          Object.entries(DRIVERS_2026).forEach(([code, info]) => {
            driverInfoMap.set(code, {
              abbreviation: code,
              number: info.number,
              team: info.team,
              fullName: info.fullName,
            });
          });
        } else {
          const driversData = await fetchErgastAPI(`${jolpica_base}/${year}/drivers.json`);
          const driversList = driversData?.MRData?.DriverTable?.Drivers ?? [];

          if (driversList.length === 0) {
            setError(`No driver data available for ${year}`);
            return;
          }

          const teamByDriverId = new Map<string, string>();
          bundle.driverStandings.forEach((s: any) => {
            teamByDriverId.set(s.Driver.driverId, s.Constructors?.[0]?.name || 'Unknown');
          });

          driversList.forEach((driver: any) => {
            const code = generateDriverCode(driver);
            if (!driverCodesSet.has(code)) {
              driverCodesSet.add(code);
              driverInfoMap.set(code, {
                abbreviation: code,
                number: driver.permanentNumber || '?',
                team: teamByDriverId.get(driver.driverId) || 'Unknown',
                fullName: `${driver.givenName} ${driver.familyName}`
              });
            }
          });
        }
      }

      // Official standings (includes sprint points)
      setStandingsList(bundle.driverStandings.map((s: any) => ({
        code: generateDriverCode(s.Driver),
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        team: s.Constructors?.[0]?.name || 'Unknown',
        points: parseFloat(s.points),
        position: parseInt(s.position),
      })));

      setConstructorStandings(bundle.constructorStandings.map((s: any) => ({
        position: parseInt(s.position),
        name: s.Constructor.name,
        points: parseFloat(s.points),
      })));

      const formattedDrivers = Array.from(driverInfoMap.values()).sort((a, b) =>
        a.abbreviation.localeCompare(b.abbreviation)
      );

      console.log(`✅ Found ${formattedDrivers.length} drivers for ${year}`);

      setDrivers(formattedDrivers);
      setSeason(bundle);

      // Only fall back to a default pair when nothing is already picked —
      // otherwise this clobbered a driver pair deep-linked via the URL
      // (?d1=...&d2=...) on every load, always snapping back to the first
      // two drivers alphabetically regardless of what was in the link.
      if (formattedDrivers.length > 0 && !driver1 && !driver2) {
        setDriver1(formattedDrivers[0].abbreviation);
        setDriver2(formattedDrivers[1]?.abbreviation || '');
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      setError('Failed to load drivers for this season.');
    } finally {
      if (prevYearRef.current === requestedYear) setLoading(false);
    }
  };

  // A driver's Jolpica entry (driverId, names…) from their 3-letter code,
  // among everyone who appears in the season's results or qualifying.
  const findSeasonDriver = (s: SeasonBundle, code: string): any =>
    [...s.results.flatMap(race => race.Results ?? []), ...s.qualifying.flatMap(race => race.QualifyingResults ?? [])]
      .find((r: any) => generateDriverCode(r.Driver) === code)?.Driver;

  // 🔥 SINGLE DRIVER STATS — computed from the loaded season
  const computeDriverStats = (s: SeasonBundle, driverCode: string): DriverInfo | null => {
    try {
      const driverInfo = findSeasonDriver(s, driverCode);
      if (!driverInfo) return null;

      const driverId = driverInfo.driverId;
      const races = racesOf(s.results, 'Results', driverId);
      const qualiRaces = racesOf(s.qualifying, 'QualifyingResults', driverId);
      const standingsMap = officialPoints(s);

      const stats: DriverStats = {
        wins: 0,
        podiums: 0,
        poles: 0,
        poleWins: 0,
        points: 0,
        racePoints: 0,
        dnfs: 0,
        dnfCauses: [],
        raceFinishes: [],
        qualiPositions: [],
        qualiWins: 0,
        raceWins: 0,
        fastestLaps: 0,
        avgRacePosition: 0,
        avgQualiPosition: 0
      };

      races.forEach((race: any) => {
        if (!race.Results?.[0]) return;
        const result = race.Results[0];

        const position = parseInt(result.position);
        const points = parseFloat(result.points);
        const status = result.status;

        stats.points += points;
        stats.racePoints += points;
        if (position === 1) stats.wins += 1;
        if (position <= 3) stats.podiums += 1;
        if (position === 1 && parseInt(result.grid) === 1) stats.poleWins += 1;
        if (result.FastestLap?.rank === '1') stats.fastestLaps += 1;

        if (status.includes('Finished') || status.includes('Lap') || status.includes('+')) {
          (stats.raceFinishes as any).push(position);
        } else {
          stats.dnfs += 1;
          stats.dnfCauses.push(status);
        }
      });
      
      qualiRaces.forEach((race: any) => {
        if (!race.QualifyingResults?.[0]) return;
        const result = race.QualifyingResults[0];
        const position = parseInt(result.position);
        
        (stats.qualiPositions as any).push(position);
        if (position === 1) stats.poles += 1;
      });
      
      if (standingsMap[driverId] !== undefined) stats.points = standingsMap[driverId];

      stats.avgRacePosition = (stats.raceFinishes as any).length > 0
        ? parseFloat(((stats.raceFinishes as any).reduce((a: number, b: number) => a + b, 0) / (stats.raceFinishes as any).length).toFixed(1))
        : 20.0;
      
      stats.avgQualiPosition = (stats.qualiPositions as any).length > 0
        ? parseFloat(((stats.qualiPositions as any).reduce((a: number, b: number) => a + b, 0) / (stats.qualiPositions as any).length).toFixed(1))
        : 20.0;
      
      let team = "Unknown";
      if (races.length > 0 && races[races.length - 1].Results?.[0]) {
        team = races[races.length - 1].Results[0].Constructor.name;
      }
      
      return {
        code: driverCode,
        name: `${driverInfo.givenName} ${driverInfo.familyName}`,
        team,
        stats
      };
    } catch (error: any) {
      console.error(`Error loading stats for ${driverCode}:`, error);
      return null;
    }
  };

  // 🔥 H2H — computed from the loaded season
  const computeH2H = (s: SeasonBundle) => {
    if (!driver1 || !driver2 || driver1 === driver2) return;
    const year = s.year;

    try {
      const driver1Info = findSeasonDriver(s, driver1);
      const driver2Info = findSeasonDriver(s, driver2);

      if (!driver1Info || !driver2Info) {
        // Expected right after a year change, not a real failure: a pair
        // picked in the previous season can be briefly paired with the new
        // season's data before the selection reset lands. Bail quietly
        // instead of surfacing an error for what resolves itself.
        return;
      }

      const driver1Id = driver1Info.driverId;
      const driver2Id = driver2Info.driverId;
      const standingsMap = officialPoints(s);
      const sprintRaces = s.sprints;

      // Sprint H2H — Jolpica has no dedicated "sprint qualifying" endpoint,
      // but each sprint result's own `grid` field IS the sprint-qualifying
      // classification (grid is set BY sprint quali), so one sprint.json
      // call gives us both H2H dimensions.
      let sprintResult: SprintH2H | null = null;
      if (sprintRaces.length > 0) {
        let sqWins1 = 0, sqWins2 = 0, sWins1 = 0, sWins2 = 0, totalSprints = 0;
        sprintRaces.forEach((race: any) => {
          const results = race.SprintResults || [];
          const r1 = results.find((r: any) => r.Driver.driverId === driver1Id);
          const r2 = results.find((r: any) => r.Driver.driverId === driver2Id);
          if (!r1 || !r2) return;
          totalSprints += 1;

          const grid1 = parseInt(r1.grid);
          const grid2 = parseInt(r2.grid);
          if (grid1 > 0 && grid2 > 0) {
            if (grid1 < grid2) sqWins1 += 1;
            else if (grid2 < grid1) sqWins2 += 1;
          }

          const pos1 = parseInt(r1.position);
          const pos2 = parseInt(r2.position);
          const finished1 = /Finished|Lap|\+/.test(r1.status);
          const finished2 = /Finished|Lap|\+/.test(r2.status);
          if (finished1 && finished2) {
            if (pos1 < pos2) sWins1 += 1;
            else if (pos2 < pos1) sWins2 += 1;
          } else if (finished1) {
            sWins1 += 1;
          } else if (finished2) {
            sWins2 += 1;
          }
        });
        if (totalSprints > 0) sprintResult = { sqWins1, sqWins2, sWins1, sWins2, totalSprints };
      }
      setSprintH2H(sprintResult);

      const driver1Races = racesOf(s.results, 'Results', driver1Id);
      const driver2Races = racesOf(s.results, 'Results', driver2Id);
      const driver1QualiRaces = racesOf(s.qualifying, 'QualifyingResults', driver1Id);
      const driver2QualiRaces = racesOf(s.qualifying, 'QualifyingResults', driver2Id);
      
      const driver1Stats: any = {
        wins: 0, podiums: 0, poles: 0, poleWins: 0, points: 0, racePoints: 0, dnfs: 0, dnfCauses: [],
        raceFinishes: [], qualiPositions: [],
        qualiWins: 0, raceWins: 0, fastestLaps: 0,
        avgRacePosition: 0, avgQualiPosition: 0
      };

      const driver2Stats: any = {
        wins: 0, podiums: 0, poles: 0, poleWins: 0, points: 0, racePoints: 0, dnfs: 0, dnfCauses: [],
        raceFinishes: [], qualiPositions: [],
        qualiWins: 0, raceWins: 0, fastestLaps: 0,
        avgRacePosition: 0, avgQualiPosition: 0
      };
      
      const driver2ResultsByRound: Record<string, any> = {};
      driver2Races.forEach((race: any) => {
        if (race.Results?.[0]) {
          driver2ResultsByRound[race.round] = race.Results[0];
        }
      });
      
      const driver2QualiByRound: Record<string, any> = {};
      driver2QualiRaces.forEach((race: any) => {
        if (race.QualifyingResults?.[0]) {
          driver2QualiByRound[race.round] = race.QualifyingResults[0];
        }
      });
      
      const raceLog: RaceLogEntry[] = [];

      driver1Races.forEach((race: any) => {
        if (!race.Results?.[0]) return;
        const result = race.Results[0];

        const position = parseInt(result.position);
        const points = parseFloat(result.points);
        const status = result.status;

        driver1Stats.points += points;
        driver1Stats.racePoints += points;
        if (position === 1) driver1Stats.wins += 1;
        if (position <= 3) driver1Stats.podiums += 1;
        if (position === 1 && parseInt(result.grid) === 1) driver1Stats.poleWins += 1;
        if (result.FastestLap?.rank === '1') driver1Stats.fastestLaps += 1;

        const d1Finished = status.includes('Finished') || status.includes('Lap') || status.includes('+');
        if (d1Finished) {
          driver1Stats.raceFinishes.push(position);
        } else {
          driver1Stats.dnfs += 1;
          driver1Stats.dnfCauses.push(status);
        }

        const driver2Result = driver2ResultsByRound[race.round];
        let pos2ForLog: number | null = null;
        if (driver2Result) {
          const pos2 = parseInt(driver2Result.position);
          const status2 = driver2Result.status;
          const d2Finished = status2.includes('Finished') || status2.includes('Lap') || status2.includes('+');
          pos2ForLog = d2Finished ? pos2 : null;

          if (d1Finished && d2Finished) {
            if (position < pos2) driver1Stats.raceWins += 1;
            else if (pos2 < position) driver2Stats.raceWins += 1;
          }
        }

        raceLog.push({
          round: parseInt(race.round),
          raceName: race.raceName,
          pos1: d1Finished ? position : null,
          pos2: pos2ForLog,
        });
      });
      
      driver2Races.forEach((race: any) => {
        if (!race.Results?.[0]) return;
        const result = race.Results[0];
        
        const position = parseInt(result.position);
        const points = parseFloat(result.points);
        const status = result.status;
        
        driver2Stats.points += points;
        driver2Stats.racePoints += points;
        if (position === 1) driver2Stats.wins += 1;
        if (position <= 3) driver2Stats.podiums += 1;
        if (position === 1 && parseInt(result.grid) === 1) driver2Stats.poleWins += 1;
        if (result.FastestLap?.rank === '1') driver2Stats.fastestLaps += 1;
        
        if (status.includes('Finished') || status.includes('Lap') || status.includes('+')) {
          driver2Stats.raceFinishes.push(position);
        } else {
          driver2Stats.dnfs += 1;
          driver2Stats.dnfCauses.push(status);
        }
      });
      
      driver1QualiRaces.forEach((race: any) => {
        if (!race.QualifyingResults?.[0]) return;
        const result = race.QualifyingResults[0];
        const position = parseInt(result.position);
        
        driver1Stats.qualiPositions.push(position);
        if (position === 1) driver1Stats.poles += 1;
        
        const driver2Quali = driver2QualiByRound[race.round];
        if (driver2Quali) {
          const pos2 = parseInt(driver2Quali.position);
          if (position < pos2) driver1Stats.qualiWins += 1;
          else driver2Stats.qualiWins += 1;
        }
      });
      
      driver2QualiRaces.forEach((race: any) => {
        if (!race.QualifyingResults?.[0]) return;
        const result = race.QualifyingResults[0];
        const position = parseInt(result.position);
        
        driver2Stats.qualiPositions.push(position);
        if (position === 1) driver2Stats.poles += 1;
      });
      
      if (standingsMap[driver1Id] !== undefined) driver1Stats.points = standingsMap[driver1Id];
      if (standingsMap[driver2Id] !== undefined) driver2Stats.points = standingsMap[driver2Id];

      driver1Stats.avgRacePosition = driver1Stats.raceFinishes.length > 0
        ? parseFloat((driver1Stats.raceFinishes.reduce((a: number, b: number) => a + b, 0) / driver1Stats.raceFinishes.length).toFixed(1))
        : 20.0;
      
      driver2Stats.avgRacePosition = driver2Stats.raceFinishes.length > 0
        ? parseFloat((driver2Stats.raceFinishes.reduce((a: number, b: number) => a + b, 0) / driver2Stats.raceFinishes.length).toFixed(1))
        : 20.0;
      
      driver1Stats.avgQualiPosition = driver1Stats.qualiPositions.length > 0
        ? parseFloat((driver1Stats.qualiPositions.reduce((a: number, b: number) => a + b, 0) / driver1Stats.qualiPositions.length).toFixed(1))
        : 20.0;
      
      driver2Stats.avgQualiPosition = driver2Stats.qualiPositions.length > 0
        ? parseFloat((driver2Stats.qualiPositions.reduce((a: number, b: number) => a + b, 0) / driver2Stats.qualiPositions.length).toFixed(1))
        : 20.0;
      
      let driver1Team = "Unknown";
      let driver2Team = "Unknown";

      if (driver1Races.length > 0 && driver1Races[driver1Races.length - 1].Results?.[0]) {
        driver1Team = driver1Races[driver1Races.length - 1].Results[0].Constructor.name;
      } else if (year === 2026 && DRIVERS_2026[driver1]) {
        driver1Team = DRIVERS_2026[driver1].team;
      }

      if (driver2Races.length > 0 && driver2Races[driver2Races.length - 1].Results?.[0]) {
        driver2Team = driver2Races[driver2Races.length - 1].Results[0].Constructor.name;
      } else if (year === 2026 && DRIVERS_2026[driver2]) {
        driver2Team = DRIVERS_2026[driver2].team;
      }
      
      setDrivers(prev => prev.map(d => {
        if (d.abbreviation === driver1) return { ...d, team: driver1Team };
        if (d.abbreviation === driver2) return { ...d, team: driver2Team };
        return d;
      }));
      
      const h2hResult = {
        year,
        totalRaces: driver1Races.length,
        driver1: {
          code: driver1,
          name: `${driver1Info.givenName} ${driver1Info.familyName}`,
          team: driver1Team,
          stats: driver1Stats
        },
        driver2: {
          code: driver2,
          name: `${driver2Info.givenName} ${driver2Info.familyName}`,
          team: driver2Team,
          stats: driver2Stats
        },
        raceLog: raceLog.sort((a, b) => a.round - b.round),
      };
      
      setH2HData(h2hResult);
      setDriver1Data(h2hResult.driver1);
      setDriver2Data(h2hResult.driver2);
      
    } catch (error: any) {
      console.error('Error computing H2H:', error);
      setError(error.message || 'Failed to load data');
    }
  };

  const getPercentage = (value1: number, value2: number) => {
    const total = value1 + value2;
    if (total === 0) return { percent1: 50, percent2: 50 };
    return {
      percent1: (value1 / total) * 100,
      percent2: (value2 / total) * 100
    };
  };

  // Buckets Ergast's free-text `status` field into readable causes for the
  // DNF-breakdown hover card. Verified against the live API: seasons 2022
  // and earlier carry a specific cause ("Accident", "Engine", "Gearbox"...),
  // but Jolpica's data for 2023+ only ever says "Retired" — no cause at all.
  // That's a real gap in the source, not a matching bug, so "Retired" gets
  // its own honest bucket instead of being silently lumped into "Other"
  // (which is reserved for genuinely unrecognized status strings).
  const MECHANICAL_KEYWORDS = [
    'Engine', 'Gearbox', 'Transmission', 'Hydraulics', 'Electrical', 'Suspension',
    'Brakes', 'Clutch', 'Power Unit', 'Turbo', 'Fuel', 'Oil', 'Water', 'Wheel',
    'Puncture', 'Tyre', 'Steering', 'Exhaust', 'Battery', 'Differential', 'Driveshaft',
    'Radiator', 'Throttle', 'Wing', 'Mechanical', 'Vibrations', 'Overheating', 'Cooling',
  ];
  const categorizeDnf = (status: string): 'Accident' | 'Mechanical' | 'Disqualified' | 'Withdrew' | 'Retired (unspecified)' | 'Other' => {
    if (/accident|collision|spun off/i.test(status)) return 'Accident';
    if (/disqualified/i.test(status)) return 'Disqualified';
    if (/did not start|withdrew|did not qualify/i.test(status)) return 'Withdrew';
    if (MECHANICAL_KEYWORDS.some(kw => status.toLowerCase().includes(kw.toLowerCase()))) return 'Mechanical';
    if (/^retired$/i.test(status.trim())) return 'Retired (unspecified)';
    return 'Other';
  };
  const summarizeDnfCauses = (causes: string[]) => {
    const counts = { Accident: 0, Mechanical: 0, Disqualified: 0, Withdrew: 0, 'Retired (unspecified)': 0, Other: 0 };
    causes.forEach(c => { counts[categorizeDnf(c)] += 1; });
    return counts;
  };

  const getCorrectedRaceH2H = (h2hData: H2HData) => {
    const totalRaces = h2hData.totalRaces;
    const currentTotal = h2hData.driver1.stats.raceWins + h2hData.driver2.stats.raceWins;
    const missingRaces = totalRaces - currentTotal;
    
    if (missingRaces === 0) {
      return {
        wins1: h2hData.driver1.stats.raceWins,
        wins2: h2hData.driver2.stats.raceWins,
        total: totalRaces
      };
    }
    
    const driver1DNFs = h2hData.driver1.stats.dnfs;
    const driver2DNFs = h2hData.driver2.stats.dnfs;
    
    let correctedWins1 = h2hData.driver1.stats.raceWins;
    let correctedWins2 = h2hData.driver2.stats.raceWins;
    
    if (driver2DNFs > driver1DNFs) {
      correctedWins1 += missingRaces;
    } else if (driver1DNFs > driver2DNFs) {
      correctedWins2 += missingRaces;
    } else {
      correctedWins1 += Math.floor(missingRaces / 2);
      correctedWins2 += Math.ceil(missingRaces / 2);
    }
    
    return {
      wins1: correctedWins1,
      wins2: correctedWins2,
      total: correctedWins1 + correctedWins2
    };
  };

  // Single merged comparison card — replaces the old "2 separate driver
  // cards" layout. Every stat is a row following the same left value / bar
  // split by percentage / right value logic as the Qualifying H2H and Race
  // H2H boxes, instead of listing each driver's numbers in isolation.
  const renderComparisonCard = () => {
    if (!h2hData) {
      return (
        <div style={{
          flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
          padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={40} style={{ color: 'var(--text-3)', marginBottom: 16 }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)', textAlign: 'center', margin: 0 }}>
            {loading ? 'Loading H2H...' : driver1 && driver2 ? 'Loading...' : 'Select two drivers'}
          </p>
        </div>
      );
    }

    const d1 = h2hData.driver1, d2 = h2hData.driver2;
    const s1 = d1.stats, s2 = d2.stats;
    const color1 = getDriverColor(d1.team);
    // Teammates share a team color, so driver 2 gets a distinct marker
    // instead — black (not white, unlike the old dark-theme version) since
    // the page background is cream now.
    const color2 = areTeammates(d1.team, d2.team) ? '#000000' : getDriverColor(d2.team);
    const totalRaces = h2hData.totalRaces || 1;
    const correctedRace = getCorrectedRaceH2H(h2hData);

    const poleConv1 = s1.poles > 0 ? (s1.poleWins / s1.poles) * 100 : null;
    const poleConv2 = s2.poles > 0 ? (s2.poleWins / s2.poles) * 100 : null;
    const ppr1 = s1.raceFinishes.length > 0 ? s1.racePoints / s1.raceFinishes.length : null;
    const ppr2 = s2.raceFinishes.length > 0 ? s2.racePoints / s2.raceFinishes.length : null;
    const qr1 = s1.avgRacePosition - s1.avgQualiPosition;
    const qr2 = s2.avgRacePosition - s2.avgQualiPosition;
    const fmtQR = (c: number) => c > 0 ? `-${Math.abs(c).toFixed(1)}` : `+${Math.abs(c).toFixed(1)}`;

    type Row = {
      label: string; statKey: string; raw1: number; raw2: number;
      display1: string | number; display2: string | number;
      bar?: boolean; lowerIsBetter?: boolean;
    };
    const rows: Row[] = [
      { label: 'Wins', statKey: 'wins', raw1: s1.wins, raw2: s2.wins, display1: s1.wins, display2: s2.wins },
      { label: 'Poles', statKey: 'poles', raw1: s1.poles, raw2: s2.poles, display1: s1.poles, display2: s2.poles },
      { label: 'Podiums', statKey: 'podiums', raw1: s1.podiums, raw2: s2.podiums, display1: s1.podiums, display2: s2.podiums },
      { label: 'Fastest Laps', statKey: 'fastestlaps', raw1: s1.fastestLaps, raw2: s2.fastestLaps, display1: s1.fastestLaps, display2: s2.fastestLaps },
      { label: 'Qualifying H2H', statKey: 'qualih2h', raw1: s1.qualiWins, raw2: s2.qualiWins, display1: s1.qualiWins, display2: s2.qualiWins },
      { label: 'Race H2H', statKey: 'raceh2h', raw1: correctedRace.wins1, raw2: correctedRace.wins2, display1: correctedRace.wins1, display2: correctedRace.wins2 },
      { label: 'Avg Race Position', statKey: 'avgracepos', raw1: s1.avgRacePosition, raw2: s2.avgRacePosition, display1: `P${s1.avgRacePosition}`, display2: `P${s2.avgRacePosition}`, lowerIsBetter: true },
      { label: 'Avg Quali Position', statKey: 'avgqualipos', raw1: s1.avgQualiPosition, raw2: s2.avgQualiPosition, display1: `P${s1.avgQualiPosition}`, display2: `P${s2.avgQualiPosition}`, lowerIsBetter: true },
      { label: 'DNFs', statKey: 'dnfs', raw1: s1.dnfs, raw2: s2.dnfs, display1: s1.dnfs, display2: s2.dnfs, lowerIsBetter: true },
      { label: 'Points per Race', statKey: 'pointsperrace', raw1: ppr1 ?? 0, raw2: ppr2 ?? 0, display1: ppr1 !== null ? ppr1.toFixed(1) : '—', display2: ppr2 !== null ? ppr2.toFixed(1) : '—', bar: ppr1 !== null && ppr2 !== null },
      { label: 'Win Rate', statKey: 'winrate', raw1: s1.wins, raw2: s2.wins, display1: `${((s1.wins / totalRaces) * 100).toFixed(1)}%`, display2: `${((s2.wins / totalRaces) * 100).toFixed(1)}%` },
      { label: 'Podium Rate', statKey: 'podiumrate', raw1: s1.podiums, raw2: s2.podiums, display1: `${((s1.podiums / totalRaces) * 100).toFixed(1)}%`, display2: `${((s2.podiums / totalRaces) * 100).toFixed(1)}%` },
      { label: 'Pole Conversion', statKey: 'poleconv', raw1: poleConv1 ?? 0, raw2: poleConv2 ?? 0, display1: poleConv1 !== null ? `${poleConv1.toFixed(1)}%` : 'N/A', display2: poleConv2 !== null ? `${poleConv2.toFixed(1)}%` : 'N/A', bar: poleConv1 !== null && poleConv2 !== null },
      { label: 'Quali → Race', statKey: 'qualitorace', raw1: 0, raw2: 0, display1: fmtQR(qr1), display2: fmtQR(qr2), bar: false },
    ];
    if (sprintH2H) {
      rows.push(
        { label: 'Sprint Qualifying H2H', statKey: 'sprintqualih2h', raw1: sprintH2H.sqWins1, raw2: sprintH2H.sqWins2, display1: sprintH2H.sqWins1, display2: sprintH2H.sqWins2 },
        { label: 'Sprint H2H', statKey: 'sprinth2h', raw1: sprintH2H.sWins1, raw2: sprintH2H.sWins2, display1: sprintH2H.sWins1, display2: sprintH2H.sWins2 },
      );
    }

    // Every row's hover target is the whole row (not just a value), and
    // always shows both drivers in the dynamic card — there's no
    // "per-side" hover anymore, so a single statKey is all the dynamic
    // card needs.
    const StatRow = ({ label, statKey, raw1, raw2, display1, display2, bar = true, lowerIsBetter = false }: Row) => {
      let percent1 = 50, percent2 = 50;
      if (bar) {
        if (lowerIsBetter) {
          const inv1 = raw1 > 0 ? 1 / raw1 : 0;
          const inv2 = raw2 > 0 ? 1 / raw2 : 0;
          ({ percent1, percent2 } = getPercentage(inv1, inv2));
        } else {
          ({ percent1, percent2 } = getPercentage(raw1, raw2));
        }
      }
      const isHovered = hoveredMetric?.kind === 'stat' && hoveredMetric.statKey === statKey;
      return (
        <div
          onMouseEnter={() => setHoveredMetric({ kind: 'stat', statKey })}
          onMouseLeave={() => setHoveredMetric(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', margin: '0 -6px',
            borderTop: '1px solid var(--border)', cursor: 'default',
            background: isHovered ? 'var(--accent-10)' : undefined,
            borderRadius: isHovered ? 'var(--r)' : undefined,
          }}
        >
          <span style={{
            width: 92, flexShrink: 0, lineHeight: 1.2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)',
          }}>{label}</span>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 12, color: color1, minWidth: 34, textAlign: 'right' }}>{display1}</span>
          {bar ? (
            <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex' }}>
              <div style={{ width: `${percent1}%`, background: color1, transition: 'width 0.4s' }} />
              <div style={{ width: `${percent2}%`, background: color2, transition: 'width 0.4s' }} />
            </div>
          ) : <div style={{ flex: 1 }} />}
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 12, color: color2, minWidth: 34, textAlign: 'left' }}>{display2}</span>
        </div>
      );
    };

    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '10px 14px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 2, borderBottom: '1px solid var(--border-hi)' }}>
          <div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15, margin: '0 0 2px', color: color1, whiteSpace: 'nowrap' }}>{getLastName(d1.name)}</h2>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-3)', margin: 0 }}>{d1.team}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, color: color1, lineHeight: 1 }}>{s1.points}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-3)' }}>vs</span>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, color: color2, lineHeight: 1 }}>{s2.points}</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Points</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15, margin: '0 0 2px', color: color2, whiteSpace: 'nowrap' }}>{getLastName(d2.name)}</h2>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-3)', margin: 0 }}>{d2.team}</p>
          </div>
        </div>

        {/* flex:1 + space-between distributes any extra height (freed up
            by removing the season box and giving the table a fixed height
            instead of flex:1) evenly as gaps between rows, instead of
            leaving it as one dead gap at the bottom of the card. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          {rows.map((row, i) => <StatRow key={row.label + i} {...row} />)}
        </div>
      </div>
    );
  };

  // Lives in the left sidebar (above the legal links) — shows contextual
  // detail while hovering: any stat row in the comparison card (the
  // calculation behind that result), or a Grand Prix column header in the
  // race log table (that race's full classification, every driver).
  const renderDynamicCard = () => {
    if (!h2hData) return null;
    const d1 = h2hData.driver1, d2 = h2hData.driver2;
    const s1 = d1.stats, s2 = d2.stats;
    const color1 = getDriverColor(d1.team);
    const color2 = areTeammates(d1.team, d2.team) ? '#000000' : getDriverColor(d2.team);
    const totalRaces = h2hData.totalRaces || 1;

    const panelStyle: CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14 };
    const headerStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 };
    const titleStyle: CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', margin: 0, fontWeight: 700 };
    const bodyStyle: CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 8px' };
    const resultRowStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)' };

    // ── Hovering a Grand Prix column header in the race log table ────────
    if (hoveredMetric?.kind === 'race') {
      const classification = raceClassifications[hoveredMetric.round];
      if (!classification) return null;
      return (
        <div style={panelStyle}>
          <div style={headerStyle}>
            <Flag size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={titleStyle}>{classification.raceName.replace(' Grand Prix', '')}</h3>
          </div>
          {/* 2 columns (P1-first-half / second-half) instead of one long
              list — a 20+ car grid in a single column didn't fit the
              sidebar's available height without scrolling; halving the
              row count this way does, same fix as the Driver Standings
              panel uses for its own 20+ entries. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(() => {
              const half = Math.ceil(classification.results.length / 2);
              return [0, 1].map(col => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {classification.results.slice(col * half, col * half + half).map(r => {
                    const isD1 = r.code === d1.code;
                    const isD2 = r.code === d2.code;
                    const color = isD1 ? color1 : isD2 ? color2 : 'var(--text-2)';
                    return (
                      <div key={r.code} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '1px 4px',
                        background: (isD1 || isD2) ? 'var(--accent-10)' : undefined,
                        borderRadius: 'var(--r)',
                      }}>
                        <span style={{ width: 13, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-3)' }}>{r.position}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9, color }}>{r.code}</span>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      );
    }

    if (hoveredMetric?.kind !== 'stat') {
      return (
        <div style={{ ...panelStyle, textAlign: 'center' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, lineHeight: 1.6, color: 'var(--text-3)', margin: 0 }}>
            Hover a stat, or a Grand Prix in the table below, for details
          </p>
        </div>
      );
    }

    const { statKey } = hoveredMetric;
    // Shared "value / total = result" line, one per driver — every
    // per-driver stat below renders this twice (once per side) instead of
    // needing a hovered side, since the dynamic card always shows both now.
    const FractionRow = ({ code, color, num, den, result }: { code: string; color: string; num: number | string; den: number | string; result: string }) => (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)' }}>
        <span style={{ color, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{code}</span>
        <span>{num}</span><span style={{ color: 'var(--text-3)' }}>/</span><span>{den}</span><span style={{ color: 'var(--text-3)' }}>=</span>
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 16, color, minWidth: 48, textAlign: 'left' }}>{result}</span>
      </div>
    );

    // ── Combined stats — describe both drivers at once ───────────────────
    if (statKey === 'qualih2h') {
      const { percent1, percent2 } = getPercentage(s1.qualiWins, s2.qualiWins);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Target size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Qualifying H2H</h3></div>
          <p style={bodyStyle}>Across <strong style={{ color: 'var(--text)' }}>{totalRaces}</strong> qualifying sessions, whoever set the faster lap wins that session.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            <span style={{ color: color1 }}>{d1.code} {s1.qualiWins} ({percent1.toFixed(0)}%)</span>
            <span style={{ color: color2 }}>{d2.code} {s2.qualiWins} ({percent2.toFixed(0)}%)</span>
          </div>
        </div>
      );
    }

    if (statKey === 'raceh2h') {
      const correctedRace = getCorrectedRaceH2H(h2hData);
      const missing = totalRaces - (s1.raceWins + s2.raceWins);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Flag size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Race H2H</h3></div>
          <p style={bodyStyle}>
            Whoever finished ahead (even after a DNF, by distance covered) wins that race.
            {missing > 0 ? ` ${missing} race${missing > 1 ? 's' : ''} where both retired ${missing > 1 ? 'were' : 'was'} credited by overall DNF count instead.` : ''}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            <span style={{ color: color1 }}>{d1.code} {correctedRace.wins1}</span>
            <span style={{ color: color2 }}>{d2.code} {correctedRace.wins2}</span>
          </div>
        </div>
      );
    }

    if (statKey === 'sprintqualih2h' || statKey === 'sprinth2h') {
      if (!sprintH2H) return null;
      const isQuali = statKey === 'sprintqualih2h';
      const wins1 = isQuali ? sprintH2H.sqWins1 : sprintH2H.sWins1;
      const wins2 = isQuali ? sprintH2H.sqWins2 : sprintH2H.sWins2;
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Zap size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>{isQuali ? 'Sprint Qualifying H2H' : 'Sprint H2H'}</h3></div>
          <p style={bodyStyle}>
            Same logic as {isQuali ? 'Qualifying' : 'Race'} H2H, across the <strong style={{ color: 'var(--text)' }}>{sprintH2H.totalSprints}</strong> sprint weekend{sprintH2H.totalSprints !== 1 ? 's' : ''} this season.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            <span style={{ color: color1 }}>{d1.code} {wins1}</span>
            <span style={{ color: color2 }}>{d2.code} {wins2}</span>
          </div>
        </div>
      );
    }

    if (statKey === 'qualitorace') {
      const change1 = s1.avgRacePosition - s1.avgQualiPosition;
      const change2 = s2.avgRacePosition - s2.avgQualiPosition;
      const fmt = (c: number) => c > 0 ? `lost ${Math.abs(c).toFixed(1)}` : `gained ${Math.abs(c).toFixed(1)}`;
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Target size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Quali → Race</h3></div>
          <p style={bodyStyle}>Avg race position minus avg qualifying position — negative means positions gained on race day.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <div><span style={{ color: color1, fontWeight: 700 }}>{d1.code}</span>: P{s1.avgRacePosition} − P{s1.avgQualiPosition} → {fmt(change1)} on average</div>
            <div><span style={{ color: color2, fontWeight: 700 }}>{d2.code}</span>: P{s2.avgRacePosition} − P{s2.avgQualiPosition} → {fmt(change2)} on average</div>
          </div>
        </div>
      );
    }

    // ── Everything else — per-driver stats, both sides stacked ───────────
    if (statKey === 'dnfs') {
      const counts1 = summarizeDnfCauses(s1.dnfCauses);
      const counts2 = summarizeDnfCauses(s2.dnfCauses);
      const renderCauses = (code: string, color: string, counts: Record<string, number>, total: number) => (
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color, marginBottom: 6 }}>{code}</div>
          {total === 0 ? (
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-2)', margin: '0 0 4px' }}>No DNFs this season</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(counts) as [string, number][]).filter(([, n]) => n > 0).map(([cause, n]) => (
                <div key={cause}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{cause}</span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 12, color }}>{n}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${(n / total) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Flag size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Reliability</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {renderCauses(d1.code, color1, counts1, s1.dnfs)}
            {renderCauses(d2.code, color2, counts2, s2.dnfs)}
          </div>
        </div>
      );
    }

    if (statKey === 'avgracepos') {
      const finishes1 = s1.raceFinishes as unknown as number[];
      const finishes2 = s2.raceFinishes as unknown as number[];
      const sum1 = finishes1.reduce((a, b) => a + b, 0);
      const sum2 = finishes2.reduce((a, b) => a + b, 0);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Target size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Avg Race Position</h3></div>
          <p style={bodyStyle}>Sum of race finishes divided by races classified (DNFs excluded).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FractionRow code={d1.code} color={color1} num={sum1} den={finishes1.length} result={`P${s1.avgRacePosition}`} />
            <FractionRow code={d2.code} color={color2} num={sum2} den={finishes2.length} result={`P${s2.avgRacePosition}`} />
          </div>
        </div>
      );
    }

    if (statKey === 'avgqualipos') {
      const positions1 = s1.qualiPositions as unknown as number[];
      const positions2 = s2.qualiPositions as unknown as number[];
      const sum1 = positions1.reduce((a, b) => a + b, 0);
      const sum2 = positions2.reduce((a, b) => a + b, 0);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Target size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Avg Quali Position</h3></div>
          <p style={bodyStyle}>Averaged across qualifying sessions.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FractionRow code={d1.code} color={color1} num={sum1} den={positions1.length} result={`P${s1.avgQualiPosition}`} />
            <FractionRow code={d2.code} color={color2} num={sum2} den={positions2.length} result={`P${s2.avgQualiPosition}`} />
          </div>
        </div>
      );
    }

    if (statKey === 'pointsperrace') {
      const finishes1 = s1.raceFinishes.length;
      const finishes2 = s2.raceFinishes.length;
      const ppr1v = finishes1 > 0 ? (s1.racePoints / finishes1).toFixed(1) : '—';
      const ppr2v = finishes2 > 0 ? (s2.racePoints / finishes2).toFixed(1) : '—';
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Trophy size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Points per Race</h3></div>
          <p style={bodyStyle}>Total points scored divided by classified finishes (DNFs excluded).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FractionRow code={d1.code} color={color1} num={s1.racePoints} den={finishes1} result={ppr1v} />
            <FractionRow code={d2.code} color={color2} num={s2.racePoints} den={finishes2} result={ppr2v} />
          </div>
        </div>
      );
    }

    if (statKey === 'poleconv') {
      const pct1 = s1.poles > 0 ? `${((s1.poleWins / s1.poles) * 100).toFixed(1)}%` : 'N/A';
      const pct2 = s2.poles > 0 ? `${((s2.poleWins / s2.poles) * 100).toFixed(1)}%` : 'N/A';
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Trophy size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>Pole Conversion</h3></div>
          <p style={bodyStyle}>Races won after starting from pole, out of total poles.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FractionRow code={d1.code} color={color1} num={s1.poleWins} den={s1.poles} result={pct1} />
            <FractionRow code={d2.code} color={color2} num={s2.poleWins} den={s2.poles} result={pct2} />
          </div>
        </div>
      );
    }

    // Everything left (wins, poles, podiums, fastestlaps, winrate,
    // podiumrate) is "count out of totalRaces" — same shape, just a
    // different count and title.
    const simpleCounts: Record<string, { title: string; value1: number; value2: number }> = {
      wins: { title: 'Wins', value1: s1.wins, value2: s2.wins },
      poles: { title: 'Poles', value1: s1.poles, value2: s2.poles },
      podiums: { title: 'Podiums', value1: s1.podiums, value2: s2.podiums },
      fastestlaps: { title: 'Fastest Laps', value1: s1.fastestLaps, value2: s2.fastestLaps },
      winrate: { title: 'Win Rate', value1: s1.wins, value2: s2.wins },
      podiumrate: { title: 'Podium Rate', value1: s1.podiums, value2: s2.podiums },
    };
    const simple = simpleCounts[statKey];
    if (simple) {
      const pct1 = ((simple.value1 / totalRaces) * 100).toFixed(1);
      const pct2 = ((simple.value2 / totalRaces) * 100).toFixed(1);
      return (
        <div style={panelStyle}>
          <div style={headerStyle}><Trophy size={16} style={{ color: 'var(--accent)' }} /><h3 style={titleStyle}>{simple.title}</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FractionRow code={d1.code} color={color1} num={simple.value1} den={totalRaces} result={`${pct1}%`} />
            <FractionRow code={d2.code} color={color2} num={simple.value2} den={totalRaces} result={`${pct2}%`} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
    <SEO
      path="/stats"
      title="F1 Driver Statistics & Head-to-Head Comparison - METRIK DELTA"
      description={`Compare Formula 1 drivers head-to-head: wins, podiums, poles, fastest laps, qualifying performance and career stats from 1950 to ${CURRENT_SEASON_YEAR}.`}
      keywords="f1 driver statistics, formula 1 h2h, f1 driver comparison, f1 qualifying stats, f1 race stats, f1 career stats, compare f1 drivers"
      structuredData={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "F1 Driver Statistics",
        "description": "Compare Formula 1 drivers head-to-head with full career statistics.",
        "url": "https://metrikdelta.com/stats",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://metrikdelta.com" },
            { "@type": "ListItem", "position": 2, "name": "Statistics", "item": "https://metrikdelta.com/stats" }
          ]
        }
      }}
    />
    <div className="data-zone" style={{
      ...(isMobile ? { minHeight: '100vh', height: 'auto' } : { height: '100vh', overflow: 'hidden' }),
      display: 'grid', gridTemplateRows: isMobile ? 'auto 1fr' : '44px 1fr', gridTemplateColumns: 'minmax(0, 1fr)',
    }}>

      {/* ── TOP BAR — identical to the Telemetry page's header ─────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        paddingLeft: 12, paddingRight: 10,
        paddingTop: isMobile ? 8 : 0, paddingBottom: isMobile ? 8 : 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', flexShrink: 0,
        position: 'relative',
      }}>
        <span className="font-rajdhani font-black text-sm tracking-[0.12em]">
          <span style={{ color: 'var(--text)' }}>METRIK</span>
          <span style={{ color: 'var(--accent)' }}> DELTA</span>
        </span>

        <div style={{
          display: 'flex',
          order: isMobile ? 3 : undefined,
          flexBasis: isMobile ? '100%' : undefined,
          justifyContent: isMobile ? 'center' : undefined,
          position: isMobile ? 'static' : 'absolute',
          left: isMobile ? undefined : '50%', transform: isMobile ? undefined : 'translateX(-50%)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden',
        }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              padding: '3px 9px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
              background: 'transparent', color: 'var(--text-2)',
              border: 'none', borderRight: '1px solid var(--border)',
              cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            Telemetry
          </button>
          <span style={{
            padding: '3px 9px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
            background: 'var(--accent-10)', color: 'var(--accent)',
          }}>
            Statistics
          </span>
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        {isPremium && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 'var(--r)',
            fontSize: 9, fontFamily: 'Rajdhani, sans-serif', fontWeight: 900,
            background: 'var(--accent-10)', color: 'var(--accent)',
            border: '1px solid var(--accent-20)',
          }}>
            <Zap size={9} />PRO
          </span>
        )}

        <div style={{ marginLeft: isMobile ? 'auto' : 0 }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text-2)' }}>
              {user.email?.split('@')[0]}
            </span>
            <button
              onClick={() => signOut()}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                padding: '2px 7px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              padding: '3px 8px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hi)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Sign in
          </button>
        )}
        </div>
      </header>

      {/* ── BODY — left selector panel + right content ──────────────────────── */}
      <main style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'visible' : 'hidden',
      }}>

        {/* ── LEFT PANEL — mirrors SessionExplorer's exactly ─────────────────── */}
        <div style={{
          width: isMobile ? '100%' : 256, flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          overflowY: isMobile ? 'visible' : 'auto',
        }}>
          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <span style={{ display: 'block', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Season</span>
              <select
                value={year}
                aria-label="Season"
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  // Bloquer la saison en cours pour FREE users
                  if (newYear >= CURRENT_SEASON_YEAR && !canAccessYear(newYear)) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setYear(newYear);
                }}
                style={{
                  width: '100%', padding: '7px 28px 7px 10px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  color: 'var(--text)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  outline: 'none', cursor: 'pointer',
                  appearance: 'none' as any,
                }}
              >
                {Array.from({ length: CURRENT_SEASON_YEAR - 2003 + 1 }, (_, i) => CURRENT_SEASON_YEAR - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />

        {/* Driver grid */}
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              Drivers
            </span>
            {(driver1 || driver2) && (
              <button
                onClick={() => { setDriver1(''); setDriver2(''); }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--accent)', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {drivers.map((driver) => {
              const isDriver1Selected = driver1 === driver.abbreviation;
              const isDriver2Selected = driver2 === driver.abbreviation;
              const isSelected = isDriver1Selected || isDriver2Selected;
              const driverColor = getDriverColor(driver.team || 'Unknown');

              let displayColor = driverColor;
              if (isDriver2Selected && driver1) {
                const driver1Team = drivers.find(d => d.abbreviation === driver1)?.team;
                if (driver1Team && areTeammates(driver.team, driver1Team)) {
                  displayColor = '#000000';
                }
              }

              return (
                <button
                  key={driver.abbreviation}
                  onClick={() => toggleDriverSelection(driver.abbreviation)}
                  disabled={loading}
                  style={{
                    position: 'relative', padding: isMobile ? '11px 2px' : '6px 2px',
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9,
                    textAlign: 'center',
                    border: `1px solid ${isSelected ? displayColor : 'var(--border)'}`,
                    borderRadius: 'var(--r)',
                    background: isSelected ? `${displayColor}22` : 'transparent',
                    color: isSelected ? displayColor : 'var(--text-2)',
                    cursor: loading ? 'not-allowed' : 'pointer', outline: 'none',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.12s',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute', top: -6, right: -4, width: 14, height: 14, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700,
                        background: displayColor, color: 'var(--bg)',
                      }}
                    >
                      {isDriver1Selected ? '1' : '2'}
                    </div>
                  )}
                  {driver.abbreviation}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hint */}
        <div style={{ margin: '0 14px', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.6,
            color: 'var(--text-3)', letterSpacing: '0.02em',
          }}>
            Select two drivers to compare their head-to-head record for the season.
          </p>
        </div>

        {/* Dynamic card — contextual DNF / avg-position detail while
            hovering those stats in the comparison card. Takes the spot the
            old "Championship" standings list used to occupy here, before
            that moved into its own permanent panel on the right. */}
        {h2hData && (
          <div style={{ margin: '0 14px', paddingBottom: 12 }}>
            {renderDynamicCard()}
          </div>
        )}

        {/* Legal links — pinned to the very bottom of the sidebar regardless
            of how tall the dynamic card above gets (marginTop: auto pushes
            it down within the flex column), instead of drifting up/down as
            hover content changes. */}
        <div style={{ margin: isMobile ? '0 14px 14px' : 'auto 14px 14px', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize={8} />
        </div>
        </div>

        {/* ── RIGHT CONTENT (comparison card + race log) ───────────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          overflowY: isMobile ? 'visible' : 'auto', overflowX: 'hidden',
          padding: 12, display: 'flex', flexDirection: 'column', background: 'var(--bg)',
        }}>
          {error && (
            <div style={{ marginBottom: 12, flexShrink: 0, background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
              <p style={{ color: '#ff6b6b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textAlign: 'center', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ flex: isMobile ? undefined : 1, minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: isMobile ? undefined : 'stretch' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', flexShrink: 0,
              width: isMobile ? '100%' : 460,
            }}>
              {renderComparisonCard()}
            </div>

            {/* Standings — moved out of the left selector sidebar so that
                sidebar stays lean (season + driver grid only), and placed
                side by side with the comparison card instead of stacked.
                Each panel stretches to match the card's height (flex
                stretch, the container's default align-items) and scrolls
                its own content internally if it doesn't fit. */}
            {standingsList.length > 0 && (
              <div style={{
                flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined,
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14,
                display: 'flex', flexDirection: 'column',
              }}>
                <span style={{
                  display: 'block', marginBottom: 10, flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
                }}>
                  Driver Standings
                </span>
                {/* Staggered starting-grid layout: odd positions (pole
                    side) in the left column, even positions in the right
                    column offset downward, same checkerboard stagger as a
                    real F1 grid. */}
                <div style={{ display: 'flex', gap: 6, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {[0, 1].map(col => (
                    <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: col === 1 ? 12 : 0 }}>
                      {standingsList.filter((_, i) => i % 2 === col).map(entry => {
                        const isSelected = driver1 === entry.code || driver2 === entry.code;
                        const color = getDriverColor(entry.team);
                        return (
                          <button
                            key={entry.code}
                            onClick={() => toggleDriverSelection(entry.code)}
                            disabled={loading}
                            style={{
                              position: 'relative',
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              padding: isMobile ? '9px 2px' : '4px 2px',
                              background: isSelected ? `${color}18` : 'transparent',
                              border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                              borderRadius: 'var(--r)',
                              cursor: loading ? 'not-allowed' : 'pointer', outline: 'none',
                              transition: 'all 0.12s',
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 2, left: 4,
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-3)',
                            }}>
                              {entry.position}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color, whiteSpace: 'nowrap' }}>
                              {getLastName(entry.name)}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 8, color: 'var(--text-2)' }}>
                              {entry.points}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {constructorStandings.length > 0 && (
              <div style={{
                flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined,
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14,
                display: 'flex', flexDirection: 'column',
              }}>
                <span style={{
                  display: 'block', marginBottom: 10, flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
                }}>
                  Constructor Standings
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {(() => {
                    const maxPoints = constructorStandings[0]?.points || 0;
                    return constructorStandings.map(c => {
                      const color = getDriverColor(c.name);
                      const pct = maxPoints > 0 ? (c.points / maxPoints) * 100 : 0;
                      return (
                        <div key={c.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                          {/* Background fill, scaled to this team's points as a
                              share of the leader's — fills the empty horizontal
                              space between name and points instead of leaving
                              it dead, without adding any row height. */}
                          <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: `${color}18` }} />
                          <span style={{ position: 'relative', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-3)', minWidth: 12 }}>{c.position}</span>
                            <span style={{ color, fontWeight: 700 }}>{c.name}</span>
                          </span>
                          <span style={{ position: 'relative', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{c.points}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Race-by-race log — sized to its own content (just a header +
              2 rows) rather than flex:1, so it doesn't stretch to fill all
              leftover vertical space; that space goes to the cards-row
              above instead. Still gets its own scroll for the sticky
              header and the many race columns (horizontal). */}
          {h2hData && h2hData.raceLog.length > 0 && (
            <div style={{
              ...(isMobile ? { maxHeight: 320 } : { flexShrink: 0, maxHeight: '100%' }),
              minWidth: 0,
              marginTop: 12, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
            }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--surface)' }}>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 6, background: 'var(--surface)',
                  width: 90, padding: '8px 14px', textAlign: 'left',
                  borderBottom: '1px solid var(--border-hi)', borderRight: '1px solid var(--border-hi)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 7,
                  color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>
                  Race
                </th>
                {h2hData.raceLog.map(r => {
                  const isHovered = hoveredMetric?.kind === 'race' && hoveredMetric.round === r.round;
                  return (
                  <th
                    key={r.round}
                    onMouseEnter={() => setHoveredMetric({ kind: 'race', round: r.round })}
                    onMouseLeave={() => setHoveredMetric(null)}
                    style={{
                      minWidth: 60, padding: '8px 4px', textAlign: 'center',
                      borderBottom: '1px solid var(--border-hi)',
                      borderRight: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                      color: isHovered ? 'var(--accent)' : 'var(--text-3)', letterSpacing: '0.02em', fontWeight: 400,
                      cursor: 'default',
                      background: isHovered ? 'var(--accent-10)' : undefined,
                    }}
                  >
                    {r.raceName.replace(' Grand Prix', '')}
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[
                { code: h2hData.driver1.code, color: getDriverColor(h2hData.driver1.team), pick: (r: RaceLogEntry) => r.pos1 },
                {
                  code: h2hData.driver2.code,
                  color: areTeammates(h2hData.driver1.team, h2hData.driver2.team) ? '#000000' : getDriverColor(h2hData.driver2.team),
                  pick: (r: RaceLogEntry) => r.pos2,
                },
              ].map(({ code, color, pick }) => (
                <tr key={code} style={{ borderBottom: '1px solid var(--border-hi)' }}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    background: 'var(--bg)', borderRight: '1px solid var(--border-hi)',
                    padding: '8px 14px',
                    fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 13, color,
                  }}>
                    {code}
                  </td>
                  {h2hData.raceLog.map(r => {
                    const pos = pick(r);
                    return (
                      <td key={r.round} style={{
                        textAlign: 'center', padding: '8px 4px',
                        borderRight: '1px solid var(--border)',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                        color: pos == null ? 'var(--text-3)' : color,
                      }}>
                        {pos == null ? 'DNF' : `P${pos}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* 🔥 UPGRADE MODAL */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="current_season"
      />
    </>
  );
}