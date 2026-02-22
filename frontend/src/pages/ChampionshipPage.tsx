import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Flag, TrendingUp, Calendar, Zap, Play, Pause, Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrandPrixSelector from '../components/GrandPrixSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React from 'react';

interface Standing {
  position: number;
  driver?: string;
  constructor?: string;
  points: number;
  wins?: number;
  team?: string;
}

interface RaceEvolutionData {
  round: number;
  raceName: string;
  standings: Array<{
    driver: string;
    points: number;
    position: number;
    team?: string;
  }>;
}

interface RaceResult {
  round: number;
  position: number;
  points?: number;
  status?: string;
}

interface DriverReplacement {
  replacedDriver: string;
  newDriver: string;
  fromRound: number;
  season: number;
}

const DRIVER_REPLACEMENTS: DriverReplacement[] = [
  {
    replacedDriver: 'Jack Doohan',
    newDriver: 'Franco Colapinto',
    fromRound: 7,
    season: 2025
  }
];

const getDriverStartRound = (driverName: string, year: number, raceResults: RaceResult[]): number => {
  const replacement = DRIVER_REPLACEMENTS.find(
    r => r.newDriver === driverName && r.season === year
  );
  
  if (replacement) {
    return replacement.fromRound;
  }
  
  if (raceResults.length === 0) return 1;
  
  const firstValidResult = raceResults.find(r => r.status === 'Finished' || r.position <= 20);
  return firstValidResult ? firstValidResult.round : 1;
};

const getDriverEndRound = (driverName: string, year: number, totalRounds: number): number | null => {
  const replacement = DRIVER_REPLACEMENTS.find(
    r => r.replacedDriver === driverName && r.season === year
  );
  
  if (replacement) {
    return replacement.fromRound - 1;
  }
  
  return null;
};

const getCountryCode = (circuitName: string, locality: string, country: string): string => {
  const countryMap: Record<string, string> = {
    'Bahrain': 'BHR',
    'Saudi Arabia': 'SAU',
    'Australia': 'AUS',
    'Japan': 'JPN',
    'China': 'CHN',
    'USA': 'USA',
    'United States': 'USA',
    'Miami': 'USA',
    'Italy': 'ITA',
    'Imola': 'ITA',
    'Monaco': 'MCO',
    'Spain': 'ESP',
    'Canada': 'CAN',
    'Austria': 'AUT',
    'UK': 'GBR',
    'United Kingdom': 'GBR',
    'Hungary': 'HUN',
    'Belgium': 'BEL',
    'Netherlands': 'NED',
    'Azerbaijan': 'AZE',
    'Singapore': 'SGP',
    'Mexico': 'MEX',
    'Brazil': 'BRA',
    'Las Vegas': 'USA',
    'Abu Dhabi': 'UAE',
    'UAE': 'UAE',
    'Qatar': 'QAT',
    'Portugal': 'POR',
    'France': 'FRA',
    'Turkey': 'TUR',
    'Germany': 'DEU'
  };

  for (const [key, code] of Object.entries(countryMap)) {
    if (country.toLowerCase().includes(key.toLowerCase()) || 
        locality.toLowerCase().includes(key.toLowerCase()) ||
        circuitName.toLowerCase().includes(key.toLowerCase())) {
      return code;
    }
  }

  return country.substring(0, 3).toUpperCase();
};

const getTeamColor = (teamName: string): string => {
  const name = teamName.toLowerCase();
  
  const teamColors: Record<string, string> = {
    'red bull': '#3671C6',
    'ferrari': '#E8002D',
    'mercedes': '#27F4D2',
    'mclaren': '#FF8700',
    'alpine': '#FF87BC',
    'aston martin': '#229971',
    'rb': '#6692FF',
    'alphatauri': '#6692FF',
    'haas': '#B6BABD',
    'kick sauber': '#00E701',
    'sauber': '#00E701',
    'alfa romeo': '#C92D4B',
    'williams': '#00A0DE',
    'racing point': '#F596C8',
    'renault': '#FFF500',
    'audi': '#BB0A30',
    'cadillac': '#003DA5',
  };
  
  for (const [key, color] of Object.entries(teamColors)) {
    if (name.includes(key)) {
      return color;
    }
  }
  
  return '#00E5CC';
};

const getDriverAbbr = (fullName: string): string => {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return parts[parts.length - 1].substring(0, 3).toUpperCase();
  }
  return fullName.substring(0, 3).toUpperCase();
};

const PositionBadge = ({ 
  position, 
  status, 
  isInactive = false 
}: { 
  position: number; 
  status?: string;
  isInactive?: boolean;
}) => {
  if (isInactive) {
    return (
      <span className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/20">
        -
      </span>
    );
  }

  const getTextColor = () => {
    if (position === 1) return 'text-yellow-400';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-amber-600';
    return 'text-white/80';
  };

  const displayValue = () => {
    if (status && (status.includes('Retired') || status.includes('Accident') || status.includes('Collision') || status.includes('Mechanical') || status.includes('Engine') || status.includes('Gearbox') || status.includes('Hydraulics') || status.includes('Electrical'))) {
      return 'DNF';
    }
    return position;
  };

  return (
    <span 
      className={`inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold ${getTextColor()}`}
    >
      {displayValue()}
    </span>
  );
};

const PointsBadge = ({ 
  points, 
  isInactive = false 
}: { 
  points: number;
  isInactive?: boolean;
}) => {
  if (isInactive) {
    return (
      <span className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/20">
        -
      </span>
    );
  }

  const getPointsColor = () => {
    if (points >= 40) return 'text-yellow-400';
    if (points >= 30) return 'text-gray-300';
    if (points >= 20) return 'text-amber-600';
    if (points >= 10) return 'text-white/80';
    if (points > 0) return 'text-white/60';
    return 'text-red-400';
  };

  return (
    <span 
      className={`inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold ${getPointsColor()}`}
    >
      {points}
    </span>
  );
};

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors' | 'after' | 'evolution'>('drivers');
  const [driverStandings, setDriverStandings] = useState<Standing[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<Standing[]>([]);
  const [driverStandingsAfter, setDriverStandingsAfter] = useState<Standing[]>([]);
  const [constructorStandingsAfter, setConstructorStandingsAfter] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [raceName, setRaceName] = useState<string>('');
  const { canAccessYear, isPremium, canMakeRequest, incrementRequest } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const [driverRacePoints, setDriverRacePoints] = useState<Record<string, RaceResult[]>>({});
  const [constructorRacePoints, setConstructorRacePoints] = useState<Record<string, RaceResult[]>>({});
  const [gpCountryCodes, setGpCountryCodes] = useState<string[]>([]);
  
  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});
  
  const [raceEvolutionData, setRaceEvolutionData] = useState<RaceEvolutionData[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [evolutionType, setEvolutionType] = useState<'drivers' | 'constructors'>('drivers');

  const getCacheKey = (type: string, year: number) => `f1_${type}_${year}`;
  
  const getFromCache = (key: string) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const ONE_HOUR = 60 * 60 * 1000;
      
      if (Date.now() - timestamp > ONE_HOUR) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  };
  
  const saveToCache = (key: string, data: any) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  };

  const fetchErgastAPI = async (url: string, retries = 3): Promise<any> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit exceeded (429) for:', url);
          
          if (retries > 0) {
            const waitTime = (4 - retries) * 1000;
            console.log(`Retrying in ${waitTime}ms... (${retries} retries left)`);
            await delay(waitTime);
            return fetchErgastAPI(url, retries - 1);
          }
          
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.MRData) {
        console.error('Invalid API response structure:', data);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching from Ergast API:', url, error);
      return null;
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const loadDriverStandings = async () => {
    setLoading(true);
    setLoadingTimeline(false);
    setTimelineProgress(0);
    
    try {
      const cacheKey = getCacheKey('driver_standings', year);
      const cached = getFromCache(cacheKey);
      
      if (cached) {
        console.log('📦 Loading from cache (drivers)');
        setDriverStandings(cached.standings);
        setDriverRacePoints(cached.racePoints);
        setGpCountryCodes(cached.countryCodes);
        setDriverTeams(cached.driverTeams || {});
        setLoading(false);
        return;
      }

      console.log('🌐 Fetching from API (drivers)');
      
      const data = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/driverstandings/`);
      
      if (!data || !data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
        console.error('No driver standings data available');
        setDriverStandings([]);
        setLoading(false);
        return;
      }
      
      const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
      
      const formatted = standings.map((s: any) => ({
        position: parseInt(s.position),
        driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
        points: parseFloat(s.points),
        wins: parseInt(s.wins),
        team: s.Constructors?.[0]?.name || 'Unknown'
      }));
      
      // ✅ AFFICHAGE IMMÉDIAT DU CLASSEMENT
      setDriverStandings(formatted);
      setLoading(false); // User voit déjà les positions et points !

      const teamsMap: Record<string, string> = {};
      formatted.forEach((driver: Standing) => {
        teamsMap[driver.driver!] = driver.team || 'Unknown';
      });
      setDriverTeams(teamsMap);

      // 🔄 CHARGEMENT PROGRESSIF DE LA TIMELINE
      setLoadingTimeline(true);

      const racesData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}.json`);
      
      if (racesData && racesData.MRData?.RaceTable?.Races) {
        const races = racesData.MRData.RaceTable.Races;
        const pointsMap: Record<string, RaceResult[]> = {};
        const countryCodes: string[] = [];

        formatted.forEach((driver: Standing) => {
          pointsMap[driver.driver!] = [];
        });

        const BATCH_SIZE = 2;
        
        for (let i = 0; i < races.length; i += BATCH_SIZE) {
          const batch = races.slice(i, Math.min(i + BATCH_SIZE, races.length));
          
          const batchPromises = batch.map(async (race: any) => {
            const round = parseInt(race.round);
            
            const circuitName = race.Circuit?.circuitName || '';
            const locality = race.Circuit?.Location?.locality || '';
            const country = race.Circuit?.Location?.country || '';
            const countryCode = getCountryCode(circuitName, locality, country);
            
            await delay(200);
            
            const resultsData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
            
            return {
              round,
              countryCode,
              results: resultsData?.MRData?.RaceTable?.Races?.[0]?.Results || []
            };
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          // ✨ UPDATE PROGRESSIF : Ajouter les résultats au fur et à mesure
          batchResults.forEach(({ round, countryCode, results }) => {
            countryCodes.push(countryCode);
            
            results.forEach((result: any) => {
              const driverName = `${result.Driver.givenName} ${result.Driver.familyName}`;
              const position = parseInt(result.position);
              const status = result.status || 'Finished';
              
              if (pointsMap[driverName]) {
                pointsMap[driverName].push({ round, position, status });
              }
            });
          });
          
          // 🎯 MISE À JOUR IMMÉDIATE avec copie profonde pour forcer React update
          setDriverRacePoints(JSON.parse(JSON.stringify(pointsMap)));
          setGpCountryCodes([...countryCodes]);
          
          // 📊 UPDATE PROGRESS
          const progress = Math.min(100, ((i + BATCH_SIZE) / races.length) * 100);
          setTimelineProgress(progress);
          
          if (i + BATCH_SIZE < races.length) {
            await delay(500);
          }
        }

        setLoadingTimeline(false);
        setTimelineProgress(100);

        saveToCache(cacheKey, {
          standings: formatted,
          racePoints: pointsMap,
          countryCodes,
          driverTeams: teamsMap
        });
      }
    } catch (error) {
      console.error('Error loading driver standings:', error);
      setDriverStandings([]);
      setLoading(false);
      setLoadingTimeline(false);
    }
  };

  const loadConstructorStandings = async () => {
    setLoading(true);
    setLoadingTimeline(false);
    setTimelineProgress(0);
    
    try {
      const cacheKey = getCacheKey('constructor_standings', year);
      const cached = getFromCache(cacheKey);
      
      if (cached) {
        console.log('📦 Loading from cache (constructors)');
        setConstructorStandings(cached.standings);
        setConstructorRacePoints(cached.racePoints);
        setGpCountryCodes(cached.countryCodes);
        setLoading(false);
        return;
      }

      console.log('🌐 Fetching from API (constructors)');
      
      const data = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/constructorstandings/`);
      
      if (!data || !data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings) {
        console.error('No constructor standings data available');
        setConstructorStandings([]);
        setLoading(false);
        return;
      }
      
      const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
      
      const formatted = standings.map((s: any) => ({
        position: parseInt(s.position),
        constructor: s.Constructor.name,
        points: parseFloat(s.points),
        wins: parseInt(s.wins)
      }));
      
      // ✅ AFFICHAGE IMMÉDIAT DU CLASSEMENT
      setConstructorStandings(formatted);
      setLoading(false);

      // 🔄 CHARGEMENT PROGRESSIF DE LA TIMELINE
      setLoadingTimeline(true);

      const racesData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}.json`);
      
      if (racesData && racesData.MRData?.RaceTable?.Races) {
        const races = racesData.MRData.RaceTable.Races;
        const pointsMap: Record<string, RaceResult[]> = {};
        const countryCodes: string[] = [];

        formatted.forEach((constructor: Standing) => {
          pointsMap[constructor.constructor!] = [];
        });

        const BATCH_SIZE = 2;
        
        for (let i = 0; i < races.length; i += BATCH_SIZE) {
          const batch = races.slice(i, Math.min(i + BATCH_SIZE, races.length));
          
          const batchPromises = batch.map(async (race: any) => {
            const round = parseInt(race.round);
            
            const circuitName = race.Circuit?.circuitName || '';
            const locality = race.Circuit?.Location?.locality || '';
            const country = race.Circuit?.Location?.country || '';
            const countryCode = getCountryCode(circuitName, locality, country);
            
            await delay(200);
            
            const resultsData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
            
            return {
              round,
              countryCode,
              results: resultsData?.MRData?.RaceTable?.Races?.[0]?.Results || []
            };
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          // ✨ UPDATE PROGRESSIF
          batchResults.forEach(({ round, countryCode, results }) => {
            countryCodes.push(countryCode);
            
            const constructorPoints: Record<string, number> = {};
            
            results.forEach((result: any) => {
              const constructorName = result.Constructor.name;
              const points = parseFloat(result.points || 0);
              
              if (!constructorPoints[constructorName]) {
                constructorPoints[constructorName] = 0;
              }
              
              constructorPoints[constructorName] += points;
            });

            Object.keys(constructorPoints).forEach(constructorName => {
              if (pointsMap[constructorName]) {
                pointsMap[constructorName].push({ 
                  round, 
                  position: 0,
                  points: constructorPoints[constructorName],
                  status: 'Finished'
                });
              }
            });
          });
          
          // 🎯 MISE À JOUR IMMÉDIATE avec copie profonde
          setConstructorRacePoints(JSON.parse(JSON.stringify(pointsMap)));
          setGpCountryCodes([...countryCodes]);
          
          // 📊 UPDATE PROGRESS
          const progress = Math.min(100, ((i + BATCH_SIZE) / races.length) * 100);
          setTimelineProgress(progress);
          
          if (i + BATCH_SIZE < races.length) {
            await delay(500);
          }
        }

        setLoadingTimeline(false);
        setTimelineProgress(100);

        saveToCache(cacheKey, {
          standings: formatted,
          racePoints: pointsMap,
          countryCodes
        });
      }
    } catch (error) {
      console.error('Error loading constructor standings:', error);
      setConstructorStandings([]);
      setLoading(false);
      setLoadingTimeline(false);
    }
  };

  const loadStandingsAfterRace = async () => {
    setLoading(true);
    try {
      const raceData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${selectedGP}/`);
      if (raceData && raceData.MRData?.RaceTable?.Races?.[0]) {
        const race = raceData.MRData.RaceTable.Races[0];
        setRaceName(race?.raceName || `Round ${selectedGP}`);
      } else {
        setRaceName(`Round ${selectedGP}`);
      }

      const driverData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${selectedGP}/driverstandings/`);
      if (driverData && driverData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
        const driverStandings = driverData.MRData.StandingsTable.StandingsLists[0].DriverStandings;
        
        const formattedDrivers = driverStandings.map((s: any) => ({
          position: parseInt(s.position),
          driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
          points: parseFloat(s.points),
          wins: parseInt(s.wins),
          team: s.Constructors?.[0]?.name || 'Unknown'
        }));
        
        setDriverStandingsAfter(formattedDrivers);
      } else {
        setDriverStandingsAfter([]);
      }

      const constructorData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${selectedGP}/constructorstandings/`);
      if (constructorData && constructorData.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings) {
        const constructorStandings = constructorData.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
        
        const formattedConstructors = constructorStandings.map((s: any) => ({
          position: parseInt(s.position),
          constructor: s.Constructor.name,
          points: parseFloat(s.points),
          wins: parseInt(s.wins)
        }));
        
        setConstructorStandingsAfter(formattedConstructors);
      } else {
        setConstructorStandingsAfter([]);
      }
    } catch (error) {
      console.error('Error loading standings after race:', error);
      setDriverStandingsAfter([]);
      setConstructorStandingsAfter([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRaceEvolution = async () => {
    setLoading(true);
    try {
      const racesData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}.json`);
      
      if (!racesData || !racesData.MRData?.RaceTable?.Races) {
        console.error('No races data available');
        setRaceEvolutionData([]);
        return;
      }
      
      const races = racesData.MRData.RaceTable.Races;
      const evolutionData: RaceEvolutionData[] = [];

      for (let i = 0; i < races.length; i++) {
        const race = races[i];
        const round = parseInt(race.round);
        
        if (i > 0) {
          await delay(200);
        }
        
        if (evolutionType === 'drivers') {
          const data = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/driverstandings/`);
          
          if (data && data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
            const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
            
            evolutionData.push({
              round,
              raceName: race.raceName,
              standings: standings.slice(0, 10).map((s: any) => ({
                driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
                points: parseFloat(s.points),
                position: parseInt(s.position),
                team: s.Constructors?.[0]?.name || 'Unknown'
              }))
            });
          }
        } else {
          const data = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/constructorstandings/`);
          
          if (data && data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings) {
            const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
            
            evolutionData.push({
              round,
              raceName: race.raceName,
              standings: standings.slice(0, 10).map((s: any) => ({
                driver: s.Constructor.name,
                points: parseFloat(s.points),
                position: parseInt(s.position),
                team: s.Constructor.name
              }))
            });
          }
        }
      }

      setRaceEvolutionData(evolutionData);
      setAnimationFrame(0);
    } catch (error) {
      console.error('Error loading race evolution:', error);
      setRaceEvolutionData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadChampionshipData = async () => {
    if (!canMakeRequest) {
      setShowUpgradeModal(true);
      return;
    }
    
    if (activeTab === 'drivers') {
      await loadDriverStandings();
    } else if (activeTab === 'constructors') {
      await loadConstructorStandings();
    } else if (activeTab === 'after') {
      await loadStandingsAfterRace();
    } else if (activeTab === 'evolution') {
      setIsAnimating(false);
      setAnimationFrame(0);
      setRaceEvolutionData([]);
      await loadRaceEvolution();
    }
    
    incrementRequest();
  };

  useEffect(() => {
    if (!isAnimating || raceEvolutionData.length === 0) return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => {
        if (prev >= raceEvolutionData.length - 1) {
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isAnimating, raceEvolutionData.length]);

  useEffect(() => {
    loadChampionshipData();
  }, [year, selectedGP, activeTab, evolutionType]);

  const getCurrentStandings = () => {
    if (activeTab === 'drivers') return driverStandings;
    if (activeTab === 'constructors') return constructorStandings;
    if (activeTab === 'after') return driverStandingsAfter.length > 0 ? driverStandingsAfter : constructorStandingsAfter;
    return [];
  };

  const currentStandings = getCurrentStandings();

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes fadeIn {
            from { 
              opacity: 0;
              transform: scale(0.8);
            }
            to { 
              opacity: 1;
              transform: scale(1);
            }
          }
          .gp-badge-appear {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}
      </style>
      <SEO 
        path="/championship"
        title="F1 Championship Standings & Results - METRIK DELTA"
        description="F1 championship standings, race results, driver rankings and constructor standings 2018-2025. Complete F1 results and podiums history."
        keywords="f1 standings, classement f1, clasificación f1, f1 results, résultat f1, resultados f1, grand prix results, f1 championship, podiums f1"
      />
      <div className="min-h-screen bg-metrik-black text-white">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          
          {/* 🔥 HEADER UNIFIÉ STYLE TELEMETRY/STATISTICS */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
  <button
    onClick={() => navigate('/')}
    className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors group self-start sm:self-center"
  >
    <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
    <span className="font-rajdhani font-bold uppercase tracking-wide text-sm sm:text-base">Back</span>
  </button>

  <div className="flex items-center gap-2 sm:gap-3">
    <Trophy className="text-metrik-turquoise" size={24} />
    <h1 className="text-2xl sm:text-4xl font-rajdhani font-black bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent text-center">
      CHAMPIONSHIP STANDINGS
    </h1>
  </div>

  <div className="hidden sm:block w-24"></div>
</div>

          {/* 🔥 COMPACT UNIFIED HEADER - Year + Tabs + Contextual Selectors */}
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl mb-6 overflow-hidden">
            {/* Top row: Year + Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch border-b border-metrik-turquoise/20">
              {/* Year Selector (intégré comme un tab) */}
              <div className="relative px-4 sm:px-6 py-3 sm:py-4 border-b sm:border-b-0 sm:border-r border-metrik-turquoise/10 bg-metrik-black/30">
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
                  className="h-full px-3 pr-8 bg-transparent border-none text-metrik-turquoise text-sm font-rajdhani font-black uppercase tracking-wider focus:outline-none cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2300E5CC' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                  }}
                >
                  {Array.from({ length: 77 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* 🔥 TABS RESPONSIVE */}
<div className="grid grid-cols-2 sm:grid-cols-4 flex-1">
  {[
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'constructors', label: 'Constructors', icon: Flag },
    { id: 'after', label: 'After', icon: Calendar },
    { id: 'evolution', label: 'Evolution', icon: TrendingUp }
  ].map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)}
      className={`
        relative px-3 sm:px-6 py-3 sm:py-4 font-rajdhani font-bold text-xs sm:text-sm uppercase tracking-wider
        transition-all duration-300 border-r border-metrik-turquoise/10 last:border-r-0
        ${activeTab === tab.id 
          ? 'text-metrik-turquoise bg-metrik-black/20' 
          : 'text-metrik-silver/70 hover:text-white'
        }
      `}
    >
      {tab.label}
      {activeTab === tab.id && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />
      )}
    </button>
  ))}
</div>
            </div>

            {/* Bottom row: Contextual selectors (After GP / Evolution Type) */}
            {(activeTab === 'after' || activeTab === 'evolution') && (
              <div className="p-4 bg-metrik-black/20">
                {activeTab === 'after' && (
                  <div>
                    <label className="block text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wide mb-2">
                      Select Race
                    </label>
                    <GrandPrixSelector
                      year={year}
                      selectedRound={selectedGP}
                      onSelect={setSelectedGP}
                    />
                  </div>
                )}

                {activeTab === 'evolution' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEvolutionType('drivers')}
                      className={`flex-1 px-6 py-3 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-300 ${
                        evolutionType === 'drivers'
                          ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                          : 'bg-metrik-black/40 border border-metrik-turquoise/20 text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                      }`}
                    >
                      Drivers
                    </button>
                    <button
                      onClick={() => setEvolutionType('constructors')}
                      className={`flex-1 px-6 py-3 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-300 ${
                        evolutionType === 'constructors'
                          ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                          : 'bg-metrik-black/40 border border-metrik-turquoise/20 text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                      }`}
                    >
                      Constructors
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔥 TIPS CONTEXTUELS */}
          {activeTab === 'evolution' && !isAnimating && raceEvolutionData.length > 0 && (
            <div className="backdrop-blur-xl bg-metrik-black/40 border border-metrik-turquoise/20 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-metrik-turquoise" />
                <h4 className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wide">
                  Quick Tip
                </h4>
              </div>
              <p className="text-xs text-metrik-silver/70 font-rajdhani leading-relaxed">
                Press PLAY to watch the championship unfold race by race, or drag the timeline to jump to any point
              </p>
            </div>
          )}

          {/* 🔄 PROGRESS BAR TIMELINE */}
          {loadingTimeline && (activeTab === 'drivers' || activeTab === 'constructors') && (
            <div className="backdrop-blur-xl bg-metrik-black/40 border border-metrik-turquoise/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 size={16} className="text-metrik-turquoise animate-spin" />
                <span className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wide">
                  Loading GP Timeline
                </span>
                <span className="text-xs font-rajdhani font-bold text-metrik-silver ml-auto">
                  {Math.round(timelineProgress)}%
                </span>
              </div>
              <div className="w-full h-2 bg-metrik-black/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-metrik-turquoise to-cyan-400 transition-all duration-300 ease-out rounded-full"
                  style={{ 
                    width: `${timelineProgress}%`,
                    boxShadow: '0 0 10px rgba(0, 229, 204, 0.5)'
                  }}
                />
              </div>
            </div>
          )}

          {/* 🔥 CONTENU PRINCIPAL */}
          <div className="space-y-6">
            
            {/* Tableau wrapped dans card */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-6">
              {loading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              )}

              {!loading && (activeTab === 'drivers' || activeTab === 'constructors') && currentStandings.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase border-b border-metrik-turquoise/20">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">{activeTab === 'drivers' ? 'Driver' : 'Constructor'}</div>
                    <div className="col-span-7 text-center">GP Timeline</div>
                    <div className="col-span-1 text-center">W</div>
                    <div className="col-span-1 text-right">PTS</div>
                  </div>

                  {gpCountryCodes.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b border-metrik-turquoise/10">
                      <div className="col-span-1"></div>
                      <div className="col-span-2"></div>
                      <div className="col-span-7 flex items-center overflow-x-auto scrollbar-hide">
                        {gpCountryCodes.map((code, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center justify-center w-[24px] h-4 text-[10px] font-rajdhani font-bold text-metrik-silver/60 uppercase"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                    </div>
                  )}

                  {currentStandings.map((standing, index) => {
                    const teamName = activeTab === 'drivers' 
                      ? (standing.team || driverTeams[standing.driver!] || 'Unknown')
                      : (standing.constructor || '');
                    
                    const teamColor = getTeamColor(teamName);
                    const entityName = standing.driver || standing.constructor || '';
                    const racePoints = activeTab === 'drivers' 
                      ? driverRacePoints[entityName] || []
                      : constructorRacePoints[entityName] || [];

                    const isTop3 = index < 3;
                    const top3Classes = [
                      'bg-yellow-500/10 border-yellow-500/30',
                      'bg-gray-400/10 border-gray-400/30',
                      'bg-orange-600/10 border-orange-600/30'
                    ];

                    return (
                      <div
                        key={standing.position}
                        className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-metrik-turquoise/20 ${
                          isTop3
                            ? `${top3Classes[index]} border-2`
                            : 'bg-metrik-black/50 border-metrik-turquoise/20'
                        }`}
                      >
                        <div className="col-span-1 flex items-center">
                          <span 
                            className="text-2xl font-rajdhani font-black"
                            style={{ color: teamColor }}
                          >
                            {standing.position}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center">
  <div className="text-sm font-rajdhani font-bold text-white truncate">
    {/* 🔥 MOBILE : Abréviation 3 lettres, DESKTOP : Nom complet */}
    <span className="sm:hidden">{getDriverAbbr(entityName)}</span>
    <span className="hidden sm:inline">{entityName}</span>
  </div>
</div>

                        <div className="col-span-7 flex items-center overflow-x-auto scrollbar-hide">
                          {(() => {
                            const startRound = activeTab === 'drivers' ? getDriverStartRound(entityName, year, racePoints) : 1;
                            const endRound = activeTab === 'drivers' ? getDriverEndRound(entityName, year, gpCountryCodes.length) : null;
                            
                            // Si on n'a aucun GP chargé encore, afficher le skeleton
                            if (loadingTimeline && gpCountryCodes.length === 0) {
                              return (
                                <div className="flex items-center gap-2 w-full">
                                  {Array.from({ length: 24 }).map((_, index) => (
                                    <div 
                                      key={index}
                                      className="inline-flex items-center justify-center w-[24px] h-5 rounded animate-pulse"
                                      style={{
                                        background: 'linear-gradient(90deg, rgba(0,229,204,0.1) 0%, rgba(0,229,204,0.3) 50%, rgba(0,229,204,0.1) 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: `shimmer 2s infinite ${index * 0.1}s`
                                      }}
                                    />
                                  ))}
                                </div>
                              );
                            }
                            
                            // Afficher les résultats chargés + skeleton pour ceux qui restent
                            const totalGPs = loadingTimeline ? 24 : gpCountryCodes.length;
                            
                            return Array.from({ length: totalGPs }, (_, index) => {
                              const round = index + 1;
                              const result = racePoints.find(r => r.round === round);
                              const hasCountryCode = index < gpCountryCodes.length;
                              
                              const isInactive = activeTab === 'drivers' && (round < startRound || (endRound !== null && round > endRound));
                              
                              // Badge inactif
                              if (isInactive && hasCountryCode) {
                                return activeTab === 'drivers' 
                                  ? <PositionBadge key={round} position={0} isInactive={true} />
                                  : <PointsBadge key={round} points={0} isInactive={true} />;
                              }
                              
                              // Badge avec résultat (CHARGÉ)
                              if (result && hasCountryCode) {
                                if (activeTab === 'constructors' && result.points !== undefined) {
                                  return (
                                    <div key={`${entityName}-${round}-${result.points}`} className="gp-badge-appear">
                                      <PointsBadge points={result.points} />
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={`${entityName}-${round}-${result.position}`} className="gp-badge-appear">
                                    <PositionBadge position={result.position} status={result.status} />
                                  </div>
                                );
                              }
                              
                              // Skeleton pour GP pas encore chargé
                              if (!hasCountryCode && loadingTimeline) {
                                return (
                                  <div 
                                    key={`skeleton-${round}`}
                                    className="inline-flex items-center justify-center w-[24px] h-5 rounded animate-pulse"
                                    style={{
                                      background: 'linear-gradient(90deg, rgba(0,229,204,0.1) 0%, rgba(0,229,204,0.3) 50%, rgba(0,229,204,0.1) 100%)',
                                      backgroundSize: '200% 100%',
                                      animation: `shimmer 2s infinite ${index * 0.1}s`
                                    }}
                                  />
                                );
                              }
                              
                              // Badge vide (pas de résultat pour ce GP)
                              return (
                                <span 
                                  key={round}
                                  className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/30"
                                >
                                  -
                                </span>
                              );
                            });
                          })()}
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          <span className="text-sm font-rajdhani font-bold text-metrik-silver">
                            {standing.wins || 0}
                          </span>
                        </div>

                        <div className="col-span-1 flex items-center justify-end">
                          <span className="text-lg font-rajdhani font-black text-metrik-turquoise">
                            {standing.points}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && activeTab === 'after' && (driverStandingsAfter.length > 0 || constructorStandingsAfter.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {driverStandingsAfter.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-metrik-turquoise/30">
                        <Users className="text-metrik-turquoise" size={20} />
                        <h2 className="text-lg font-rajdhani font-black text-white uppercase">
                          Drivers after {raceName}
                        </h2>
                      </div>

                      <div className="space-y-2">
                        {driverStandingsAfter.map((standing, index) => {
                          const teamColor = getTeamColor(standing.team || 'Unknown');
                          const isTop3 = index < 3;
                          const top3Classes = [
                            'bg-yellow-500/10 border-yellow-500/30 border-2',
                            'bg-gray-400/10 border-gray-400/30 border-2',
                            'bg-orange-600/10 border-orange-600/30 border-2'
                          ];

                          return (
                            <div key={standing.position} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 hover:scale-[1.01] ${isTop3 ? top3Classes[index] : 'bg-metrik-black/50 border-metrik-turquoise/20'}`}>
                              <div className="flex items-center gap-3 flex-1">
                                <span 
                                  className="text-2xl font-rajdhani font-black w-8"
                                  style={{ color: teamColor }}
                                >
                                  {standing.position}
                                </span>
                                <div className="text-sm font-rajdhani font-bold text-white">{standing.driver}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-metrik-silver">{standing.wins}W</span>
                                <span className="text-lg font-rajdhani font-black text-metrik-turquoise">{standing.points}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {constructorStandingsAfter.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-metrik-turquoise/30">
                        <Flag className="text-metrik-turquoise" size={20} />
                        <h2 className="text-lg font-rajdhani font-black text-white uppercase">
                          Constructors after {raceName}
                        </h2>
                      </div>

                      <div className="space-y-2">
                        {constructorStandingsAfter.map((standing, index) => {
                          const teamColor = getTeamColor(standing.constructor || '');
                          const isTop3 = index < 3;
                          const top3Classes = [
                            'bg-yellow-500/10 border-yellow-500/30 border-2',
                            'bg-gray-400/10 border-gray-400/30 border-2',
                            'bg-orange-600/10 border-orange-600/30 border-2'
                          ];

                          return (
                            <div key={standing.position} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 hover:scale-[1.01] ${isTop3 ? top3Classes[index] : 'bg-metrik-black/50 border-metrik-turquoise/20'}`}>
                              <div className="flex items-center gap-3 flex-1">
                                <span 
                                  className="text-2xl font-rajdhani font-black w-8"
                                  style={{ color: teamColor }}
                                >
                                  {standing.position}
                                </span>
                                <div className="text-sm font-rajdhani font-bold text-white">{standing.constructor}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-metrik-silver">{standing.wins}W</span>
                                <span className="text-lg font-rajdhani font-black text-metrik-turquoise">{standing.points}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!loading && activeTab === 'evolution' && raceEvolutionData.length > 0 && (() => {
                const currentStandings = raceEvolutionData[animationFrame]?.standings
                  .slice()
                  .sort((a, b) => a.position - b.position) || [];

                const allPoints = raceEvolutionData.flatMap(race => race.standings.map(s => s.points || 0));
                const maxPoints = Math.max(...allPoints, 100);

                const calculateLabelPositions = () => {
                  const positions = currentStandings.slice(0, 10).map((standing) => ({
                    driver: standing.driver,
                    points: standing.points || 0,
                    yPosition: maxPoints > 0 ? ((standing.points || 0) / maxPoints) * 100 : 0,
                    color: getTeamColor(standing.team || 'Unknown')
                  }));

                  const sorted = positions.sort((a, b) => b.yPosition - a.yPosition);
                  const minDistance = 8;

                  for (let i = 1; i < sorted.length; i++) {
                    const current = sorted[i];
                    const previous = sorted[i - 1];
                    const distance = previous.yPosition - current.yPosition;

                    if (distance < minDistance) {
                      current.yPosition = previous.yPosition - minDistance;
                    }
                  }

                  return sorted;
                };

                const labelPositions = calculateLabelPositions();

                return (
                  <div className="space-y-6">
                    {/* Race header */}
                    <div className="text-center">
                      <div className="text-metrik-turquoise font-rajdhani font-bold text-xs uppercase tracking-wider mb-1">
                        ROUND {animationFrame + 1} / {raceEvolutionData.length}
                      </div>
                      <h2 className="text-2xl font-rajdhani font-black text-white uppercase">
                        {raceEvolutionData[animationFrame]?.raceName || 'Loading...'}
                      </h2>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => setIsAnimating(!isAnimating)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-lg font-rajdhani font-bold text-sm shadow-lg shadow-metrik-turquoise/50 hover:scale-105 transition-all duration-300"
                      >
                        {isAnimating ? <><Pause size={16} /><span>PAUSE</span></> : <><Play size={16} /><span>PLAY</span></>}
                      </button>
                      <button
                        onClick={() => { setAnimationFrame(0); setIsAnimating(false); }}
                        className="px-5 py-2.5 bg-metrik-black/40 border border-metrik-turquoise/20 text-metrik-silver rounded-lg font-rajdhani font-bold text-sm hover:text-white hover:bg-metrik-turquoise/10 transition-all duration-300"
                      >
                        RESET
                      </button>
                    </div>

                    {/* Chart */}
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-around pointer-events-none z-10">
                        {labelPositions.map((label) => (
                          <div
                            key={label.driver}
                            className="absolute left-0 transition-all duration-1000 ease-out"
                            style={{
                              bottom: `${Math.max(0, Math.min(95, label.yPosition))}%`,
                              transform: 'translateY(50%)'
                            }}
                          >
                            <span 
                              className="font-rajdhani font-black text-xs drop-shadow-lg whitespace-nowrap"
                              style={{ 
                                color: label.color,
                                textShadow: `0 0 8px ${label.color}80`
                              }}
                            >
                              {getDriverAbbr(label.driver)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col justify-around pointer-events-none z-10">
                        {labelPositions.map((label) => (
                          <div
                            key={`${label.driver}-pts`}
                            className="absolute right-0 transition-all duration-1000 ease-out"
                            style={{
                              bottom: `${Math.max(0, Math.min(95, label.yPosition))}%`,
                              transform: 'translateY(50%)'
                            }}
                          >
                            <span 
                              className="font-rajdhani font-black text-xs drop-shadow-lg whitespace-nowrap"
                              style={{ 
                                color: label.color,
                                textShadow: `0 0 8px ${label.color}80`
                              }}
                            >
                              {label.points}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="px-14">
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart 
                            data={raceEvolutionData.slice(0, animationFrame + 1)}
                            margin={{ top: 20, right: 10, left: -35, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis dataKey="round" stroke="#9CA3AF" style={{ fontSize: '10px', fontWeight: 'bold' }} tick={{ fill: '#9CA3AF' }} />
                            <YAxis stroke="#9CA3AF" style={{ fontSize: '10px', fontWeight: 'bold' }} domain={[0, maxPoints]} tick={{ fill: '#9CA3AF' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0A0F1E', border: '2px solid #00E5CC', borderRadius: '8px', padding: '8px' }}
                              labelStyle={{ color: '#00E5CC', fontWeight: 'bold', fontFamily: 'Rajdhani, sans-serif', fontSize: '12px' }}
                              itemStyle={{ color: '#F3F4F6', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px' }}
                            />
                            {raceEvolutionData[0]?.standings.slice(0, 10).map((driver, index) => (
                              <Line 
                                key={driver.driver}
                                type="monotone" 
                                dataKey={(data) => {
                                  const standing = data.standings.find(s => s.driver === driver.driver);
                                  return standing ? standing.points : null;
                                }}
                                stroke={getTeamColor(driver.team || 'Unknown')}
                                strokeWidth={index < 3 ? 3 : 2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2 }}
                                name={getDriverAbbr(driver.driver)}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Timeline slider */}
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase flex-shrink-0">TIMELINE</div>
                      <input
                        type="range"
                        min="0"
                        max={raceEvolutionData.length - 1}
                        value={animationFrame}
                        onChange={(e) => {
                          setAnimationFrame(parseInt(e.target.value));
                          setIsAnimating(false);
                        }}
                        className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgb(0, 229, 204) 0%, rgb(0, 229, 204) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                        }}
                      />
                      <div className="text-xs font-rajdhani font-bold text-metrik-silver flex-shrink-0">
                        {animationFrame + 1} / {raceEvolutionData.length}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
       reason="current_season"  // 🔥 AJOUTER
      />
    </>
  );
}