import React, { useState, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, Line, MeshTransmissionMaterial } from '@react-three/drei';
import { ArrowLeft, Loader2, Eye, EyeOff, Play, Pause, RotateCcw, Maximize2, Minimize2, Wind, Tag, Zap } from 'lucide-react';
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
    name: 'Aileron Avant',
    description: 'Génère 25-30% de l\'appui aérodynamique total. Composé de 5 éléments ajustables permettant d\'optimiser l\'équilibre aérodynamique. Le design influence directement le flux d\'air vers le reste de la voiture.',
    specs: ['Largeur: 1800mm', 'Matériau: Carbone', 'Poids: ~10kg', 'Downforce: 25-30%', 'Éléments: 5 flaps ajustables', 'Pression max: 5 tonnes'],
    position: [0, 0.3, 2.5],
    color: '#00E5CC'
  },
  {
    id: 'rear-wing',
    name: 'Aileron Arrière + DRS',
    description: 'Aileron mobile avec système DRS (Drag Reduction System). S\'ouvre pour réduire la traînée aérodynamique et gagner 10-15 km/h en ligne droite. Contrôlé électroniquement depuis le cockpit.',
    specs: ['Largeur: 950mm', 'DRS: +10-15 km/h', 'Downforce: 35-40%', 'Angle: Variable', 'Ouverture: 85mm max', 'Activation: <1 seconde'],
    position: [0, 1.2, -2.5],
    color: '#00E5CC'
  },
  {
    id: 'cockpit',
    name: 'Cockpit + Halo',
    description: 'Protection en titane introduite en 2018. Le Halo résiste à 12 tonnes de force et a déjà sauvé plusieurs vies. Le cockpit intègre tous les contrôles vitaux accessibles au pilote.',
    specs: ['Halo: 7kg titanium', 'Force: 125kN résistance', 'Obligatoire depuis 2018', 'Épaisseur: 3.5mm', 'Visibilité: 98% maintenue', 'Température cockpit: 50-60°C'],
    position: [0, 0.8, 0.2],
    color: '#FFD700'
  },
  {
    id: 'wheels',
    name: 'Roues (x4)',
    description: 'Pneus Pirelli 18 pouces avec jantes en magnésium. Les équipes peuvent changer les 4 roues en moins de 2 secondes lors d\'un arrêt au stand. La température optimale est cruciale pour la performance.',
    specs: ['Diamètre: 720mm (18")', 'Largeur avant: 305mm', 'Largeur arrière: 405mm', 'Température optimale: 100-110°C', 'Pression: 19-21 PSI', 'Poids jante: 8.5kg', 'Matériau: Magnésium', 'Pit stop: <2.0 secondes'],
    position: [0, 0.4, 0],
    color: '#E5E5E5'
  },
  {
    id: 'sidepods',
    name: 'Pontons',
    description: 'Éléments aérodynamiques cruciaux qui refroidissent le moteur via 4 radiateurs. Leur design crée également l\'effet Venturi qui génère de l\'appui. Zone d\'innovation majeure entre équipes.',
    specs: ['Radiateurs: 4x (eau, huile, turbo)', 'Flux d\'air: 150+ kg/s', 'Effet Venturi optimisé', 'Matériau: Carbone sandwich', 'Température gestion: 100-120°C', 'Design: Spécifique par équipe'],
    position: [0, 0.6, 0],
    color: '#FF3366'
  },
  {
    id: 'floor',
    name: 'Fond Plat',
    description: 'Surface qui génère l\'effet de sol (ground effect). Responsable de 40-45% de l\'appui total grâce au Venturi créé sous la voiture. La hauteur de roulage est critique (5-10mm du sol).',
    specs: ['Longueur: 3400mm', 'Effet Venturi principal', 'Ground effect moderne', 'Hauteur critique: 5-10mm', 'Downforce: 40-45% du total', 'Matériau: Carbone renforcé', 'Plancher strié (règlement 2022)'],
    position: [0, 0.05, 0],
    color: '#1A1A1A'
  },
  {
    id: 'engine',
    name: 'Moteur V6 Hybride',
    description: 'Groupe propulseur hybride combinant un V6 1.6L Turbo avec deux systèmes de récupération d\'énergie (MGU-K et MGU-H). Développe environ 1000 chevaux au total avec une efficacité thermique record de 50%.',
    specs: ['Cylindrée: 1600cc', 'ICE: ~750ch (moteur thermique)', 'MGU-K: ~160ch (cinétique)', 'MGU-H: ~120ch (thermique)', 'RPM max: 15,000', 'Efficacité: ~50%', 'Consommation: 110kg/course', 'Déploiement ERS: 33s/tour'],
    position: [0, 0.6, -0.8],
    color: '#FFD700'
  },
  {
    id: 'suspension',
    name: 'Suspension',
    description: 'Système push-rod/pull-rod ultra-sophistiqué qui maintient la voiture à hauteur optimale. Ajustable en permanence pour s\'adapter au niveau de carburant et à l\'usure des pneus.',
    specs: ['Type: Push-rod (avant) / Pull-rod (arr)', 'Amortisseurs: Réglables dynamiquement', 'Débattement: ~100mm', 'Fréquence: 2-3 Hz', 'Matériau: Titane et carbone', 'Poids: ~15kg total'],
    position: [0, 0.4, 1],
    color: '#C0C0C0'
  },
  {
    id: 'gearbox',
    name: 'Boîte de Vitesses',
    description: 'Transmission séquentielle 8 rapports + marche arrière. Les changements de vitesse s\'effectuent en moins de 50 millisecondes via des palettes au volant. Structure porteuse en carbone.',
    specs: ['Rapports: 8 + marche arrière', 'Changement: <50ms', 'Matériau: Carbone titane', 'Poids: ~40kg', 'Durabilité: 6 courses minimum', 'Type: Séquentielle'],
    position: [0, 0.5, -1.2],
    color: '#808080'
  },
  {
    id: 'steering',
    name: 'Volant',
    description: 'Centre névralgique avec plus de 25 boutons et réglages. Le pilote contrôle freinage, différentiel, ERS, radio, boissons et stratégie depuis le volant. Coût: ~50,000€.',
    specs: ['Boutons: 25+ fonctions', 'Écran: LCD haute définition', 'Matériau: Carbone', 'Poids: ~1.3kg', 'Palettes: Changement vitesse', 'Prix unitaire: ~€50,000'],
    position: [0, 0.9, 0.5],
    color: '#FFD700'
  },
  {
    id: 'battery',
    name: 'Batterie ES',
    description: 'Système de stockage d\'énergie (Energy Store) de 4 MJ. Alimente le MGU-K qui délivre 160 chevaux supplémentaires pendant 33 secondes par tour maximum.',
    specs: ['Capacité: 4 MJ', 'Poids: ~25kg', 'Puissance: 120 kW', 'Déploiement: 33s/tour max', 'Voltage: ~800V', 'Chimie: Lithium-ion'],
    position: [0, 0.5, 0.3],
    color: '#00FF00'
  },
  {
    id: 'diffuser',
    name: 'Diffuseur',
    description: 'Élément aérodynamique arrière qui accélère le flux d\'air sortant sous la voiture. Crée un effet de succion qui plaque la voiture au sol. Design complexe avec canaux multiples.',
    specs: ['Angle: 15° maximum', 'Downforce: 15-20%', 'Hauteur: Variable', 'Canaux: Multiples', 'Interaction: Fond plat', 'Règlement: Strict 2022'],
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
}

function F1ProceduralCar({
  animateRotation,
  animateWheels,
  drsOpen,
  explodedView,
  selectedPart,
  onPartClick,
  showLabels,
  windTunnel
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

      {showLabels && carParts.map((part) => (
        <group key={part.id} position={part.position}>
          <Html center distanceFactor={5}>
            <button
              onClick={() => onPartClick(part)}
              className="bg-black/80 text-white px-3 py-1 rounded border border-turquoise-500/50 hover:bg-turquoise-500/20 transition-colors text-xs font-semibold whitespace-nowrap"
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
  const [selectedPart, setSelectedPart] = useState<CarPart | null>(null);
  const [animateRotation, setAnimateRotation] = useState(true);
  const [animateWheels, setAnimateWheels] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [drsOpen, setDrsOpen] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [windTunnel, setWindTunnel] = useState(true);

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
              <h1 className="text-4xl font-bold text-turquoise-500">F1 ANATOMY</h1>
              <p className="text-gray-400 mt-1">Voiture 3D Interactive • 12 Composants • CFD Simulation</p>
            </div>
          </div>
        </div>

        <div className="glass-cockpit p-6 mb-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setAnimateRotation(!animateRotation)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                animateRotation 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              {animateRotation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              Rotation
            </button>

            <button
              onClick={() => setAnimateWheels(!animateWheels)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                animateWheels 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              <RotateCcw className="w-4 h-4" />
              Roues
            </button>

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                showLabels 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              <Tag className="w-4 h-4" />
              Labels
            </button>

            <button
              onClick={() => setShowEnvironment(!showEnvironment)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                showEnvironment 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              {showEnvironment ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Env
            </button>

            <button
              onClick={() => setDrsOpen(!drsOpen)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                drsOpen 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 border border-red-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-red-500/50'
              } transition-all`}
            >
              <Zap className="w-4 h-4" />
              DRS
            </button>

            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                explodedView 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              {explodedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              Vue éclatée
            </button>

            <button
              onClick={() => setWindTunnel(!windTunnel)}
              className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${
                windTunnel 
                  ? 'bg-turquoise-500 text-black shadow-lg shadow-turquoise-500/50 border border-turquoise-400' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/20 hover:border-turquoise-500/50'
              } transition-all`}
            >
              <Wind className="w-4 h-4" />
              CFD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="glass-cockpit p-2 h-[600px] relative">
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
                  
                  <ambientLight intensity={0.3} />
                  <directionalLight 
                    position={[10, 10, 5]} 
                    intensity={2}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                  />
                  <directionalLight position={[-10, 5, -5]} intensity={0.8} />
                  <spotLight 
                    position={[0, 10, 0]} 
                    intensity={1}
                    angle={0.5} 
                    penumbra={1} 
                    castShadow 
                  />
                  <pointLight position={[0, 3, 3]} intensity={0.5} color="#00E5CC" />
                  <pointLight position={[0, 3, -3]} intensity={0.5} color="#00E5CC" />
                  
                  {showEnvironment && <Environment preset="city" />}
                  
                  <F1ProceduralCar 
                    animateRotation={animateRotation}
                    animateWheels={animateWheels}
                    drsOpen={drsOpen}
                    explodedView={explodedView}
                    selectedPart={selectedPart}
                    onPartClick={setSelectedPart}
                    showLabels={showLabels}
                    windTunnel={windTunnel}
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

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded border border-turquoise-500/30">
                <p className="text-sm text-gray-400">
                  🖱️ Rotation • 🔍 Zoom • 🎯 Hotspots • 🌊 CFD • ⚡ DRS • 💥 Vue éclatée
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="glass-cockpit p-6 h-[600px] overflow-y-auto">
              {selectedPart ? (
                <div>
                  <h3 className="text-2xl font-bold text-turquoise-500 mb-4">
                    {selectedPart.name}
                  </h3>
                  
                  <p className="text-gray-300 mb-6">
                    {selectedPart.description}
                  </p>

                  <h4 className="text-lg font-semibold text-turquoise-400 mb-3">
                    Spécifications
                  </h4>
                  
                  <ul className="space-y-2 mb-6">
                    {selectedPart.specs.map((spec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-turquoise-500 mt-1">•</span>
                        <span className="text-gray-300">{spec}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setSelectedPart(null)}
                    className="w-full py-2 bg-turquoise-500 hover:bg-turquoise-600 text-black font-semibold rounded transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-turquoise-500 mb-4">
                    Fonctionnalités
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="p-3 bg-turquoise-500/10 rounded border border-turquoise-500/30">
                      <h4 className="text-turquoise-400 font-semibold mb-2 flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        Soufflerie CFD
                      </h4>
                      <p className="text-sm text-gray-300">
                        Lignes de flux animées montrant l'aérodynamique réelle. Effet aileron, sol, et DRS visible.
                      </p>
                    </div>

                    <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                      <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        DRS Actif
                      </h4>
                      <p className="text-sm text-gray-300">
                        L'aileron s'ouvre progressivement. Impact visible sur le flux d'air (moins de turbulences).
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded border border-white/10">
                      <h4 className="text-turquoise-400 font-semibold mb-2 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Roues Réalistes
                      </h4>
                      <p className="text-sm text-gray-300">
                        Les 4 roues tournent sur place avec jantes détaillées et rayons.
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded border border-white/10">
                      <h4 className="text-turquoise-400 font-semibold mb-2 flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        Vue Éclatée
                      </h4>
                      <p className="text-sm text-gray-300">
                        Chaque composant s'éloigne précisément de son axe pour voir l'intérieur.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-turquoise-400 mb-3">
                      Composants
                    </h4>
                    <div className="space-y-2">
                      {carParts.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => setSelectedPart(part)}
                          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded border border-white/10 hover:border-turquoise-500/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: part.color }}
                            />
                            <span className="text-gray-200 text-sm">{part.name}</span>
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

        <div className="mt-8 glass-cockpit p-6">
          <h3 className="text-2xl font-bold text-turquoise-500 mb-6">
            💨 Aérodynamique CFD & Technologies Expliquées
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3 flex items-center gap-2">
                <Wind className="w-5 h-5" />
                Flux Laminaire
              </h4>
              <p className="text-sm text-gray-400">
                Les lignes bleues montrent le flux d'air. L'aileron avant divise le flux, 
                l'air accélère sous le fond plat (effet Venturi), et l'aileron arrière crée de l'appui 
                tout en générant des turbulences.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3">⚡ Impact DRS</h4>
              <p className="text-sm text-gray-400">
                DRS fermé: Grande turbulence arrière créant une haute traînée. 
                DRS ouvert: Flux lisse, traînée réduite de 20-30%, gain de vitesse de 10-15 km/h 
                en ligne droite. Utilisable uniquement en course et sous conditions.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3">⬇️ Effet de Sol</h4>
              <p className="text-sm text-gray-400">
                Les lignes de flux descendent sous la voiture et s'accélèrent (Venturi). 
                Crée 40-45% de l'appui total. Hauteur critique de 5-10mm du sol. 
                Le règlement 2022 a réintroduit cet effet pour améliorer les courses.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3">🔋 Système Hybride</h4>
              <p className="text-sm text-gray-400">
                Le MGU-K récupère l'énergie au freinage (jusqu'à 2 MJ par tour) et la redéploie 
                pour 160ch supplémentaires pendant 33 secondes par tour maximum. 
                Le MGU-H récupère l'énergie du turbo sans limite de temps.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3">🛞 Gestion Pneumatiques</h4>
              <p className="text-sm text-gray-400">
                5 composés Pirelli (C0-C5). Fenêtre optimale: 100-110°C. Stratégie cruciale 
                avec gestion thermique, dégradation et graining. Les équipes doivent utiliser 
                au minimum 2 composés différents en course.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-turquoise-400 font-semibold mb-3">⚙️ Électronique Embarquée</h4>
              <p className="text-sm text-gray-400">
                Plus de 300 capteurs sur la voiture. Transmission de données en temps réel 
                vers les stands. Analyse de la température des freins, pression des pneus, 
                usure, consommation carburant, et paramètres moteur pour optimiser la stratégie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}    