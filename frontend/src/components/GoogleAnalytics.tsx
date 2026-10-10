import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_EVENT, hasAnalyticsConsent } from '../utils/consent';

const GA_MEASUREMENT_ID = 'G-BE39LEWZ5Q';

function loadGtag() {
  if (window.gtag) return;

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
    });
  `;
  document.head.appendChild(script2);
}

// Loaded only once the visitor accepts the cookie banner, straight away
// (no reload needed) thanks to the banner's change event.
export default function GoogleAnalytics() {
  const location = useLocation();
  const [consented, setConsented] = useState(hasAnalyticsConsent());

  useEffect(() => {
    const onConsentChange = () => setConsented(hasAnalyticsConsent());
    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  useEffect(() => {
    if (consented) loadGtag();
  }, [consented]);

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, consented]);

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
