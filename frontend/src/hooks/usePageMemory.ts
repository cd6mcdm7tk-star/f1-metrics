import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Each page keeps its whole selection in its query string, so remembering
// a page's last URL (for this tab) is enough for switching Telemetry ↔
// Statistics to come back to what was on screen instead of the defaults.
const storageKey = (path: string) => `lastUrl:${path}`;

export function useRememberPageUrl() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(pathname), search); } catch { /* storage unavailable */ }
  }, [pathname, search]);
}

export function rememberedUrl(path: string): string {
  try { return path + (sessionStorage.getItem(storageKey(path)) ?? ''); } catch { return path; }
}
