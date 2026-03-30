import React, { useState, useRef, Suspense, useMemo } from 'react';
import SEO from '../components/SEO';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, Line, MeshTransmissionMaterial } from '@react-three/drei';
import { ArrowLeft, Loader2, Play, Pause, RotateCcw, Maximize2, Minimize2, Wind, Tag, Zap, MousePointer2, ZoomIn, Target, Waves, ArrowDown, Battery as BatteryIcon, Disc, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface CarPart {
  id: string;
  name: string;
  description: string;
  specs: string[];
  position: [number, number, number];
  color: string;
}

const carParts: CarPart[] = [
  {
    id: 'front-wing',
    name: 'Front Wing',
    description: 'Generates 25-30% of total aerodynamic downforce. Composed of 5 adjustable elements to optimise aerodynamic balance. The design directly influences airflow to the rest of the car.',
    specs: ['Width: 1800mm', 'Material: Carbon fibre', 'Weight: ~10kg', 'Downforce: 25-30%', 'Elements: 5 adjustable flaps', 'Max load: 5 tonnes'],
    position: [0, 0.3, 2.5],
    color: '#00E5CC'
  },
  {
    id: 'rear-wing',
    name: 'Rear Wing + DRS',
    description: 'Mobile wing with DRS (Drag Reduction System). Opens to reduce aerodynamic drag and gain 10-15 km/h on straights. Electronically controlled from the cockpit.',
    specs: ['Width: 950mm', 'DRS: +10-15 km/h', 'Downforce: 35-40%', 'Angle: Variable', 'Opening: 85mm max', 'Activation: <1 second'],
    position: [0, 1.2, -2.5],
    color: '#00E5CC'
  },
  {
    id: 'cockpit',
    name: 'Cockpit + Halo',
    description: 'Titanium protection introduced in 2018. The Halo withstands 12 tonnes of force and has already saved several lives. The cockpit integrates all vital controls accessible to the driver.',
    specs: ['Halo: 7kg titanium', 'Strength: 125kN resistance', 'Mandatory since 2018', 'Thickness: 3.5mm', 'Visibility: 98% maintained', 'Cockpit temp: 50-60°C'],
    position: [0, 0.8, 0.2],
    color: '#FFD700'
  },
  {
    id: 'wheels',
    name: 'Wheels (x4)',
    description: '18-inch Pirelli tyres with magnesium rims. Teams can change all 4 wheels in under 2 seconds during a pit stop. Optimal temperature is crucial for performance.',
    specs: ['Diameter: 720mm (18")', 'Front width: 305mm', 'Rear width: 405mm', 'Optimal temp: 100-110°C', 'Pressure: 19-21 PSI', 'Rim weight: 8.5kg', 'Material: Magnesium', 'Pit stop: <2.0 seconds'],
    position: [0, 0.4, 0],
    color: '#E5E5E5'
  },
  {
    id: 'sidepods',
    name: 'Sidepods',
    description: 'Crucial aerodynamic elements that cool the engine via 4 radiators. Their design also creates the Venturi effect that generates downforce. Major innovation area between teams.',
    specs: ['Radiators: 4x (water, oil, turbo)', 'Airflow: 150+ kg/s', 'Venturi effect optimised', 'Material: Carbon sandwich', 'Thermal management: 100-120°C', 'Design: Team-specific'],
    position: [0, 0.6, 0],
    color: '#FF3366'
  },
  {
    id: 'floor',
    name: 'Floor',
    description: 'Surface generating the ground effect. Responsible for 40-45% of total downforce via the Venturi created under the car. Ride height is critical (5-10mm from ground).',
    specs: ['Length: 3400mm', 'Main Venturi effect', 'Modern ground effect', 'Critical height: 5-10mm', 'Downforce: 40-45% of total', 'Material: Reinforced carbon', '2022 regulation floor'],
    position: [0, 0.05, 0],
    color: '#1A1A1A'
  },
  {
    id: 'engine',
    name: 'V6 Hybrid Engine',
    description: 'Hybrid power unit combining a 1.6L Turbo V6 with two energy recovery systems (MGU-K and MGU-H). Develops around 1000 horsepower total with a record 50% thermal efficiency.',
    specs: ['Displacement: 1600cc', 'ICE: ~750hp', 'MGU-K: ~160hp (kinetic)', 'MGU-H: ~120hp (thermal)', 'Max RPM: 15,000', 'Efficiency: ~50%', 'Fuel consumption: 110kg/race', 'ERS deployment: 33s/lap'],
    position: [0, 0.6, -0.8],
    color: '#FFD700'
  },
  {
    id: 'suspension',
    name: 'Suspension',
    description: 'Ultra-sophisticated push-rod/pull-rod system that maintains the car at optimal ride height. Continuously adjustable to adapt to fuel level and tyre wear.',
    specs: ['Type: Push-rod (front) / Pull-rod (rear)', 'Dampers: Dynamically adjustable', 'Travel: ~100mm', 'Frequency: 2-3 Hz', 'Material: Titanium and carbon', 'Weight: ~15kg total'],
    position: [0, 0.4, 1],
    color: '#C0C0C0'
  },
  {
    id: 'gearbox',
    name: 'Gearbox',
    description: '8-speed sequential transmission + reverse. Gear changes occur in less than 50 milliseconds via steering wheel paddles. Load-bearing carbon structure.',
    specs: ['Gears: 8 + reverse', 'Shift time: <50ms', 'Material: Carbon titanium', 'Weight: ~40kg', 'Durability: 6 races minimum', 'Type: Sequential'],
    position: [0, 0.5, -1.2],
    color: '#808080'
  },
  {
    id: 'steering',
    name: 'Steering Wheel',
    description: 'Control centre with over 25 buttons and settings. The driver controls braking bias, differential, ERS, radio, drinks and strategy from the wheel. Cost: ~€50,000.',
    specs: ['Buttons: 25+ functions', 'Screen: High-definition LCD', 'Material: Carbon fibre', 'Weight: ~1.3kg', 'Paddles: Gear shift', 'Unit price: ~€50,000'],
    position: [0, 0.9, 0.5],
    color: '#FFD700'
  },
  {
    id: 'battery',
    name: 'ES Battery',
    description: '4 MJ Energy Store system. Powers the MGU-K which delivers 160 extra horsepower for a maximum of 33 seconds per lap.',
    specs: ['Capacity: 4 MJ', 'Weight: ~25kg', 'Power: 120 kW', 'Deployment: 33s/lap max', 'Voltage: ~800V', 'Chemistry: Lithium-ion'],
    position: [0, 0.5, 0.3],
    color: '#00FF00'
  },
  {
    id: 'diffuser',
    name: 'Diffuser',
    description: 'Rear aerodynamic element that accelerates airflow exiting under the car. Creates a suction effect that pins the car to the ground. Complex design with multiple channels.',
    specs: ['Angle: 15° maximum', 'Downforce: 15-20%', 'Height: Variable', 'Channels: Multiple', 'Interaction: Floor', 'Regulation: Strict 2022'],
    position: [0, 0.1, -2],
    color: '#00E5CC'
  }
];

const carParts2026: CarPart[] = [
  {
    id: 'front-wing',
    name: 'Active Front Wing',
    description: 'Variable geometry front wing. Flattens on straights to reduce drag ("highway mode"), rises in corners to maximise downforce. Partially replaces the role of DRS.',
    specs: ['Width: 1800mm', 'Material: Carbon fibre', 'Mode: Active (variable)', 'Downforce: 20-25%', 'Position: Automatic', 'Straight-line gain: ~6 km/h'],
    position: [0, 0.3, 2.5],
    color: '#00E5CC'
  },
  {
    id: 'rear-wing',
    name: 'Active Rear Wing (Lazy Wing)',
    description: 'Nicknamed "Lazy Wing", this active wing replaces DRS. Automatically lays flat at high speed to reduce drag and rises in corners. Continuously controlled by electronics.',
    specs: ['Width: 1000mm', 'Mode: Continuous (not binary)', 'Drag reduction: -25-35%', 'Angle: Real-time variable', 'Control: FIA electronics', 'Standardised across teams'],
    position: [0, 1.2, -2.5],
    color: '#00E5CC'
  },
  {
    id: 'cockpit',
    name: 'Cockpit + Halo',
    description: 'Halo protection retained and reinforced. The cockpit integrates new active aerodynamic controls. The driver can manually adjust the aero map under certain permitted conditions.',
    specs: ['Halo: 7kg titanium (unchanged)', 'Strength: 125kN resistance', 'Active aero control: Yes', 'Cockpit temp: 45-55°C', 'Visibility: 98% maintained', 'New: Lazy Wing control'],
    position: [0, 0.8, 0.2],
    color: '#FFD700'
  },
  {
    id: 'wheels',
    name: 'Wheels (x4)',
    description: '18-inch Pirelli tyres retained. Slight compound evolution to suit the lighter, faster 2026 cars. Pit stops remain a key strategic weapon.',
    specs: ['Diameter: 720mm (18")', 'Front width: 305mm', 'Rear width: 405mm', 'Optimal temp: 95-110°C', 'Pressure: 19-21 PSI', 'Pit stop target: <2.0s'],
    position: [0, 0.4, 0],
    color: '#E5E5E5'
  },
  {
    id: 'sidepods',
    name: 'Sidepods',
    description: 'Significantly simplified sidepods. The 2026 regulations reduce underfloor tunnels, limiting the lateral Venturi effect. Cleaner design with less complex carbon surface area.',
    specs: ['Aerodynamics: Simplified', 'Radiators: 3x (reduced ICE)', 'Airflow: 120+ kg/s', 'Underfloor: Regulation limited', 'Material: Carbon sandwich', 'Innovation zone: Reduced'],
    position: [0, 0.6, 0],
    color: '#FF3366'
  },
  {
    id: 'floor',
    name: 'Floor',
    description: 'Revised floor for 2026. Venturi tunnels under the floor are simplified compared to 2022 regulations. Ground effect is maintained but via less complex geometry.',
    specs: ['Length: 3200mm', 'Venturi: Simplified vs 2022-2025', 'Ground effect: Maintained', 'Critical height: 5-12mm', 'Downforce: 35-40% of total', 'Regulation: New 2026'],
    position: [0, 0.05, 0],
    color: '#1A1A1A'
  },
  {
    id: 'engine',
    name: '2026 V6 Hybrid Power Unit',
    description: 'Major revolution: 50% of power comes from the electric motor (MGU-E). No more MGU-H. The 1.6L Turbo V6 develops ~550hp, the MGU-E adds ~550 more. Record 55% thermal efficiency.',
    specs: ['ICE: ~550hp (V6 Turbo)', 'MGU-E: ~550hp electric', 'Total: ~1100hp', 'Electric ratio: 50%', 'No MGU-H', 'Efficiency: ~55%', 'Max RPM: 15,000', 'ERS deployment: No time limit'],
    position: [0, 0.6, -0.8],
    color: '#00FF88'
  },
  {
    id: 'suspension',
    name: 'Suspension',
    description: 'Active suspension permitted in 2026 for the first time since the 1990s. Allows dynamic ride height adjustment to optimise active aerodynamics.',
    specs: ['Type: Push-rod/Pull-rod + Active', 'Height: Dynamically adjustable', 'Travel: ~100mm', 'Frequency: 2-5 Hz', 'Material: Titanium and carbon', 'New: Active suspension'],
    position: [0, 0.4, 1],
    color: '#C0C0C0'
  },
  {
    id: 'gearbox',
    name: 'Gearbox',
    description: '8-speed sequential transmission retained. Now integrated with the hybrid management system to optimise MGU-E deployment. Manages energy recovery under braking.',
    specs: ['Gears: 8 + reverse', 'Shift time: <50ms', 'Integration: MGU-E', 'Recovery: Under braking', 'Durability: 6 races minimum', 'Type: Sequential'],
    position: [0, 0.5, -1.2],
    color: '#808080'
  },
  {
    id: 'steering',
    name: 'Steering Wheel',
    description: 'Steering wheel enriched with new controls to manage active aerodynamics. The driver can modulate the Lazy Wing position in certain permitted situations. Still over 25 functions.',
    specs: ['Buttons: 30+ functions', 'Active aero: Direct control', 'Screen: High-definition LCD', 'Material: Carbon fibre', 'Weight: ~1.4kg', 'Unit price: ~€60,000'],
    position: [0, 0.9, 0.5],
    color: '#FFD700'
  },
  {
    id: 'battery',
    name: 'ES Battery (Energy Store)',
    description: 'Battery more than doubled to absorb MGU-E power. Goes from 4 MJ to 9 MJ. Deployment is no longer limited to 33 seconds per lap — the MGU-E can be used continuously if battery allows.',
    specs: ['Capacity: 9 MJ (vs 4 MJ in 2025)', 'Weight: ~50kg', 'Power: 350 kW', 'Deployment: Continuous (no 33s limit)', 'Voltage: ~900V', 'Chemistry: Advanced lithium-ion'],
    position: [0, 0.5, 0.3],
    color: '#00FF88'
  },
  {
    id: 'diffuser',
    name: 'Diffuser',
    description: 'Simplified diffuser in line with the 2026 floor. Still essential for rear downforce, but with fewer complex channels. Reduced interaction with Venturi tunnels.',
    specs: ['Angle: 15° maximum', 'Downforce: 12-18%', 'Height: Variable', 'Channels: Reduced vs 2022-2025', 'Interaction: Simplified floor', 'Regulation: New 2026'],
    position: [0, 0.1, -2],
    color: '#00E5CC'
  }
];

function CarbonTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(40, 40, 40, ${Math.random() * 0.5})`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, []);
  
  return texture;
}

function FrontWing({ exploded }: { exploded: number }) {
  const carbonTexture = CarbonTexture();
  
  return (
    <group position={[0, 0.3, 2.5 + exploded * 1.5]}>
      <mesh castShadow>
        <boxGeometry args={[2, 0.05, 0.4]} />
        <meshStandardMaterial 
          map={carbonTexture}
          color="#00E5CC"
          metalness={0.9}
          roughness={0.1}
          emissive="#00E5CC"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {[0.6, 0.3, 0, -0.3, -0.6].map((offset, i) => (
        <mesh key={i} position={[0, offset * 0.15, 0.05]} castShadow>
          <boxGeometry args={[2, 0.03, 0.3]} />
          <meshStandardMaterial 
            map={carbonTexture}
            color="#00E5CC"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
      
      {[-0.8, 0.8].map((side, i) => (
        <mesh key={`endplate-${i}`} position={[side, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.4, 0.4]} />
          <meshStandardMaterial 
            color="#1A1A1A"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function RearWing({ exploded, drsOpen }: { exploded: number; drsOpen: boolean }) {
  const carbonTexture = CarbonTexture();
  const wingRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (wingRef.current) {
      const targetRotation = drsOpen ? -0.3 : 0;
      wingRef.current.rotation.x += (targetRotation - wingRef.current.rotation.x) * 0.1;
    }
  });
  
  return (
    <group position={[0, 1.2, -2.5 - exploded * 1.5]}>
      <mesh position={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.05]} />
        <meshStandardMaterial color="#1A1A1A" metalness={0.9} roughness={0.1} />
      </mesh>
      
      <mesh position={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.05]} />
        <meshStandardMaterial color="#1A1A1A" metalness={0.9} roughness={0.1} />
      </mesh>
      
      <group ref={wingRef} position={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1, 0.05, 0.5]} />
          <meshStandardMaterial 
            map={carbonTexture}
            color="#00E5CC"
            metalness={0.9}
            roughness={0.1}
            emissive="#00E5CC"
            emissiveIntensity={0.2}
          />
        </mesh>
        
        <mesh position={[0, -0.15, 0]} castShadow>
          <boxGeometry args={[1, 0.05, 0.45]} />
          <meshStandardMaterial 
            map={carbonTexture}
            color="#00E5CC"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
}

function Cockpit({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.8 + exploded * 0.5, 0.2]}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.5, 1.2]} />
        <meshStandardMaterial 
          color="#0A0A0A"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      <mesh position={[0, 0.35, 0]} castShadow>
        <torusGeometry args={[0.35, 0.05, 16, 32]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1}
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0.35, -0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      
      <mesh position={[0.2, 0.15, 0.4]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.03]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1}
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function Wheels({ exploded, animate }: { exploded: number; animate: boolean }) {
  const wheelRefs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null)
  ];

  useFrame(() => {
    if (animate) {
      wheelRefs.forEach(ref => {
        if (ref.current) {
          ref.current.rotation.x += 0.1;
        }
      });
    }
  });

  const positions: [number, number, number][] = [
    [1.2 + exploded * 0.8, 0.4, 1.5 + exploded * 0.3],
    [-1.2 - exploded * 0.8, 0.4, 1.5 + exploded * 0.3],
    [1.2 + exploded * 0.8, 0.4, -1.5 - exploded * 0.3],
    [-1.2 - exploded * 0.8, 0.4, -1.5 - exploded * 0.3]
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} ref={wheelRefs[i]} position={pos} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.2}
              roughness={0.8}
            />
          </mesh>
          
          <mesh castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.32, 32]} />
            <meshStandardMaterial 
              color="#C0C0C0"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          
          {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((angle, j) => (
            <mesh
              key={j}
              position={[
                0,
                Math.cos(angle) * 0.15,
                Math.sin(angle) * 0.15
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
              <meshStandardMaterial 
                color="#808080"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}
          
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.34, 16]} />
            <meshStandardMaterial 
              color="#FFD700"
              metalness={1}
              roughness={0.1}
              emissive="#FFD700"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Sidepods({ exploded }: { exploded: number }) {
  const carbonTexture = CarbonTexture();
  
  return (
    <>
      {[-0.9, 0.9].map((side, i) => (
        <group key={i} position={[side + (side > 0 ? exploded * 0.8 : -exploded * 0.8), 0.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.4, 0.6, 2.5]} />
            <meshStandardMaterial 
              map={carbonTexture}
              color="#FF3366"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[0, -0.15, 0.3]} castShadow>
            <boxGeometry args={[0.35, 0.25, 1.8]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          
          <mesh position={[side > 0 ? -0.15 : 0.15, 0.1, 0.5]} castShadow>
            <boxGeometry args={[0.15, 0.3, 1.2]} />
            <meshStandardMaterial 
              color="#00E5CC"
              metalness={0.9}
              roughness={0.1}
              emissive="#00E5CC"
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Floor({ exploded }: { exploded: number }) {
  const carbonTexture = CarbonTexture();
  
  return (
    <group position={[0, 0.05 - exploded * 0.5, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.02, 4]} />
        <meshStandardMaterial 
          map={carbonTexture}
          color="#1A1A1A"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {[-0.7, 0.7].map((side, i) => (
        <mesh key={i} position={[side, -0.05, -1.2]} castShadow>
          <boxGeometry args={[0.3, 0.08, 1.2]} />
          <meshStandardMaterial 
            color="#00E5CC"
            metalness={0.8}
            roughness={0.2}
            emissive="#00E5CC"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Engine({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.6, -0.8 - exploded * 0.8]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.5, 0.9]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1}
          roughness={0.2}
          emissive="#FFD700"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.8]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      
      {[-0.25, 0.25].map((side, i) => (
        <mesh key={i} position={[side, 0.15, 0.2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
          <meshStandardMaterial 
            color="#C0C0C0"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
      
      <mesh position={[0, -0.2, -0.3]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 16]} />
        <meshStandardMaterial 
          color="#808080"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function Suspension({ exploded }: { exploded: number }) {
  return (
    <>
      {[
        [1.2, 0.4, 1.5],
        [-1.2, 0.4, 1.5],
        [1.2, 0.4, -1.5],
        [-1.2, 0.4, -1.5]
      ].map((pos, i) => (
        <group key={i} position={[pos[0], pos[1] + exploded * 0.3, pos[2]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
            <meshStandardMaterial 
              color="#C0C0C0"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.15, 8]} />
            <meshStandardMaterial 
              color="#FFD700"
              metalness={1}
              roughness={0.1}
              emissive="#FFD700"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Gearbox({ exploded }: { exploded: number }) {
  const carbonTexture = CarbonTexture();
  
  return (
    <group position={[0, 0.5, -1.2 - exploded * 0.8]}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.4, 0.7]} />
        <meshStandardMaterial 
          map={carbonTexture}
          color="#808080"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.6]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

function Steering({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.9 + exploded * 0.3, 0.5]}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.15, 0.02, 16, 32, Math.PI * 1.5]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1}
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.02]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Battery({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.5 + exploded * 0.3, 0.3]}>
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.25, 0.6]} />
        <meshStandardMaterial 
          color="#00FF00"
          metalness={0.7}
          roughness={0.3}
          emissive="#00FF00"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.35, 0.05, 0.55]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

function Diffuser({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.1 - exploded * 0.3, -2 - exploded * 0.5]}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 0.3, 0.8]} />
        <meshStandardMaterial 
          color="#00E5CC"
          metalness={0.9}
          roughness={0.1}
          emissive="#00E5CC"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {[-0.5, 0, 0.5].map((offset, i) => (
        <mesh key={i} position={[offset, 0.1, 0.2]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.6]} />
          <meshStandardMaterial 
            color="#1A1A1A"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function Bargeboard({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.7, 0.7].map((side, i) => (
        <group key={i} position={[side + (side > 0 ? exploded * 0.5 : -exploded * 0.5), 0.3, 1.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.15, 0.4, 0.6]} />
            <meshStandardMaterial 
              color="#00E5CC"
              metalness={0.9}
              roughness={0.1}
              emissive="#00E5CC"
              emissiveIntensity={0.15}
            />
          </mesh>
          
          <mesh position={[side > 0 ? -0.1 : 0.1, -0.1, -0.15]} castShadow>
            <boxGeometry args={[0.08, 0.25, 0.3]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Exhaust({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.7, -1.5 - exploded * 0.3]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.4, 16]} />
        <meshStandardMaterial 
          color="#808080"
          metalness={1}
          roughness={0.2}
          emissive="#FF6600"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.15, 12]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function TWing({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 1, -2 - exploded * 0.8]}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.03, 0.15]} />
        <meshStandardMaterial 
          color="#00E5CC"
          metalness={0.9}
          roughness={0.1}
          emissive="#00E5CC"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function Mirrors({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.75, 0.75].map((side, i) => (
        <group key={i} position={[side + (side > 0 ? exploded * 0.4 : -exploded * 0.4), 0.75, 0.8]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[side > 0 ? 0.08 : -0.08, 0.1, 0]} castShadow>
            <boxGeometry args={[0.12, 0.08, 0.02]} />
            <meshStandardMaterial 
              color="#00E5CC"
              metalness={1}
              roughness={0.05}
              emissive="#00E5CC"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SharkFin({ exploded }: { exploded: number }) {
  return (
    <group position={[0, 0.9 + exploded * 0.2, -1]}>
      <mesh castShadow>
        <boxGeometry args={[0.02, 0.35, 0.6]} />
        <meshStandardMaterial 
          color="#1A1A1A"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      <mesh position={[0, 0.1, -0.25]} castShadow>
        <boxGeometry args={[0.03, 0.15, 0.1]} />
        <meshStandardMaterial 
          color="#FF3366"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function CoolingLouvers({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.85, 0.85].map((side, i) => (
        <group key={i} position={[side, 0.75, -0.3]}>
          {[0, 0.1, 0.2].map((offset, j) => (
            <mesh key={j} position={[0, 0, offset]} castShadow>
              <boxGeometry args={[0.3, 0.02, 0.05]} />
              <meshStandardMaterial 
                color="#1A1A1A"
                metalness={0.6}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function BrakeDucts({ exploded }: { exploded: number }) {
  return (
    <>
      {[
        [1.2, 0.35, 1.5],
        [-1.2, 0.35, 1.5],
        [1.2, 0.35, -1.5],
        [-1.2, 0.35, -1.5]
      ].map((pos, i) => (
        <group key={i} position={[pos[0] + (pos[0] > 0 ? exploded * 0.3 : -exploded * 0.3), pos[1], pos[2]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.06, 0.15, 8]} />
            <meshStandardMaterial 
              color="#FF3366"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function BrakeDiscs({ exploded }: { exploded: number }) {
  return (
    <>
      {[
        [1.2, 0.4, 1.5],
        [-1.2, 0.4, 1.5],
        [1.2, 0.4, -1.5],
        [-1.2, 0.4, -1.5]
      ].map((pos, i) => (
        <group key={i} position={[pos[0] + (pos[0] > 0 ? exploded * 0.3 : -exploded * 0.3), pos[1], pos[2]]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
            <meshStandardMaterial 
              color="#808080"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <mesh castShadow>
            <torusGeometry args={[0.15, 0.02, 8, 32]} />
            <meshStandardMaterial 
              color="#C0C0C0"
              metalness={1}
              roughness={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function FrontWingEndplates({ exploded }: { exploded: number }) {
  return (
    <>
      {[-1.0, 1.0].map((side, i) => (
        <group key={i} position={[side + (side > 0 ? exploded * 0.5 : -exploded * 0.5), 0.3, 2.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.5, 0.4]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[0, -0.15, 0.1]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.15]} />
            <meshStandardMaterial 
              color="#00E5CC"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function RearWingEndplates({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.55, 0.55].map((side, i) => (
        <group key={i} position={[side, 1.2, -2.5 - exploded * 1.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.8, 0.3]} />
            <meshStandardMaterial 
              color="#1A1A1A"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[0, 0.3, -0.1]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.1]} />
            <meshStandardMaterial 
              color="#FF3366"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function FloorEdge({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.9, 0.9].map((side, i) => (
        <mesh key={i} position={[side, 0.05 - exploded * 0.5, 0]} castShadow>
          <boxGeometry args={[0.05, 0.08, 3.5]} />
          <meshStandardMaterial 
            color="#00E5CC"
            metalness={0.9}
            roughness={0.1}
            emissive="#00E5CC"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </>
  );
}

function SponsorPanels({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.85, 0.85].map((side, i) => (
        <group key={i}>
          <mesh position={[side, 0.7, 0.5]} castShadow>
            <boxGeometry args={[0.35, 0.15, 0.02]} />
            <meshStandardMaterial 
              color="#FF3366"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
          
          <mesh position={[side, 0.7, -0.5]} castShadow>
            <boxGeometry args={[0.35, 0.15, 0.02]} />
            <meshStandardMaterial 
              color="#00E5CC"
              metalness={0.7}
              roughness={0.3}
              emissive="#00E5CC"
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function CoolingInlets({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.85, 0.85].map((side, i) => (
        <mesh 
          key={i} 
          position={[side, 0.6, 1.0]} 
          rotation={[0, side > 0 ? -0.2 : 0.2, 0]}
          castShadow
        >
          <boxGeometry args={[0.25, 0.35, 0.15]} />
          <meshStandardMaterial 
            color="#1A1A1A"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

function RearImpactStructure({ exploded }: { exploded: number }) {
  return (
    <mesh position={[0, 0.7, -2.9 - exploded * 0.8]} castShadow>
      <boxGeometry args={[0.5, 0.4, 0.3]} />
      <meshStandardMaterial 
        color="#1A1A1A"
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

function RadiatorGrilles({ exploded }: { exploded: number }) {
  return (
    <>
      {[-0.85, 0.85].map((side, i) => (
        <group key={i}>
          {[0.3, 0.5, 0.7].map((zPos, j) => (
            <mesh 
              key={j}
              position={[side, 0.65, zPos]} 
              castShadow
            >
              <boxGeometry args={[0.32, 0.45, 0.02]} />
              <meshStandardMaterial 
                color="#1A1A1A"
                metalness={0.5}
                roughness={0.6}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function WindStreamline({ startPos, windTunnel, drsOpen, offset }: { startPos: [number, number, number]; windTunnel: boolean; drsOpen: boolean; offset: number }) {
  const lineRef = useRef<any>(null);
  const zPosition = useRef(offset);
  const [lineWidth, setLineWidth] = useState(1.5);
  const [opacity, setOpacity] = useState(0.7);
  
  useFrame(() => {
    if (!lineRef.current || !windTunnel) return;
    
    // VITESSE VARIABLE selon la zone
    let speed = 0.11;
    const heightFactor = Math.max(0.6, 1 - startPos[1] * 0.2);
    const currentZ = zPosition.current;
    
    // Zone Venturi (-2 < z < 1.5) : ACCÉLÉRATION
    if (currentZ >= -2 && currentZ < 1.5 && startPos[1] < 0.15) {
      const venturiProgress = (currentZ + 2) / 3.5;
      const venturiBoost = Math.sin(venturiProgress * Math.PI) * 0.15;
      speed += venturiBoost; // Accélère jusqu'à +150% !
    }
    
    // Zone turbulences DRS fermé : RALENTISSEMENT
    if (currentZ < -2 && startPos[1] > 1.0 && !drsOpen) {
      speed *= 0.7; // Ralentit de 30%
    }
    
    zPosition.current -= speed * heightFactor;
    
    if (zPosition.current < -15) {
      zPosition.current = offset;
    }
    
    lineRef.current.position.z = zPosition.current;
    
    // ÉPAISSEUR & OPACITÉ DYNAMIQUES selon la zone
    let dynamicWidth = 1.5;
    let dynamicOpacity = 0.7;
    
    // Turbulences : plus épais et visible
    if (currentZ < -2 && startPos[1] > 1.0 && !drsOpen) {
      dynamicWidth = 2.2;
      dynamicOpacity = 0.85;
    }
    // Venturi : plus fin et transparent (vitesse élevée)
    else if (currentZ >= -2 && currentZ < 1.5 && startPos[1] < 0.15) {
      dynamicWidth = 1.2;
      dynamicOpacity = 0.6;
    }
    
    setLineWidth(dynamicWidth);
    setOpacity(dynamicOpacity);
    
    // RECALCUL DYNAMIQUE DES POINTS
    const pts = [];
    const startX = startPos[0];
    const startY = startPos[1];
    
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const localZ = t * 8 - 4;
      const worldZ = currentZ + localZ;
      
      let x = startX;
      let y = startY;
      
      const organicWave = Math.sin(t * Math.PI * 2) * 0.01;
      
      // Zone arrière : TURBULENCES DRS
      if (worldZ < -2) {
        const distFromWing = Math.abs(worldZ + 3.5);
        const turbulence = Math.max(0, 1 - distFromWing / 2.5);
        
        if (startY > 1.0 && turbulence > 0) {
          if (!drsOpen) {
            const chaos = Math.sin(worldZ * 3) * turbulence;
            y -= chaos * 2.0;
            x -= Math.cos(worldZ * 3) * turbulence * 1.4;
            x += Math.sin(worldZ * 4) * turbulence * 0.7;
          } else {
            y -= Math.sin(worldZ * 1.5) * turbulence * 0.15;
          }
        }
        else if (startY < 0.1) {
          y -= turbulence * 1.8;
          x *= (1 - turbulence * 0.1);
        }
        else if (Math.abs(startX) > 0.8) {
          x -= (startX > 0 ? 1 : -1) * turbulence * (drsOpen ? 0.6 : 1.1);
          y -= Math.sin(worldZ * (drsOpen ? 2 : 4)) * turbulence * (drsOpen ? 0.3 : 0.6);
        }
      }
      
      // Zone corps : VENTURI
      else if (worldZ >= -2 && worldZ < 1.5) {
        const bodyProgress = (worldZ + 2) / 3.5;
        const venturiEffect = Math.sin(bodyProgress * Math.PI);
        
        if (startY > 0.8) {
          y -= Math.sin(bodyProgress * Math.PI * 3) * 0.08;
        }
        else if (startY > 0.5) {
          if (Math.abs(startX) < 0.4) {
            x -= (startX > 0 ? 1 : -1) * bodyProgress * 0.35;
          }
        }
        else if (Math.abs(startX) > 0.6) {
          x -= (startX > 0 ? 1 : -1) * bodyProgress * 0.3;
        }
        else if (startY < 0.15) {
          y += venturiEffect * 0.25;
          x *= (1 - bodyProgress * 0.1);
        }
      }
      
      // Zone avant : SIMPLE
      else if (worldZ >= 1.5) {
        const frontProgress = Math.min(1, (worldZ - 1.5) / 4);
        
        if (startY > 0.4) {
          y -= frontProgress * 0.3;
          x -= startX * frontProgress * 0.2;
        }
        else if (Math.abs(startX) > 0.5) {
          x -= (startX > 0 ? 1 : -1) * frontProgress * 0.4;
        }
        else if (startY < 0.2) {
          y += frontProgress * 0.3;
        }
      }
      
      y += organicWave;
      pts.push(new THREE.Vector3(x, y, localZ));
    }
    
    if (lineRef.current.geometry) {
      lineRef.current.geometry.setPositions(pts.flatMap(p => [p.x, p.y, p.z]));
    }
  });

  if (!windTunnel) return null;

  const initialPoints = Array.from({ length: 70 }, (_, i) => {
    const t = i / 70;
    const z = t * 8 - 4;
    return new THREE.Vector3(startPos[0], startPos[1], z);
  });

  return (
    <Line
      ref={lineRef}
      points={initialPoints}
      color="#00E5CC"
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}

// Particules Venturi sous la voiture - montrent l'accélération de l'air
function VenturiParticle({ startPos, windTunnel, offset }: { startPos: [number, number, number]; windTunnel: boolean; offset: number }) {
  const particleRef = useRef<any>(null);
  
  useFrame(() => {
    if (particleRef.current && windTunnel) {
      const currentZ = particleRef.current.position.z;
      
      // EFFET VENTURI ULTRA VISIBLE avec contraste de vitesse
      let speed = 0.12;  // Vitesse de base
      
      // AVANT la voiture (z > 1.5) : RALENTISSEMENT
      if (currentZ > 1.5) {
        speed = 0.08;  // Lent avant d'arriver
      }
      // SOUS la voiture (-0.5 < z < 1.5) : ACCÉLÉRATION MASSIVE
      else if (currentZ >= -0.5 && currentZ < 1.5) {
        const progress = (currentZ + 0.5) / 2.0;
        const venturiBoost = Math.sin(progress * Math.PI); // Courbe d'accélération
        speed = 0.12 + venturiBoost * 0.38; // Accélère jusqu'à 0.50 (x4 plus rapide !)
      }
      // APRÈS la voiture (z < -0.5) : Retour à vitesse normale
      else {
        speed = 0.15;
      }
      
      particleRef.current.position.z -= speed;
      
      if (particleRef.current.position.z < -7) {
        particleRef.current.position.z = offset;
      }
    }
  });
  
  if (!windTunnel) return null;
  
  return (
    <mesh ref={particleRef} position={startPos}>
      <sphereGeometry args={[0.032, 8, 8]} />
      <meshStandardMaterial 
        color="#FF3366" 
        transparent 
        opacity={0.9}
        emissive="#FF3366"
        emissiveIntensity={0.7}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

// Particules latérales - montrent l'écoulement latéral
function LateralParticle({ startPos, windTunnel, offset, side }: { startPos: [number, number, number]; windTunnel: boolean; offset: number; side: 'left' | 'right' }) {
  const particleRef = useRef<any>(null);
  
  useFrame(() => {
    if (particleRef.current && windTunnel) {
      const currentZ = particleRef.current.position.z;
      
      // Vitesse de base
      let speed = 0.12;
      
      // Déviation latérale progressive
      const lateralMove = side === 'left' ? -0.008 : 0.008;
      particleRef.current.position.x += lateralMove;
      
      particleRef.current.position.z -= speed;
      
      if (particleRef.current.position.z < -7) {
        particleRef.current.position.z = offset;
        particleRef.current.position.x = startPos[0]; // Reset position X
      }
    }
  });
  
  if (!windTunnel) return null;
  
  return (
    <mesh ref={particleRef} position={startPos}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshStandardMaterial 
        color="#FFB800" 
        transparent 
        opacity={0.75}
        emissive="#FFB800"
        emissiveIntensity={0.4}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

interface F1ProceduralCarProps {
  animateRotation: boolean;
  animateWheels: boolean;
  drsOpen: boolean;
  explodedView: boolean;
  selectedPart: CarPart | null;
  onPartClick: (part: CarPart | null) => void;
  showLabels: boolean;
  windTunnel: boolean;
  parts: CarPart[];
}

function F1ProceduralCar({
  animateRotation,
  animateWheels,
  drsOpen,
  explodedView,
  selectedPart,
  onPartClick,
  showLabels,
  windTunnel,
  parts,
}: F1ProceduralCarProps) {
  const carRef = useRef<THREE.Group>(null);
  const explodedAmount = explodedView ? 1 : 0;

  useFrame(() => {
    if (carRef.current && animateRotation) {
      carRef.current.rotation.y += 0.005;
    }
  });

  const streamlinePositions: [number, number][] = [
    // Flux centraux stratégiques (5) - montrent l'effet général
    [0, -0.05],   // Sous châssis
    [0, 0.15],    // Bas
    [0, 0.5],     // Milieu
    [0, 0.85],    // Haut
    [0, 1.15],    // Très haut (aileron arrière)
    
    // Flux latéraux essentiels (8) - montrent l'effet pontons
    [-0.35, 0.1],
    [0.35, 0.1],
    [-0.55, 0.4],
    [0.55, 0.4],
    [-0.35, 0.75],
    [0.35, 0.75],
    [-0.45, 1.1],   // Aileron arrière côtés
    [0.45, 1.1],
    
    // Flux extérieurs (5) - montrent la largeur d'impact
    [-0.85, 0.2],
    [0.85, 0.2],
    [-0.85, 0.55],
    [0.85, 0.55],
    [0, 0.35]       // Central médian
  ];

  return (
    <group ref={carRef}>
      <FrontWing exploded={explodedAmount} />
      <RearWing exploded={explodedAmount} drsOpen={drsOpen} />
      <Cockpit exploded={explodedAmount} />
      <Wheels exploded={explodedAmount} animate={animateWheels} />
      <Sidepods exploded={explodedAmount} />
      <Floor exploded={explodedAmount} />
      <Engine exploded={explodedAmount} />
      <Suspension exploded={explodedAmount} />
      <Gearbox exploded={explodedAmount} />
      <Steering exploded={explodedAmount} />
      <Battery exploded={explodedAmount} />
      <Diffuser exploded={explodedAmount} />
      <Bargeboard exploded={explodedAmount} />
      <Exhaust exploded={explodedAmount} />
      <TWing exploded={explodedAmount} />
      <Mirrors exploded={explodedAmount} />
      <SharkFin exploded={explodedAmount} />
      <CoolingLouvers exploded={explodedAmount} />
      <BrakeDucts exploded={explodedAmount} />
      <BrakeDiscs exploded={explodedAmount} />
      <FrontWingEndplates exploded={explodedAmount} />
      <RearWingEndplates exploded={explodedAmount} />
      <FloorEdge exploded={explodedAmount} />
      <SponsorPanels exploded={explodedAmount} />
      <CoolingInlets exploded={explodedAmount} />
      <RearImpactStructure exploded={explodedAmount} />
      <RadiatorGrilles exploded={explodedAmount} />
      
      {streamlinePositions.map(([x, y], i) => (
        <React.Fragment key={i}>
          <WindStreamline
            startPos={[x, y, 0]}
            windTunnel={windTunnel}
            drsOpen={drsOpen}
            offset={0}
          />
          <WindStreamline
            startPos={[x, y, 0]}
            windTunnel={windTunnel}
            drsOpen={drsOpen}
            offset={3.75}
          />
          <WindStreamline
            startPos={[x, y, 0]}
            windTunnel={windTunnel}
            drsOpen={drsOpen}
            offset={7.5}
          />
          <WindStreamline
            startPos={[x, y, 0]}
            windTunnel={windTunnel}
            drsOpen={drsOpen}
            offset={11.25}
          />
        </React.Fragment>
      ))}

      {/* Particules Venturi sous la voiture - montrent l'accélération */}
      {[
        // Ligne centrale (très dense)
        [0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3], [0, 0, 4], [0, 0, 5], [0, 0, 6], [0, 0, 7.5],
        
        // Lignes latérales proches (denses)
        [-0.15, 0.02, 0], [0.15, 0.02, 0],
        [-0.15, 0.02, 1.5], [0.15, 0.02, 1.5],
        [-0.15, 0.02, 3], [0.15, 0.02, 3],
        [-0.15, 0.02, 4.5], [0.15, 0.02, 4.5],
        [-0.15, 0.02, 6], [0.15, 0.02, 6],
        [-0.15, 0.02, 7.5], [0.15, 0.02, 7.5],
        
        // Lignes intermédiaires
        [-0.3, 0.03, 0.5], [0.3, 0.03, 0.5],
        [-0.3, 0.03, 2], [0.3, 0.03, 2],
        [-0.3, 0.03, 3.5], [0.3, 0.03, 3.5],
        [-0.3, 0.03, 5], [0.3, 0.03, 5],
        [-0.3, 0.03, 6.5], [0.3, 0.03, 6.5],
        
        // Lignes larges
        [-0.45, 0.05, 1], [0.45, 0.05, 1],
        [-0.45, 0.05, 2.5], [0.45, 0.05, 2.5],
        [-0.45, 0.05, 4], [0.45, 0.05, 4],
        [-0.45, 0.05, 5.5], [0.45, 0.05, 5.5],
        [-0.45, 0.05, 7], [0.45, 0.05, 7],
        
        // Lignes extérieures
        [-0.6, 0.07, 0.5], [0.6, 0.07, 0.5],
        [-0.6, 0.07, 2.5], [0.6, 0.07, 2.5],
        [-0.6, 0.07, 4.5], [0.6, 0.07, 4.5],
        [-0.6, 0.07, 6.5], [0.6, 0.07, 6.5],
      ].map((pos, i) => (
        <VenturiParticle
          key={`particle-${i}`}
          startPos={pos as [number, number, number]}
          windTunnel={windTunnel}
          offset={8}
        />
      ))}

      {/* Particules latérales - montrent l'écoulement latéral */}
      {[
        // Côté gauche
        { pos: [-0.7, 0.3, 0], side: 'left' as const },
        { pos: [-0.7, 0.3, 3], side: 'left' as const },
        { pos: [-0.7, 0.3, 6], side: 'left' as const },
        { pos: [-0.7, 0.6, 1.5], side: 'left' as const },
        { pos: [-0.7, 0.6, 4.5], side: 'left' as const },
        { pos: [-0.9, 0.45, 2], side: 'left' as const },
        { pos: [-0.9, 0.45, 5], side: 'left' as const },
        
        // Côté droit
        { pos: [0.7, 0.3, 0], side: 'right' as const },
        { pos: [0.7, 0.3, 3], side: 'right' as const },
        { pos: [0.7, 0.3, 6], side: 'right' as const },
        { pos: [0.7, 0.6, 1.5], side: 'right' as const },
        { pos: [0.7, 0.6, 4.5], side: 'right' as const },
        { pos: [0.9, 0.45, 2], side: 'right' as const },
        { pos: [0.9, 0.45, 5], side: 'right' as const },
      ].map((data, i) => (
        <LateralParticle
          key={`lateral-${i}`}
          startPos={data.pos as [number, number, number]}
          windTunnel={windTunnel}
          offset={8}
          side={data.side}
        />
      ))}

      {showLabels && parts.map((part) => (
        <group key={part.id} position={part.position}>
          <Html center distanceFactor={5}>
            <button
              onClick={() => onPartClick(part)}
              className="bg-metrik-black/80 backdrop-blur-md text-metrik-text px-3 py-1 rounded-lg border border-metrik-turquoise/50 hover:bg-metrik-turquoise/20 transition-colors text-xs font-bold font-rajdhani whitespace-nowrap"
              style={{ pointerEvents: 'auto' }}
            >
              {part.name}
            </button>
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function F1AnatomyPage() {
  const navigate = useNavigate();
  const [regulation, setRegulation] = useState<'2022-2025' | '2026'>('2022-2025');
  const [selectedPart, setSelectedPart] = useState<CarPart | null>(null);
  const [animateRotation, setAnimateRotation] = useState(true);
  const [animateWheels, setAnimateWheels] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [drsOpen, setDrsOpen] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [windTunnel, setWindTunnel] = useState(false);

  const activeCarParts = regulation === '2026' ? carParts2026 : carParts;

  return (
    <>
    <SEO path="/f1-anatomy" title="F1 Car Anatomy - METRIK DELTA" description="Explore the anatomy of a Formula 1 car in 3D: aerodynamics, DRS, power unit, tyres and all technical components explained." keywords="f1 car anatomy, formula 1 car parts, f1 aerodynamics, f1 drs, f1 technical explained" />
    <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-black font-rajdhani text-metrik-turquoise">F1 ANATOMY</h1>
              <p className="text-xs md:text-base text-metrik-text-secondary mt-1 hidden sm:block">Interactive 3D Car • 12 Components • CFD Simulation</p>
            </div>
          </div>

          {/* Regulation toggle */}
          <div className="flex items-center gap-1 p-1 bg-metrik-dark border border-white/10 rounded-lg">
            <button
              onClick={() => { setRegulation('2022-2025'); setSelectedPart(null); }}
              className={`px-3 py-1.5 rounded text-xs md:text-sm font-bold font-rajdhani transition-all ${
                regulation === '2022-2025'
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg'
                  : 'text-metrik-text-secondary hover:text-metrik-text'
              }`}
            >
              2022–2025
            </button>
            <button
              onClick={() => { setRegulation('2026'); setSelectedPart(null); }}
              className={`px-3 py-1.5 rounded text-xs md:text-sm font-bold font-rajdhani transition-all ${
                regulation === '2026'
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg'
                  : 'text-metrik-text-secondary hover:text-metrik-text'
              }`}
            >
              2026
            </button>
          </div>
        </div>

        {regulation === '2026' && (
          <div className="mb-4 px-4 py-2.5 bg-metrik-turquoise/10 border border-metrik-turquoise/40 rounded-lg flex items-center gap-3">
            <span className="text-metrik-turquoise font-bold font-rajdhani text-sm">NEW 2026 REGULATIONS</span>
            <span className="text-metrik-text-secondary text-xs font-inter">Active Aero · 50/50 Power Unit · Active Suspension · 9 MJ Battery</span>
          </div>
        )}

        <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg p-3 md:p-6 mb-4">
          <div className="flex flex-nowrap md:flex-wrap gap-2 md:gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setAnimateRotation(!animateRotation)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                animateRotation 
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg border border-metrik-turquoise' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-turquoise/50'
              }`}
            >
              {animateRotation ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              <span className="hidden sm:inline">Rotate</span>
            </button>

            <button
              onClick={() => setAnimateWheels(!animateWheels)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                animateWheels 
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg border border-metrik-turquoise' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-turquoise/50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Wheels</span>
            </button>

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                showLabels 
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg border border-metrik-turquoise' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-turquoise/50'
              }`}
            >
              <Tag className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Labels</span>
            </button>

            <button
              onClick={() => setDrsOpen(!drsOpen)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                drsOpen 
                  ? 'bg-metrik-error text-white shadow-lg shadow-metrik-error/50 border border-metrik-error' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-error/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              DRS
            </button>

            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                explodedView 
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg border border-metrik-turquoise' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-turquoise/50'
              }`}
            >
              {explodedView ? <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              <span className="hidden lg:inline">Exploded</span>
              <span className="hidden sm:inline lg:hidden">Expl.</span>
            </button>

            <button
              onClick={() => setWindTunnel(!windTunnel)}
              className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded text-sm md:text-base font-bold font-rajdhani flex items-center gap-1 md:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${
                windTunnel 
                  ? 'bg-metrik-turquoise text-metrik-black shadow-glow-turquoise-lg border border-metrik-turquoise' 
                  : 'bg-white/5 text-metrik-text hover:bg-white/10 border border-white/20 hover:border-metrik-turquoise/50'
              }`}
            >
              <Wind className="w-3.5 h-3.5 md:w-4 md:h-4" />
              CFD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg p-2 h-[400px] md:h-[600px] relative">
              <Canvas shadows camera={{ position: [6, 3, 6], fov: 50 }}>
                <Suspense fallback={null}>
                  <OrbitControls 
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={3}
                    maxDistance={15}
                    maxPolarAngle={Math.PI / 2}
                  />
                  
                  <ambientLight intensity={0.5} />

                  {/* Main directional lights */}
                  <directionalLight 
                    position={[10, 10, 5]} 
                    intensity={2.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                  />
                  <directionalLight position={[-10, 5, -5]} intensity={1.2} />

                  {/* Spot from top */}
                  <spotLight 
                    position={[0, 15, 0]} 
                    intensity={1.5}
                    angle={0.6} 
                    penumbra={1} 
                    castShadow 
                  />

                  {/* Accent lights turquoise */}
                  <pointLight position={[0, 3, 3]} intensity={0.8} color="#00E5CC" />
                  <pointLight position={[0, 3, -3]} intensity={0.8} color="#00E5CC" />

                  {/* Hemisphere light pour simuler un environnement */}
                  <hemisphereLight 
                    args={["#87CEEB", "#1A1A1A", 0.8]} 
                    position={[0, 50, 0]} 
                  />

                  {/* Rim lights pour les contours */}
                  <pointLight position={[5, 2, 0]} intensity={0.6} color="#FFFFFF" />
                  <pointLight position={[-5, 2, 0]} intensity={0.6} color="#FFFFFF" />

                  {/* Fill light devant */}
                  <directionalLight 
                    position={[0, 5, 10]} 
                    intensity={1} 
                    color="#FFFFFF" 
                  />
                  
                  <F1ProceduralCar
                    animateRotation={animateRotation}
                    animateWheels={animateWheels}
                    drsOpen={drsOpen}
                    explodedView={explodedView}
                    selectedPart={selectedPart}
                    onPartClick={setSelectedPart}
                    showLabels={showLabels}
                    windTunnel={windTunnel}
                    parts={activeCarParts}
                  />
                  
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                    <planeGeometry args={[50, 50]} />
                    <meshStandardMaterial 
                      color="#0A0A0A" 
                      metalness={0.9}
                      roughness={0.1}
                    />
                  </mesh>
                  
                  <EffectComposer>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.5} />
                  </EffectComposer>
                </Suspense>
              </Canvas>

              <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 bg-metrik-black/90 backdrop-blur-md px-2 md:px-4 py-1.5 md:py-2 rounded-lg border border-metrik-turquoise/30">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-metrik-text-secondary font-inter">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <MousePointer2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Rotation</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Zoom</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Target className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Hotspots</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Waves className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden md:inline">CFD</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Zap className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden md:inline">DRS</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden lg:inline">Exploded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg p-4 md:p-6 max-h-[500px] md:h-[600px] overflow-y-auto">
              {selectedPart ? (
                <div>
                  <h3 className="text-xl md:text-2xl font-black font-rajdhani text-metrik-turquoise mb-3 md:mb-4">
                    {selectedPart.name}
                  </h3>

                  <p className="text-sm md:text-base text-metrik-text-secondary font-inter mb-4 md:mb-6">
                    {selectedPart.description}
                  </p>

                  <h4 className="text-base md:text-lg font-bold font-rajdhani text-metrik-turquoise mb-2 md:mb-3">
                    Specifications
                  </h4>

                  <ul className="space-y-2 mb-4 md:mb-6 font-inter">
                    {selectedPart.specs.map((spec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-metrik-turquoise mt-1">•</span>
                        <span className="text-xs md:text-sm text-metrik-text-secondary">{spec}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setSelectedPart(null)}
                    className="w-full py-2 bg-metrik-turquoise hover:bg-metrik-turquoise/80 text-metrik-black font-bold font-rajdhani rounded-lg transition-colors text-sm md:text-base"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg md:text-xl font-black font-rajdhani text-metrik-turquoise mb-3 md:mb-4">
                    Features
                  </h3>

                  <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                    <div className="p-3 bg-metrik-turquoise/10 rounded-lg border border-metrik-turquoise/30">
                      <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 flex items-center gap-2 text-sm md:text-base">
                        <Wind className="w-4 h-4" />
                        CFD Wind Tunnel
                      </h4>
                      <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                        Animated flow lines showing real aerodynamics. Wing, ground effect, and DRS impact visible.
                      </p>
                    </div>

                    <div className="p-3 bg-metrik-error/10 rounded-lg border border-metrik-error/30">
                      <h4 className="text-metrik-error font-bold font-rajdhani mb-2 flex items-center gap-2 text-sm md:text-base">
                        <Zap className="w-4 h-4" />
                        Active DRS
                      </h4>
                      <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                        The wing opens progressively. Visible impact on airflow (reduced turbulence).
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 flex items-center gap-2 text-sm md:text-base">
                        <Play className="w-4 h-4" />
                        Realistic Wheels
                      </h4>
                      <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                        All 4 wheels rotate on the spot with detailed rims and spokes.
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 flex items-center gap-2 text-sm md:text-base">
                        <Maximize2 className="w-4 h-4" />
                        Exploded View
                      </h4>
                      <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                        Each component moves precisely away from its axis to see inside.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-metrik-dark">
                    <h4 className="text-base md:text-lg font-bold font-rajdhani text-metrik-turquoise mb-3">
                      Components
                    </h4>
                    <div className="space-y-2 font-inter">
                      {activeCarParts.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => setSelectedPart(part)}
                          className="w-full text-left p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-metrik-turquoise/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: part.color }}
                            />
                            <span className="text-metrik-text text-xs md:text-sm">{part.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-8 backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg p-4 md:p-6">
          <h3 className="text-xl md:text-2xl font-black font-rajdhani text-metrik-turquoise mb-4 md:mb-6 flex items-center gap-2">
            <Wind className="w-5 h-5 md:w-6 md:h-6" />
            {regulation === '2026' ? 'New 2026 Technologies Explained' : 'CFD Aerodynamics & Technologies Explained'}
          </h3>

          {regulation === '2026' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="p-3 md:p-4 bg-metrik-turquoise/10 rounded-lg border border-metrik-turquoise/30">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                  Power Unit 50/50
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  For the first time in history: 50% of power comes from the electric motor (MGU-E, ~550hp).
                  The Turbo V6 provides the remaining 550hp. The MGU-H is eliminated.
                  Total: ~1100hp in cars 30kg lighter.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-metrik-turquoise/10 rounded-lg border border-metrik-turquoise/30">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Wind className="w-4 h-4 md:w-5 md:h-5" />
                  Active Aerodynamics
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  The rear "Lazy Wing" and active front wing replace the binary DRS.
                  Aerodynamic surfaces adjust continuously: flat on straights,
                  raised in corners. Estimated gain: 15-20 km/h on straights.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <BatteryIcon className="w-4 h-4 md:w-5 md:h-5" />
                  9 MJ Battery
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Battery capacity increases from 4 MJ to 9 MJ (+125%). MGU-E deployment is no longer
                  limited to 33 seconds — it can be used continuously. Strategic revolution:
                  battery charge management becomes paramount in races.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                  Simplified Ground Effect
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Venturi tunnels under the floor are simplified compared to 2022-2025.
                  Ground effect is maintained (35-40% of downforce) but with less complex
                  geometry, reducing porpoising sensitivity and improving close racing.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Disc className="w-4 h-4 md:w-5 md:h-5" />
                  Tyre Management
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Pirelli 18-inch tyres retained. Lighter (~768 kg) and more powerful
                  cars change degradation patterns. Brake energy recovery alters
                  tyre behaviour during deceleration phases.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  Active Suspension
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Permitted for the first time since 1994, active suspension allows
                  dynamic ride height adjustment. Combined with active aero,
                  it optimises downforce in corners and drag on straights in real time.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Waves className="w-4 h-4 md:w-5 md:h-5" />
                  Laminar Flow
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  The blue lines show airflow. The front wing splits the flow,
                  air accelerates under the flat floor (Venturi effect), and the rear wing generates downforce
                  while producing turbulence.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                  DRS Impact
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  DRS closed: Large rear turbulence creating high drag.
                  DRS open: Smooth flow, drag reduced by 20-30%, speed gain of 10-15 km/h
                  on straights. Usable in race conditions only, within designated zones.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                  Ground Effect
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Flow lines descend under the car and accelerate (Venturi).
                  Generates 40-45% of total downforce. Critical ride height of 5-10mm from the ground.
                  The 2022 regulations reintroduced this effect to improve racing.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <BatteryIcon className="w-4 h-4 md:w-5 md:h-5" />
                  Hybrid System
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  The MGU-K recovers braking energy (up to 2 MJ per lap) and redeploys it
                  for an extra 160hp for a maximum of 33 seconds per lap.
                  The MGU-H harvests turbo energy with no time limit.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Disc className="w-4 h-4 md:w-5 md:h-5" />
                  Tyre Management
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  5 Pirelli compounds (C0-C5). Optimal window: 100-110°C. Strategy is crucial
                  with thermal management, degradation and graining. Teams must use
                  at least 2 different compounds during the race.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-metrik-turquoise font-bold font-rajdhani mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  Onboard Electronics
                </h4>
                <p className="text-xs md:text-sm text-metrik-text-secondary font-inter">
                  Over 300 sensors on the car. Real-time data transmission to the pit wall.
                  Brake temperature, tyre pressure, wear, fuel consumption,
                  and engine parameters all monitored to optimise strategy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}