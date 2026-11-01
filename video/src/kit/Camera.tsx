import { createContext, useContext, type ReactNode } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { framingAt, reframes, STILL, type Framing, type Scenes } from './framing';

const FramingContext = createContext<Framing>(STILL);

/** How the camera frames the scene now: still outside a Camera */
export const useFraming = (): Framing => useContext(FramingContext);

/** Moves the camera over a timeline's scenes, for the Stages inside (kit/framing.ts) */
export default function Camera({ timeline, children }: { timeline: Scenes; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <FramingContext.Provider value={framingAt(reframes(timeline, frame), frame, fps)}>{children}</FramingContext.Provider>;
}
