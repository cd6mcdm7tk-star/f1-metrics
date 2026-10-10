// Chosen from the Vite build mode only: `vite preview` (and the prerender
// step) serve a production build on localhost, so the hostname can't tell.
const BACKEND_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || 'http://localhost:8000'
  : import.meta.env.VITE_API_URL_EU || 'https://metrikdelta-backend-eu-production.up.railway.app';

// Backend base with exactly one trailing /api — VITE_API_URL_EU is set
// without it on Vercel but with it in the local .env.production.
export function getApiBase(): string {
  const trimmed = BACKEND_URL.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
