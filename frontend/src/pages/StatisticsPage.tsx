import { useState, useEffect } from 'react';
import { Trophy, Target, Award, Flag, BarChart3, Users } from 'lucide-react';
import SEO from '../components/SEO';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { useTranslation } from 'react-i18next';

interface DriverStats {
  wins: number;
  podiums: number;
  poles: number;
  points: number;
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

interface H2HData {
  year: number;
  totalRaces: number;
  driver1: DriverInfo;
  driver2: DriverInfo;
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
  const { t } = useTranslation();
  const { canAccessYear } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Selection states
  const [year, setYear] = useState(2025);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');
  
  // Data states
  const [loading, setLoading] = useState(false);
  const [h2hData, setH2HData] = useState<H2HData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Individual driver stats
  const [driver1Data, setDriver1Data] = useState<DriverInfo | null>(null);
  const [driver2Data, setDriver2Data] = useState<DriverInfo | null>(null);

  // Couleurs par écurie (pas par pilote)
  const teamColors: { [key: string]: string } = {
    'Red Bull': '#3671C6',
    'Red Bull Racing': '#3671C6',
    'McLaren': '#FF8700',
    'Ferrari': '#E8002D',
    'Mercedes': '#27F4D2',
    'Aston Martin': '#229971',
    'Alpine': '#FF87BC',
    'Williams': '#64C4FF',
    'RB': '#6692FF',
    'Racing Bulls': '#6692FF',
    'AlphaTauri': '#6692FF',
    'Toro Rosso': '#6692FF',
    'Haas': '#B6BABD',
    'Haas F1 Team': '#B6BABD',
    'Kick Sauber': '#52E252',
    'Sauber': '#52E252',
    'Audi': '#BB0A30',
    'Alfa Romeo': '#C92D4B',
    'Racing Point': '#F596C8',
    'Renault': '#FFF500',
    'Cadillac': '#003DA5',
  };

  const getDriverColor = (teamName: string) => {
    if (teamColors[teamName]) return teamColors[teamName];

    const teamLower = teamName.toLowerCase();
    if (teamLower.includes('red bull')) return '#3671C6';
    if (teamLower.includes('mclaren')) return '#FF8700';
    if (teamLower.includes('ferrari')) return '#E8002D';
    if (teamLower.includes('mercedes')) return '#27F4D2';
    if (teamLower.includes('aston martin')) return '#229971';
    if (teamLower.includes('alpine')) return '#FF87BC';
    if (teamLower.includes('williams')) return '#64C4FF';
    if (teamLower.includes('racing bulls') || teamLower.includes('alphatauri') || teamLower.includes('toro rosso')) return '#6692FF';
    if (teamLower.includes('haas')) return '#B6BABD';
    if (teamLower.includes('audi') || teamLower.includes('sauber') || teamLower.includes('alfa romeo')) return '#BB0A30';
    if (teamLower.includes('cadillac')) return '#003DA5';
    if (teamLower.includes('racing point')) return '#F596C8';
    if (teamLower.includes('renault')) return '#FFF500';

    return '#00E5CC';
  };
  
  const areTeammates = (team1: string, team2: string) => {
    return team1.toLowerCase() === team2.toLowerCase();
  };

  useEffect(() => {
    loadDriversForYear();
  }, [year]);

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
  const loadDriversForYear = async () => {
    try {
      setDrivers([]);
      setDriver1('');
      setDriver2('');

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
      
      const [racesData, qualiData, standingsData] = await Promise.all([
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driverId}/results.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driverId}/qualifying.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driverId}/driverStandings.json`),
      ]);
      const races = racesData?.MRData?.RaceTable?.Races || [];
      const qualiRaces = qualiData?.MRData?.RaceTable?.Races || [];
      const officialPoints = parseFloat(
        standingsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0]?.points ?? '-1'
      );
      
      const stats: DriverStats = {
        wins: 0,
        podiums: 0,
        poles: 0,
        points: 0,
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
        if (position === 1) stats.wins += 1;
        if (position <= 3) stats.podiums += 1;
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
      
      if (officialPoints >= 0) stats.points = officialPoints;

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
      
      const [driver1RacesData, driver2RacesData, driver1QualiData, driver2QualiData, driver1StandingsData, driver2StandingsData] = await Promise.all([
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver1Id}/results.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver2Id}/results.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver1Id}/qualifying.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver2Id}/qualifying.json?limit=100`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver1Id}/driverStandings.json`),
        fetchErgastAPI(`${jolpica_base}/${year}/drivers/${driver2Id}/driverStandings.json`),
      ]);
      const driver1OfficialPoints = parseFloat(
        driver1StandingsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0]?.points ?? '-1'
      );
      const driver2OfficialPoints = parseFloat(
        driver2StandingsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0]?.points ?? '-1'
      );
      
      const driver1Races = driver1RacesData?.MRData?.RaceTable?.Races || [];
      const driver2Races = driver2RacesData?.MRData?.RaceTable?.Races || [];
      const driver1QualiRaces = driver1QualiData?.MRData?.RaceTable?.Races || [];
      const driver2QualiRaces = driver2QualiData?.MRData?.RaceTable?.Races || [];
      
      const driver1Stats: any = {
        wins: 0, podiums: 0, poles: 0, points: 0, dnfs: 0,
        raceFinishes: [], qualiPositions: [],
        qualiWins: 0, raceWins: 0, fastestLaps: 0,
        avgRacePosition: 0, avgQualiPosition: 0
      };
      
      const driver2Stats: any = {
        wins: 0, podiums: 0, poles: 0, points: 0, dnfs: 0,
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
      
      driver1Races.forEach((race: any) => {
        if (!race.Results?.[0]) return;
        const result = race.Results[0];
        
        const position = parseInt(result.position);
        const points = parseFloat(result.points);
        const status = result.status;
        
        driver1Stats.points += points;
        if (position === 1) driver1Stats.wins += 1;
        if (position <= 3) driver1Stats.podiums += 1;
        if (result.FastestLap?.rank === '1') driver1Stats.fastestLaps += 1;
        
        if (status.includes('Finished') || status.includes('Lap') || status.includes('+')) {
          driver1Stats.raceFinishes.push(position);
        } else {
          driver1Stats.dnfs += 1;
        }
        
        const driver2Result = driver2ResultsByRound[race.round];
        if (driver2Result) {
          const pos2 = parseInt(driver2Result.position);
          const status2 = driver2Result.status;
          
          const d1Finished = status.includes('Finished') || status.includes('Lap') || status.includes('+');
          const d2Finished = status2.includes('Finished') || status2.includes('Lap') || status2.includes('+');
          
          if (d1Finished && d2Finished) {
            if (position < pos2) driver1Stats.raceWins += 1;
            else if (pos2 < position) driver2Stats.raceWins += 1;
          }
        }
      });
      
      driver2Races.forEach((race: any) => {
        if (!race.Results?.[0]) return;
        const result = race.Results[0];
        
        const position = parseInt(result.position);
        const points = parseFloat(result.points);
        const status = result.status;
        
        driver2Stats.points += points;
        if (position === 1) driver2Stats.wins += 1;
        if (position <= 3) driver2Stats.podiums += 1;
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
      
      if (driver1OfficialPoints >= 0) driver1Stats.points = driver1OfficialPoints;
      if (driver2OfficialPoints >= 0) driver2Stats.points = driver2OfficialPoints;

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
        }
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
        <div className="border border-sector-border bg-sector-cream flex flex-col items-center justify-center p-16">
          <Users className="text-sector-muted/30 mb-4" size={32} />
          <p className="font-space-mono text-[11px] tracking-[0.4em] text-sector-muted uppercase">{placeholder}</p>
        </div>
      );
    }

    const baseColor = getDriverColor(driverData.team);
    const displayColor = isSecondDriver && h2hData && areTeammates(h2hData.driver1.team, h2hData.driver2.team)
      ? '#888888'
      : baseColor;

    const totalRaces = h2hData?.totalRaces || 24;

    return (
      <div className="border border-sector-border overflow-hidden" style={{ borderTopColor: displayColor, borderTopWidth: 3 }}>
        {/* Driver header */}
        <div className="flex items-start justify-between p-4 border-b border-sector-border bg-sector-cream">
          <div>
            <h2 className="font-ibm-mono text-2xl leading-none mb-1" style={{ fontWeight: 300, color: displayColor }}>
              {driverData.code}
            </h2>
            <p className="font-space-mono text-[11px] tracking-[0.2em] text-sector-dark">{driverData.name}</p>
            <p className="font-space-mono text-[10px] tracking-[0.2em] text-sector-muted mt-0.5">{driverData.team}</p>
          </div>
          <div className="text-right">
            <div className="font-ibm-mono text-3xl leading-none" style={{ fontWeight: 300, color: displayColor }}>
              {driverData.stats.points}
            </div>
            <div className="font-space-mono text-[10px] tracking-[0.4em] text-sector-dark uppercase mt-1">{t('statistics.points')}</div>
          </div>
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-2 gap-px bg-sector-border">
          {[
            { icon: Trophy, label: t('statistics.wins'),    value: driverData.stats.wins },
            { icon: Target, label: t('statistics.poles'),   value: driverData.stats.poles },
            { icon: Award,  label: t('statistics.podiums'), value: driverData.stats.podiums },
            { icon: Flag,   label: t('statistics.fastest'), value: driverData.stats.fastestLaps },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-sector-bg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={10} style={{ color: displayColor }} />
                <span className="font-space-mono text-[10px] tracking-[0.3em] text-sector-dark uppercase">{label}</span>
              </div>
              <div className="font-ibm-mono text-xl leading-none" style={{ fontWeight: 300, color: displayColor }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Detailed stats */}
        <div className="divide-y divide-sector-border">
          {([
            [t('statistics.avgRacePos'),  `P${driverData.stats.avgRacePosition}`],
            [t('statistics.avgQualiPos'), `P${driverData.stats.avgQualiPosition}`],
            [t('statistics.dnfs'),        driverData.stats.dnfs],
            [t('statistics.ptsPerRace'),  (driverData.stats.points / totalRaces).toFixed(1)],
            [t('statistics.winRate'),     `${((driverData.stats.wins / totalRaces) * 100).toFixed(1)}%`],
            [t('statistics.podiumRate'),  `${((driverData.stats.podiums / totalRaces) * 100).toFixed(1)}%`],
            [t('statistics.poleConv'),    driverData.stats.poles > 0 ? `${((driverData.stats.wins / driverData.stats.poles) * 100).toFixed(1)}%` : '—'],
            [t('statistics.qualiToRace'), (() => { const d = driverData.stats.avgRacePosition - driverData.stats.avgQualiPosition; return d > 0 ? `-${Math.abs(d).toFixed(1)}` : `+${Math.abs(d).toFixed(1)}`; })()],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-2">
              <span className="font-space-mono text-[11px] tracking-[0.2em] text-sector-dark uppercase">{label}</span>
              <span className="font-ibm-mono text-sm" style={{ fontWeight: 300, color: displayColor }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <SEO
        path="/statistics"
        title="Driver Statistics H2H — SECTOR F4R"
        description="Compare Formula 1 drivers head-to-head: wins, podiums, qualifying performance and race analysis."
        keywords="f1 driver statistics, formula 1 h2h, f1 driver comparison, f1 qualifying stats"
      />
      <div className="min-h-screen bg-sector-bg text-sector-black">

        {/* ── Editorial header ── */}
        <div className="border-b border-sector-border px-6 md:px-10 py-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-space-mono text-[11px] tracking-[0.45em] text-sector-muted uppercase mb-1">
                {t('statistics.subtitle')}
              </p>
              <h1
                className="font-ibm-mono uppercase tracking-[0.18em] text-sector-black leading-none"
                style={{ fontSize: 'clamp(1.1rem, 2.4vw, 2.1rem)', fontWeight: 300 }}
              >
                {t('statistics.title')}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 pb-1">
              <BarChart3 size={13} className="text-sector-red" />
              <span className="font-space-mono text-[11px] tracking-[0.35em] text-sector-muted uppercase">2003 — 2026</span>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-10 py-6">

          {/* ── Controls ── */}
          <div className="border border-sector-border mb-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row">

              {/* Year selector */}
              <div className="px-4 py-4 border-b lg:border-b-0 lg:border-r border-sector-border bg-sector-cream lg:w-44 shrink-0">
                <p className="font-space-mono text-[10px] tracking-[0.4em] text-sector-dark uppercase mb-2">{t('statistics.season')}</p>
                <select
                  value={year}
                  onChange={(e) => {
                    const newYear = Number(e.target.value);
                    if (newYear >= 2026 && !canAccessYear(newYear)) { setShowUpgradeModal(true); return; }
                    setYear(newYear);
                  }}
                  className="w-full bg-transparent font-space-mono text-[12px] tracking-[0.25em] text-sector-red uppercase focus:outline-none cursor-pointer appearance-none"
                >
                  {Array.from({ length: 2026 - 2003 + 1 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Driver grid */}
              <div className="p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-space-mono text-[10px] tracking-[0.4em] text-sector-dark uppercase">{t('statistics.driverSelection')}</p>
                  {(driver1 || driver2) && (
                    <button
                      onClick={() => { setDriver1(''); setDriver2(''); }}
                      className="font-space-mono text-[10px] tracking-[0.3em] text-sector-muted hover:text-sector-red uppercase transition-colors"
                    >
                      {t('statistics.clear')}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-11 gap-1.5">
                  {drivers.map((driver) => {
                    const isD1 = driver1 === driver.abbreviation;
                    const isD2 = driver2 === driver.abbreviation;
                    const isSelected = isD1 || isD2;
                    const color = getDriverColor(driver.team || 'Unknown');

                    return (
                      <button
                        key={driver.abbreviation}
                        onClick={() => {
                          if (isD1) setDriver1('');
                          else if (isD2) setDriver2('');
                          else if (!driver1) setDriver1(driver.abbreviation);
                          else if (!driver2) setDriver2(driver.abbreviation);
                          else setDriver1(driver.abbreviation);
                        }}
                        disabled={loading}
                        className={`relative h-8 font-space-mono text-[10px] tracking-[0.1em] uppercase transition-all ${
                          isSelected ? '' : 'border border-sector-border text-sector-dark hover:text-sector-black hover:border-sector-black'
                        } ${loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        style={isSelected ? {
                          border: `2px solid ${color}`,
                          color,
                          backgroundColor: `${color}10`,
                        } : {}}
                      >
                        {isSelected && (
                          <span
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center font-space-mono text-[10px] text-white"
                            style={{ backgroundColor: color }}
                          >
                            {isD1 ? '1' : '2'}
                          </span>
                        )}
                        {driver.abbreviation}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="border border-sector-red bg-sector-red/5 px-4 py-3 mb-6">
              <p className="font-space-mono text-[11px] tracking-[0.3em] text-sector-red uppercase">{error}</p>
            </div>
          )}

          {/* ── Main 3-col grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderDriverCard(driver1Data, t('statistics.selectFirstDriver'), false)}

            {/* Centre H2H */}
            {h2hData ? (
              <div className="space-y-4">
                {/* Season badge */}
                <div className="border border-sector-border bg-sector-cream p-4 text-center">
                  <p className="font-space-mono text-[10px] tracking-[0.45em] text-sector-dark uppercase mb-1">{t('statistics.season')}</p>
                  <p className="font-ibm-mono text-2xl text-sector-black" style={{ fontWeight: 300 }}>{h2hData.year}</p>
                  <p className="font-space-mono text-[10px] tracking-[0.3em] text-sector-dark uppercase mt-1">{h2hData.totalRaces} {t('statistics.races')}</p>
                </div>

                {/* H2H bars */}
                {(['Qualifying', 'Race'] as const).map((type) => {
                  const isQuali = type === 'Qualifying';
                  const wins1: number = isQuali ? h2hData.driver1.stats.qualiWins : getCorrectedRaceH2H(h2hData).wins1;
                  const wins2: number = isQuali ? h2hData.driver2.stats.qualiWins : getCorrectedRaceH2H(h2hData).wins2;
                  const { percent1, percent2 } = getPercentage(wins1, wins2);
                  const color1 = getDriverColor(h2hData.driver1.team);
                  const color2 = areTeammates(h2hData.driver1.team, h2hData.driver2.team) ? '#888888' : getDriverColor(h2hData.driver2.team);

                  return (
                    <div key={type} className="border border-sector-border overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-sector-border bg-sector-cream">
                        {isQuali ? <Target size={11} className="text-sector-red" /> : <Flag size={11} className="text-sector-red" />}
                        <h3 className="font-space-mono text-[10px] tracking-[0.35em] text-sector-black uppercase">{isQuali ? t('statistics.h2hQualifying') : t('statistics.h2hRace')}</h3>
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-ibm-mono text-2xl" style={{ fontWeight: 300, color: color1 }}>{wins1}</span>
                          <span className="font-space-mono text-[10px] tracking-[0.4em] text-sector-dark uppercase">vs</span>
                          <span className="font-ibm-mono text-2xl" style={{ fontWeight: 300, color: color2 }}>{wins2}</span>
                        </div>
                        <div className="h-4 overflow-hidden flex border border-sector-border">
                          <div className="flex items-center justify-center transition-all duration-500"
                            style={{ width: `${percent1}%`, backgroundColor: color1 }}>
                            {percent1 > 15 && <span className="font-space-mono text-[10px] text-white">{percent1.toFixed(0)}%</span>}
                          </div>
                          <div className="flex items-center justify-center transition-all duration-500"
                            style={{ width: `${percent2}%`, backgroundColor: color2 }}>
                            {percent2 > 15 && <span className="font-space-mono text-[10px] text-white">{percent2.toFixed(0)}%</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-sector-border bg-sector-cream flex flex-col items-center justify-center p-16">
                <BarChart3 className="text-sector-muted/30 mb-4" size={32} />
                <p className="font-space-mono text-[11px] tracking-[0.4em] text-sector-muted uppercase text-center">
                  {loading ? t('common.loading') : t('statistics.selectTwoDrivers')}
                </p>
              </div>
            )}

            {renderDriverCard(driver2Data, t('statistics.selectSecondDriver'), true)}
          </div>
        </div>

        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="current_season" />
      </div>
    </>
  );
}