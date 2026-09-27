import { useState, useEffect, useRef } from 'react';
import { Trophy, Target, Award, Zap, Flag, BarChart3, Users } from 'lucide-react';
import SEO from '../components/SEO';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from '../components/UpgradeModal';
import AuthModal from '../components/AuthModal';
import LegalLinks from '../components/LegalLinks';
import { useIsMobile } from '../hooks/useIsMobile';

interface DriverStats {
  wins: number;
  podiums: number;
  poles: number;
  poleWins: number;
  points: number;
  racePoints: number;
  dnfs: number;
  avgRacePosition: number;
  avgQualiPosition: number;
  qualiWins: number;
  raceWins: number;
  fastestLaps: number;
  raceFinishes: number[];
  qualiPositions: number[];
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

// 🌐 ERGAST API HELPER
const fetchErgastAPI = async (url: string, retries = 3): Promise<any> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        const waitTime = (4 - retries) * 1000;
        console.log(`⏳ Rate limit, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchErgastAPI(url, retries - 1);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data || !data.MRData) return null;
    return data;
  } catch (error) {
    console.error('Ergast API error:', url, error);
    return null;
  }
};

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
  const [year, setYear] = useState(() => parseInt(searchParams.get('y') || '2025'));
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

  // Official points map (driverId → points, includes sprint) — populated once per year
  const [standingsMap, setStandingsMap] = useState<Record<string, number>>({});
  // Full ordered championship standings for the sidebar widget — same fetch
  // as standingsMap, just keeping the whole list instead of only the points.
  const [standingsList, setStandingsList] = useState<{ code: string; name: string; team: string; points: number; position: number }[]>([]);

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

  // A `y=2026` URL restores straight into state before any paywall check —
  // once the subscription status is actually known, bounce back to 2025 if
  // it turns out this viewer isn't entitled to it (waits for `subscriptionReady`
  // so a genuinely premium user's own link isn't wrongly bounced first).
  useEffect(() => {
    if (subscriptionReady && !canAccessYear(year)) {
      setYear(2025);
      setShowUpgradeModal(true);
    }
  }, [subscriptionReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstYearLoadRef = useRef(true);
  useEffect(() => {
    loadDriversForYear(!firstYearLoadRef.current);
    firstYearLoadRef.current = false;
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadData = async () => {
      if (driver1 && driver2 && driver1 !== driver2) {
        setError(null);
        await loadH2H();
      } else if (driver1 && !driver2) {
        setH2HData(null);
        setDriver2Data(null);
        const data = await loadDriverStats(driver1);
        setDriver1Data(data);
      } else if (driver2 && !driver1) {
        setH2HData(null);
        setDriver1Data(null);
        const data = await loadDriverStats(driver2);
        setDriver2Data(data);
      } else {
        setH2HData(null);
        setDriver1Data(null);
        setDriver2Data(null);
        setError(null);
      }
    };

    loadData();
  }, [driver1, driver2, year]);

  // 🔥 HELPER: Générer un code à 3 lettres pour les pilotes sans code
  const generateDriverCode = (driver: any): string => {
    if (driver.code) return driver.code;
    const lastName = driver.familyName.toUpperCase();
    return lastName.substring(0, 3);
  };

  // 🔥 LOAD DRIVERS AVEC ERGAST DIRECT (ONLY DRIVERS WHO RACED)
  // `resetSelection` is false only for the very first call (page load) so a
  // driver1/driver2 restored from the URL isn't wiped out before it's ever
  // used — same fix as TelemetryPage's mount-wipe bug.
  const loadDriversForYear = async (resetSelection: boolean = true) => {
    try {
      setDrivers([]);
      if (resetSelection) {
        setDriver1('');
        setDriver2('');
      }

      const jolpica_base = 'https://api.jolpi.ca/ergast/f1';
      const resultsData = await fetchErgastAPI(`${jolpica_base}/${year}/results.json?limit=1000`);
      const races = resultsData?.MRData?.RaceTable?.Races ?? [];

      const driverCodesSet = new Set<string>();
      const driverInfoMap = new Map<string, any>();

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
          }
        });
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

          const entriesData = await fetchErgastAPI(`${jolpica_base}/${year}/driverStandings.json`);
          const standingsList = entriesData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
          const teamByDriverId = new Map<string, string>();
          standingsList.forEach((s: any) => {
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

      // Fetch official standings (includes sprint points) — one call per year change
      const standingsData = await fetchErgastAPI(`${jolpica_base}/${year}/driverStandings.json`);
      const standingsEntries = standingsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
      const newStandingsMap: Record<string, number> = {};
      standingsEntries.forEach((s: any) => {
        newStandingsMap[s.Driver.driverId] = parseFloat(s.points);
      });
      setStandingsMap(newStandingsMap);
      setStandingsList(standingsEntries.map((s: any) => ({
        code: generateDriverCode(s.Driver),
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        team: s.Constructors?.[0]?.name || 'Unknown',
        points: parseFloat(s.points),
        position: parseInt(s.position),
      })));

      const formattedDrivers = Array.from(driverInfoMap.values()).sort((a, b) =>
        a.abbreviation.localeCompare(b.abbreviation)
      );

      console.log(`✅ Found ${formattedDrivers.length} drivers for ${year}`);

      setDrivers(formattedDrivers);

      if (formattedDrivers.length > 0) {
        setDriver1(formattedDrivers[0].abbreviation);
        setDriver2(formattedDrivers[1]?.abbreviation || '');
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      setError('Failed to load drivers for this season.');
    }
  };

  // 🔥 LOAD SINGLE DRIVER STATS AVEC ERGAST DIRECT
  const loadDriverStats = async (driverCode: string) => {
    try {
      const jolpica_base = "https://api.jolpi.ca/ergast/f1";
      
      const driversData = await fetchErgastAPI(`${jolpica_base}/${year}/drivers.json`);
      if (!driversData?.MRData?.DriverTable?.Drivers) return null;
      
      const driversList = driversData.MRData.DriverTable.Drivers;
      const driverInfo = driversList.find((d: any) => generateDriverCode(d) === driverCode);
      if (!driverInfo) return null;
      
      const driverId = driverInfo.driverId;
      
      const racesData = await fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driverId}/results.json?limit=100`);
      const races = racesData?.MRData?.RaceTable?.Races || [];
      
      const qualiData = await fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driverId}/qualifying.json?limit=100`);
      const qualiRaces = qualiData?.MRData?.RaceTable?.Races || [];
      
      const stats: DriverStats = {
        wins: 0,
        podiums: 0,
        poles: 0,
        poleWins: 0,
        points: 0,
        racePoints: 0,
        dnfs: 0,
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

  // 🔥 LOAD H2H AVEC ERGAST DIRECT
  const loadH2H = async () => {
    if (!driver1 || !driver2 || driver1 === driver2) return;

    setLoading(true);
    
    try {
      const jolpica_base = "https://api.jolpi.ca/ergast/f1";
      
      console.log(`🔍 Fetching H2H: ${year} - ${driver1} vs ${driver2}`);
      
      const driversData = await fetchErgastAPI(`${jolpica_base}/${year}/drivers.json`);
      if (!driversData?.MRData?.DriverTable?.Drivers) {
        throw new Error('No drivers data available');
      }
      
      const driversList = driversData.MRData.DriverTable.Drivers;
      const driver1Info = driversList.find((d: any) => generateDriverCode(d) === driver1);
      const driver2Info = driversList.find((d: any) => generateDriverCode(d) === driver2);
      
      if (!driver1Info || !driver2Info) {
        throw new Error(`Drivers not found in ${year}`);
      }
      
      const driver1Id = driver1Info.driverId;
      const driver2Id = driver2Info.driverId;
      
      const [driver1RacesData, driver2RacesData, driver1QualiData, driver2QualiData] = await Promise.all([
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver1Id}/results.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver2Id}/results.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver1Id}/qualifying.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver2Id}/qualifying.json?limit=100`)
      ]);
      
      const driver1Races = driver1RacesData?.MRData?.RaceTable?.Races || [];
      const driver2Races = driver2RacesData?.MRData?.RaceTable?.Races || [];
      const driver1QualiRaces = driver1QualiData?.MRData?.RaceTable?.Races || [];
      const driver2QualiRaces = driver2QualiData?.MRData?.RaceTable?.Races || [];
      
      const driver1Stats: any = {
        wins: 0, podiums: 0, poles: 0, poleWins: 0, points: 0, racePoints: 0, dnfs: 0,
        raceFinishes: [], qualiPositions: [],
        qualiWins: 0, raceWins: 0, fastestLaps: 0,
        avgRacePosition: 0, avgQualiPosition: 0
      };

      const driver2Stats: any = {
        wins: 0, podiums: 0, poles: 0, poleWins: 0, points: 0, racePoints: 0, dnfs: 0,
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
      console.error('Error loading H2H:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
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

  const renderDriverCard = (driverData: DriverInfo | null, placeholder: string, isSecondDriver: boolean = false) => {
    if (!driverData) {
      return (
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
          padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={40} style={{ color: 'var(--text-3)', marginBottom: 16 }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)', textAlign: 'center', margin: 0 }}>{placeholder}</p>
        </div>
      );
    }

    const baseColor = getDriverColor(driverData.team);
    // Teammates share a team color, so the second driver gets a distinct
    // marker instead — black (not white, unlike the old dark-theme version)
    // since the page background is cream now.
    const displayColor = isSecondDriver && h2hData && areTeammates(h2hData.driver1.team, h2hData.driver2.team)
      ? '#000000'
      : baseColor;

    return (
      <div style={{ background: 'var(--panel)', border: `2px solid ${displayColor}80`, borderRadius: 'var(--r2)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, margin: '0 0 4px', color: displayColor }}>
              {driverData.code}
            </h2>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-2)', margin: 0 }}>{driverData.name}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text-3)', margin: 0 }}>{driverData.team}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 32, color: displayColor, lineHeight: 1 }}>
              {driverData.stats.points}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Points</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { icon: Trophy, label: 'Wins', value: driverData.stats.wins },
            { icon: Target, label: 'Poles', value: driverData.stats.poles },
            { icon: Award, label: 'Podiums', value: driverData.stats.podiums },
            { icon: Zap, label: 'Fastest', value: driverData.stats.fastestLaps }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon size={12} style={{ color: displayColor }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
              </div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: displayColor }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div>
          {[
            ['Avg Race Position', `P${driverData.stats.avgRacePosition}`],
            ['Avg Quali Position', `P${driverData.stats.avgQualiPosition}`],
            ['DNFs', driverData.stats.dnfs],
            ['Points per Race', driverData.stats.raceFinishes.length > 0 ? (driverData.stats.racePoints / driverData.stats.raceFinishes.length).toFixed(1) : '—', true],
            ['Win Rate', `${((driverData.stats.wins / (h2hData?.totalRaces || 24)) * 100).toFixed(1)}%`],
            ['Podium Rate', `${((driverData.stats.podiums / (h2hData?.totalRaces || 24)) * 100).toFixed(1)}%`],
            ['Pole Conversion', driverData.stats.poles > 0 ? `${((driverData.stats.poleWins / driverData.stats.poles) * 100).toFixed(1)}%` : 'N/A'],
            ['Quali → Race', (() => {
              const change = driverData.stats.avgRacePosition - driverData.stats.avgQualiPosition;
              return change > 0 ? `-${Math.abs(change).toFixed(1)}` : `+${Math.abs(change).toFixed(1)}`;
            })()]
          ].map(([label, value, separator], index) => (
            <div
              key={index}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0',
                borderTop: `1px solid ${separator ? 'var(--border-hi)' : 'var(--border)'}`,
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{label}</span>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15, color: displayColor }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
    <SEO
      path="/stats"
      title="F1 Driver Statistics & Head-to-Head Comparison - METRIK DELTA"
      description="Compare Formula 1 drivers head-to-head: wins, podiums, poles, fastest laps, qualifying performance and career stats from 1950 to 2026."
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
      <div style={{
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
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  // Bloquer 2026 pour FREE users
                  if (newYear >= 2026 && !canAccessYear(newYear)) {
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
                {Array.from({ length: 2026 - 2003 + 1 }, (_, i) => 2026 - i).map((y) => (
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
                    position: 'relative', padding: '6px 2px',
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

        {/* Championship standings — an actual staggered starting-grid
            layout: odd positions (pole side) in the left column, even
            positions in the right column offset downward, same checkerboard
            stagger as a real F1 grid. */}
        {standingsList.length > 0 && (
          <div style={{ margin: '0 14px 14px', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{
              display: 'block', marginBottom: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              Championship
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1].map(col => (
                <div key={col} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
                  marginTop: col === 1 ? 12 : 0,
                }}>
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
                          padding: '3px 2px',
                          background: isSelected ? `${color}18` : 'transparent',
                          border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                          borderRadius: 'var(--r)',
                          cursor: loading ? 'not-allowed' : 'pointer', outline: 'none',
                          transition: 'all 0.12s',
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 2, left: 3,
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: 'var(--text-3)',
                        }}>
                          {entry.position}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9, color }}>
                          {entry.code}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 7, color: 'var(--text-2)' }}>
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

        {/* Legal links — pinned to the bottom of the scrollable left panel */}
        <div style={{ margin: '0 14px 14px', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize={8} />
        </div>
        </div>

        {/* ── RIGHT CONTENT (driver cards + race log) ─────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          overflow: isMobile ? 'visible' : 'hidden',
          padding: 12, display: 'flex', flexDirection: 'column', background: 'var(--bg)',
        }}>
          {error && (
            <div style={{ marginBottom: 12, flexShrink: 0, background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
              <p style={{ color: '#ff6b6b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textAlign: 'center', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ overflowY: isMobile ? 'visible' : 'auto' }}>
              {renderDriverCard(driver1Data, 'Select first driver', false)}
            </div>

            <div style={{ overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {h2hData ? (
            <div className="space-y-4">
              <div style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-30)', borderRadius: 'var(--r2)', padding: 14, textAlign: 'center' }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 17, textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 2px' }}>{h2hData.year} Season</h3>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-2)', margin: 0 }}>{h2hData.totalRaces} Races</p>
              </div>

              {(() => {
                // Teammates share a team color — driver 2 gets black instead
                // (not white, unlike the old dark-theme version) since the
                // page background is cream now.
                const driver2BarColor = areTeammates(h2hData.driver1.team, h2hData.driver2.team)
                  ? '#000000'
                  : getDriverColor(h2hData.driver2.team);
                return ['Qualifying', 'Race'].map((type) => {
                const isQuali = type === 'Qualifying';

                let wins1, wins2;

                if (isQuali) {
                  wins1 = h2hData.driver1.stats.qualiWins;
                  wins2 = h2hData.driver2.stats.qualiWins;
                } else {
                  const correctedRace = getCorrectedRaceH2H(h2hData);
                  wins1 = correctedRace.wins1;
                  wins2 = correctedRace.wins2;
                }

                const { percent1, percent2 } = getPercentage(wins1, wins2);

                return (
                  <div key={type} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                      {isQuali ? <Target size={16} style={{ color: 'var(--accent)' }} /> : <Flag size={16} style={{ color: 'var(--accent)' }} />}
                      <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', margin: 0, fontWeight: 700 }}>{type} H2H</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 28, color: getDriverColor(h2hData.driver1.team) }}>
                        {wins1}
                      </span>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 28, color: driver2BarColor }}>
                        {wins2}
                      </span>
                    </div>

                    <div style={{ height: 22, background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${percent1}%`, background: getDriverColor(h2hData.driver1.team), transition: 'width 0.4s' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: '#fff' }}>{percent1.toFixed(0)}%</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${percent2}%`, transition: 'width 0.4s',
                        background: driver2BarColor,
                      }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: driver2BarColor === '#000000' ? '#fff' : '#000' }}>{percent2.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          ) : (
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
              padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={40} style={{ color: 'var(--text-3)', marginBottom: 16 }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)', textAlign: 'center', margin: 0 }}>
                {loading ? 'Loading H2H...' : driver1 && driver2 ? 'Loading...' : 'Select two drivers'}
              </p>
            </div>
          )}
            </div>

            <div style={{ overflowY: isMobile ? 'visible' : 'auto' }}>
              {renderDriverCard(driver2Data, 'Select second driver', true)}
            </div>
          </div>

          {/* Race-by-race log — back under the driver cards (bounded by this
              column's width, not the full page) like the original layout;
              it gets its own internal scroll (both directions) rather than
              trying to force everything onto one screen. */}
          {h2hData && h2hData.raceLog.length > 0 && (
            <div style={{
              ...(isMobile ? { maxHeight: 320 } : { flex: 1, minHeight: 0 }),
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
                {h2hData.raceLog.map(r => (
                  <th key={r.round} style={{
                    minWidth: 60, padding: '8px 4px', textAlign: 'center',
                    borderBottom: '1px solid var(--border-hi)',
                    borderRight: '1px solid var(--border)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                    color: 'var(--text-3)', letterSpacing: '0.02em', fontWeight: 400,
                  }}>
                    {r.raceName.replace(' Grand Prix', '')}
                  </th>
                ))}
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
      </div>
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