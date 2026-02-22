/**
 * METRIK DELTA - Frontend Config
 * Auto-détecte local/production pour l'URL backend
 */

// Détection environnement
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

// URLs Backend
const BACKEND_URLS = {
  development: {
    eu: 'http://localhost:8000',
    usa: 'http://localhost:8000', // Même en local pour simplifier
  },
  production: {
    eu: 'https://metrikdelta-backend-eu-production.up.railway.app',
    usa: 'https://metrikdelta-backend-eu-production.up.railway.app', // Tu peux ajouter USA plus tard
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

// Log en développement
if (isDevelopment) {
  console.log('🔧 METRIK DELTA - Development Mode');
  console.log('📡 Backend URL:', config.backend.baseUrl);
} else {
  console.log('🚀 METRIK DELTA - Production Mode');
  console.log('📡 Backend URL:', config.backend.baseUrl);
}