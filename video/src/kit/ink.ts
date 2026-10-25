// The new series' palette: the site's dark theme (frontend/src/index.css),
// plus the few colours a scene needs to say brake, throttle and gain.
import { BRAND } from '../theme';

export const INK = {
  /** The site's background, surface and panel */
  bg: '#3d0c10',
  surface: '#4d1016',
  panel: '#57121c',
  deep: '#24060a',
  text: BRAND.text,
  textSub: BRAND.textSub,
  textGhost: BRAND.textGhost,
  grid: 'rgba(242,230,216,0.10)',
  /** A faint light band, so the road reads on every shade of the backdrop */
  asphalt: 'rgba(242,230,216,0.07)',
  edge: 'rgba(242,230,216,0.55)',
  brake: '#ff5b4a',
  throttle: '#f2e6d8',
};

/** Text that reads on a background of `color`: the dark ink on light team colours */
export function inkOn(color: string): string {
  const hex = color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? INK.bg : INK.text;
}
