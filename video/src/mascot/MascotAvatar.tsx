import { AbsoluteFill } from 'remotion';
import { BRAND } from '../theme';
import Donkey from './Donkey';
import { FACES } from './face';

// The social networks' profile picture: the mascot's head and shoulders,
// framed to survive the round crop every network applies.

export const AVATAR_SIZE = 1080;
/** Head and collar, the ear tips inside the circle; the shirt's print would be cut off */
const BUST = '-80 -100 760 760';

export default function MascotAvatar() {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #7a1822 0%, ${BRAND.bg} 45%, #3d0a10 100%)` }}>
      <Donkey face={FACES.pleased} print={false} viewBox={BUST} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
}
