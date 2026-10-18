// The video's script, from the analysis: which corners to stop at, what to
// say and point at there, and when, in frames at 60 fps.
import { fit, type Rect } from '../camera';
import { CARD_FOCUS } from '../format';
import { formatGap, formatLapTime, placeList, sessionName, STRINGS, type Lang } from '../i18n';
import { CHARTS, DRIVERS, PAGE, TRACK, type RowName } from '../site/geometry';
import { spokenGap, spokenLapTime, spokenPlaces, toVoiceLine, VOICE, type Narration, type Voiceover, type VoiceLine } from '../voice';
import type { Analysis, Finding, Side } from './analysis';
import { distanceAt, type Duel } from './data';
import { BEAT, PageTimeline, rowsRect, type PageStory } from './page';

/** A stop on the lap */
export interface Moment {
  /** "T1", or "straight" */
  label: string;
  /** Where the gap is measured (m) */
  from: number;
  to: number;
  /** The stretch the charts zoom onto (m) */
  window: [number, number];
  gapChange: number;
  /** Who gains there */
  winner: Side;
  findings: Finding[];
}

/** Something drawn on the charts, from frame `cue`: when the voice mentions it */
export type Mark = { cue?: number } & (
  | { kind: 'finding'; finding: Finding }
  | { kind: 'gap'; from: number; to: number; side: Side; gap: string }
  | { kind: 'topSpeed'; at: [number, number]; speeds: [number, number] }
);

export interface Beat {
  from: number;
  to: number;
  kicker: string;
  title: string;
  detail?: string;
  /** What the voiceover says meanwhile */
  voice: string;
  marks: Mark[];
  /** The zoomed stretch the marks sit on, or none for the whole lap */
  window: [number, number] | null;
}

export interface Zoom {
  window: [number, number];
  /** The corner, for the track map */
  label: string;
  apexAt: number;
  /** Zooming in from `from`, in until `in`, out from `out`, gone at `to` */
  from: number;
  in: number;
  out: number;
  to: number;
}

export interface Story extends PageStory {
  frames: number;
  moments: Moment[];
  hookExit: number;
  /** Where the closing line starts */
  outro: number;
  /** Stretches the mascot says to camera, cutting away from the page: the
   * hook, then the verdict and the closing line */
  mascot: { from: number; to: number }[];
  /** The voiceover, timed to the beats; the first line is the hook's */
  voice: VoiceLine[];
}

const HOOK_EXIT = 150;
const OUTRO = 200;
/** Past this, the least telling corners are left out */
const MAX_FRAMES = 6000;
const MIN_MOMENTS = 3;
const MIN_MOMENT_GAP = 0.015;
const MAX_MOMENTS = 6;
const MAX_FINDINGS = 4;
/** A finding strong enough to tell even for the driver who loses the corner */
const STRONG = 2;

/** Corners where the winner's gain shows on the charts, corners where each
 * driver has an edge that cancels out, and straights won on speed */
export function pickMoments(analysis: Analysis, lapLength: number, max = MAX_MOMENTS, only?: string[]): Moment[] {
  const decisive: Moment[] = [], tradeOffs: Moment[] = [];
  for (const section of analysis.sections) {
    for (const corner of section.corners) {
      const winner: Side = corner.gapChange > 0 ? 0 : 1;
      // The whole-corner speed only when nothing more precise explains the gain
      const precise = corner.findings.filter(f => f.kind !== 'cornerSpeed');
      const explains = precise.some(f => 'side' in f && f.side === winner);
      const own = explains ? precise : corner.findings;
      const sided = own.filter(f => 'side' in f);
      const forWinner = sided.filter(f => f.side === winner);
      const strong = (side: Side) => sided.some(f => f.side === side && f.score >= STRONG);
      const isDecisive = Math.abs(corner.gapChange) >= MIN_MOMENT_GAP && forWinner.length > 0;
      if (!isDecisive && !(strong(0) && strong(1))) continue;
      // The winner's edges, the loser's strong ones, and the gear if it differs
      const findings = own.filter(f => !('side' in f) || f.side === winner || f.score >= STRONG);
      // Braking to back on full throttle, with room either side
      const p = corner.phases;
      const starts = [p[0].slowAt, p[1].slowAt].filter((d): d is number => d != null);
      const ends = [p[0].fullThrottleAt, p[1].fullThrottleAt, p[0].lift?.to, p[1].lift?.to].filter((d): d is number => d != null);
      let a = Math.max(corner.from, (starts.length ? Math.min(...starts) : corner.apexAt - 150) - 100);
      let b = Math.min(corner.to, Math.max(corner.apexAt + 150, ...ends) + 100);
      if (b - a < 350) [a, b] = [Math.max(0, (a + b) / 2 - 175), Math.min(lapLength, (a + b) / 2 + 175)];
      (isDecisive ? decisive : tradeOffs).push({ label: corner.label, from: corner.from, to: corner.to, window: [a, b], gapChange: corner.gapChange, winner, findings });
    }
    const straight = section.straight;
    const winner: Side = section.gapChange > 0 ? 0 : 1;
    const explained = decisive.some(m => m.from >= section.from && m.to <= section.to);
    // Only when the speed deficit accounts for most of the time
    if (straight && straight.side === winner && Math.abs(section.gapChange) >= 2 * MIN_MOMENT_GAP && straight.time >= Math.abs(section.gapChange) / 2 && !explained) {
      decisive.push({
        label: 'straight', from: section.from, to: section.to,
        window: [Math.max(0, straight.from - 60), Math.min(lapLength, straight.to + 60)],
        gapChange: section.gapChange, winner, findings: [straight],
      });
    }
  }

  // A script picks its own corners, each once: its straight is the one where the most time went
  if (only) {
    const all = [...decisive, ...tradeOffs].sort((x, y) => Math.abs(y.gapChange) - Math.abs(x.gapChange));
    return only.map(label => all.find(m => m.label === label)).filter((m): m is Moment => m !== undefined).sort((x, y) => x.from - y.from);
  }

  // The biggest gains, each driver's best first so both sides of the story
  // show, then the corners where their strengths cancel out
  const bySize = [...decisive].sort((x, y) => Math.abs(y.gapChange) - Math.abs(x.gapChange));
  const picked = new Set<Moment>();
  for (const side of [0, 1] as Side[]) {
    const best = bySize.find(m => m.winner === side);
    if (best) picked.add(best);
  }
  const strength = (m: Moment) => Math.min(...([0, 1] as Side[]).map(side => Math.max(0, ...m.findings.filter(f => 'side' in f && f.side === side).map(f => f.score))));
  for (const m of [...bySize, ...tradeOffs.sort((x, y) => strength(y) - strength(x))]) if (picked.size < max) picked.add(m);
  return [...picked].sort((x, y) => x.from - y.from);
}

const names = (duel: Duel) => duel.drivers.map(d => d.name) as [string, string];

// Through a corner, in the order things happen
const PHASE_ORDER: Finding['kind'][] = ['braking', 'liftOnly', 'entrySpeed', 'cornerSpeed', 'apexSpeed', 'gear', 'lift', 'throttle', 'exitSpeed', 'straightSpeed'];

export interface Telling {
  title: string;
  detail?: string;
  voice: string;
  marks: Mark[];
  rows: RowName[];
}

/** What a moment's beats say and draw, through the corner in order; an edge
 * of the other driver comes with a "but" */
export function momentBeats(m: Moment, duel: Duel, lang: Lang): Telling[] {
  const s = STRINGS[lang];
  const say = VOICE[lang];
  const n = names(duel);
  const findings = [...m.findings].sort((a, b) => PHASE_ORDER.indexOf(a.kind) - PHASE_ORDER.indexOf(b.kind));
  const used = new Set<Finding>();
  const take = <K extends Finding['kind']>(kind: K, side?: Side) => {
    const f = findings.find((x): x is Extract<Finding, { kind: K }> => x.kind === kind && !used.has(x) && (side === undefined || !('side' in x) || x.side === side));
    if (f) used.add(f);
    return f;
  };
  const marks = (...list: (Finding | undefined)[]): Mark[] => list.filter((f): f is Finding => !!f).map(finding => ({ kind: 'finding', finding }));
  const told: (Telling & { side: Side | null; score: number })[] = [];

  for (const f of findings) {
    if (used.has(f)) continue;
    used.add(f);
    let t: Telling;
    switch (f.kind) {
      case 'braking': {
        const entry = take('entrySpeed', f.side);
        t = {
          title: (f.pedal === 'brake' ? s.braking : s.lifting)(n[f.side], f.by), detail: entry ? s.entryDetail(entry.by) : undefined,
          voice: f.pedal === 'brake' ? say.braking(n[f.side], f.by, entry?.by) : say.lifting(n[f.side], f.by),
          marks: marks(f, entry), rows: ['speed', 'brake'],
        };
        break;
      }
      case 'liftOnly':
        t = { title: s.liftOnly(n[f.side], n[1 - f.side]), voice: say.liftOnly(n[f.side], n[1 - f.side]), marks: marks(f), rows: ['speed', 'brake'] };
        break;
      case 'entrySpeed':
        t = { title: s.entrySpeed(n[f.side], f.by), voice: say.entrySpeed(n[f.side], f.by), marks: marks(f), rows: ['speed', 'brake'] };
        break;
      case 'apexSpeed': {
        const gear = take('gear');
        const [a, b] = f.side === 0 ? f.speeds : [f.speeds[1], f.speeds[0]];
        const detail = gear ? s.gear(n[f.side], gear.gears[f.side], n[1 - f.side], gear.gears[1 - f.side]) : s.speeds(a, b);
        const gearStep = gear ? gear.gears[f.side] - gear.gears[1 - f.side] : 0;
        const relative = gearStep === 1 ? 'higher' : gearStep === -1 ? 'lower' : null;
        t = { title: s.apexSpeed(n[f.side], f.by), detail, voice: say.apexSpeed(n[f.side], f.by, relative), marks: marks(f, gear), rows: gear ? ['speed', 'gear'] : ['speed', 'throttle'] };
        break;
      }
      case 'gear':
        t = { title: s.gear(n[0], f.gears[0], n[1], f.gears[1]), voice: say.gear(n[0], f.gears[0], n[1], f.gears[1]), marks: marks(f), rows: ['speed', 'gear'] };
        break;
      case 'lift': {
        const lifter = (1 - f.side) as Side;
        t = { title: s.lift(n[lifter]), detail: s.liftDetail(f.speedGain[lifter], n[f.side], f.speedGain[f.side]), voice: say.lift(n[lifter]), marks: marks(f), rows: ['speed', 'throttle'] };
        break;
      }
      case 'throttle': {
        const exit = take('exitSpeed', f.side);
        t = {
          title: s.throttle(n[f.side], f.by), detail: exit ? s.exitDetail(exit.by) : undefined,
          voice: say.throttle(n[f.side], f.by, exit?.by), marks: marks(f, exit), rows: ['speed', 'throttle'],
        };
        break;
      }
      case 'exitSpeed':
        t = { title: s.exitSpeed(n[f.side], f.by), voice: say.exitSpeed(n[f.side], f.by), marks: marks(f), rows: ['speed', 'throttle'] };
        break;
      case 'cornerSpeed':
        t = { title: s.cornerSpeed(n[f.side], f.by), voice: say.cornerSpeed(n[f.side], f.by), marks: marks(f), rows: ['speed', 'throttle'] };
        break;
      case 'straightSpeed': {
        const [a, b] = f.side === 0 ? f.topSpeeds : [f.topSpeeds[1], f.topSpeeds[0]];
        t = { title: s.straightSpeed(n[f.side], f.by), detail: s.topSpeeds(a, b), voice: say.straightSpeed(n[f.side], f.by), marks: marks(f), rows: ['speed', 'throttle'] };
        break;
      }
    }
    // A beat telling two findings counts as the stronger
    const merged = t.marks.map(m => (m.kind === 'finding' ? m.finding.score : 0));
    told.push({ ...t, side: 'side' in f ? f.side : null, score: Math.max(f.score, ...merged) });
  }

  // The most telling few, kept in corner order
  const kept = [...told].sort((a, b) => b.score - a.score).slice(0, MAX_FINDINGS);
  const beats = told.filter(t => kept.includes(t));
  // "But" when the other driver's edge first comes in
  const first = beats.find(t => t.side !== null)?.side ?? null;
  let turned = false;
  return beats.map(({ side, score: _, ...t }) => {
    const but = !turned && first !== null && side !== null && side !== first;
    turned ||= but;
    return but ? { ...t, title: s.but(t.title), voice: say.but(t.voice) } : t;
  });
}

/** Share of the lap where each lap is the quicker, counted like the site's track map */
export function dominance(duel: Duel): [number, number] {
  const counts = [0, 0];
  for (const p of duel.telemetry.telemetry) {
    let best = 0;
    for (let i = 1; i < p.speeds.length; i++) if (p.speeds[i] > p.speeds[best]) best = i;
    counts[duel.order.indexOf(best)]++;
  }
  const total = duel.telemetry.telemetry.length;
  return [Math.round((counts[0] / total) * 100), Math.round((counts[1] / total) * 100)];
}

/** The video's script: the written narration's corners, or as many moments
 * as fit in 100 s, at least three. Timed to the recorded voiceover when there
 * is one, else to an estimate of each line's length. */
export function buildStory(duel: Duel, analysis: Analysis, lang: Lang, narration: Narration | null = null, voiceover: Voiceover | null = null): Story {
  if (narration) return compose(duel, analysis, lang, MAX_MOMENTS, narration, voiceover);
  for (let max = MAX_MOMENTS; ; max--) {
    const story = compose(duel, analysis, lang, max, null, voiceover);
    if (story.frames <= MAX_FRAMES || max <= MIN_MOMENTS) return story;
  }
}

function compose(duel: Duel, analysis: Analysis, lang: Lang, maxMoments: number, narration: Narration | null, voiceover: Voiceover | null): Story {
  const s = STRINGS[lang];
  const say = VOICE[lang];
  const n = names(duel);
  const [faster, slower] = duel.drivers;
  const lapLength = duel.distance[duel.distance.length - 1];
  const moments = pickMoments(analysis, lapLength, maxMoments, narration ? Object.keys(narration.moments) : undefined);
  const driversRect: Rect = { x: DRIVERS.x, y: DRIVERS.y, w: 560, h: DRIVERS.h };

  // Lines one after the other, never over each other, each word timed
  const voice: VoiceLine[] = [];
  const speak = (from: number, text: string): VoiceLine | null => {
    if (!text) return null;
    const line = toVoiceLine(text, Math.max(from, (voice.at(-1)?.to ?? 0) + 6), lang, 60, voiceover);
    voice.push(line);
    return line;
  };

  // The mascot says the hook; the video cuts to the page as it ends
  const lapGap = slower.lapTime - faster.lapTime;
  const hookLine = speak(12, narration?.hook ?? say.hook(slower.name, faster.name, spokenGap(lapGap, lang)));
  const hookExit = Math.max(HOOK_EXIT, (hookLine?.to ?? 0) - 20);
  const page = new PageTimeline(duel, lang, speak, hookExit + 20);
  // The page is first seen on the lap times, as the hook cuts to it
  page.hold(0, fit(driversRect, CARD_FOCUS, 'top'));

  // Lap times and sectors, on the page's own panel
  const where = `${duel.location} ${duel.year} · ${sessionName(duel.session, lang)}`;
  page.beat(BEAT, {
    kicker: where, title: s.laps(faster.name, formatLapTime(faster.lapTime, lang), slower.name, formatGap(lapGap, lang)),
    voice: narration?.laps ?? say.laps(sessionName(duel.session, lang), duel.location, duel.year, faster.name, spokenLapTime(faster.lapTime, lang), slower.name, spokenGap(lapGap, lang)),
    marks: [], window: null,
  }, fit(driversRect, CARD_FOCUS, 'top'), 50);
  const sectorWinners = [0, 1, 2].map(k => {
    const [a, b] = [faster.sectors[k], slower.sectors[k]];
    return a == null || b == null ? null : a <= b ? faster.name : slower.name;
  });
  if (sectorWinners.every(w => w)) {
    page.beat(BEAT, {
      kicker: s.sectors, title: s.sectorWinners(sectorWinners as string[]), voice: narration?.sectors ?? say.sectors(sectorWinners as string[], n, lang), marks: [], window: null,
    }, fit(driversRect, CARD_FOCUS, 'top'));
  }

  // Drive to each moment, zoom onto it, tell it
  moments.forEach((m, k) => page.corner(m, momentBeats(m, duel, lang), narration?.moments[m.label], { index: k + 1, total: moments.length }));
  const lastDrive = page.cursor;
  page.drive(lapLength);

  // Summary on the whole lap, its line starting over the end of the lap
  const whole: Rect = { x: 0, y: 0, w: PAGE.width, h: PAGE.height };
  const won = (side: Side) => moments.filter(m => m.winner === side).map(m => m.label);
  const gaps: Mark[] = moments.map(m => ({ kind: 'gap', from: m.from, to: m.to, side: m.winner, gap: formatGap(m.gapChange, lang, 2) }));
  page.beat(BEAT, {
    kicker: s.summary,
    title: won(0).length ? s.winsAt(n[0], placeList(won(0), lang)) : s.ahead(n[0], formatGap(lapGap, lang)),
    detail: won(1).length ? s.clawsAt(n[1], placeList(won(1), lang)) : undefined,
    voice: narration?.summary ?? (won(0).length
      ? say.summary(n[0], spokenPlaces(won(0), lang), n[1], won(1).length ? spokenPlaces(won(1), lang) : null)
      : say.verdict(n[0], spokenGap(lapGap, lang))),
    marks: gaps, window: null,
  }, fit(whole, CARD_FOCUS), 50, undefined, lastDrive + 10);
  const share = dominance(duel);
  const leader: Side = share[0] >= share[1] ? 0 : 1;
  // A script leaves out the beats it has nothing to say over
  if (!narration || narration.dominance) {
    page.beat(BEAT, {
      kicker: s.dominance, title: s.dominanceShare(n[leader], share[leader]), voice: narration?.dominance ?? say.dominance(n[leader], share[leader]), marks: [], window: null,
    }, fit(TRACK, CARD_FOCUS));
  }
  const tops = analysis.topSpeed.map(Math.round) as [number, number];
  const fullThrottle = analysis.fullThrottle.map(f => Math.round(f * 100));
  const topAt = [0, 1].map(side => {
    const lap = duel.order[side];
    const points = duel.telemetry.telemetry;
    return points.reduce((best, p, i) => (p.speeds[lap] > points[best].speeds[lap] ? i : best), 0);
  }).map(i => duel.distance[i]) as [number, number];
  if (!narration || narration.topSpeed) {
    page.beat(BEAT, {
      kicker: s.topSpeed, title: `${n[0]} ${tops[0]} km/h · ${n[1]} ${tops[1]} km/h`,
      detail: fullThrottle[0] !== fullThrottle[1] ? s.fullThrottle(fullThrottle[0], fullThrottle[1]) : undefined,
      voice: narration?.topSpeed ?? say.topSpeed(n[0], tops[0], n[1], tops[1]),
      marks: [{ kind: 'topSpeed', at: topAt, speeds: tops }], window: null,
    }, fit(rowsRect(['speed'], CHARTS.x, CHARTS.w), CARD_FOCUS));
  }
  // The mascot comes back for the verdict and stays to sign off
  const epilogue = narration?.epilogue;
  const closing = page.cursor;
  page.beat(BEAT, epilogue
    ? { kicker: epilogue.kicker, title: epilogue.title, voice: epilogue.voice, marks: [], window: null }
    : { kicker: s.verdict, title: s.ahead(n[0], formatGap(lapGap, lang)), voice: say.verdict(n[0], spokenGap(lapGap, lang)), marks: [], window: null },
  fit(driversRect, CARD_FOCUS, 'top'));

  const cursor = page.cursor;
  const endLine = speak(cursor + 10, narration?.end ?? say.end);
  const endLength = Math.max(OUTRO, (endLine?.to ?? cursor) - cursor + 30);

  return {
    ...page.story(analysis, voice.slice(1)),
    frames: cursor + endLength, moments, hookExit, outro: cursor,
    mascot: [{ from: 0, to: hookExit + 20 }, { from: closing, to: cursor + endLength }], voice,
  };
}

/** The replayed lap's distance at a frame: lap time runs evenly, so the cars slow through the corners */
export function replayDistance(duel: Duel, story: Pick<PageStory, 'drives'>, frame: number): number {
  let time = 0;
  for (const d of story.drives) {
    if (frame < d.from) break;
    time = frame < d.to ? d.startTime + (d.endTime - d.startTime) * ((frame - d.from) / (d.to - d.from)) : d.endTime;
  }
  return distanceAt(duel, time);
}
