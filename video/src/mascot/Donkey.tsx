import { useId, type CSSProperties } from 'react';
import { BRAND, DISPLAY, SITE } from '../theme';
import { FACES, MOUTHS, mouthOutline, type Face, type Mouth, type MouthShape } from './face';

// The mascot: a race-engineer donkey, front on, in the site's colours. Drawn
// in parts (ears, lids, brows, mouth) so a face and a mouth shape pose it.

const C = {
  coat: '#8f827c',
  mane: '#2b201f',
  pale: BRAND.text,
  innerEar: '#e3c4bd',
  nostril: '#5a3d3a',
  line: '#2a0b10',
  mouth: '#3a0d14',
  tongue: '#c2505d',
  teeth: '#fffaf2',
  headset: '#232227',
  shirt: '#1f1416',
  accent: BRAND.bg,
};
const LINE = 6;

/** The whole figure, and the head alone for the emblem */
export const FIGURE_BOX = '40 -70 520 810';
export const HEAD_BOX = '100 -70 400 630';

export interface DonkeyProps {
  face?: Face;
  /** Defaults to the face's mouth at rest */
  mouth?: Mouth;
  /** 0 open → 1 shut, over the face's own lids */
  blink?: number;
  /** Where the eyes look, -1 → 1 */
  look?: { x: number; y: number };
  /** A foreleg raised to point, degrees from upright towards the viewer's right */
  point?: number;
  /** The head lowered by this much, as it bobs with the voice */
  nod?: number;
  /** The site's address on the shirt, left off when a title covers it */
  print?: boolean;
  headOnly?: boolean;
  viewBox?: string;
  style?: CSSProperties;
}

export default function Donkey({ face = FACES.neutral, mouth, blink = 0, look = { x: 0, y: 0 }, point, nod = 0, print = true, headOnly = false, viewBox, style }: DonkeyProps) {
  const id = useId().replace(/:/g, '');
  const lid = (side: 0 | 1) => Math.min(1, face.lids[side] + blink * (1 - face.lids[side]));

  return (
    <svg viewBox={viewBox ?? (headOnly ? HEAD_BOX : FIGURE_BOX)} style={{ display: 'block', overflow: 'visible', ...style }}>
      {!headOnly && <Body print={print} />}
      {!headOnly && point != null && <Foreleg angle={point} />}
      <g transform={`translate(0 ${nod}) rotate(${face.tilt} 300 600)`}>
        <Ear x={232} y={196} angle={-face.ears[0]} id={`${id}l`} />
        <Ear x={368} y={196} angle={face.ears[1]} id={`${id}r`} />
        <path
          d="M 300 150 C 354 150 402 170 420 216 C 434 252 432 302 416 342 C 404 374 394 398 390 424 L 210 424 C 206 398 196 374 184 342 C 168 302 166 252 180 216 C 198 170 246 150 300 150 Z"
          fill={C.coat} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round"
        />
        <path
          d="M 262 172 C 260 146 268 126 280 112 C 284 128 290 136 297 138 C 300 120 310 104 326 96 C 321 118 326 134 340 146 C 346 154 344 166 336 174 Z"
          fill={C.mane} stroke={C.line} strokeWidth={4} strokeLinejoin="round"
        />
        <Headset />
        <Brow cx={248} lift={face.browLift[0]} tilt={-face.browTilt[0]} />
        <Brow cx={352} lift={face.browLift[1]} tilt={face.browTilt[1]} />
        <Eye cx={248} cy={268} lid={lid(0)} tilt={-face.lidTilt[0]} lower={face.lower[0]} look={look} id={`${id}el`} />
        <Eye cx={352} cy={268} lid={lid(1)} tilt={face.lidTilt[1]} lower={face.lower[1]} look={look} id={`${id}er`} />
        <ellipse cx={300} cy={452} rx={124} ry={88} fill={C.pale} stroke={C.line} strokeWidth={LINE} />
        <ellipse cx={264} cy={426} rx={14} ry={9} transform="rotate(-28 264 426)" fill={C.nostril} />
        <ellipse cx={336} cy={426} rx={14} ry={9} transform="rotate(28 336 426)" fill={C.nostril} />
        <MouthShapeView shape={MOUTHS[mouth ?? face.rest]} corners={face.corners} id={`${id}m`} />
        <path d="M 182 298 C 166 384 186 446 222 470" fill="none" stroke={C.headset} strokeWidth={8} strokeLinecap="round" />
        <rect x={214} y={461} width={32} height={20} rx={10} fill={C.headset} stroke={C.line} strokeWidth={3} />
      </g>
    </svg>
  );
}

function Ear({ x, y, angle, id }: { x: number; y: number; angle: number; id: string }) {
  const outline = 'M -40 10 C -52 -70 -40 -165 0 -235 C 40 -165 52 -70 40 10 Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <clipPath id={id}><path d={outline} /></clipPath>
      <path d={outline} fill={C.coat} />
      <path d="M -22 0 C -30 -70 -22 -150 0 -200 C 22 -150 30 -70 22 0 Z" fill={C.innerEar} />
      <ellipse cx={0} cy={-240} rx={70} ry={62} fill={C.mane} clipPath={`url(#${id})`} />
      <path d={outline} fill="none" stroke={C.line} strokeWidth={LINE} strokeLinejoin="round" />
    </g>
  );
}

function Headset() {
  return (
    <g>
      <path d="M 186 250 C 180 120 420 120 414 250" fill="none" stroke={C.line} strokeWidth={26} strokeLinecap="round" />
      <path d="M 186 250 C 180 120 420 120 414 250" fill="none" stroke={C.headset} strokeWidth={16} strokeLinecap="round" />
      {[160, 394].map(x => (
        <g key={x}>
          <rect x={x} y={222} width={46} height={78} rx={18} fill={C.headset} stroke={C.line} strokeWidth={LINE} />
          <rect x={x + 12} y={240} width={22} height={42} rx={10} fill={C.accent} />
        </g>
      ))}
    </g>
  );
}

function Brow({ cx, lift, tilt }: { cx: number; lift: number; tilt: number }) {
  return (
    <path
      d="M -24 4 Q 0 -8 24 4"
      transform={`translate(${cx} ${216 - lift * 16}) rotate(${tilt})`}
      fill="none" stroke={C.mane} strokeWidth={10} strokeLinecap="round"
    />
  );
}

function Eye({ cx, cy, lid, tilt, lower, look, id }: {
  cx: number; cy: number; lid: number; tilt: number; lower: number; look: { x: number; y: number }; id: string;
}) {
  const ex = cx + look.x * 9, ey = cy + 2 + look.y * 7;
  const top = ey - 25 + lid * 50;
  const bottom = ey + 25 - lower * 30;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={38} ry={35} fill={C.pale} stroke={C.line} strokeWidth={4} />
      <clipPath id={id}><ellipse cx={ex} cy={ey} rx={22} ry={27} /></clipPath>
      <ellipse cx={ex} cy={ey} rx={18} ry={23} fill={C.line} />
      <circle cx={ex - 6} cy={ey - 9} r={6} fill="#fff" />
      <g clipPath={`url(#${id})`}>
        <g transform={`rotate(${tilt} ${ex} ${top})`}>
          <path d={`M ${ex - 40} ${top - 70} L ${ex + 40} ${top - 70} L ${ex + 40} ${top - 8} Q ${ex} ${top + 10} ${ex - 40} ${top - 8} Z`} fill={C.pale} />
          {lid > 0.04 && <path d={`M ${ex - 40} ${top - 8} Q ${ex} ${top + 10} ${ex + 40} ${top - 8}`} fill="none" stroke={C.line} strokeWidth={5} />}
        </g>
        {lower > 0.04 && (
          <path d={`M ${ex - 30} ${bottom} Q ${ex} ${bottom - 12 * lower} ${ex + 30} ${bottom} L ${ex + 30} ${bottom + 60} L ${ex - 30} ${bottom + 60} Z`} fill={C.pale} stroke={C.line} strokeWidth={4} />
        )}
      </g>
    </g>
  );
}

function MouthShapeView({ shape, corners, id }: { shape: MouthShape; corners: [number, number]; id: string }) {
  const cx = 300, cy = 484;
  const open = mouthOutline(shape, cx, cy);
  if (!open) {
    const half = shape.width / 2, sag = ((corners[0] + corners[1]) / 2) * 14;
    return (
      <path
        d={`M ${cx - half} ${cy - corners[0] * 12} Q ${cx} ${cy + sag} ${cx + half} ${cy - corners[1] * 12}`}
        fill="none" stroke={C.line} strokeWidth={LINE} strokeLinecap="round"
      />
    );
  }
  return (
    <g>
      <clipPath id={id}><path d={open.d} /></clipPath>
      <path d={open.d} fill={C.mouth} />
      <g clipPath={`url(#${id})`}>
        {shape.tongue && <ellipse cx={cx} cy={open.bottom} rx={shape.width * 0.3} ry={shape.height * 0.32} fill={C.tongue} />}
        {shape.teeth !== 'none' && <Teeth cx={cx} y={open.top - 2} />}
        {shape.teeth === 'both' && <Teeth cx={cx} y={open.bottom - 14} />}
      </g>
      <path d={open.d} fill="none" stroke={C.line} strokeWidth={5} strokeLinejoin="round" />
    </g>
  );
}

function Teeth({ cx, y }: { cx: number; y: number }) {
  return (
    <g>
      <rect x={cx - 26} y={y} width={52} height={18} rx={3} fill={C.teeth} />
      <line x1={cx} y1={y} x2={cx} y2={y + 18} stroke={C.line} strokeWidth={2.5} />
    </g>
  );
}

function Body({ print }: { print: boolean }) {
  // The shirt runs on below the frame, for shots that crop the figure lower
  return (
    <g>
      <path d="M 238 470 L 362 470 L 380 616 L 220 616 Z" fill={C.coat} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round" />
      <path
        d="M 66 1240 L 92 760 C 104 652 170 610 236 600 L 300 664 L 364 600 C 430 610 496 652 508 760 L 534 1240 Z"
        fill={C.shirt} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round"
      />
      <path d="M 232 598 L 300 666 L 368 598" fill="none" stroke={C.pale} strokeWidth={10} strokeLinejoin="round" />
      {print && <text x={300} y={722} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={30} letterSpacing="0.06em" fill={C.pale}>{SITE}</text>}
    </g>
  );
}

function Foreleg({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle} 450 650)`}>
      <path d="M 424 650 L 420 500 C 420 486 480 486 480 500 L 476 650 Z" fill={C.coat} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M 416 506 L 414 470 C 414 452 486 452 486 470 L 484 506 C 462 514 438 514 416 506 Z" fill={C.mane} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round" />
      <line x1={450} y1={462} x2={450} y2={510} stroke={C.line} strokeWidth={4} />
      <path d="M 402 690 L 406 616 C 410 586 490 586 494 616 L 498 690 Z" fill={C.shirt} stroke={C.line} strokeWidth={LINE} strokeLinejoin="round" />
    </g>
  );
}
