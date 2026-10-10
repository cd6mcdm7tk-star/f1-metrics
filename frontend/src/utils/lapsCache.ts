// localStorage cache for each driver's lap list, with an expiry per entry.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // ms
}

const DEFAULT_TTL = 60 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch (error) {
    console.error(`Cache read failed for ${key}:`, error);
    return null;
  }
}

export function setCached<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  const value = JSON.stringify({ data, timestamp: Date.now(), ttl } satisfies CacheEntry<T>);
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'QuotaExceededError')) {
      console.error(`Cache write failed for ${key}:`, error);
      return;
    }
    // Storage full: drop every cached entry (including older telemetry ones), then try once more
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('telemetry_') || k.startsWith('session_laps_'))) localStorage.removeItem(k);
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // Too large even then: not cached
    }
  }
}

export const getSessionLapsKey = (year: number, gp: number, session: string, driver: string): string =>
  `session_laps_${year}_${gp}_${session}_${driver}`;
