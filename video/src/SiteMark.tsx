import { SITE_MARK } from './format';
import { BRAND, MONO, SITE } from './theme';

/** The site's address in a corner for the whole video, so a clip shared on its own still says where it comes from */
export default function SiteMark() {
  return (
    <div style={{
      position: 'absolute', right: SITE_MARK.right, top: SITE_MARK.top, zIndex: 90,
      fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', color: BRAND.text, opacity: 0.72, textShadow: '0 1px 6px rgba(0,0,0,0.5)',
    }}>
      {SITE}
    </div>
  );
}
