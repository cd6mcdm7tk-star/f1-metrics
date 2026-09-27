/**
 * METRIK DELTA - Frontend Config
 * Auto-détecte local/production pour l'URL backend
 */

// Détection environnement — uniquement basée sur le mode de build Vite.
// Un fallback sur window.location.hostname === 'localhost' cassait la
// prerendering : `vite preview` sert aussi un build de prod sur localhost,
// ce qui ferait pointer un vrai build de prod vers un backend local absent
// (donc absent aussi côté serveur de build Vercel).
const isDevelopment = import.meta.env.DEV;

// URLs Backend — lues depuis les variables d'environnement
const BACKEND_URLS = {
  development: {
    eu: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    usa: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  },
  production: {
    eu: import.meta.env.VITE_API_URL_EU || 'https://metrikdelta-backend-eu-production.up.railway.app',
    usa: import.meta.env.VITE_API_URL_USA || import.meta.env.VITE_API_URL_EU || 'https://metrikdelta-backend-eu-production.up.railway.app',
  },
};

// Sélectionne l'URL selon l'environnement
const currentBackend = isDevelopment
  ? BACKEND_URLS.development
  : BACKEND_URLS.production;

// Export config
export const config = {
  backend: {
    baseUrl: currentBackend.eu,
    euUrl: currentBackend.eu,
    usaUrl: currentBackend.usa,
  },
  isDevelopment,
  isProduction: !isDevelopment,
};

// Helper: Get backend URL (avec région optionnelle)
export function getBackendUrl(region: 'eu' | 'usa' = 'eu'): string {
  return region === 'usa' ? config.backend.usaUrl : config.backend.euUrl;
}

if (isDevelopment) {
  console.log('🔧 Dev — backend:', config.backend.baseUrl);
}