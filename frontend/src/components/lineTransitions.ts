// Which drivers' lines the lap chart draws, which are drawing in or fading
// out, and their colours. A deselected line stays drawn, where it was and in
// its colour, while it fades; a line draws in when its laps are there to
// draw, not when it's selected.
import { useEffect, useRef, useState } from 'react';
import { teammateColors } from '../utils/teamColors';
import { DRAW_MS } from './lapChart';

/** A deselected line's fade-out (ms) */
export const FADE_MS = 300;
/** A dot's fade-in once its line reaches it (ms) */
export const DOT_MS = 160;

export interface LineTransitions {
  /** Drawn, in a stable order: a line keeps its place until it's gone */
  lines: string[];
  /** Drawing in: their dots show as the line reaches them */
  entering: string[];
  /** Deselected, fading out */
  leaving: string[];
  /** The selection and the lines with laps, as of the last update */
  selected: string[];
  shown: string[];
  /** Bumped on a new session, so earlier timers are dropped */
  generation: number;
}

export function initialLines(selected: string[], shown: string[], generation = 0): LineTransitions {
  return { lines: [...selected], entering: [...shown], leaving: [], selected, shown, generation };
}

/** The lines after the selection or the loaded laps change */
export function nextLines(state: LineTransitions, selected: string[], shown: string[]): LineTransitions {
  const removed = state.selected.filter(d => !selected.includes(d));
  const leaving = [...state.leaving, ...removed.filter(d => !state.leaving.includes(d))].filter(d => !selected.includes(d));
  const kept = state.lines.filter(d => selected.includes(d) || leaving.includes(d));
  const lines = [...kept, ...selected.filter(d => !kept.includes(d))];
  // Back before it faded out: it never left, so it doesn't draw in again
  const fresh = shown.filter(d => !state.shown.includes(d) && !state.leaving.includes(d));
  const entering = [...state.entering.filter(d => !leaving.includes(d)), ...fresh.filter(d => !state.entering.includes(d))];
  return { ...state, lines, entering, leaving, selected, shown };
}

export const settleLeaving = (state: LineTransitions, code: string): LineTransitions =>
  state.leaving.includes(code)
    ? { ...state, leaving: state.leaving.filter(d => d !== code), lines: state.lines.filter(d => d !== code) }
    : state;

export const settleEntering = (state: LineTransitions, code: string): LineTransitions =>
  state.entering.includes(code) ? { ...state, entering: state.entering.filter(d => d !== code) } : state;

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((d, i) => d === b[i]);

/** The lap chart's lines for the selected drivers, `shown` being those whose laps are loaded */
export function useLineTransitions(selected: string[], shown: string[], sessionKey: string): LineTransitions {
  const [state, setState] = useState(() => initialLines(selected, shown));
  const [key, setKey] = useState(sessionKey);

  // Adjusted while rendering, so a deselected line never leaves the chart for a frame
  if (key !== sessionKey) {
    setKey(sessionKey);
    setState(initialLines(selected, shown, state.generation + 1));
  } else if (!sameList(state.selected, selected) || !sameList(state.shown, shown)) {
    setState(nextLines(state, selected, shown));
  }

  // One timer per line drawing in or fading out, kept while it still does
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const running = timers.current;
    const wanted = new Map<string, () => void>([
      ...state.leaving.map(code => [`out:${state.generation}:${code}`, () => setState(s => settleLeaving(s, code))] as const),
      ...state.entering.map(code => [`in:${state.generation}:${code}`, () => setState(s => settleEntering(s, code))] as const),
    ]);
    for (const [id, timer] of running) {
      if (!wanted.has(id)) { clearTimeout(timer); running.delete(id); }
    }
    for (const [id, settle] of wanted) {
      if (running.has(id)) continue;
      const ms = id.startsWith('out:') ? FADE_MS : DRAW_MS + DOT_MS;
      running.set(id, setTimeout(() => { running.delete(id); settle(); }, ms));
    }
  }, [state.leaving, state.entering, state.generation]);
  useEffect(() => {
    const running = timers.current;
    return () => running.forEach(clearTimeout);
  }, []);

  return state;
}

type Colors = Record<string, string | null>;

const sameColors = (a: Colors, b: Colors) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => k in b && a[k] === b[k]);

/** Teammates' second colours over the lines drawn (null: the team's own). A
 * fading line keeps the colour it had when it began to fade (`frozen`), so it
 * never changes as it goes, nor matches the teammate taking the team's back. */
export function lineColors(
  lines: string[], leaving: string[], frozen: Colors, areTeammates: (a: string, b: string) => boolean,
): { colors: Colors; frozen: Colors } {
  const current = teammateColors(lines, areTeammates);
  const kept: Colors = Object.fromEntries(leaving.map(code => [code, code in frozen ? frozen[code] : current[code] ?? null]));
  return { colors: { ...current, ...kept }, frozen: kept };
}

/** lineColors, keeping what the fading lines had from one render to the next */
export function useLineColors(lines: string[], leaving: string[], areTeammates: (a: string, b: string) => boolean): Colors {
  const [frozen, setFrozen] = useState<Colors>({});
  const next = lineColors(lines, leaving, frozen, areTeammates);
  // Adjusted while rendering, like the lines themselves
  if (!sameColors(next.frozen, frozen)) setFrozen(next.frozen);
  return next.colors;
}
