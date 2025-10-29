import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Flag, TrendingUp, Calendar, Award, Crown, Medal, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import YearSelector from '../components/YearSelector';
import GrandPrixSelector from '../components/GrandPrixSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonCard from '../components/SkeletonCard';
import type { DriverStanding, ConstructorStanding, Circuit, RaceResultsData, StandingsAfterRace } from '../types/championship';

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

// Team colors mapping - Real F1 team colors
const getTeamColor = (driverOrTeam: string): string => {
  const name = driverOrTeam.toLowerCase();
  
  // Red Bull Racing
  if (name.includes('verstappen') || name.includes('perez') || name.includes('red bull')) {
    return 'from-blue-900 via-blue-800 to-blue-900';
  }
  // Ferrari
  if (name.includes('leclerc') || name.includes('sainz') || name.includes('ferrari')) {
    return 'from-red-600 via-red-700 to-red-800';
  }
  // Mercedes
  if (name.includes('hamilton') || name.includes('russell') || name.includes('mercedes')) {
    return 'from-cyan-400 via-cyan-500 to-teal-500';
  }
  // McLaren
  if (name.includes('norris') || name.includes('piastri') || name.includes('mclaren')) {
    return 'from-orange-500 via-orange-600 to-orange-700';
  }
  // Alpine
  if (name.includes('gasly') || name.includes('ocon') || name.includes('alpine')) {
    return 'from-blue-500 via-pink-400 to-pink-500';
  }
  // Aston Martin
  if (name.includes('alonso') || name.includes('stroll') || name.includes('aston')) {
    return 'from-green-600 via-green-700 to-green-800';
  }
  // AlphaTauri / RB
  if (name.includes('tsunoda') || name.includes('ricciardo') || name.includes('alphatauri') || name.includes('lawson')) {
    return 'from-slate-600 via-slate-700 to-slate-800';
  }
  // Alfa Romeo / Sauber
  if (name.includes('bottas') || name.includes('zhou') || name.includes('alfa') || name.includes('sauber')) {
    return 'from-red-800 via-red-900 to-red-950';
  }
  // Haas
  if (name.includes('magnussen') || name.includes('hulkenberg') || name.includes('haas')) {
    return 'from-gray-200 via-gray-300 to-gray-400';
  }
  // Williams
  if (name.includes('albon') || name.includes('sargeant') || name.includes('williams') || name.includes('colapinto')) {
    return 'from-blue-600 via-blue-700 to-blue-800';
  }
  
  // Default fallback color
  return 'from-metrik-turquoise via-cyan-500 to-teal-500';
};

// Get driver abbreviation (3 letters)
const getDriverAbbr = (fullName: string): string => {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return parts[parts.length - 1].substring(0, 3).toUpperCase();
  }
  return fullName.substring(0, 3).toUpperCase();
};

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors' | 'after' | 'evolution'>('drivers');
  const [driverStandings, setDriverStandings] = useState<Standing[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<Standing[]>([]);
  const [driverStandingsAfter, setDriverStandingsAfter] = useState<Standing[]>([]);
  const [constructorStandingsAfter, setConstructorStandingsAfter] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(false);
  const [raceName, setRaceName] = useState<string>('');
  
  // Race Evolution states
  const [raceEvolutionData, setRaceEvolutionData] = useState<RaceEvolutionData[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Helper function for Ergast API calls with error handling
  const fetchErgastAPI = async (url: string): Promise<any> => {
    try {
      const response = await fetch(url);
      
      // Check if response is OK
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit exceeded (429) for:', url);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate that MRData exists
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

  // Helper to add delay between requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const [isAnimating, setIsAnimating] = useState(false);
  const [evolutionType, setEvolutionType] = useState<'drivers' | 'constructors'>('drivers');

  const loadDriverStandings = async () => {
    setLoading(true);
    try {
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
      // Get race info
      const raceData = await fetchErgastAPI(`https://api.jolpi.ca/ergast/f1/${year}/${selectedGP}/`);
      if (raceData && raceData.MRData?.RaceTable?.Races?.[0]) {
        const race = raceData.MRData.RaceTable.Races[0];
        setRaceName(race?.raceName || `Round ${selectedGP}`);
      } else {
        setRaceName(`Round ${selectedGP}`);
      }

      // Get driver standings
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

      // Get constructor standings
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

      // Add delay between requests to avoid rate limiting (429)
      for (let i = 0; i < races.length; i++) {
        const race = races[i];
        const round = parseInt(race.round);
        
        // Add delay between requests (200ms) to avoid hitting rate limits
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
    if (activeTab === 'drivers') {
      loadDriverStandings();
    } else if (activeTab === 'constructors') {
      loadConstructorStandings();
    } else if (activeTab === 'after') {
      loadStandingsAfterRace();
    } else if (activeTab === 'evolution') {
      // Reset animation states when loading new data
      setIsAnimating(false);
      setAnimationFrame(0);
      setRaceEvolutionData([]);
      loadRaceEvolution();
    }
  }, [year, selectedGP, activeTab, evolutionType]);

  const getCurrentStandings = () => {
    if (activeTab === 'drivers') return driverStandings;
    if (activeTab === 'constructors') return constructorStandings;
    if (activeTab === 'after') return driverStandingsAfter.length > 0 ? driverStandingsAfter : constructorStandingsAfter;
    return [];
  };

  const currentStandings = getCurrentStandings();
  const top3 = currentStandings.slice(0, 3);
  const rest = currentStandings.slice(3);

  const champion = currentStandings[0];
  const totalCompetitors = currentStandings.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-metrik-black via-gray-900 to-metrik-black">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-all duration-300 font-rajdhani hover:translate-x-[-4px]"
          >
            <ArrowLeft size={20} />
            <span className="text-base md:text-lg">BACK</span>
          </button>

          <div className="flex items-center gap-2">
            <Trophy className="text-metrik-turquoise" size={24} />
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-rajdhani font-black text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300 tracking-wider">
              CHAMPIONSHIP {year}
            </h1>
          </div>

          <div className="w-12 md:w-24" />
        </div>

        {/* Selectors */}
        <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg shadow-metrik-turquoise/20">
          <div className="flex items-center gap-4 md:gap-6 flex-wrap">
            <div className="w-full md:w-auto">
              <YearSelector
                selectedYear={year}
                onSelectYear={setYear}
                minYear={1950}
                maxYear={2025}
              />
            </div>

            {activeTab === 'after' && (
              <div className="w-full md:w-auto">
                <GrandPrixSelector
                  year={year}
                  selectedRound={selectedGP}
                  onSelect={setSelectedGP}
                />
              </div>
            )}

            {activeTab === 'evolution' && (
              <div className="w-full md:w-auto">
                <label className="block text-metrik-silver text-xs md:text-sm font-rajdhani uppercase mb-2 tracking-wider">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEvolutionType('drivers')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-rajdhani font-bold transition-all duration-300 ${
                      evolutionType === 'drivers'
                        ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black shadow-lg shadow-metrik-turquoise/50'
                        : 'bg-metrik-black/50 text-metrik-silver hover:text-white border border-metrik-turquoise/30'
                    }`}
                  >
                    DRIVERS
                  </button>
                  <button
                    onClick={() => setEvolutionType('constructors')}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-rajdhani font-bold transition-all duration-300 ${
                      evolutionType === 'constructors'
                        ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black shadow-lg shadow-metrik-turquoise/50'
                        : 'bg-metrik-black/50 text-metrik-silver hover:text-white border border-metrik-turquoise/30'
                    }`}
                  >
                    CONSTRUCTORS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {(activeTab === 'drivers' || activeTab === 'constructors') && champion && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="backdrop-blur-xl bg-gradient-to-br from-metrik-turquoise/20 to-cyan-500/20 border border-metrik-turquoise/40 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg shadow-metrik-turquoise/20">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <Crown className="text-metrik-turquoise" size={20} />
                <h3 className="text-metrik-silver text-xs md:text-sm font-rajdhani uppercase tracking-wider">
                  Current Leader
                </h3>
              </div>
              <div className="text-xl md:text-3xl font-rajdhani font-black text-white mb-1">
                {champion.driver || champion.constructor}
              </div>
              <div className="text-metrik-turquoise text-lg md:text-2xl font-rajdhani font-bold">
                {champion.points} points
              </div>
            </div>

            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <Users className="text-metrik-turquoise" size={20} />
                <h3 className="text-metrik-silver text-xs md:text-sm font-rajdhani uppercase tracking-wider">
                  Total {activeTab === 'drivers' ? 'Drivers' : 'Teams'}
                </h3>
              </div>
              <div className="text-4xl md:text-5xl font-rajdhani font-black text-white">
                {totalCompetitors}
              </div>
            </div>

            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <Trophy className="text-metrik-turquoise" size={20} />
                <h3 className="text-metrik-silver text-xs md:text-sm font-rajdhani uppercase tracking-wider">
                  Leader Victories
                </h3>
              </div>
              <div className="text-4xl md:text-5xl font-rajdhani font-black text-white">
                {champion.wins || 0}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl mb-6 md:mb-8 overflow-hidden">
          <div className="flex border-b border-metrik-turquoise/20 overflow-x-auto">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex-1 min-w-[100px] px-3 py-3 md:px-6 md:py-4 font-rajdhani font-bold text-sm md:text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'drivers'
                  ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                  : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
              }`}
            >
              <Users size={18} />
              <span className="hidden sm:inline">DRIVERS</span>
            </button>
            <button
              onClick={() => setActiveTab('constructors')}
              className={`flex-1 min-w-[100px] px-3 py-3 md:px-6 md:py-4 font-rajdhani font-bold text-sm md:text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'constructors'
                  ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                  : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
              }`}
            >
              <Flag size={18} />
              <span className="hidden sm:inline">CONSTRUCTORS</span>
            </button>
            <button
              onClick={() => setActiveTab('after')}
              className={`flex-1 min-w-[100px] px-3 py-3 md:px-6 md:py-4 font-rajdhani font-bold text-sm md:text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'after'
                  ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                  : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
              }`}
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">AFTER</span>
            </button>
            <button
              onClick={() => setActiveTab('evolution')}
              className={`flex-1 min-w-[100px] px-3 py-3 md:px-6 md:py-4 font-rajdhani font-bold text-sm md:text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'evolution'
                  ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black'
                  : 'text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10'
              }`}
            >
              <TrendingUp size={18} />
              <span className="hidden sm:inline">EVOLUTION</span>
            </button>
          </div>

          <div className="p-4 md:p-8">
            {loading && (
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            )}

            {/* Drivers & Constructors Tabs - TON CODE ORIGINAL */}
            {!loading && (activeTab === 'drivers' || activeTab === 'constructors') && (
              <div className="space-y-8 md:space-y-12">
                {top3.length > 0 && (
                  <div>
                    <h3 className="text-2xl md:text-3xl font-rajdhani font-black text-white mb-6 md:mb-8 text-center uppercase tracking-wide flex items-center justify-center gap-3">
                      <Award className="text-metrik-turquoise" size={28} />
                      Championship Podium
                    </h3>
                    
                    {/* Desktop Podium */}
                    <div className="hidden md:flex items-end justify-center gap-6 mb-12">
                      {top3[1] && (
                        <div className="flex-1 max-w-xs animate-fade-in" style={{ animationDelay: '100ms' }}>
                          <div className="backdrop-blur-xl bg-gradient-to-br from-gray-400/30 to-gray-600/30 border-2 border-gray-400/50 rounded-2xl p-6 shadow-2xl shadow-gray-400/30 h-64 flex flex-col justify-end hover:scale-105 transition-transform duration-300">
                            <div className="text-center">
                              <div className="inline-block p-3 bg-gray-400/30 rounded-xl mb-3">
                                <Medal className="text-gray-300" size={40} />
                              </div>
                              <div className="text-6xl font-rajdhani font-black text-gray-300 mb-2">2</div>
                              <div className="text-xl font-rajdhani font-bold text-white mb-2">
                                {top3[1].driver || top3[1].constructor}
                              </div>
                              <div className="text-3xl font-rajdhani font-black text-gray-300">
                                {top3[1].points} pts
                              </div>
                              {top3[1].wins !== undefined && (
                                <div className="text-sm text-gray-400 font-inter mt-2">
                                  {top3[1].wins} {top3[1].wins === 1 ? 'victory' : 'victories'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {top3[0] && (
                        <div className="flex-1 max-w-xs animate-fade-in">
                          <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-500/50 rounded-2xl p-8 shadow-2xl shadow-yellow-500/40 h-80 flex flex-col justify-end hover:scale-105 transition-transform duration-300">
                            <div className="text-center">
                              <div className="inline-block p-4 bg-yellow-500/30 rounded-2xl mb-4">
                                <Crown className="text-yellow-400" size={56} />
                              </div>
                              <div className="text-7xl font-rajdhani font-black text-yellow-400 mb-3">1</div>
                              <div className="text-2xl font-rajdhani font-black text-white mb-3">
                                {top3[0].driver || top3[0].constructor}
                              </div>
                              <div className="text-4xl font-rajdhani font-black text-yellow-400">
                                {top3[0].points} pts
                              </div>
                              {top3[0].wins !== undefined && (
                                <div className="text-sm text-yellow-200 font-inter mt-2">
                                  {top3[0].wins} {top3[0].wins === 1 ? 'victory' : 'victories'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {top3[2] && (
                        <div className="flex-1 max-w-xs animate-fade-in" style={{ animationDelay: '200ms' }}>
                          <div className="backdrop-blur-xl bg-gradient-to-br from-orange-600/30 to-orange-700/30 border-2 border-orange-600/50 rounded-2xl p-6 shadow-2xl shadow-orange-600/30 h-56 flex flex-col justify-end hover:scale-105 transition-transform duration-300">
                            <div className="text-center">
                              <div className="inline-block p-3 bg-orange-600/30 rounded-xl mb-3">
                                <Medal className="text-orange-400" size={36} />
                              </div>
                              <div className="text-5xl font-rajdhani font-black text-orange-400 mb-2">3</div>
                              <div className="text-lg font-rajdhani font-bold text-white mb-2">
                                {top3[2].driver || top3[2].constructor}
                              </div>
                              <div className="text-3xl font-rajdhani font-black text-orange-400">
                                {top3[2].points} pts
                              </div>
                              {top3[2].wins !== undefined && (
                                <div className="text-sm text-orange-300 font-inter mt-2">
                                  {top3[2].wins} {top3[2].wins === 1 ? 'victory' : 'victories'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile Podium */}
                    <div className="md:hidden space-y-4 mb-8">
                      {top3.map((standing, index) => {
                        const medals = [
                          { bgGradient: 'from-yellow-500/30 to-yellow-600/30', borderColor: 'border-yellow-500/50', textColor: 'text-yellow-400' },
                          { bgGradient: 'from-gray-400/30 to-gray-600/30', borderColor: 'border-gray-400/50', textColor: 'text-gray-300' },
                          { bgGradient: 'from-orange-600/30 to-orange-700/30', borderColor: 'border-orange-600/50', textColor: 'text-orange-400' }
                        ];
                        const medal = medals[index];

                        return (
                          <div key={standing.position} className={`backdrop-blur-xl bg-gradient-to-br ${medal.bgGradient} border-2 ${medal.borderColor} rounded-xl p-4`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`text-3xl font-rajdhani font-black ${medal.textColor}`}>
                                  {standing.position}
                                </div>
                                <div className="text-base font-rajdhani font-bold text-white">
                                  {standing.driver || standing.constructor}
                                </div>
                              </div>
                              <div className={`text-2xl font-rajdhani font-black ${medal.textColor}`}>
                                {standing.points} pts
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rest.length > 0 && (
                  <div>
                    <h3 className="text-xl md:text-2xl font-rajdhani font-black text-white mb-4 md:mb-6 uppercase tracking-wide">
                      Full Standings
                    </h3>
                    <div className="space-y-3">
                      {rest.map((standing, index) => (
                        <div
                          key={standing.position}
                          className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg md:rounded-xl p-4 md:p-5 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300 hover:scale-102 animate-fade-in"
                          style={{ animationDelay: `${(index + 3) * 50}ms` }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-metrik-turquoise to-cyan-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-metrik-turquoise/30 flex-shrink-0">
                                <span className="text-xl md:text-2xl font-rajdhani font-black text-metrik-black">
                                  {standing.position}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-base md:text-xl font-rajdhani font-bold text-white truncate">
                                  {standing.driver || standing.constructor}
                                </div>
                                <div className="text-xs md:text-sm text-metrik-silver font-inter">
                                  {standing.wins} victory{standing.wins !== 1 ? 'ies' : 'y'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl md:text-3xl font-rajdhani font-black text-metrik-turquoise">
                                {standing.points}
                              </div>
                              <div className="text-xs text-metrik-silver font-rajdhani uppercase tracking-wider">
                                points
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* After Race Tab - RESPONSIVE COMPLET */}
            {!loading && activeTab === 'after' && driverStandingsAfter.length > 0 && constructorStandingsAfter.length > 0 && (
              <div className="space-y-8 md:space-y-12">
                <div>
                  <h2 className="text-2xl md:text-3xl font-rajdhani font-black text-white mb-6 md:mb-8 text-center uppercase tracking-wide flex items-center justify-center gap-3">
                    <Users className="text-metrik-turquoise" size={28} />
                    <span className="text-base md:text-2xl">Driver Standings after {raceName}</span>
                  </h2>
                  
                  {driverStandingsAfter.slice(0, 3).length > 0 && (
                    <>
                      {/* Desktop Podium */}
                      <div className="hidden md:flex items-end justify-center gap-6 mb-8">
                        {driverStandingsAfter[1] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-gray-400/30 to-gray-600/30 border-2 border-gray-400/50 rounded-2xl p-6 shadow-2xl shadow-gray-400/30 h-64 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="text-6xl font-rajdhani font-black text-gray-300 mb-2">2</div>
                                <div className="text-xl font-rajdhani font-bold text-white mb-2">{driverStandingsAfter[1].driver}</div>
                                <div className="text-3xl font-rajdhani font-black text-gray-300">{driverStandingsAfter[1].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {driverStandingsAfter[0] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-500/50 rounded-2xl p-8 shadow-2xl shadow-yellow-500/40 h-80 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="inline-block p-4 bg-yellow-500/30 rounded-2xl mb-4">
                                  <Crown className="text-yellow-400" size={56} />
                                </div>
                                <div className="text-7xl font-rajdhani font-black text-yellow-400 mb-3">1</div>
                                <div className="text-2xl font-rajdhani font-black text-white mb-3">{driverStandingsAfter[0].driver}</div>
                                <div className="text-4xl font-rajdhani font-black text-yellow-400">{driverStandingsAfter[0].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {driverStandingsAfter[2] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-600/30 to-orange-700/30 border-2 border-orange-600/50 rounded-2xl p-6 shadow-2xl shadow-orange-600/30 h-56 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="text-5xl font-rajdhani font-black text-orange-400 mb-2">3</div>
                                <div className="text-lg font-rajdhani font-bold text-white mb-2">{driverStandingsAfter[2].driver}</div>
                                <div className="text-3xl font-rajdhani font-black text-orange-400">{driverStandingsAfter[2].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile Podium */}
                      <div className="md:hidden space-y-4 mb-8">
                        {driverStandingsAfter.slice(0, 3).map((standing, index) => {
                          const medals = [
                            { bgGradient: 'from-yellow-500/30 to-yellow-600/30', borderColor: 'border-yellow-500/50', textColor: 'text-yellow-400' },
                            { bgGradient: 'from-gray-400/30 to-gray-600/30', borderColor: 'border-gray-400/50', textColor: 'text-gray-300' },
                            { bgGradient: 'from-orange-600/30 to-orange-700/30', borderColor: 'border-orange-600/50', textColor: 'text-orange-400' }
                          ];
                          const medal = medals[index];

                          return (
                            <div key={standing.position} className={`backdrop-blur-xl bg-gradient-to-br ${medal.bgGradient} border-2 ${medal.borderColor} rounded-xl p-4`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`text-3xl font-rajdhani font-black ${medal.textColor}`}>{standing.position}</div>
                                  <div className="text-base font-rajdhani font-bold text-white">{standing.driver}</div>
                                </div>
                                <div className={`text-2xl font-rajdhani font-black ${medal.textColor}`}>{standing.points} pts</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {driverStandingsAfter.slice(3).length > 0 && (
                    <div className="space-y-3">
                      {driverStandingsAfter.slice(3).map((standing) => (
                        <div key={standing.position} className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg md:rounded-xl p-4 md:p-5 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-metrik-turquoise to-cyan-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-metrik-turquoise/30 flex-shrink-0">
                                <span className="text-xl md:text-2xl font-rajdhani font-black text-metrik-black">{standing.position}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-base md:text-xl font-rajdhani font-bold text-white truncate">{standing.driver}</div>
                                <div className="text-xs md:text-sm text-metrik-silver font-inter">{standing.wins} victory{standing.wins !== 1 ? 'ies' : 'y'}</div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl md:text-3xl font-rajdhani font-black text-metrik-turquoise">{standing.points}</div>
                              <div className="text-xs text-metrik-silver font-rajdhani uppercase tracking-wider">points</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t border-metrik-turquoise/30">
                  <h2 className="text-2xl md:text-3xl font-rajdhani font-black text-white mb-6 md:mb-8 text-center uppercase tracking-wide flex items-center justify-center gap-3">
                    <Flag className="text-metrik-turquoise" size={28} />
                    <span className="text-base md:text-2xl">Constructor Standings after {raceName}</span>
                  </h2>

                  {constructorStandingsAfter.slice(0, 3).length > 0 && (
                    <>
                      {/* Desktop Podium */}
                      <div className="hidden md:flex items-end justify-center gap-6 mb-8">
                        {constructorStandingsAfter[1] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-gray-400/30 to-gray-600/30 border-2 border-gray-400/50 rounded-2xl p-6 shadow-2xl shadow-gray-400/30 h-64 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="text-6xl font-rajdhani font-black text-gray-300 mb-2">2</div>
                                <div className="text-xl font-rajdhani font-bold text-white mb-2">{constructorStandingsAfter[1].constructor}</div>
                                <div className="text-3xl font-rajdhani font-black text-gray-300">{constructorStandingsAfter[1].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {constructorStandingsAfter[0] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-500/50 rounded-2xl p-8 shadow-2xl shadow-yellow-500/40 h-80 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="inline-block p-4 bg-yellow-500/30 rounded-2xl mb-4">
                                  <Crown className="text-yellow-400" size={56} />
                                </div>
                                <div className="text-7xl font-rajdhani font-black text-yellow-400 mb-3">1</div>
                                <div className="text-2xl font-rajdhani font-black text-white mb-3">{constructorStandingsAfter[0].constructor}</div>
                                <div className="text-4xl font-rajdhani font-black text-yellow-400">{constructorStandingsAfter[0].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {constructorStandingsAfter[2] && (
                          <div className="flex-1 max-w-xs">
                            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-600/30 to-orange-700/30 border-2 border-orange-600/50 rounded-2xl p-6 shadow-2xl shadow-orange-600/30 h-56 flex flex-col justify-end">
                              <div className="text-center">
                                <div className="text-5xl font-rajdhani font-black text-orange-400 mb-2">3</div>
                                <div className="text-lg font-rajdhani font-bold text-white mb-2">{constructorStandingsAfter[2].constructor}</div>
                                <div className="text-3xl font-rajdhani font-black text-orange-400">{constructorStandingsAfter[2].points} pts</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile Podium */}
                      <div className="md:hidden space-y-4 mb-8">
                        {constructorStandingsAfter.slice(0, 3).map((standing, index) => {
                          const medals = [
                            { bgGradient: 'from-yellow-500/30 to-yellow-600/30', borderColor: 'border-yellow-500/50', textColor: 'text-yellow-400' },
                            { bgGradient: 'from-gray-400/30 to-gray-600/30', borderColor: 'border-gray-400/50', textColor: 'text-gray-300' },
                            { bgGradient: 'from-orange-600/30 to-orange-700/30', borderColor: 'border-orange-600/50', textColor: 'text-orange-400' }
                          ];
                          const medal = medals[index];

                          return (
                            <div key={standing.position} className={`backdrop-blur-xl bg-gradient-to-br ${medal.bgGradient} border-2 ${medal.borderColor} rounded-xl p-4`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`text-3xl font-rajdhani font-black ${medal.textColor}`}>{standing.position}</div>
                                  <div className="text-base font-rajdhani font-bold text-white">{standing.constructor}</div>
                                </div>
                                <div className={`text-2xl font-rajdhani font-black ${medal.textColor}`}>{standing.points} pts</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {constructorStandingsAfter.slice(3).length > 0 && (
                    <div className="space-y-3">
                      {constructorStandingsAfter.slice(3).map((standing) => (
                        <div key={standing.position} className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg md:rounded-xl p-4 md:p-5 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-metrik-turquoise to-cyan-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-metrik-turquoise/30 flex-shrink-0">
                                <span className="text-xl md:text-2xl font-rajdhani font-black text-metrik-black">{standing.position}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-base md:text-xl font-rajdhani font-bold text-white truncate">{standing.constructor}</div>
                                <div className="text-xs md:text-sm text-metrik-silver font-inter">{standing.wins} victory{standing.wins !== 1 ? 'ies' : 'y'}</div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl md:text-3xl font-rajdhani font-black text-metrik-turquoise">{standing.points}</div>
                              <div className="text-xs text-metrik-silver font-rajdhani uppercase tracking-wider">points</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Race Evolution Tab - NOUVEAU DESIGN AVEC COULEURS ÉCURIE */}
            {!loading && activeTab === 'evolution' && raceEvolutionData.length > 0 && (
              <div className="space-y-6 md:space-y-8">
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl p-4 md:p-6">
                  <div className="text-center">
                    <div className="text-metrik-turquoise font-rajdhani text-sm md:text-lg mb-2">
                      Round {raceEvolutionData[animationFrame]?.round} of {raceEvolutionData.length}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-rajdhani font-black text-white">
                      {raceEvolutionData[animationFrame]?.raceName || 'Loading...'}
                    </h2>
                  </div>
                </div>

                <div className="flex justify-center gap-3 md:gap-4">
                  <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-xl font-rajdhani font-bold text-base md:text-lg shadow-lg shadow-metrik-turquoise/50 hover:scale-105 transition-transform duration-300"
                  >
                    {isAnimating ? (
                      <>
                        <Pause size={20} />
                        PAUSE
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        PLAY
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setAnimationFrame(0);
                      setIsAnimating(false);
                    }}
                    className="px-6 md:px-8 py-3 md:py-4 bg-metrik-black/50 text-metrik-silver border border-metrik-turquoise/30 rounded-xl font-rajdhani font-bold text-base md:text-lg hover:text-white hover:bg-metrik-turquoise/10 transition-all duration-300"
                  >
                    RESET
                  </button>
                </div>

                <div className="space-y-2 md:space-y-3">
                  {raceEvolutionData[animationFrame]?.standings
                    .sort((a, b) => b.points - a.points)
                    .map((standing, index) => {
                      const maxPoints = Math.max(...raceEvolutionData[animationFrame].standings.map(s => s.points));
                      const barWidth = maxPoints > 0 ? (standing.points / maxPoints) * 100 : 0;
                      const teamColor = getTeamColor(standing.driver);
                      const driverAbbr = getDriverAbbr(standing.driver);

                      return (
                        <div
                          key={standing.driver}
                          className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg md:rounded-xl overflow-hidden hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-1000"
                        >
                          <div className="flex items-center p-2 md:p-3 gap-2 md:gap-3">
                            <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${teamColor} rounded-lg flex items-center justify-center shadow-lg flex-shrink-0`}>
                              <span className="text-lg md:text-xl font-rajdhani font-black text-white drop-shadow-lg">
                                {index + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-rajdhani font-bold text-white mb-1">
                                <span className="hidden md:inline text-base md:text-lg">{standing.driver}</span>
                                <span className="md:hidden text-sm">{driverAbbr}</span>
                              </div>
                              
                              <div className="relative h-8 md:h-10 bg-white/10 rounded-lg overflow-hidden">
                                <div
                                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${teamColor} transition-all duration-1000 ease-out`}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                </div>
                                
                                <div className="absolute inset-0 flex items-center px-3">
                                  <span className="text-base md:text-xl font-rajdhani font-black text-white drop-shadow-lg relative z-10">
                                    {standing.points} pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl md:rounded-2xl p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-turquoise uppercase flex-shrink-0">
                      Timeline
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={raceEvolutionData.length - 1}
                      value={animationFrame}
                      onChange={(e) => {
                        setAnimationFrame(parseInt(e.target.value));
                        setIsAnimating(false);
                      }}
                      className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-metrik-turquoise"
                      style={{
                        background: `linear-gradient(to right, rgb(0, 229, 204) 0%, rgb(0, 229, 204) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                    <div className="text-xs md:text-sm font-inter text-metrik-silver flex-shrink-0">
                      {animationFrame + 1} / {raceEvolutionData.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}