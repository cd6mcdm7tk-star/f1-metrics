import { useState, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { ArrowLeft, ZoomIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import axios from 'axios';

interface GPSPoint {
  x: number;
  y: number;
  speed: number;
  distance: number;
  throttle: number;
  brake: boolean;
}

interface Corner {
  corner_id: number;
  name: string;
  apex_index: number;
  start_index: number;
  end_index: number;
  min_speed: number;
  apex_point: {
    x: number;
    y: number;
    distance: number;
  };
}

interface CornerAnalysisData {
  lap_info: {
    driver: string;
    lap_time: string;
    lap_number: number;
    compound: string;
  };
  gps_data: GPSPoint[];
  corners: Corner[];
  total_points: number;
  total_corners: number;
}

interface DriverCornerData {
  driver: string;
  color: string;
  data: CornerAnalysisData | null;
  loading: boolean;
}

const DRIVER_COLORS = [
  '#00E5CC', // Turquoise
  '#FF3366', // Rose
  '#FFD700', // Or
  '#00FF00', // Vert
  '#FF6600', // Orange
];

function normalizeGPSData(gpsData: GPSPoint[]): GPSPoint[] {
  if (gpsData.length === 0) return [];
  
  const minX = Math.min(...gpsData.map(p => p.x));
  const maxX = Math.max(...gpsData.map(p => p.x));
  const minY = Math.min(...gpsData.map(p => p.y));
  const maxY = Math.max(...gpsData.map(p => p.y));
  
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = Math.max(rangeX, rangeY);
  
  return gpsData.map(point => ({
    ...point,
    x: ((point.x - minX) / scale) * 20 - 10,
    y: 0,
    distance: ((point.y - minY) / scale) * 20 - 10
  }));
}

function getSpeedColor(speed: number, maxSpeed: number): string {
  const ratio = speed / maxSpeed;
  if (ratio > 0.8) return '#00FF00'; // Vert = rapide
  if (ratio > 0.5) return '#FFD700'; // Jaune = moyen
  if (ratio > 0.3) return '#FF6600'; // Orange = lent
  return '#FF0000'; // Rouge = très lent
}

interface MiniMapProps {
  driversData: DriverCornerData[];
  selectedCorner: Corner | null;
  onCornerSelect: (corner: Corner) => void;
}

function MiniMap({ driversData, selectedCorner, onCornerSelect }: MiniMapProps) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 25, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  const firstDriver = driversData.find(d => d.data);
  if (!firstDriver || !firstDriver.data) return null;
  
  const normalized = normalizeGPSData(firstDriver.data.gps_data);
  const circuitPath = normalized.map(p => new THREE.Vector3(p.x, 0, p.distance));
  
  return (
    <>
      <Line
        points={circuitPath}
        color="#ffffff"
        lineWidth={3}
        transparent
        opacity={0.3}
      />
      
      {firstDriver.data.corners.map((corner, idx) => {
        const point = normalized[corner.apex_index];
        if (!point) return null;
        
        const isSelected = selectedCorner?.corner_id === corner.corner_id;
        
        return (
          <mesh
            key={idx}
            position={[point.x, 0.2, point.distance]}
            onClick={() => onCornerSelect(corner)}
          >
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial 
              color={isSelected ? '#00E5CC' : '#FF3366'} 
              transparent
              opacity={isSelected ? 1 : 0.7}
            />
          </mesh>
        );
      })}
      
      <gridHelper args={[30, 30, '#00E5CC', '#1A1A1A']} />
      <ambientLight intensity={0.8} />
    </>
  );
}

interface DetailedCornerViewProps {
  driversData: DriverCornerData[];
  selectedCorner: Corner | null;
}

function DetailedCornerView({ driversData, selectedCorner }: DetailedCornerViewProps) {
  const { camera } = useThree();
  
  const validDrivers = driversData.filter(d => d.data);
  
  const zoomData = useMemo(() => {
    if (!selectedCorner || validDrivers.length === 0) return null;
    
    return validDrivers.map(driver => {
      const normalized = normalizeGPSData(driver.data!.gps_data);
      const segment = normalized.slice(
        selectedCorner.start_index,
        selectedCorner.end_index + 1
      );
      
      return {
        driver: driver.driver,
        color: driver.color,
        segment,
        apexIndex: selectedCorner.apex_index - selectedCorner.start_index
      };
    });
  }, [validDrivers, selectedCorner]);
  
  useEffect(() => {
    if (zoomData && zoomData.length > 0) {
      const firstSegment = zoomData[0].segment;
      if (firstSegment.length > 0) {
        const midPoint = firstSegment[Math.floor(firstSegment.length / 2)];
        camera.position.set(midPoint.x, 12, midPoint.distance + 6);
        camera.lookAt(midPoint.x, 0, midPoint.distance);
      }
    }
  }, [zoomData, camera]);
  
  if (!zoomData) return null;
  
  const maxSpeed = Math.max(
    ...validDrivers.flatMap(d => d.data!.gps_data.map(p => p.speed))
  );
  
  return (
    <>
      {zoomData.map((data, driverIdx) => (
        <group key={driverIdx}>
          {data.segment.map((point, idx) => {
            if (idx === 0) return null;
            
            const prevPoint = data.segment[idx - 1];
            const color = getSpeedColor(point.speed, maxSpeed);
            
            const start = new THREE.Vector3(prevPoint.x, 0.1, prevPoint.distance);
            const end = new THREE.Vector3(point.x, 0.1, point.distance);
            
            return (
              <Line
                key={idx}
                points={[start, end]}
                color={color}
                lineWidth={3}
                transparent
                opacity={0.9}
              />
            );
          })}
          
          {data.apexIndex >= 0 && data.apexIndex < data.segment.length && (
            <mesh position={[
              data.segment[data.apexIndex].x,
              0.3,
              data.segment[data.apexIndex].distance
            ]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color="#FF0000"
                emissive="#FF0000"
                emissiveIntensity={0.8}
              />
            </mesh>
          )}
        </group>
      ))}
      
      <gridHelper args={[20, 20, '#00E5CC', '#1A1A1A']} />
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={1} color="#00E5CC" />
    </>
  );
}

export default function CornerAnalyzerPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(2024);
  const [grandsPrix, setGrandsPrix] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState('Q');
  const [availableDrivers, setAvailableDrivers] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  
  const [driversData, setDriversData] = useState<DriverCornerData[]>([]);
  const [selectedCorner, setSelectedCorner] = useState<Corner | null>(null);
  
  const [loadingGP, setLoadingGP] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [viewMode, setViewMode] = useState<'minimap' | 'detail'>('minimap');

  useEffect(() => {
    const fetchGrandsPrix = async () => {
      setLoadingGP(true);
      try {
        const response = await axios.get(`http://localhost:8000/api/grands-prix/${year}`);
        const data = response.data.grands_prix || [];
        setGrandsPrix(data);
        if (data.length > 0) {
          setSelectedRound(data[0].round);
        }
      } catch (error) {
        console.error('Error fetching GPs:', error);
        setGrandsPrix([]);
      } finally {
        setLoadingGP(false);
      }
    };

    fetchGrandsPrix();
  }, [year]);

  useEffect(() => {
    if (selectedRound === null || selectedRound === undefined) return;

    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const response = await axios.get(
          `http://localhost:8000/api/drivers/${year}/${selectedRound}/${sessionType}`
        );
        const driversArray = response.data.drivers || response.data || [];
        const drivers = driversArray.map((d: any) => d.number);
        setAvailableDrivers(drivers);
        setSelectedDrivers([]);
        setDriversData([]);
        setSelectedCorner(null);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        setAvailableDrivers([]);
      } finally {
        setLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, [year, selectedRound, sessionType]);

  const addDriver = async (driver: string) => {
    if (selectedDrivers.includes(driver) || selectedDrivers.length >= 5) return;

    const newDriverData: DriverCornerData = {
      driver,
      color: DRIVER_COLORS[selectedDrivers.length],
      data: null,
      loading: true
    };

    setSelectedDrivers([...selectedDrivers, driver]);
    setDriversData([...driversData, newDriverData]);

    try {
      const response = await axios.get<CornerAnalysisData>(
        `http://localhost:8000/api/corner-analysis/${year}/${selectedRound}/${sessionType}/${driver}`
      );
      
      setDriversData(prev => 
        prev.map(d => 
          d.driver === driver 
            ? { ...d, data: response.data, loading: false }
            : d
        )
      );
      
      if (selectedDrivers.length === 0 && response.data.corners.length > 0) {
        setSelectedCorner(response.data.corners[0]);
      }
    } catch (error) {
      console.error(`Error fetching corner analysis for ${driver}:`, error);
      setDriversData(prev => prev.filter(d => d.driver !== driver));
      setSelectedDrivers(prev => prev.filter(d => d !== driver));
    }
  };

  const removeDriver = (driver: string) => {
    setSelectedDrivers(prev => prev.filter(d => d !== driver));
    setDriversData(prev => prev.filter(d => d.driver !== driver));
  };

  const handleCornerSelect = (corner: Corner) => {
    setSelectedCorner(corner);
    setViewMode('detail');
  };

  const firstDriverWithData = driversData.find(d => d.data);

  return (
    <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-turquoise-500">CORNER ANALYZER</h1>
              <p className="text-gray-400 mt-1">Detailed Trajectory Analysis • Turn by Turn</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-cockpit p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                >
                  {[2024, 2023, 2022, 2021, 2020].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                  Grand Prix
                </label>
                {loadingGP ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : (
                  <select
                    value={selectedRound || ''}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                  >
                    {Array.isArray(grandsPrix) && grandsPrix.length > 0 ? (
                      grandsPrix.map(gp => (
                        <option key={gp.round} value={gp.round}>
                          {gp.country}
                        </option>
                      ))
                    ) : (
                      <option key="no-gps" value="">No GPs available</option>
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                  Session
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                >
                  <option value="Q">Qualifying</option>
                  <option value="R">Race</option>
                  <option value="FP1">FP1</option>
                  <option value="FP2">FP2</option>
                  <option value="FP3">FP3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                  Add Driver ({selectedDrivers.length}/5)
                </label>
                {loadingDrivers ? (
                  <div className="text-gray-400 text-sm">Loading drivers...</div>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addDriver(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                    disabled={selectedDrivers.length >= 5}
                  >
                    <option value="">Select driver...</option>
                    {availableDrivers
                      .filter(d => !selectedDrivers.includes(d))
                      .map(driver => (
                        <option key={driver} value={driver}>
                          #{driver}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {driversData.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                    Selected Drivers
                  </label>
                  <div className="space-y-2">
                    {driversData.map((driver) => (
                      <div
                        key={driver.driver}
                        className="flex items-center justify-between bg-white/5 p-3 rounded border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: driver.color }}
                          />
                          <span className="text-white font-semibold">
                            #{driver.driver}
                          </span>
                          {driver.loading && (
                            <span className="text-xs text-gray-400">Loading...</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeDriver(driver.driver)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {firstDriverWithData && firstDriverWithData.data && firstDriverWithData.data.corners.length > 0 && (
                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm font-semibold text-turquoise-400 mb-2">
                    Select Corner ({firstDriverWithData.data.corners.length} detected)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {firstDriverWithData.data.corners.map((corner) => (
                      <button
                        key={corner.corner_id}
                        onClick={() => handleCornerSelect(corner)}
                        className={`py-2 px-3 rounded text-sm font-semibold transition-colors ${
                          selectedCorner?.corner_id === corner.corner_id
                            ? 'bg-turquoise-500 text-black'
                            : 'bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        T{corner.corner_id}
                      </button>
                    ))}
                  </div>
                  
                  {selectedCorner && (
                    <div className="mt-3 p-3 bg-white/5 rounded text-sm">
                      <div className="text-turquoise-400 font-semibold mb-1">
                        {selectedCorner.name}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Min Speed: {selectedCorner.min_speed.toFixed(0)} km/h
                      </div>
                    </div>
                  )}
                </div>
              )}

              {driversData.length > 0 && driversData.every(d => !d.loading) && firstDriverWithData && (
                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm font-semibold text-turquoise-400 mb-3">
                    View Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('minimap')}
                      className={`flex-1 py-2 rounded text-sm font-semibold ${
                        viewMode === 'minimap'
                          ? 'bg-turquoise-500 text-black'
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      Track Map
                    </button>
                    <button
                      onClick={() => setViewMode('detail')}
                      className={`flex-1 py-2 rounded text-sm font-semibold ${
                        viewMode === 'detail'
                          ? 'bg-turquoise-500 text-black'
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                      disabled={!selectedCorner}
                    >
                      <ZoomIn className="w-4 h-4 inline mr-1" />
                      Zoom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass-cockpit p-2 h-[700px]">
              {driversData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-xl mb-2">Select drivers to analyze their racing lines</p>
                    <p className="text-sm">Click on corners in the map or select from the list</p>
                  </div>
                </div>
              ) : (
                <Canvas camera={{ position: [0, 25, 0], fov: 60 }}>
                  <color attach="background" args={['#0A0A0A']} />
                  
                  {viewMode === 'minimap' ? (
                    <MiniMap
                      driversData={driversData}
                      selectedCorner={selectedCorner}
                      onCornerSelect={handleCornerSelect}
                    />
                  ) : (
                    <DetailedCornerView
                      driversData={driversData}
                      selectedCorner={selectedCorner}
                    />
                  )}
                  
                  <EffectComposer>
                    <Bloom 
                      luminanceThreshold={0.2} 
                      luminanceSmoothing={0.9} 
                      intensity={1.2} 
                    />
                  </EffectComposer>
                </Canvas>
              )}
            </div>
            
            {viewMode === 'detail' && selectedCorner && (
              <div className="mt-4 glass-cockpit p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-turquoise-500">
                    {selectedCorner.name} Analysis
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>High Speed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Low Speed / Apex</span>
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