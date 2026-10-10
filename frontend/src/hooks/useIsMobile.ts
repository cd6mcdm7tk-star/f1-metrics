import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

// The whole app is laid out with inline `style={{}}` objects, not CSS
// classes — so plain @media queries can't override any of it (inline
// styles always win the cascade). This hook lets each component branch on
// a JS boolean instead and pick different literal values for the same
// style keys; the `false` branch must always equal what's already there
// today, so desktop is byte-for-byte unchanged.
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
