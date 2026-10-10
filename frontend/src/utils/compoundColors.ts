// Tyre compound colours for the cream `.data-zone` background. Medium (yellow)
// and hard (white) stay true to the brand because every dot using them is
// drawn with a border, which keeps them visible on the light background.
const COMPOUND_COLOR: Record<string, string> = {
  soft: '#ce0000', medium: '#f1c40f', hard: '#ffffff',
  intermediate: '#007700', wet: '#0060ce',
  c1: '#ffffff', c2: '#ffffff', c3: '#f1c40f', c4: '#f1c40f', c5: '#ce0000', c6: '#ce0000',
};

export function compoundColor(c: string | null | undefined): string {
  if (!c || c === 'None') return '';
  const k = c.toLowerCase();
  const key = Object.keys(COMPOUND_COLOR).find(name => k.includes(name));
  return key ? COMPOUND_COLOR[key] : '';
}
