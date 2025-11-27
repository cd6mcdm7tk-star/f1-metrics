import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Flag, TrendingUp, Calendar, Award, Crown, Medal, Play, Pause, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrandPrixSelector from '../components/GrandPrixSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRateLimit } from '../hooks/useRateLimit';
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
}

interface RaceEvolutionData {
  round: number;
  raceName: string;
  standings: Array<{
    driver: string;
    points: number;
    position: number;
  }>;
}

interface RaceResult {
  round: number;
  position: number; // Position finale (P1, P2, P3, etc.) - pour drivers
  points?: number; // Points gagnés ce GP - pour constructors
  status?: string; // "Finished", "Retired", "Accident", etc.
}

interface DriverReplacement {
  replacedDriver: string;
  newDriver: string;
  fromRound: number; // À partir de quel round le nouveau pilote commence
  season: number;
}

// Configuration des remplacements connus
const DRIVER_REPLACEMENTS: DriverReplacement[] = [
  {
    replacedDriver: 'Jack Doohan',
    newDriver: 'Franco Colapinto',
    fromRound: 7, // Imola 2025
    season: 2025
  }
  // Ajouter d'autres remplacements ici si besoin
];

// Fonction helper pour obtenir le round de début d'un pilote
const getDriverStartRound = (driverName: string, year: number, raceResults: RaceResult[]): number => {
  // Chercher si c'est un remplaçant
  const replacement = DRIVER_REPLACEMENTS.find(
    r => r.newDriver === driverName && r.season === year
  );
  
  if (replacement) {
    return replacement.fromRound;
  }
  
  // Sinon, détecter automatiquement (premier résultat non-DNF ou premier round)
  if (raceResults.length === 0) return 1;
  
  const firstValidResult = raceResults.find(r => r.status === 'Finished' || r.position <= 20);
  return firstValidResult ? firstValidResult.round : 1;
};

// Fonction helper pour obtenir le round de fin d'un pilote
const getDriverEndRound = (driverName: string, year: number, totalRounds: number): number | null => {
  // Chercher si ce pilote a été remplacé
  const replacement = DRIVER_REPLACEMENTS.find(
    r => r.replacedDriver === driverName && r.season === year
  );
  
  if (replacement) {
    return replacement.fromRound - 1; // Dernier round avant le remplacement
  }
  
  return null; // Pas remplacé = jusqu'à la fin
};

// Get country code from circuit name or location
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

  // Try to match country
  for (const [key, code] of Object.entries(countryMap)) {
    if (country.toLowerCase().includes(key.toLowerCase()) || 
        locality.toLowerCase().includes(key.toLowerCase()) ||
        circuitName.toLowerCase().includes(key.toLowerCase())) {
      return code;
    }
  }

  return country.substring(0, 3).toUpperCase();
};

// Team colors mapping - SAISON 2025
const getTeamColor = (driverOrTeam: string): string => {
  const name = driverOrTeam.toLowerCase();
  
  // Red Bull Racing (2025: Verstappen, Tsunoda)
  if (name.includes('verstappen') || name.includes('tsunoda') || name.includes('red bull')) {
    return '#3671C6';
  }
  
  // Ferrari (2025: Leclerc, Hamilton)
  if (name.includes('leclerc') || name.includes('hamilton') || name.includes('ferrari')) {
    return '#E8002D';
  }
  
  // Mercedes (2025: Russell, Antonelli)
  if (name.includes('russell') || name.includes('antonelli') || name.includes('mercedes')) {
    return '#27F4D2';
  }
  
  // McLaren (2025: Norris, Piastri)
  if (name.includes('norris') || name.includes('piastri') || name.includes('mclaren')) {
    return '#FF8700';
  }
  
  // Alpine (2025: Gasly, Doohan)
  if (name.includes('gasly') || name.includes('doohan') || name.includes('alpine') || name.includes('colapinto')) {
    return '#FF87BC';
  }
  
  // Aston Martin (2025: Alonso, Stroll)
  if (name.includes('alonso') || name.includes('stroll') || name.includes('aston')) {
    return '#229971';
  }
  
  // RB (2025: Lawson, Hadjar)
  if (name.includes('lawson') || name.includes('hadjar') || name.includes('alphatauri')) {
    return '#6692FF';
  }
  
  // Kick Sauber (2025: Hulkenberg, Bortoleto)
  if (name.includes('hulkenberg') || name.includes('bortoleto') || name.includes('bottas') || name.includes('zhou') || name.includes('alfa') || name.includes('sauber')) {
    return '#00E701';
  }
  
  // Haas (2025: Ocon, Bearman)
  if (name.includes('ocon') || name.includes('bearman') || name.includes('magnussen') || name.includes('haas')) {
    return '#B6BABD';
  }
  
  // Williams (2025: Albon, Sainz)
  if (name.includes('albon') || name.includes('sainz') || name.includes('sargeant') || name.includes('williams') || name.includes('colapinto')) {
    return '#00A0DE';
  }
  
  return '#00E5CC';
};

// Get driver abbreviation
const getDriverAbbr = (fullName: string): string => {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return parts[parts.length - 1].substring(0, 3).toUpperCase();
  }
  return fullName.substring(0, 3).toUpperCase();
};

// Position badge component - AFFICHE POSITIONS AVEC COULEURS OR/ARGENT/BRONZE
const PositionBadge = ({ 
  position, 
  status, 
  isInactive = false 
}: { 
  position: number; 
  status?: string;
  isInactive?: boolean;
}) => {
  // Si case inactive (avant arrivée ou après départ)
  if (isInactive) {
    return (
      <span className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/20">
        -
      </span>
    );
  }

  // Couleurs Or/Argent/Bronze pour le podium
  const getTextColor = () => {
    if (position === 1) return 'text-yellow-400'; // Or
    if (position === 2) return 'text-gray-300'; // Argent
    if (position === 3) return 'text-amber-600'; // Bronze
    return 'text-white/80'; // Blanc pour le reste
  };

  // Afficher DNF si abandon, sinon la position
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

// Points badge component - AFFICHE POINTS TOTAUX POUR CONSTRUCTEURS
const PointsBadge = ({ 
  points, 
  isInactive = false 
}: { 
  points: number;
  isInactive?: boolean;
}) => {
  // Si case inactive
  if (isInactive) {
    return (
      <span className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/20">
        -
      </span>
    );
  }

  // Couleurs selon les points
  const getPointsColor = () => {
    if (points >= 40) return 'text-yellow-400'; // 40-44 pts (double podium) - Or
    if (points >= 30) return 'text-gray-300'; // 30-39 pts (podium + top 5) - Argent
    if (points >= 20) return 'text-amber-600'; // 20-29 pts (top 5) - Bronze
    if (points >= 10) return 'text-white/80'; // 10-19 pts - Blanc
    if (points > 0) return 'text-white/60'; // 1-9 pts - Gris
    return 'text-red-400'; // 0 pts - Rouge
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
  const [raceName, setRaceName] = useState<string>('');
  const { canMakeRequest, incrementRequest } = useRateLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Race points per driver
  const [driverRacePoints, setDriverRacePoints] = useState<Record<string, RaceResult[]>>({});
  const [constructorRacePoints, setConstructorRacePoints] = useState<Record<string, RaceResult[]>>({});
  const [gpCountryCodes, setGpCountryCodes] = useState<string[]>([]); // Codes pays des GP (BHR, AUS, etc.)
  
  // Race Evolution states
  const [raceEvolutionData, setRaceEvolutionData] = useState<RaceEvolutionData[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [evolutionType, setEvolutionType] = useState<'drivers' | 'constructors'>('drivers');

  // Year selector state
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Cache helper functions
  const getCacheKey = (type: string, year: number) => `f1_${type}_${year}`;
  
  const getFromCache = (key: string) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const ONE_HOUR = 60 * 60 * 1000;
      
      // Invalider le cache après 1 heure
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

  const fetchErgastAPI = async (url: string): Promise<any> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit exceeded (429) for:', url);
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
    try {
      // Check cache first
      const cacheKey = getCacheKey('driver_standings', year);
      const cached = getFromCache(cacheKey);
      
      if (cached) {
        console.log('📦 Loading from cache (drivers)');
        setDriverStandings(cached.standings);
        setDriverRacePoints(cached.racePoints);
        setGpCountryCodes(cached.countryCodes);
        setLoading(false);
        return;
      }

      console.log('🌐 Fetching from API (drivers)');
      
      // Load final standings
      const data = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/driverstandings/`);
      
      if (!data || !data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
        console.error('No driver standings data available');
        setDriverStandings([]);
        return;
      }
      
      const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
      
      const formatted = standings.map((s: any) => ({
        position: parseInt(s.position),
        driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
        points: parseFloat(s.points),
        wins: parseInt(s.wins)
      }));
      
      setDriverStandings(formatted);

      // Load race-by-race points for each driver
      const racesData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}.json`);
      
      if (racesData && racesData.MRData?.RaceTable?.Races) {
        const races = racesData.MRData.RaceTable.Races;
        const pointsMap: Record<string, RaceResult[]> = {};
        const countryCodes: string[] = [];

        // Initialize all drivers
        formatted.forEach((driver: Standing) => {
          pointsMap[driver.driver!] = [];
        });

        // ⚡ PARALLEL FETCHING - Tous les GP en même temps
        const racePromises = races.slice(0, 24).map(async (race: any) => {
          const round = parseInt(race.round);
          
          // Extract country code from race data
          const circuitName = race.Circuit?.circuitName || '';
          const locality = race.Circuit?.Location?.locality || '';
          const country = race.Circuit?.Location?.country || '';
          const countryCode = getCountryCode(circuitName, locality, country);
          
          const resultsData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
          
          return {
            round,
            countryCode,
            results: resultsData?.MRData?.RaceTable?.Races?.[0]?.Results || []
          };
        });

        // Attendre tous les résultats en parallèle
        const allRaceResults = await Promise.all(racePromises);

        // Process results
        allRaceResults.forEach(({ round, countryCode, results }) => {
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

        setDriverRacePoints(pointsMap);
        setGpCountryCodes(countryCodes);

        // Save to cache
        saveToCache(cacheKey, {
          standings: formatted,
          racePoints: pointsMap,
          countryCodes
        });
      }
    } catch (error) {
      console.error('Error loading driver standings:', error);
      setDriverStandings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConstructorStandings = async () => {
    setLoading(true);
    try {
      // Check cache first
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
        return;
      }
      
      const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
      
      const formatted = standings.map((s: any) => ({
        position: parseInt(s.position),
        constructor: s.Constructor.name,
        points: parseFloat(s.points),
        wins: parseInt(s.wins)
      }));
      
      setConstructorStandings(formatted);

      // Load race-by-race points for constructors
      const racesData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}.json`);
      
      if (racesData && racesData.MRData?.RaceTable?.Races) {
        const races = racesData.MRData.RaceTable.Races;
        const pointsMap: Record<string, RaceResult[]> = {};
        const countryCodes: string[] = [];

        formatted.forEach((constructor: Standing) => {
          pointsMap[constructor.constructor!] = [];
        });

        // ⚡ PARALLEL FETCHING - Tous les GP en même temps
        const racePromises = races.slice(0, 24).map(async (race: any) => {
          const round = parseInt(race.round);
          
          // Extract country code
          const circuitName = race.Circuit?.circuitName || '';
          const locality = race.Circuit?.Location?.locality || '';
          const country = race.Circuit?.Location?.country || '';
          const countryCode = getCountryCode(circuitName, locality, country);
          
          const resultsData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
          
          return {
            round,
            countryCode,
            results: resultsData?.MRData?.RaceTable?.Races?.[0]?.Results || []
          };
        });

        // Attendre tous les résultats en parallèle
        const allRaceResults = await Promise.all(racePromises);

        // Process results
        allRaceResults.forEach(({ round, countryCode, results }) => {
          countryCodes.push(countryCode);
          
          // Calculate total points for each constructor in this GP
          const constructorPoints: Record<string, number> = {};
          
          results.forEach((result: any) => {
            const constructorName = result.Constructor.name;
            const points = parseFloat(result.points || 0);
            
            if (!constructorPoints[constructorName]) {
              constructorPoints[constructorName] = 0;
            }
            
            constructorPoints[constructorName] += points;
          });

          // Store total points for each constructor
          Object.keys(constructorPoints).forEach(constructorName => {
            if (pointsMap[constructorName]) {
              pointsMap[constructorName].push({ 
                round, 
                position: 0, // Not used for constructors
                points: constructorPoints[constructorName],
                status: 'Finished'
              });
            }
          });
        });

        setConstructorRacePoints(pointsMap);
        setGpCountryCodes(countryCodes);

        // Save to cache
        saveToCache(cacheKey, {
          standings: formatted,
          racePoints: pointsMap,
          countryCodes
        });
      }
    } catch (error) {
      console.error('Error loading constructor standings:', error);
      setConstructorStandings([]);
    } finally {
      setLoading(false);
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
          wins: parseInt(s.wins)
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
                position: parseInt(s.position)
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
                position: parseInt(s.position)
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
      <SEO 
        path="/championship"
        title="F1 Championship Standings & Results - METRIK DELTA"
        description="F1 championship standings, race results, driver rankings and constructor standings 2018-2025. Complete F1 results and podiums history."
        keywords="f1 standings, classement f1, clasificación f1, f1 results, résultat f1, resultados f1, grand prix results, f1 championship, podiums f1"
      />
      <div className="min-h-screen bg-metrik-black text-white">
        <div className="container mx-auto px-4 py-4 md:py-6">
          {/* HEADER ULTRA COMPACT */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-all duration-300 font-rajdhani hover:translate-x-[-4px]"
            >
              <ArrowLeft size={20} />
              <span className="text-base md:text-lg">BACK</span>
            </button>

            <div className="flex items-center gap-3">
              <Trophy className="text-metrik-turquoise" size={24} />
              <h1 className="text-2xl md:text-4xl font-rajdhani font-black text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300 tracking-wider">
                CHAMPIONSHIP {year}
              </h1>
            </div>

            {/* YEAR SELECTOR INLINE */}
            <div className="relative">
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-metrik-card/95 border border-metrik-turquoise/30 rounded-lg hover:border-metrik-turquoise/60 transition-all duration-300 font-rajdhani font-bold text-metrik-turquoise"
              >
                {year}
                <ChevronDown size={16} className={`transition-transform duration-300 ${showYearDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showYearDropdown && (
                <div className="absolute right-0 mt-2 w-48 max-h-64 overflow-y-auto bg-metrik-card border border-metrik-turquoise/30 rounded-lg shadow-xl z-50">
                  {Array.from({ length: 76 }, (_, i) => 2025 - i).map(y => (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setShowYearDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left font-rajdhani font-bold transition-all duration-200 ${
                        y === year
                          ? 'bg-metrik-turquoise text-metrik-black'
                          : 'text-metrik-silver hover:bg-metrik-turquoise/10 hover:text-white'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GP SELECTOR (only for AFTER tab) */}
          {activeTab === 'after' && (
            <div className="mb-4">
              <GrandPrixSelector
                year={year}
                selectedRound={selectedGP}
                onSelect={setSelectedGP}
              />
            </div>
          )}

          {/* EVOLUTION TYPE SELECTOR */}
          {activeTab === 'evolution' && (
            <div className="mb-4 flex justify-center gap-2">
              <button
                onClick={() => setEvolutionType('drivers')}
                className={`px-6 py-2 rounded-lg font-rajdhani font-bold transition-all duration-300 ${
                  evolutionType === 'drivers'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'bg-metrik-card border border-metrik-turquoise/30 text-metrik-silver hover:text-white'
                }`}
              >
                DRIVERS
              </button>
              <button
                onClick={() => setEvolutionType('constructors')}
                className={`px-6 py-2 rounded-lg font-rajdhani font-bold transition-all duration-300 ${
                  evolutionType === 'constructors'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'bg-metrik-card border border-metrik-turquoise/30 text-metrik-silver hover:text-white'
                }`}
              >
                CONSTRUCTORS
              </button>
            </div>
          )}

          {/* TABS */}
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl mb-4 overflow-hidden">
            <div className="flex border-b border-metrik-turquoise/20">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`flex-1 px-4 py-3 font-rajdhani font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'drivers'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                }`}
              >
                <Users size={16} />
                DRIVERS
              </button>
              <button
                onClick={() => setActiveTab('constructors')}
                className={`flex-1 px-4 py-3 font-rajdhani font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'constructors'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                }`}
              >
                <Flag size={16} />
                CONSTRUCTORS
              </button>
              <button
                onClick={() => setActiveTab('after')}
                className={`flex-1 px-4 py-3 font-rajdhani font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'after'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                }`}
              >
                <Calendar size={16} />
                AFTER
              </button>
              <button
                onClick={() => setActiveTab('evolution')}
                className={`flex-1 px-4 py-3 font-rajdhani font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'evolution'
                    ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                    : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
                }`}
              >
                <TrendingUp size={16} />
                EVOLUTION
              </button>
            </div>

            <div className="p-4">
              {loading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              )}

              {/* DRIVERS & CONSTRUCTORS - TABLEAU OPTIMISÉ AVEC GP TIMELINE */}
              {!loading && (activeTab === 'drivers' || activeTab === 'constructors') && currentStandings.length > 0 && (
                <div className="space-y-2">
                  {/* TABLE HEADER */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase border-b border-metrik-turquoise/20">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">{activeTab === 'drivers' ? 'Driver' : 'Constructor'}</div>
                    <div className="col-span-7 text-center">GP Timeline</div>
                    <div className="col-span-1 text-center">W</div>
                    <div className="col-span-1 text-right">PTS</div>
                  </div>

                  {/* GP COUNTRY CODES ROW */}
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

                  {/* TABLE ROWS */}
                  {currentStandings.map((standing, index) => {
                    const teamColor = getTeamColor(standing.driver || standing.constructor || '');
                    const entityName = standing.driver || standing.constructor || '';
                    const racePoints = activeTab === 'drivers' 
                      ? driverRacePoints[entityName] || []
                      : constructorRacePoints[entityName] || [];

                    // Style spécial pour le top 3
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
                        {/* POSITION - NUMÉRO COLORÉ SANS FOND */}
                        <div className="col-span-1 flex items-center">
                          <span 
                            className="text-2xl font-rajdhani font-black"
                            style={{ color: teamColor }}
                          >
                            {standing.position}
                          </span>
                        </div>

                        {/* NAME */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm font-rajdhani font-bold text-white truncate">
                            {entityName}
                          </div>
                        </div>

                        {/* GP TIMELINE */}
                        <div className="col-span-7 flex items-center overflow-x-auto scrollbar-hide">
                          {racePoints.length > 0 ? (
                            (() => {
                              const startRound = getDriverStartRound(entityName, year, racePoints);
                              const endRound = getDriverEndRound(entityName, year, gpCountryCodes.length);
                              
                              return Array.from({ length: gpCountryCodes.length }, (_, index) => {
                                const round = index + 1;
                                const result = racePoints.find(r => r.round === round);
                                
                                // Case inactive si avant arrivée ou après départ (only for drivers)
                                const isInactive = activeTab === 'drivers' && (round < startRound || (endRound !== null && round > endRound));
                                
                                if (isInactive) {
                                  return activeTab === 'drivers' 
                                    ? <PositionBadge key={round} position={0} isInactive={true} />
                                    : <PointsBadge key={round} points={0} isInactive={true} />;
                                }
                                
                                if (result) {
                                  // Pour les constructeurs, afficher les points totaux
                                  if (activeTab === 'constructors' && result.points !== undefined) {
                                    return (
                                      <PointsBadge 
                                        key={round} 
                                        points={result.points}
                                      />
                                    );
                                  }
                                  
                                  // Pour les drivers, afficher la position
                                  return (
                                    <PositionBadge 
                                      key={round} 
                                      position={result.position}
                                      status={result.status}
                                    />
                                  );
                                }
                                
                                // Pas de résultat pour ce round (pas encore couru)
                                return (
                                  <span 
                                    key={round}
                                    className="inline-flex items-center justify-center w-[24px] h-5 text-xs font-rajdhani font-bold text-white/30"
                                  >
                                    -
                                  </span>
                                );
                              });
                            })()
                          ) : (
                            <span className="text-xs text-metrik-silver/50 font-inter italic">Loading...</span>
                          )}
                        </div>

                        {/* WINS */}
                        <div className="col-span-1 flex items-center justify-center">
                          <span className="text-sm font-rajdhani font-bold text-metrik-silver">
                            {standing.wins || 0}
                          </span>
                        </div>

                        {/* POINTS */}
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

              {/* AFTER RACE - LAYOUT CÔTE À CÔTE */}
              {!loading && activeTab === 'after' && (driverStandingsAfter.length > 0 || constructorStandingsAfter.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Drivers After Race */}
                  {driverStandingsAfter.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xl font-rajdhani font-black text-white text-center uppercase flex items-center justify-center gap-2 pb-2 border-b border-metrik-turquoise/30">
                        <Users className="text-metrik-turquoise" size={20} />
                        Drivers after {raceName}
                      </h2>

                      <div className="space-y-2">
                        {driverStandingsAfter.map((standing, index) => {
                          const teamColor = getTeamColor(standing.driver || '');
                          const isTop3 = index < 3;
                          const top3Classes = [
                            'bg-yellow-500/10 border-yellow-500/30 border-2',
                            'bg-gray-400/10 border-gray-400/30 border-2',
                            'bg-orange-600/10 border-orange-600/30 border-2'
                          ];

                          return (
                            <div key={standing.position} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 hover:scale-[1.01] ${isTop3 ? top3Classes[index] : 'bg-metrik-black/50 border-metrik-turquoise/20'}`}>
                              <div className="flex items-center gap-3 flex-1">
                                {/* POSITION - NUMÉRO COLORÉ SANS FOND */}
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

                  {/* Constructors After Race */}
                  {constructorStandingsAfter.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xl font-rajdhani font-black text-white text-center uppercase flex items-center justify-center gap-2 pb-2 border-b border-metrik-turquoise/30">
                        <Flag className="text-metrik-turquoise" size={20} />
                        Constructors after {raceName}
                      </h2>

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
                                {/* POSITION - NUMÉRO COLORÉ SANS FOND */}
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

              {/* EVOLUTION TAB */}
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
                    color: getTeamColor(standing.driver)
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
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4">
                      <div className="text-center">
                        <div className="text-metrik-turquoise font-rajdhani font-bold text-xs uppercase tracking-wider mb-1">
                          ROUND {animationFrame + 1} / {raceEvolutionData.length}
                        </div>
                        <h2 className="text-xl md:text-2xl font-rajdhani font-black text-white uppercase">
                          {raceEvolutionData[animationFrame]?.raceName || 'Loading...'}
                        </h2>
                      </div>
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
                        className="px-5 py-2.5 bg-metrik-card border border-metrik-turquoise/30 text-metrik-silver rounded-lg font-rajdhani font-bold text-sm hover:text-white hover:bg-metrik-turquoise/10 transition-all duration-300"
                      >
                        RESET
                      </button>
                    </div>

                    {/* Chart */}
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 md:p-6">
                      <div className="relative">
                        {/* Labels */}
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
                                  stroke={getTeamColor(driver.driver)}
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
                    </div>

                    {/* Timeline Slider */}
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3">
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
        onUpgrade={() => {
          setShowUpgradeModal(false);
          window.location.href = '/';
        }}
      />
    </>
  );
}