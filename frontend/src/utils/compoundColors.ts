// Tire compound colors — tuned for the cream `.data-zone` background
// (#ede5d5). The conventional F1 broadcast colors (bright red/yellow/white/
// green/blue) assume a dark backdrop; on this light background several of
// them measured under 1.4:1 contrast (near-invisible) before this pass.
//
// `medium` and `hard` stay at their true brand colors (yellow / white) for
// dot fills, since every dot-fill usage in the app draws a border around
// them (either the driver's own color, for the interactive chart dot, or a
// neutral `--border-hi` ring added specifically so these two aren't
// invisible against the near-white bg). Anywhere the color is needed to be
// self-legible with no border to lean on — the S/M/H/I/W letter text — use
// `compoundTextColor()` instead, which substitutes a darker, standalone-
// legible shade for exactly those two compounds.
export const COMPOUND_COLOR: Record<string, string> = {
  soft: '#ce0000', medium: '#f1c40f', hard: '#ffffff',
  intermediate: '#007700', wet: '#0060ce',
  c1: '#ffffff', c2: '#ffffff', c3: '#f1c40f', c4: '#f1c40f', c5: '#ce0000', c6: '#ce0000',
};

// Standalone-legible substitutes for the two compounds whose true color
// (yellow, white) can't clear WCAG text contrast on this background even
// with generous tuning — used only where there's no border to carry them.
const TEXT_OVERRIDE: Record<string, string> = {
  medium: '#9d6200', hard: '#6c625d',
  c3: '#9d6200', c4: '#9d6200', c1: '#6c625d', c2: '#6c625d',
};

export const NO_COMPOUND_COLOR = '#3a3a52';

function matchKey(c: string | null | undefined): string | null {
  if (!c || c === 'None') return null;
  const k = c.toLowerCase();
  for (const key of Object.keys(COMPOUND_COLOR)) if (k.includes(key)) return key;
  return null;
}

export function compoundColor(c: string | null | undefined): string {
  const key = matchKey(c);
  return key ? COMPOUND_COLOR[key] : '';
}

export function compoundTextColor(c: string | null | undefined): string {
  const key = matchKey(c);
  if (!key) return '';
  return TEXT_OVERRIDE[key] ?? COMPOUND_COLOR[key];
}

export function compoundLetter(c: string | null | undefined): string {
  if (!c || c === 'None') return '·';
  const k = c.toLowerCase();
  if (k.includes('soft'))   return 'S';
  if (k.includes('medium')) return 'M';
  if (k.includes('hard'))   return 'H';
  if (k.includes('inter'))  return 'I';
  if (k.includes('wet'))    return 'W';
  return c.charAt(0).toUpperCase();
}
