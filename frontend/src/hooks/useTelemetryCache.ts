// 🔥 HOOK CUSTOM - Cache intelligent sessionStorage pour télémétrie
// Gère automatiquement get/set/clear du cache avec expiration

import { useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live en millisecondes
}

export function useTelemetryCache() {
  // TTL par défaut : 1 heure (les données F1 ne changent pas en session)
  const DEFAULT_TTL = 60 * 60 * 1000;

  /**
   * Récupérer une valeur du cache
   */
  const getCached = useCallback(<T,>(key: string): T | null => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Vérifier expiration
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        // Expiré → supprimer
        sessionStorage.removeItem(key);
        return null;
      }

      console.log(`✅ Cache HIT: ${key}`);
      return entry.data;
    } catch (error) {
      console.error(`❌ Cache read error for ${key}:`, error);
      return null;
    }
  }, []);

  /**
   * Stocker une valeur dans le cache
   */
  const setCached = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      sessionStorage.setItem(key, JSON.stringify(entry));
      console.log(`💾 Cache SET: ${key}`);
    } catch (error) {
      console.error(`❌ Cache write error for ${key}:`, error);
      
      // Si quota dépassé, nettoyer le cache le plus ancien
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ SessionStorage full, clearing oldest entries...');
        clearOldestEntries(5);
        
        // Réessayer
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl
          };
          sessionStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          console.error('❌ Cache write failed after cleanup:', retryError);
        }
      }
    }
  }, [DEFAULT_TTL]);

  /**
   * Supprimer une clé du cache
   */
  const removeCached = useCallback((key: string): void => {
    sessionStorage.removeItem(key);
    console.log(`🗑️ Cache REMOVE: ${key}`);
  }, []);

  /**
   * Nettoyer toutes les entrées expirées
   */
  const clearExpired = useCallback((): void => {
    const now = Date.now();
    let cleaned = 0;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      try {
        const cached = sessionStorage.getItem(key);
        if (!cached) continue;

        const entry: CacheEntry<any> = JSON.parse(cached);
        if (now - entry.timestamp > entry.ttl) {
          sessionStorage.removeItem(key);
          cleaned++;
        }
      } catch (error) {
        // Ignore malformed entries
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }, []);

  /**
   * Nettoyer les N entrées les plus anciennes
   */
  const clearOldestEntries = useCallback((count: number): void => {
    const entries: Array<{ key: string; timestamp: number }> = [];

    // Collecter toutes les entrées avec timestamp
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      try {
        const cached = sessionStorage.getItem(key);
        if (!cached) continue;

        const entry: CacheEntry<any> = JSON.parse(cached);
        entries.push({ key, timestamp: entry.timestamp });
      } catch (error) {
        // Ignore
      }
    }

    // Trier par timestamp (plus ancien en premier)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Supprimer les N plus anciens
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      sessionStorage.removeItem(entries[i].key);
    }

    console.log(`🧹 Removed ${Math.min(count, entries.length)} oldest cache entries`);
  }, []);

  /**
   * Nettoyer tout le cache
   */
  const clearAll = useCallback((): void => {
    sessionStorage.clear();
    console.log('🧹 Cache cleared completely');
  }, []);

  /**
   * Générer une clé de cache pour session-laps
   */
  const getSessionLapsKey = useCallback(
    (year: number, gp: number, session: string, driver: string): string => {
      return `session_laps_${year}_${gp}_${session}_${driver}`;
    },
    []
  );

  /**
   * Générer une clé de cache pour télémétrie
   */
  const getTelemetryKey = useCallback(
    (
      year: number,
      gp: number,
      session: string,
      driver1: string,
      lap1: number | undefined,
      driver2: string,
      lap2: number | undefined
    ): string => {
      const lap1Str = lap1 !== undefined ? `lap${lap1}` : 'fastest';
      const lap2Str = lap2 !== undefined ? `lap${lap2}` : 'fastest';
      return `telemetry_${year}_${gp}_${session}_${driver1}_${lap1Str}_${driver2}_${lap2Str}`;
    },
    []
  );

  return {
    getCached,
    setCached,
    removeCached,
    clearExpired,
    clearAll,
    getSessionLapsKey,
    getTelemetryKey
  };
}