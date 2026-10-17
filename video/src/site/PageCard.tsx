import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { cameraTransform, type Camera } from '../camera';
import { BrandBackground } from '../components';
import { CARD, VIDEO } from '../format';
import { BRAND } from '../theme';

/** The site's page in a card over a blurred copy of itself, as a show sets an
 * archive document. `page` and `backdrop` are laid out on the page, under the
 * camera; `overlay` is drawn on the screen, inside the card. */
export default function PageCard({ cam, page, backdrop, overlay, children }: {
  cam: Camera; page: ReactNode; backdrop: ReactNode; overlay?: ReactNode; children?: ReactNode;
}) {
  const underCamera = (content: ReactNode) => (
    <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: cameraTransform(cam) }}>{content}</div>
  );
  return (
    <BrandBackground>
      <AbsoluteFill style={{ filter: 'blur(40px)', transform: 'scale(1.3)' }}>{underCamera(backdrop)}</AbsoluteFill>
      {/* Tinted with the brand's colour, so the light page blurs to bordeaux */}
      <AbsoluteFill style={{ background: BRAND.bg, opacity: 0.72 }} />
      <div style={{
        position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, overflow: 'hidden',
        borderRadius: 18, boxShadow: '0 30px 90px rgba(10,0,2,0.55)',
      }}>
        <div style={{ position: 'absolute', left: -CARD.x, top: -CARD.y, width: VIDEO.width, height: VIDEO.height }}>
          {underCamera(page)}
          {overlay}
        </div>
      </div>
      {children}
    </BrandBackground>
  );
}
