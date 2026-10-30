import type { CSSProperties } from 'react';

// Team colours for the cream background: close to each livery, at >=3:1
// contrast. Some pairs are close for colour-blind viewers (Sauber/Audi, Aston
// Martin/Ferrari, Williams/Red Bull), so a colour never appears without the
// driver's code or name. Matched in this order, by substring of the team name.
const TEAM_COLORS: [string, string][] = [
  ['red bull', '#3671C6'],
  ['racing bulls', '#527AFF'],
  ['alphatauri', '#527AFF'],
  ['toro rosso', '#527AFF'],
  ['ferrari', '#E8002D'],
  ['mercedes', '#008E87'],
  ['mclaren', '#EA4E00'],
  ['alpine', '#CE5C91'],
  ['aston martin', '#006A3D'],
  ['haas', '#555555'],
  ['sauber', '#008D00'],
  ['alfa romeo', '#C92D4B'],
  ['williams', '#0088DE'],
  ['cadillac', '#0E49B1'],
  ['audi', '#BB0A30'],
  ['racing point', '#c40086'],
  ['force india', '#c40086'],
  ['renault', '#796600'],
];

const UNKNOWN_TEAM_COLOR = '#555555';

/** WCAG contrast ratio between two #rrggbb colours */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Pure black rather than the site's bordeaux ink: Sauber's green needs it to reach 4.5:1
const DARK_INK = '#000000';
const LIGHT_INK = '#ffffff';

/** Text that reads on a team colour: the site's dark ink or white, whichever contrasts more */
export function inkOn(color: string): string {
  return contrastRatio(color, DARK_INK) >= contrastRatio(color, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

/** A team colour worn as a badge, with readable text on it. On the cream data
 * zone team colours read badly as text (Williams blue: 2.5:1), so there they
 * fill a badge, mark a border or a dot, and the text stays in ink. */
export function teamBadge(color: string): CSSProperties {
  return { background: color, color: inkOn(color), padding: '1px 5px', borderRadius: 'var(--r)', display: 'inline-block', lineHeight: 1.25 };
}

export function teamColor(teamName: string): string {
  const name = teamName.toLowerCase();
  if (name === 'rb' || name.startsWith('rb ')) return '#527AFF';
  return TEAM_COLORS.find(([key]) => name.includes(key))?.[1] ?? UNKNOWN_TEAM_COLOR;
}

// A driver whose teammate is listed before them can't reuse the team colour:
// each team that needs a second colour takes the next of these, in order.
// None is close to a team colour.
const TEAMMATE_COLORS = ['#000000', '#6B2D8E', '#7B4B27', '#B8860B', '#4A5568', '#8B3A62'];

/** Second colours for the drivers in `codes` whose teammate comes before them. */
export function teammateColors(codes: string[], areTeammates: (a: string, b: string) => boolean): Record<string, string> {
  const colors: Record<string, string> = {};
  const byFirstDriver = new Map<string, string>();
  codes.forEach((code, i) => {
    if (codes.indexOf(code) !== i) return; // same driver, another lap
    const first = codes.slice(0, i).find(prev => prev !== code && areTeammates(prev, code));
    if (!first) return;
    let color = byFirstDriver.get(first);
    if (!color) {
      color = TEAMMATE_COLORS[byFirstDriver.size % TEAMMATE_COLORS.length];
      byFirstDriver.set(first, color);
    }
    colors[code] = color;
  });
  return colors;
}
