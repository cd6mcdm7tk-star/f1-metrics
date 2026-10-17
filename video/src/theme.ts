import { loadFont as loadRajdhani } from '@remotion/google-fonts/Rajdhani';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// The brand as the videos sign it: change it here to rename every video
export const BRAND_NAME = 'METRIK DELTA';
export const SITE = 'metrikdelta.com';

// The landing page's palette (frontend/src/pages/LandingPage.tsx), for the
// screens around the site's page
export const BRAND = {
  bg: '#5e1018',
  text: '#f2e6d8',
  textSub: 'rgba(242,230,216,0.62)',
  textGhost: 'rgba(242,230,216,0.28)',
  glow: 'rgba(120,10,20,0.35)',
};

// The weights the site loads (frontend/index.html), so its page renders as it does there
export const DISPLAY = loadRajdhani('normal', { weights: ['300', '400', '500', '600', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;
export const MONO = loadJetBrainsMono('normal', { weights: ['400', '500', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;
