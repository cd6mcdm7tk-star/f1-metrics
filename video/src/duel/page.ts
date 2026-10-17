// The site's page told beat by beat: the camera's shots, the marks on the
// charts as the voice names them, the replay driving from corner to corner
// and the corners zoomed onto. The duel tells a whole lap this way, the
// qualifying recap one corner. Frames at 60 fps.
import { clamp, fit, type Camera, type Rect, type Shot } from '../camera';
import { CARD_FOCUS } from '../format';
import { formatGap, STRINGS, type Lang } from '../i18n';
import { CHARTS, distanceX, plotX, ROWS, type RowName } from '../site/geometry';
import { zoomDomain } from '../site/laps';
import { spokenGap, VOICE, type VoiceLine } from '../voice';
import { cueTime } from '../words';
import type { Analysis, Finding } from './analysis';
import { distanceAt, interpolate, type Duel } from './data';
import type { Beat, Mark, Moment, Telling, Zoom } from './story';

/** The shortest a beat lasts when its line is shorter */
export const BEAT = 80;
const RESULT = 70;
const ZOOM_IN = 40;
const ZOOM_OUT = 32;
/** Replay frames per second of lap: fast, the voice is what matters */
const LAP_PACE = 4;
const EXPLAINER = 170;
/** The voice starts this many frames into its beat */
const VOICE_LEAD = 8;

export interface PageStory {
  shots: Shot[];
  beats: Beat[];
  zooms: Zoom[];
  /** Stretches of frames replaying the faster lap from one time to another (s) */
  drives: { from: number; to: number; startTime: number; endTime: number }[];
  /** Each corner told, as the video gets there */
  chapters: { from: number; label: string; index: number; total: number }[];
  /** What a term means, the first time the voice says it */
  explainers: { from: number; to: number; text: string }[];
  /** The gap between the laps along the lap, where it is reliable (s) */
  gap: { distance: number[]; gap: number[] };
}

/** A held shot that slowly pushes in, so nothing is ever quite still */
export const drift = (camera: Camera, from: number, length: number) => (frame: number) =>
  ({ ...camera, scale: camera.scale * (1 + 0.04 * clamp((frame - from) / length, 0, 1)) });
export const still = (camera: Camera) => () => camera;

// What the voice says when it mentions each mark, as the start of a word
const CUES: Record<Finding['kind'] | 'gap' | 'topSpeed', Record<Lang, string[]>> = {
  braking: { fr: ['frein', 'pointill'], en: ['brake', 'braking', 'dotted'] },
  liftOnly: { fr: ['frein', 'leve'], en: ['brake', 'lift'] },
  entrySpeed: { fr: ['entre', 'garde'], en: ['carr', 'way'] },
  apexSpeed: { fr: ['corde'], en: ['apex'] },
  gear: { fr: ['rapport'], en: ['gear'] },
  lift: { fr: ['relache', 'glisse'], en: ['lift', 'slide'] },
  throttle: { fr: ['gaz', 'accelerateur'], en: ['throttle'] },
  exitSpeed: { fr: ['sort'], en: ['exit', 'out'] },
  cornerSpeed: { fr: ['virage'], en: ['corner'] },
  straightSpeed: { fr: ['droite'], en: ['straight'] },
  gap: { fr: ['centieme', 'millieme', 'gagne', 'repris', 'reprend'], en: ['hundredth', 'thousandth', 'gain', 'back'] },
  topSpeed: { fr: ['pointe', 'droite'], en: ['straight', 'top'] },
};

/** The numbers a mark shows, which the voice may say */
function markValues(mark: Mark): number[] {
  if (mark.kind === 'gap') return [];
  if (mark.kind === 'topSpeed') return mark.speeds;
  const f = mark.finding;
  switch (f.kind) {
    case 'gear': return f.gears;
    case 'apexSpeed': return [f.by, ...f.speeds];
    case 'straightSpeed': return [f.by, ...f.topSpeeds];
    case 'liftOnly':
    case 'lift': return [];
    default: return [f.by];
  }
}

/** Where on the zoomed charts a finding sits: a distance and the rows that show it */
function focusOf(f: Finding): [number, RowName[]] {
  switch (f.kind) {
    case 'braking': return [(f.at[0] + f.at[1]) / 2, ['speed', 'brake']];
    case 'liftOnly': return [f.at, ['speed', 'brake']];
    case 'apexSpeed': return [(f.at[0] + f.at[1]) / 2, ['speed']];
    case 'gear': return [(f.at[0] + f.at[1]) / 2, ['throttle', 'gear']];
    case 'throttle': return [(f.at[0] + f.at[1]) / 2, ['speed', 'throttle']];
    default: return [(f.from + f.to) / 2, ['speed', 'throttle']];
  }
}

// Explained the first time the voice uses the word
const GLOSSARY: Record<Lang, { cues: string[]; text: string }[]> = {
  fr: [
    { cues: ['corde'], text: 'La corde : le point le plus lent du virage' },
    { cues: ['pointill'], text: 'En pointillés : là où chaque pilote freine' },
    { cues: ['rapport'], text: 'Le rapport : la vitesse de boîte engagée' },
    { cues: ['glisse'], text: 'Une glisse : les pneus décrochent, le pilote doit lever le pied' },
  ],
  en: [
    { cues: ['apex'], text: 'The apex: the slowest point of the corner' },
    { cues: ['dotted'], text: 'Dotted lines: where each driver starts braking' },
    { cues: ['gear'], text: 'The gear: which ratio is engaged' },
    { cues: ['slide'], text: 'A slide: the tyres let go, the driver has to lift' },
  ],
};
const DELTA_NOTE: Record<Lang, string> = {
  fr: 'En bas, le delta : l’écart entre les deux, mètre par mètre',
  en: 'At the bottom, the delta: the gap between them, metre by metre',
};

/** A moment's lines spread over its beats: one each, the extra ones on the last */
function spread(lines: string[], count: number): string[] {
  if (lines.length <= count) return [...lines, ...Array<string>(count - lines.length).fill('')];
  return [...lines.slice(0, count - 1), lines.slice(count - 1).join(' ')];
}

/** The charts' rows as a page rectangle, the plot's width by default */
export function rowsRect(rows: RowName[], x = CHARTS.x + 30, w = CHARTS.w - 30): Rect {
  const top = Math.min(...rows.map(r => ROWS[r].y)) - 24;
  const bottom = Math.max(...rows.map(r => ROWS[r].y + ROWS[r].h));
  return { x, y: top, w, h: bottom - top };
}

export class PageTimeline {
  readonly beats: Beat[] = [];
  readonly shots: Shot[] = [];
  readonly zooms: Zoom[] = [];
  readonly drives: PageStory['drives'] = [];
  readonly chapters: PageStory['chapters'] = [];
  /** Where the next beat starts */
  cursor: number;
  /** How far the replay has driven (m) */
  private reached = 0;

  constructor(
    private readonly duel: Duel,
    private readonly lang: Lang,
    /** Says a line from a frame, after the one before; null without text */
    private readonly speak: (from: number, text: string) => VoiceLine | null,
    start: number,
  ) {
    this.cursor = start;
  }

  /** The camera held on `camera` from `from` */
  hold(from: number, camera: Camera): void {
    this.shots.push({ from, blend: 1, camera: still(camera) });
  }

  /** A beat from the cursor, as long as its line takes to say; its marks come
   * in as the voice names them, and the camera follows. The line may start
   * earlier, over the drive there; marks wait for the beat. */
  beat(length: number, beat: Omit<Beat, 'from' | 'to'>, camera: Camera, blend = 36, focus?: (mark: Mark) => Rect | null, voiceFrom?: number): VoiceLine | null {
    const from = this.cursor;
    const line = this.speak(voiceFrom ?? from + VOICE_LEAD, beat.voice);
    const to = Math.max(from + length, (line?.to ?? from) + 10);
    const heard = beat.marks.map(mark => {
      const kind = mark.kind === 'finding' ? mark.finding.kind : mark.kind;
      return line && cueTime(line.said, CUES[kind][this.lang], markValues(mark), this.lang);
    });
    // A mark the voice doesn't name comes in with the first one it does
    const first = Math.min(...heard.filter((t): t is number => t != null));
    const marks = beat.marks.map((mark, i) => ({ ...mark, cue: Math.max(from + 12, heard[i] ?? (Number.isFinite(first) ? first : from + 12)) }));
    this.beats.push({ ...beat, marks, from, to });
    this.shots.push({ from, blend, camera: drift(camera, from, to - from) });
    for (const mark of [...marks].sort((a, b) => a.cue - b.cue)) {
      if (mark.cue <= from + 12) continue;
      const rect = focus?.(mark);
      if (rect) this.shots.push({ from: mark.cue, blend: 18, camera: drift(fit(rect, CARD_FOCUS), mark.cue, to - mark.cue) });
    }
    this.cursor = to;
    return line;
  }

  /** The replay driving on to distance `end`, the camera following the cars */
  drive(end: number): void {
    const { duel } = this;
    const lapLength = duel.distance[duel.distance.length - 1];
    const timeAt = (d: number) => interpolate(duel.distance, duel.time[0], d);
    const [startTime, endTime] = [timeAt(this.reached), timeAt(end)];
    const from = this.cursor;
    const length = Math.round(clamp((endTime - startTime) * LAP_PACE, 24, 160));
    this.drives.push({ from, to: from + length, startTime, endTime });
    this.shots.push({
      from, blend: 40,
      camera: frame => {
        const t = startTime + (endTime - startTime) * clamp((frame - from) / length, 0, 1);
        const x = distanceX(distanceAt(duel, t), lapLength);
        const w = 420;
        return fit({ x: clamp(x - w / 2, CHARTS.x, CHARTS.x + CHARTS.w - w), y: ROWS.speed.y - 24, w, h: ROWS.brake.y + ROWS.brake.h - ROWS.speed.y + 24 }, CARD_FOCUS);
      },
    });
    this.cursor += length;
    this.reached = end;
  }

  /** A corner: the replay driving there, the zoom onto it, a beat per telling,
   * then the time gained. `written` are the script's lines for it, or the
   * corner's name, a line per telling and the time gained are said. */
  corner(m: Moment, tellings: Telling[], written: string[] | undefined, chapter: { index: number; total: number }): void {
    const { duel, lang } = this;
    const s = STRINGS[lang];
    const say = VOICE[lang];
    const n = duel.drivers.map(d => d.name);
    // The corner's first line starts as the replay drives there
    const driveFrom = this.cursor;
    this.drive(m.to);
    const zoomFrom = this.cursor;
    const kicker = m.label === 'straight' ? s.straight : s.corner(m.label);
    this.cursor += ZOOM_IN - 10;
    const gap = formatGap(m.gapChange, lang, 2);
    const even = Math.abs(m.gapChange) < 0.005;
    const lines = written
      ? spread(written, tellings.length + 1)
      : [
        ...tellings.map((beat, b) => (b === 0 && m.label !== 'straight' ? say.corner(m.label) + beat.voice : beat.voice)),
        even ? say.even : say.gains(n[m.winner], spokenGap(m.gapChange, lang, 2)),
      ];
    // Where each mark is on the zoomed charts, for the camera to go there
    const domain = zoomDomain(duel, m.window);
    const markFocus = (mark: Mark): Rect | null => {
      if (mark.kind === 'topSpeed') return null;
      const [d, rows]: [number, RowName[]] = mark.kind === 'gap' ? [(domain[0] + domain[1]) / 2, ['delta']] : focusOf(mark.finding);
      const w = 440;
      const x = clamp(plotX(clamp(d, domain[0], domain[1]), domain) - w / 2, CHARTS.x, CHARTS.x + CHARTS.w - w);
      return { ...rowsRect(rows), x, w };
    };
    let opening: number | null = null;
    tellings.forEach((beat, b) => {
      const line = this.beat(
        BEAT, { kicker, title: beat.title, detail: beat.detail, voice: lines[b], marks: beat.marks, window: m.window },
        fit(rowsRect(beat.rows), CARD_FOCUS), 30, markFocus, b === 0 ? driveFrom + 10 : undefined,
      );
      opening ??= line?.from ?? null;
    });
    // The corner's chapter starts as the voice does
    this.chapters.push({ from: opening ?? zoomFrom, label: kicker, ...chapter });
    this.beat(RESULT, {
      kicker, title: even ? s.even : s.gains(n[m.winner], gap), voice: lines[lines.length - 1],
      marks: [{ kind: 'gap', from: Math.max(m.from, m.window[0]), to: Math.min(m.to, m.window[1]), side: m.winner, gap }], window: m.window,
    }, fit(rowsRect(['speed', 'delta']), CARD_FOCUS), 30, markFocus);
    this.zooms.push({ window: m.window, label: m.label, apexAt: (m.window[0] + m.window[1]) / 2, from: zoomFrom, in: zoomFrom + ZOOM_IN, out: this.cursor, to: this.cursor + ZOOM_OUT });
    this.cursor += ZOOM_OUT;
  }

  /** What was told, with the terms its `lines` explain the first time they
   * say them, and the gap along the lap at the corners' edges */
  story(analysis: Analysis, lines: VoiceLine[]): PageStory {
    const { duel, lang } = this;
    const explainers: PageStory['explainers'] = [];
    for (const term of GLOSSARY[lang]) {
      const first = lines.map(line => cueTime(line.said, term.cues)).find((t): t is number => t != null);
      if (first != null) explainers.push({ from: first, to: first + EXPLAINER, text: term.text });
    }
    const firstGap = this.beats.flatMap(b => b.marks).find(m => m.kind === 'gap')?.cue;
    if (firstGap != null) explainers.push({ from: firstGap, to: firstGap + EXPLAINER, text: DELTA_NOTE[lang] });
    // One at a time
    explainers.sort((a, b) => a.from - b.from);
    for (let i = 1; i < explainers.length; i++) explainers[i].from = Math.max(explainers[i].from, explainers[i - 1].to + 20);
    for (const e of explainers) e.to = e.from + EXPLAINER;

    const lapLength = duel.distance[duel.distance.length - 1];
    const edges = [...new Set([0, ...analysis.sections.flatMap(sec => [sec.from, ...sec.corners.flatMap(c => [c.from, c.to]), sec.to]), lapLength])].sort((a, b) => a - b);
    const gap = { distance: edges, gap: edges.map(d => interpolate(duel.distance, duel.time[1], d) - interpolate(duel.distance, duel.time[0], d)) };

    return {
      shots: [...this.shots].sort((a, b) => a.from - b.from), beats: this.beats, zooms: this.zooms, drives: this.drives,
      chapters: this.chapters, explainers, gap,
    };
  }
}
