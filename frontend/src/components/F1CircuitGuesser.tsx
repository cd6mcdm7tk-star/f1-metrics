import { useState, useEffect } from 'react';
import { X, Trophy, Timer, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Circuit {
  name: string;
  country: string;
  flag: string;
  round: number;
  year: number;
  options: string[];
}

const circuits: Circuit[] = [
  {
    name: "Bahrain",
    country: "Bahrain",
    flag: "🇧🇭",
    round: 1,
    year: 2024,
    options: ["Bahrain", "Saudi Arabia", "Abu Dhabi", "Qatar"]
  },
  {
    name: "Monaco",
    country: "Monaco",
    flag: "🇲🇨",
    round: 8,
    year: 2024,
    options: ["Monaco", "Singapore", "Baku", "Montreal"]
  },
  {
    name: "Silverstone",
    country: "Great Britain",
    flag: "🇬🇧",
    round: 12,
    year: 2024,
    options: ["Silverstone", "Spa", "Monza", "Suzuka"]
  },
  {
    name: "Monza",
    country: "Italy",
    flag: "🇮🇹",
    round: 16,
    year: 2024,
    options: ["Monza", "Barcelona", "Austria", "Imola"]
  },
  {
    name: "Spa",
    country: "Belgium",
    flag: "🇧🇪",
    round: 14,
    year: 2024,
    options: ["Spa", "Suzuka", "Silverstone", "COTA"]
  },
  {
    name: "Suzuka",
    country: "Japan",
    flag: "🇯🇵",
    round: 4,
    year: 2024,
    options: ["Suzuka", "Shanghai", "Singapore", "Spa"]
  },
  {
    name: "COTA",
    country: "USA",
    flag: "🇺🇸",
    round: 19,
    year: 2024,
    options: ["COTA", "Mexico", "Brazil", "Miami"]
  },
  {
    name: "Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    round: 18,
    year: 2024,
    options: ["Singapore", "Abu Dhabi", "Bahrain", "Baku"]
  },
  {
    name: "Interlagos",
    country: "Brazil",
    flag: "🇧🇷",
    round: 21,
    year: 2024,
    options: ["Interlagos", "Mexico", "COTA", "Miami"]
  },
  {
    name: "Zandvoort",
    country: "Netherlands",
    flag: "🇳🇱",
    round: 15,
    year: 2024,
    options: ["Zandvoort", "Hungary", "Austria", "Imola"]
  }
];

interface TrackData {
  x: number;
  y: number;
}

interface F1CircuitGuesserProps {
  onClose: () => void;
}

export default function F1CircuitGuesser({ onClose }: F1CircuitGuesserProps) {
  const [currentCircuitIndex, setCurrentCircuitIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [shuffledCircuits, setShuffledCircuits] = useState<Circuit[]>([]);
  const [trackData, setTrackData] = useState<TrackData[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);

  useEffect(() => {
    // Shuffle circuits at start
    const shuffled = [...circuits].sort(() => Math.random() - 0.5).slice(0, 10);
    setShuffledCircuits(shuffled);
  }, []);

  useEffect(() => {
    if (shuffledCircuits.length > 0 && currentCircuitIndex < shuffledCircuits.length) {
      loadTrackData(shuffledCircuits[currentCircuitIndex]);
    }
  }, [currentCircuitIndex, shuffledCircuits]);

  const loadTrackData = async (circuit: Circuit) => {
    try {
      setLoadingTrack(true);
      const url = `https://metrikdelta-backend-eu-production.up.railway.app/api/racing-line/${circuit.year}/${circuit.round}/Q/VER`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch track data');
      }
      
      const data = await response.json();
      
      if (data.gps_data && data.gps_data.length > 0) {
        const formattedData = data.gps_data.map((point: any) => ({
          x: point.x || point.X || 0,
          y: point.y || point.Y || 0
        }));
        setTrackData(formattedData);
      } else {
        setTrackData([]);
      }
      setLoadingTrack(false);
    } catch (error) {
      console.error('Error loading track data:', error);
      setTrackData([]);
      setLoadingTrack(false);
    }
  };

  useEffect(() => {
    if (shuffledCircuits.length === 0 || gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentCircuitIndex, gameOver, shuffledCircuits]);

  const handleTimeout = () => {
    if (currentCircuitIndex >= shuffledCircuits.length - 1) {
      setGameOver(true);
    } else {
      setCurrentCircuitIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeLeft(15);
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;

    const correct = answer === shuffledCircuits[currentCircuitIndex].name;
    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentCircuitIndex >= shuffledCircuits.length - 1) {
        setGameOver(true);
      } else {
        setCurrentCircuitIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimeLeft(15);
      }
    }, 1500);
  };

  const resetGame = () => {
    const shuffled = [...circuits].sort(() => Math.random() - 0.5).slice(0, 10);
    setShuffledCircuits(shuffled);
    setCurrentCircuitIndex(0);
    setScore(0);
    setGameOver(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimeLeft(15);
  };

  if (shuffledCircuits.length === 0) {
    return null;
  }

  const currentCircuit = shuffledCircuits[currentCircuitIndex];

  // Render track SVG
  const renderTrack = () => {
    if (loadingTrack) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-8 h-8 text-metrik-turquoise animate-spin" />
        </div>
      );
    }

    if (trackData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-metrik-silver text-sm">Track data unavailable</p>
        </div>
      );
    }

    const xCoords = trackData.map(p => p.x);
    const yCoords = trackData.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    const width = 320;
    const height = 300;
    const padding = 20;
    
    const scaleX = (width - 2 * padding) / (maxX - minX);
    const scaleY = (height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    
    const points = trackData.map(point => {
      const x = padding + (point.x - minX) * scale;
      const y = padding + (point.y - minY) * scale;
      return `${x},${y}`;
    }).join(' ');

    const startX = padding + (trackData[0].x - minX) * scale;
    const startY = padding + (trackData[0].y - minY) * scale;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto drop-shadow-2xl">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="#00E5CC"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          className={selectedAnswer ? (isCorrect ? 'animate-pulse' : '') : ''}
        />
        <circle cx={startX} cy={startY} r="5" fill="#FFFFFF" />
        <text x={startX + 10} y={startY + 5} fill="#00E5CC" fontSize="10" fontWeight="bold">START</text>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-metrik-black/90 backdrop-blur-xl animate-fade-in">
      <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl shadow-metrik-turquoise/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-metrik-turquoise/20 rounded-xl">
              <Trophy className="w-6 h-6 text-metrik-turquoise" />
            </div>
            <div>
              <h2 className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                F1 CIRCUIT GUESSER
              </h2>
              <p className="text-sm text-metrik-silver font-inter">
                Guess the F1 circuit from its track layout!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-metrik-turquoise/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-metrik-silver hover:text-white" />
          </button>
        </div>

        {!gameOver ? (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2 backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg px-4 py-2">
                <Trophy className="w-5 h-5 text-metrik-turquoise" />
                <span className="font-rajdhani font-bold text-white">
                  Score: {score}/{shuffledCircuits.length}
                </span>
              </div>

              <div className="flex items-center gap-2 backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg px-4 py-2">
                <span className="font-rajdhani font-bold text-metrik-silver">
                  Circuit {currentCircuitIndex + 1}/{shuffledCircuits.length}
                </span>
              </div>

              <div className={`flex items-center gap-2 backdrop-blur-xl border rounded-lg px-4 py-2 ${
                timeLeft <= 5 
                  ? 'bg-red-500/20 border-red-500/30' 
                  : 'bg-metrik-black/50 border-metrik-turquoise/20'
              }`}>
                <Timer className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-400' : 'text-metrik-turquoise'}`} />
                <span className={`font-rajdhani font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Circuit Display */}
            <div className="mb-6 backdrop-blur-xl bg-metrik-black/30 border border-metrik-turquoise/20 rounded-2xl p-8 flex items-center justify-center min-h-[340px]">
              {renderTrack()}
            </div>

            {/* Answer Feedback */}
            {selectedAnswer && (
              <div className={`mb-4 p-4 rounded-xl border ${
                isCorrect 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              } flex items-center gap-3 animate-fade-in`}>
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="font-rajdhani font-bold text-green-400">Correct! 🎉</p>
                      <p className="text-sm text-green-300 font-inter">
                        {currentCircuit.flag} {currentCircuit.name}, {currentCircuit.country}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-400" />
                    <div>
                      <p className="font-rajdhani font-bold text-red-400">Wrong! 😕</p>
                      <p className="text-sm text-red-300 font-inter">
                        Correct answer: {currentCircuit.flag} {currentCircuit.name}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {currentCircuit.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={`
                    px-6 py-4 rounded-xl font-rajdhani font-bold text-lg transition-all duration-300
                    ${selectedAnswer 
                      ? option === currentCircuit.name
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : option === selectedAnswer
                        ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                        : 'bg-metrik-black/30 border border-metrik-turquoise/10 text-metrik-silver opacity-50'
                      : 'bg-metrik-black/50 border border-metrik-turquoise/30 text-white hover:bg-metrik-turquoise/20 hover:border-metrik-turquoise hover:scale-105'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        ) : (
          // Game Over Screen
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-metrik-turquoise/20 rounded-full mb-6">
              <Trophy className="w-10 h-10 text-metrik-turquoise" />
            </div>
            
            <h3 className="text-4xl font-rajdhani font-black text-white mb-4">
              Game Over!
            </h3>
            
            <div className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/30 rounded-2xl p-6 mb-6 max-w-md mx-auto">
              <p className="text-6xl font-rajdhani font-black text-metrik-turquoise mb-2">
                {score}/{shuffledCircuits.length}
              </p>
              <p className="text-metrik-silver font-inter">
                {score === shuffledCircuits.length 
                  ? '🏆 Perfect Score! You\'re an F1 expert!'
                  : score >= 7
                  ? '🎉 Great job! You know your circuits!'
                  : score >= 5
                  ? '👍 Not bad! Keep practicing!'
                  : '💪 Keep learning those circuits!'}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={resetGame}
                className="px-8 py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-xl font-rajdhani font-black text-lg text-metrik-black hover:shadow-2xl hover:shadow-metrik-turquoise/50 transition-all duration-300 hover:scale-105"
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="px-8 py-4 bg-metrik-card/80 backdrop-blur-xl border border-metrik-turquoise/30 rounded-xl font-rajdhani font-black text-lg text-metrik-turquoise hover:bg-metrik-turquoise/20 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}