import path from 'node:path';
import site from '../frontend/tailwind.config.js';

// The site's own config, scanning the site's components the videos render
export default {
  ...site,
  content: [path.resolve('../frontend/src/**/*.{ts,tsx}'), path.resolve('src/**/*.{ts,tsx}')],
};
