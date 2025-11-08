import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Flag, TrendingUp, Calendar, Award, Crown, Medal, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import YearSelector from '../components/YearSelector';
import GrandPrixSelector from '../components/GrandPrixSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonCard from '../components/SkeletonCard';
import type { DriverStanding, ConstructorStanding, Circuit, RaceResultsData, StandingsAfterRace } from '../types/championship';
import { useRateLimit } from '../hooks/useRateLimit';
import UpgradeModal from '../components/UpgradeModal';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

// Team colors mapping - Real F1 team colors
const getTeamColor = (driverOrTeam: string): string => {
  const name = driverOrTeam.toLowerCase();
  
  // Red Bull Racing
  if (name.includes('verstappen') || name.includes('perez') || name.includes('red bull')) {
    return '#3671C6';
  }
  // Ferrari
  if (name.includes('leclerc') || name.includes('sainz') || name.includes('ferrari')) {
    return '#E8002D';
  }
  // Mercedes
  if (name.includes('hamilton') || name.includes('russell') || name.includes('mercedes')) {
    return '#27F4D2';
  }
  // McLaren
  if (name.includes('norris') || name.includes('piastri') || name.includes('mclaren')) {
    return '#FF8700';
  }
  // Alpine
  if (name.includes('gasly') || name.includes('ocon') || name.includes('alpine')) {
    return '#FF87BC';
  }
  // Aston Martin
  if (name.includes('alonso') || name.includes('stroll') || name.includes('aston')) {
    return '#229971';
  }
  // AlphaTauri / RB
  if (name.includes('tsunoda') || name.includes('ricciardo') || name.includes('alphatauri') || name.includes('lawson')) {
    return '#6692FF';
  }
  // Alfa Romeo / Sauber
  if (name.includes('bottas') || name.includes('zhou') || name.includes('alfa') || name.includes('sauber')) {
    return '#C92D4B';
  }
  // Haas
  if (name.includes('magnussen') || name.includes('hulkenberg') || name.includes('haas')) {
    return '#B6BABD';
  }
  // Williams
  if (name.includes('albon') || name.includes('sargeant') || name.includes('williams') || name.includes('colapinto')) {
    return '#00A0DE';
  }
  
  // Default fallback color
  return '#00E5CC';
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

  const loadChampionshipData = async () => {
    // Check rate limit ONCE for the entire year data load
    if (!canMakeRequest) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Load data based on active tab
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
    
    // Increment ONCE after successful load
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
  const top3 = currentStandings.slice(0, 3);
  const rest = currentStandings.slice(3);

  const champion = currentStandings[0];
  const totalCompetitors = currentStandings.length;

  return (
    <>
      <SEO 
        path="/championship"
        title="F1 Championship Standings & Results - METRIK DELTA"
        description="F1 championship standings, race results, driver rankings and constructor standings 2018-2025. Complete F1 results and podiums history."
        keywords="f1 standings, classement f1, clasificación f1, f1 results, résultat f1, resultados f1, grand prix results, f1 championship, podiums f1"
      />
      <div className="min-h-screen bg-metrik-black text-white">
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

              {/* DRIVERS & CONSTRUCTORS - DESIGN COMPACT AMÉLIORÉ */}
              {!loading && (activeTab === 'drivers' || activeTab === 'constructors') && (
                <div className="space-y-6">
                  {/* Podium Compact */}
                  {top3.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                      {top3.map((standing, index) => {
                        const medals = [
                          { icon: Crown, bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/50', textClass: 'text-yellow-400', shadowClass: 'shadow-yellow-500/30' },
                          { icon: Medal, bgClass: 'bg-gray-400/20', borderClass: 'border-gray-400/50', textClass: 'text-gray-300', shadowClass: 'shadow-gray-400/30' },
                          { icon: Medal, bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/50', textClass: 'text-orange-400', shadowClass: 'shadow-orange-500/30' }
                        ];
                        const medal = medals[index];
                        const Icon = medal.icon;

                        return (
                          <div
                            key={standing.position}
                            className={`backdrop-blur-xl ${medal.bgClass} border-2 ${medal.borderClass} rounded-xl p-4 shadow-lg ${medal.shadowClass} hover:scale-105 transition-transform duration-300`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Icon className={medal.textClass} size={32} />
                              <div className="flex-1">
                                <div className={`text-xl font-rajdhani font-black ${medal.textClass}`}>
                                  P{standing.position}
                                </div>
                              </div>
                            </div>
                            <div className="text-lg md:text-xl font-rajdhani font-bold text-white mb-1 truncate">
                              {standing.driver || standing.constructor}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className={`text-2xl md:text-3xl font-rajdhani font-black ${medal.textClass}`}>
                                {standing.points}
                              </div>
                              <div className="text-xs text-metrik-silver font-inter">
                                {standing.wins} {standing.wins === 1 ? 'win' : 'wins'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Classement complet - DESIGN COMPACT */}
                  {rest.length > 0 && (
                    <div className="space-y-2">
                      {rest.map((standing) => {
                        const teamColor = getTeamColor(standing.driver || standing.constructor || '');
                        
                        return (
                          <div
                            key={standing.position}
                            className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg p-3 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300 hover:scale-[1.01]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Position + Team Color */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
                                  style={{ backgroundColor: teamColor }}
                                >
                                  <span className="text-lg font-rajdhani font-black text-white">
                                    {standing.position}
                                  </span>
                                </div>
                                
                                {/* Driver/Constructor Name */}
                                <div className="min-w-0 flex-1">
                                  <div className="text-base md:text-lg font-rajdhani font-bold text-white truncate">
                                    {standing.driver || standing.constructor}
                                  </div>
                                  <div className="text-xs text-metrik-silver font-inter">
                                    {standing.wins} {standing.wins === 1 ? 'victory' : 'victories'}
                                  </div>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl md:text-2xl font-rajdhani font-black text-metrik-turquoise">
                                  {standing.points}
                                </div>
                                <div className="text-xs text-metrik-silver font-rajdhani uppercase">
                                  pts
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* AFTER RACE - MÊME DESIGN COMPACT */}
              {!loading && activeTab === 'after' && (driverStandingsAfter.length > 0 || constructorStandingsAfter.length > 0) && (
                <div className="space-y-8">
                  {/* Drivers After Race */}
                  {driverStandingsAfter.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xl md:text-2xl font-rajdhani font-black text-white text-center uppercase tracking-wide flex items-center justify-center gap-3">
                        <Users className="text-metrik-turquoise" size={24} />
                        Drivers after {raceName}
                      </h2>

                      {/* Podium Compact */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {driverStandingsAfter.slice(0, 3).map((standing, index) => {
                          const medals = [
                            { icon: Crown, bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/50', textClass: 'text-yellow-400' },
                            { icon: Medal, bgClass: 'bg-gray-400/20', borderClass: 'border-gray-400/50', textClass: 'text-gray-300' },
                            { icon: Medal, bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/50', textClass: 'text-orange-400' }
                          ];
                          const medal = medals[index];
                          const Icon = medal.icon;

                          return (
                            <div key={standing.position} className={`backdrop-blur-xl ${medal.bgClass} border-2 ${medal.borderClass} rounded-xl p-4`}>
                              <div className="flex items-center gap-3 mb-2">
                                <Icon className={medal.textClass} size={28} />
                                <div className={`text-xl font-rajdhani font-black ${medal.textClass}`}>P{standing.position}</div>
                              </div>
                              <div className="text-lg font-rajdhani font-bold text-white mb-1 truncate">{standing.driver}</div>
                              <div className={`text-2xl font-rajdhani font-black ${medal.textClass}`}>{standing.points} pts</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Rest Compact */}
                      <div className="space-y-2">
                        {driverStandingsAfter.slice(3).map((standing) => {
                          const teamColor = getTeamColor(standing.driver || '');
                          return (
                            <div key={standing.position} className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg p-3 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: teamColor }}>
                                    <span className="text-lg font-rajdhani font-black text-white">{standing.position}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-base font-rajdhani font-bold text-white truncate">{standing.driver}</div>
                                    <div className="text-xs text-metrik-silver font-inter">{standing.wins} {standing.wins === 1 ? 'win' : 'wins'}</div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xl font-rajdhani font-black text-metrik-turquoise">{standing.points}</div>
                                  <div className="text-xs text-metrik-silver font-rajdhani uppercase">pts</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Constructors After Race */}
                  {constructorStandingsAfter.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-metrik-turquoise/30">
                      <h2 className="text-xl md:text-2xl font-rajdhani font-black text-white text-center uppercase tracking-wide flex items-center justify-center gap-3">
                        <Flag className="text-metrik-turquoise" size={24} />
                        Constructors after {raceName}
                      </h2>

                      {/* Podium Compact */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {constructorStandingsAfter.slice(0, 3).map((standing, index) => {
                          const medals = [
                            { icon: Crown, bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/50', textClass: 'text-yellow-400' },
                            { icon: Medal, bgClass: 'bg-gray-400/20', borderClass: 'border-gray-400/50', textClass: 'text-gray-300' },
                            { icon: Medal, bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/50', textClass: 'text-orange-400' }
                          ];
                          const medal = medals[index];
                          const Icon = medal.icon;

                          return (
                            <div key={standing.position} className={`backdrop-blur-xl ${medal.bgClass} border-2 ${medal.borderClass} rounded-xl p-4`}>
                              <div className="flex items-center gap-3 mb-2">
                                <Icon className={medal.textClass} size={28} />
                                <div className={`text-xl font-rajdhani font-black ${medal.textClass}`}>P{standing.position}</div>
                              </div>
                              <div className="text-lg font-rajdhani font-bold text-white mb-1 truncate">{standing.constructor}</div>
                              <div className={`text-2xl font-rajdhani font-black ${medal.textClass}`}>{standing.points} pts</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Rest Compact */}
                      <div className="space-y-2">
                        {constructorStandingsAfter.slice(3).map((standing) => {
                          const teamColor = getTeamColor(standing.constructor || '');
                          return (
                            <div key={standing.position} className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg p-3 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: teamColor }}>
                                    <span className="text-lg font-rajdhani font-black text-white">{standing.position}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-base font-rajdhani font-bold text-white truncate">{standing.constructor}</div>
                                    <div className="text-xs text-metrik-silver font-inter">{standing.wins} {standing.wins === 1 ? 'win' : 'wins'}</div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xl font-rajdhani font-black text-metrik-turquoise">{standing.points}</div>
                                  <div className="text-xs text-metrik-silver font-rajdhani uppercase">pts</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EVOLUTION TAB - RESPONSIVE MOBILE + LABELS INTELLIGENTS */}
              {!loading && activeTab === 'evolution' && raceEvolutionData.length > 0 && (() => {
                // Get current standings
                const currentStandings = raceEvolutionData[animationFrame]?.standings
                  .slice()
                  .sort((a, b) => a.position - b.position) || [];

                // Calculate max points for scaling
                const allPoints = raceEvolutionData.flatMap(race => race.standings.map(s => s.points));
                const maxPoints = Math.max(...allPoints, 100);

                // Calculate label positions with anti-collision
                const calculateLabelPositions = () => {
                  const positions = currentStandings.slice(0, 10).map((standing) => ({
                    driver: standing.driver,
                    points: standing.points,
                    yPosition: (standing.points / maxPoints) * 100,
                    color: getTeamColor(standing.driver)
                  }));

                  // Sort by yPosition to detect collisions
                  const sorted = positions.sort((a, b) => b.yPosition - a.yPosition);
                  const minDistance = 8; // Minimum distance between labels (in %)

                  // Adjust positions to prevent collisions
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
                  <div className="space-y-4 md:space-y-6">
                    {/* Header */}
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 md:p-6">
                      <div className="text-center">
                        <div className="text-metrik-turquoise font-rajdhani font-bold text-sm uppercase tracking-wider mb-2">
                          ROUND {animationFrame + 1} / {raceEvolutionData.length}
                        </div>
                        <h2 className="text-xl md:text-3xl font-rajdhani font-black text-white uppercase">
                          {raceEvolutionData[animationFrame]?.raceName || 'Loading...'}
                        </h2>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => setIsAnimating(!isAnimating)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-xl font-rajdhani font-bold text-base shadow-lg shadow-metrik-turquoise/50 hover:scale-105 transition-all duration-300"
                      >
                        {isAnimating ? <><Pause size={18} /><span>PAUSE</span></> : <><Play size={18} /><span>PLAY</span></>}
                      </button>
                      <button
                        onClick={() => { setAnimationFrame(0); setIsAnimating(false); }}
                        className="px-6 py-3 bg-metrik-black/50 text-metrik-silver border border-metrik-turquoise/30 rounded-xl font-rajdhani font-bold text-base hover:text-white hover:bg-metrik-turquoise/10 transition-all duration-300"
                      >
                        RESET
                      </button>
                    </div>

                    {/* Chart Container - RESPONSIVE */}
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 md:p-6">
                      <h3 className="text-lg md:text-xl font-rajdhani font-black text-white uppercase text-center mb-4 md:mb-6">
                        {evolutionType === 'drivers' ? 'DRIVERS' : 'CONSTRUCTORS'} EVOLUTION
                      </h3>
                      
                      <div className="relative">
                        {/* Labels on LEFT - ANTI-COLLISION */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-16 flex flex-col justify-around pointer-events-none z-10">
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
                                className="font-rajdhani font-black text-xs md:text-sm drop-shadow-lg whitespace-nowrap"
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

                        {/* Points on RIGHT */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-16 flex flex-col justify-around pointer-events-none z-10">
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
                                className="font-rajdhani font-black text-xs md:text-sm drop-shadow-lg whitespace-nowrap"
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

                        {/* Chart - RESPONSIVE HEIGHT */}
                        <div className="px-14 md:px-20">
                          <ResponsiveContainer width="100%" height={400} className="md:h-[500px]">
                            <LineChart 
  data={raceEvolutionData.slice(0, animationFrame + 1)}
  margin={{ 
    top: 20, 
    right: 10, 
    left: window.innerWidth < 768 ? -35 : 10,  // ← -10 sur mobile, 10 sur desktop
    bottom: 20 
  }}
>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              
                              <XAxis 
                                dataKey="round" 
                                stroke="#9CA3AF"
                                style={{ fontSize: window.innerWidth < 768 ? '10px' : '12px', fontWeight: 'bold' }}
                                tick={{ fill: '#9CA3AF' }}
                              />
                              
                              <YAxis 
                                stroke="#9CA3AF"
                                style={{ fontSize: window.innerWidth < 768 ? '10px' : '12px', fontWeight: 'bold' }}
                                domain={[0, maxPoints]}
                                tick={{ fill: '#9CA3AF' }}
                              />
                              
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0A0F1E', 
                                  border: '2px solid #00E5CC',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  boxShadow: '0 0 15px rgba(0, 229, 204, 0.3)'
                                }}
                                labelStyle={{ 
                                  color: '#00E5CC', 
                                  fontWeight: 'bold',
                                  fontFamily: 'Rajdhani, sans-serif',
                                  fontSize: '12px'
                                }}
                                itemStyle={{ 
                                  color: '#F3F4F6',
                                  fontFamily: 'Rajdhani, sans-serif',
                                  fontSize: '11px'
                                }}
                              />
                              
                              {/* Lines */}
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
                    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase flex-shrink-0">
                          TIMELINE
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
                          className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, rgb(0, 229, 204) 0%, rgb(0, 229, 204) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) ${(animationFrame / (raceEvolutionData.length - 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                          }}
                        />
                        <div className="text-sm font-rajdhani font-bold text-metrik-silver flex-shrink-0">
                          {animationFrame + 1} / {raceEvolutionData.length}
                        </div>
                      </div>
                    </div>

                    {/* Current Top 3 - COMPACT */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {currentStandings.slice(0, 3).map((standing, index) => {
                        const positions = ['1ST', '2ND', '3RD'];
                        const posColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
                        const teamColor = getTeamColor(standing.driver);
                        
                        return (
                          <div 
                            key={standing.driver} 
                            className="backdrop-blur-xl bg-metrik-black/50 rounded-xl p-4 border-2"
                            style={{ borderColor: teamColor }}
                          >
                            <div className={`text-2xl font-rajdhani font-black ${posColors[index]} mb-2`}>
                              {positions[index]}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: teamColor }}
                              >
                                <span className="text-white font-rajdhani font-black text-xs">
                                  {getDriverAbbr(standing.driver)}
                                </span>
                              </div>
                              <div className="text-white font-rajdhani font-bold text-base truncate">
                                {standing.driver.split(' ').pop()}
                              </div>
                            </div>
                            <div className="text-metrik-turquoise font-rajdhani font-black text-xl">
                              {standing.points} PTS
                            </div>
                          </div>
                        );
                      })}
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