import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, Award, Zap, Flag, BarChart3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';

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
  const { canAccessYear, isPremium, canMakeRequest, incrementRequest } = useSubscription();
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
    'AlphaTauri': '#6692FF',
    'Toro Rosso': '#6692FF',
    'Haas': '#B6BABD',
    'Kick Sauber': '#52E252',
    'Sauber': '#52E252',
    'Alfa Romeo': '#C92D4B',
    'Racing Point': '#F596C8',
    'Renault': '#FFF500',
    'Audi': '#BB0A30',
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
    if (teamLower.includes('alphatauri') || teamLower.includes('toro rosso')) return '#6692FF';
    if (teamLower.includes('haas')) return '#B6BABD';
    if (teamLower.includes('sauber') || teamLower.includes('alfa romeo')) return '#52E252';
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
      
      const resultsData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=1000`);
      
      if (!resultsData || !resultsData.MRData?.RaceTable?.Races) {
        console.error('No race data for', year);
        setError(`No race data available for ${year}`);
        return;
      }
      
      const races = resultsData.MRData.RaceTable.Races;
      
      const driverCodesSet = new Set<string>();
      const driverInfoMap = new Map<string, any>();
      
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
      
      const formattedDrivers = Array.from(driverInfoMap.values()).sort((a, b) => 
        a.abbreviation.localeCompare(b.abbreviation)
      );
      
      console.log(`✅ Found ${formattedDrivers.length} drivers who raced in ${year}`);
      
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
      }
      
      if (driver2Races.length > 0 && driver2Races[driver2Races.length - 1].Results?.[0]) {
        driver2Team = driver2Races[driver2Races.length - 1].Results[0].Constructor.name;
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
        <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-12 sm:p-20 flex flex-col items-center justify-center transition-all duration-300 ease-in-out">
          <Users className="text-metrik-silver/50 mb-4 transition-all duration-300" size={48} />
          <p className="text-metrik-silver font-rajdhani text-lg text-center transition-all duration-300">{placeholder}</p>
        </div>
      );
    }

    const baseColor = getDriverColor(driverData.team);
    const displayColor = isSecondDriver && h2hData && areTeammates(h2hData.driver1.team, h2hData.driver2.team)
      ? '#FFFFFF'
      : baseColor;

    return (
      <div 
        className="backdrop-blur-xl bg-gradient-to-br from-black/40 to-metrik-card/95 border-2 rounded-xl p-3 sm:p-4 transition-all duration-300 ease-in-out animate-fadeIn"
        style={{ borderColor: `${displayColor}80` }}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-rajdhani font-black mb-1" style={{ color: displayColor }}>
              {driverData.code}
            </h2>
            <p className="text-xs text-metrik-silver">{driverData.name}</p>
            <p className="text-[10px] text-metrik-silver/70">{driverData.team}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-rajdhani font-black" style={{ color: displayColor }}>
              {driverData.stats.points}
            </div>
            <div className="text-[10px] text-metrik-silver uppercase">Points</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          {[
            { icon: Trophy, label: 'Wins', value: driverData.stats.wins },
            { icon: Target, label: 'Poles', value: driverData.stats.poles },
            { icon: Award, label: 'Podiums', value: driverData.stats.podiums },
            { icon: Zap, label: 'Fastest', value: driverData.stats.fastestLaps }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-metrik-black/40 rounded-lg p-2 sm:p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} style={{ color: displayColor }} />
                <span className="text-[10px] text-metrik-silver uppercase">{label}</span>
              </div>
              <div className="text-xl sm:text-2xl font-rajdhani font-black" style={{ color: displayColor }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            ['Avg Race Position', `P${driverData.stats.avgRacePosition}`],
            ['Avg Quali Position', `P${driverData.stats.avgQualiPosition}`],
            ['DNFs', driverData.stats.dnfs],
            ['Points per Race', (driverData.stats.points / (h2hData?.totalRaces || 24)).toFixed(1), true],
            ['Win Rate', `${((driverData.stats.wins / (h2hData?.totalRaces || 24)) * 100).toFixed(1)}%`],
            ['Podium Rate', `${((driverData.stats.podiums / (h2hData?.totalRaces || 24)) * 100).toFixed(1)}%`],
            ['Pole Conversion', driverData.stats.poles > 0 ? `${((driverData.stats.wins / driverData.stats.poles) * 100).toFixed(1)}%` : 'N/A'],
            ['Quali → Race', (() => {
              const change = driverData.stats.avgRacePosition - driverData.stats.avgQualiPosition;
              return change > 0 ? `-${Math.abs(change).toFixed(1)}` : `+${Math.abs(change).toFixed(1)}`;
            })()]
          ].map(([label, value, separator], index) => (
            <div 
              key={index}
              className={`flex justify-between items-center py-2 border-t ${separator ? 'border-metrik-turquoise/20' : 'border-metrik-turquoise/10'}`}
            >
              <span className="text-xs text-metrik-silver uppercase">{label}</span>
              <span className="text-base sm:text-lg font-rajdhani font-black" style={{ color: displayColor }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-[1600px]">
        {/* 🔥 HEADER RESPONSIVE */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-all duration-300 font-rajdhani hover:translate-x-[-4px] self-start sm:self-center"
          >
            <ArrowLeft size={20} />
            <span className="text-sm sm:text-base font-bold uppercase">Back</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <BarChart3 className="text-metrik-turquoise" size={24} />
            <h1 className="text-2xl sm:text-3xl font-rajdhani font-black text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300 tracking-wider uppercase">
              Statistics H2H
            </h1>
          </div>

          <div className="hidden sm:block w-24"></div>
        </div>

        {/* 🔥 CONTROLS RESPONSIVE */}
        <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 sm:p-6 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-metrik-turquoise rounded" />
                <h3 className="text-sm font-rajdhani font-bold text-white uppercase tracking-wide">Season</h3>
              </div>

              <div>
                <label className="block text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wide mb-2">Year</label>
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
                  className="w-full h-11 px-4 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white text-sm font-rajdhani font-bold focus:border-metrik-turquoise focus:outline-none hover:border-metrik-turquoise/50 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: 2026 - 2003 + 1 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-metrik-turquoise rounded" />
                  <h3 className="text-sm font-rajdhani font-bold text-white uppercase tracking-wide">Driver Selection</h3>
                </div>
                {(driver1 || driver2) && (
                  <button
                    onClick={() => { setDriver1(''); setDriver2(''); }}
                    className="text-xs font-rajdhani font-bold text-metrik-silver hover:text-metrik-turquoise uppercase tracking-wide transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* 🔥 DRIVER GRID RESPONSIVE - 5 colonnes mobile, 10 desktop */}
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                {drivers.map((driver) => {
                  const isDriver1Selected = driver1 === driver.abbreviation;
                  const isDriver2Selected = driver2 === driver.abbreviation;
                  const isSelected = isDriver1Selected || isDriver2Selected;
                  const driverColor = getDriverColor(driver.team || 'Unknown');
                  
                  let displayColor = driverColor;
                  if (isDriver2Selected && driver1) {
                    const driver1Team = drivers.find(d => d.abbreviation === driver1)?.team;
                    if (driver1Team && areTeammates(driver.team, driver1Team)) {
                      displayColor = '#FFFFFF';
                    }
                  }

                  return (
                    <button
                      key={driver.abbreviation}
                      onClick={() => {
                        if (isDriver1Selected) {
                          setDriver1('');
                        } else if (isDriver2Selected) {
                          setDriver2('');
                        } else if (!driver1) {
                          setDriver1(driver.abbreviation);
                        } else if (!driver2) {
                          setDriver2(driver.abbreviation);
                        } else {
                          setDriver1(driver.abbreviation);
                        }
                      }}
                      disabled={loading}
                      className={`
                        relative h-9 sm:h-10 rounded-lg font-rajdhani font-black text-xs sm:text-sm uppercase tracking-wide
                        transition-all duration-200 flex items-center justify-center
                        ${isSelected ? 'shadow-lg scale-105' : 'bg-metrik-black/40 border border-metrik-silver/20 text-metrik-silver/60 hover:text-metrik-silver hover:border-metrik-silver/40 hover:scale-105'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={isSelected ? {
                        backgroundColor: `${displayColor}20`,
                        borderWidth: '2px',
                        borderColor: displayColor,
                        color: displayColor,
                        boxShadow: `0 0 15px ${displayColor}30`,
                      } : {}}
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                          style={{
                            backgroundColor: displayColor,
                            color: '#000',
                            boxShadow: `0 0 8px ${displayColor}50`,
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
          </div>
        </div>

        {error && (
          <div className="mb-4 backdrop-blur-xl bg-red-500/10 border border-red-500/50 rounded-xl p-4 transition-all duration-300">
            <p className="text-red-400 font-rajdhani font-bold text-center">{error}</p>
          </div>
        )}

        {/* 🔥 MAIN CONTENT GRID RESPONSIVE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {renderDriverCard(driver1Data, 'Select first driver', false)}

          {h2hData ? (
            <div className="space-y-4">
              <div className="backdrop-blur-xl bg-gradient-to-r from-metrik-turquoise/10 to-cyan-500/10 border border-metrik-turquoise/50 rounded-xl p-3 sm:p-4 text-center">
                <h3 className="text-lg font-rajdhani font-black text-metrik-turquoise uppercase mb-1">{h2hData.year} Season</h3>
                <p className="text-sm text-metrik-silver">{h2hData.totalRaces} Races</p>
              </div>

              {['Qualifying', 'Race'].map((type) => {
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
                  <div key={type} className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {isQuali ? <Target className="text-metrik-turquoise" size={18} /> : <Flag className="text-metrik-turquoise" size={18} />}
                      <h3 className="text-sm font-rajdhani font-black text-metrik-turquoise uppercase">{type} H2H</h3>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl font-rajdhani font-black" style={{ color: getDriverColor(h2hData.driver1.team) }}>
                        {wins1}
                      </span>
                      <span className="text-3xl font-rajdhani font-black" 
                        style={{ color: areTeammates(h2hData.driver1.team, h2hData.driver2.team) ? '#FFFFFF' : getDriverColor(h2hData.driver2.team) }}>
                        {wins2}
                      </span>
                    </div>

                    <div className="h-6 bg-metrik-black/50 rounded-full overflow-hidden border border-metrik-turquoise/30 flex">
                      <div className="flex items-center justify-center transition-all duration-500" 
                        style={{ width: `${percent1}%`, backgroundColor: getDriverColor(h2hData.driver1.team) }}>
                        <span className="text-xs font-rajdhani font-bold text-white">{percent1.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-center transition-all duration-500" 
                        style={{ 
                          width: `${percent2}%`, 
                          backgroundColor: areTeammates(h2hData.driver1.team, h2hData.driver2.team) ? '#FFFFFF' : getDriverColor(h2hData.driver2.team) 
                        }}>
                        <span className="text-xs font-rajdhani font-bold text-black">{percent2.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-12 sm:p-20 flex flex-col items-center justify-center">
              <BarChart3 className="text-metrik-silver/50 mb-4" size={48} />
              <p className="text-metrik-silver font-rajdhani text-lg text-center">
                {loading ? 'Loading H2H...' : driver1 && driver2 ? 'Loading...' : 'Select two drivers'}
              </p>
            </div>
          )}

          {renderDriverCard(driver2Data, 'Select second driver', true)}
        </div>
      </div>

      {/* 🔥 UPGRADE MODAL */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="current_season"
      />
    </div>
  );
}