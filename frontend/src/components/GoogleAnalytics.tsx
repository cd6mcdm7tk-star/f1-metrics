import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_MEASUREMENT_ID = 'G-BE39LEWZ5Q';

export default function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // 🔥 Installer le script Google Analytics (une seule fois)
    if (!window.gtag) {
      // Script gtag.js
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script1);

      // Script d'initialisation
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
  }, []);

  // 🔥 Tracker les changements de page (SPA)
  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null; // Pas de rendu visuel
}

// 🔥 Helper pour tracker des events custom
export const trackEvent = (eventName: string, eventParams?: any) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// 🔥 Extend Window interface pour TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}