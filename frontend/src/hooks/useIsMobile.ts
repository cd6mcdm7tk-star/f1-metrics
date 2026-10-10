import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

// Layout is written in inline styles, which @media queries can't override:
// components branch on this instead.
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
