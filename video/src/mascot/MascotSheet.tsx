import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { BRAND, BRAND_NAME, DISPLAY, MONO } from '../theme';
import Donkey, { type DonkeyProps } from './Donkey';
import { FACES, type Viseme } from './face';

// A model sheet to judge the mascot before it is animated: its expressions,
// its mouth shapes and the head as an emblem at icon sizes.

const POSES: { label: string; props: DonkeyProps }[] = [
  { label: 'Neutre', props: { face: FACES.neutral } },
  { label: 'Parle', props: { face: FACES.neutral, mouth: 'D', look: { x: -0.4, y: 0 } } },
  { label: 'Surpris', props: { face: FACES.surprised } },
  { label: 'Ironique', props: { face: FACES.ironic, look: { x: 0.5, y: 0 } } },
  { label: 'Déçu', props: { face: FACES.disappointed, look: { x: 0, y: 0.6 } } },
  { label: 'Montre', props: { face: FACES.pleased, point: 32, look: { x: 0.9, y: -0.5 } } },
];

const MOUTH_ROW: { viseme: Viseme; sound: string }[] = [
  { viseme: 'X', sound: 'repos' }, { viseme: 'A', sound: 'm b p' }, { viseme: 'B', sound: 's t i' },
  { viseme: 'C', sound: 'è' }, { viseme: 'D', sound: 'a' }, { viseme: 'E', sound: 'o' },
  { viseme: 'F', sound: 'ou' }, { viseme: 'G', sound: 'f v' }, { viseme: 'H', sound: 'l' },
];

const Label = ({ children }: { children: ReactNode }) => (
  <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 20, letterSpacing: '0.24em', textTransform: 'uppercase', color: BRAND.textSub }}>{children}</div>
);

export default function MascotSheet() {
  return (
    <AbsoluteFill style={{ background: BRAND.bg, padding: '90px 60px', color: BRAND.text }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: '0.22em' }}>{BRAND_NAME}</div>
      <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 20, letterSpacing: '0.3em', color: BRAND.textSub }}>LA MASCOTTE · PLANCHE 01</div>

      <div style={{ marginTop: 50, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 40, columnGap: 20 }}>
        {POSES.map(pose => (
          <div key={pose.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Donkey {...pose.props} style={{ width: 270, overflow: 'hidden' }} />
            <Label>{pose.label}</Label>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between' }}>
        {MOUTH_ROW.map(({ viseme, sound }) => (
          <div key={viseme} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Donkey face={FACES.neutral} mouth={viseme} viewBox="176 362 248 180" headOnly style={{ width: 100, overflow: 'hidden' }} />
            <Label>{viseme}</Label>
            <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 16, color: BRAND.textGhost }}>{sound}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 60, display: 'flex', alignItems: 'flex-end', gap: 44 }}>
        {[240, 128, 64, 32].map(size => (
          <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: size, height: size, borderRadius: '50%', background: BRAND.text, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <Donkey headOnly style={{ width: size * 0.92, marginTop: size * 0.04 }} />
            </div>
            <Label>{size} px</Label>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
