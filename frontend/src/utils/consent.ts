// Cookie banner choice (CookieConsent), read before loading analytics (GoogleAnalytics)
export const CONSENT_KEY = 'cookie-consent';
export const CONSENT_EVENT = 'cookie-consent-changed';

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}
