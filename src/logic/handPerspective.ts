import { CARD_RAISE_MS, CARD_RELEASE_MS } from '../data/battleTiming';
import type { RaisedHand } from '../data/battleRaisedHands';

export const HAND_PERSPECTIVE_PEAK = 1.6;
export const HAND_RETRACT_MS = 80;
export interface HandWarp {
  center: { x: number; y: number };
  axis: { x: number; y: number };
  along: number;
  across: number;
}

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** The same round clock as the four drawn poses; release rapidly retracts the hand. */
export function handPerspectiveScale(elapsed: number): number {
  if (elapsed < CARD_RAISE_MS || elapsed >= CARD_RELEASE_MS + HAND_RETRACT_MS) return 1;
  const amount = elapsed < CARD_RELEASE_MS
    ? smooth((elapsed - CARD_RAISE_MS) / (CARD_RELEASE_MS - CARD_RAISE_MS))
    : 1 - smooth((elapsed - CARD_RELEASE_MS) / HAND_RETRACT_MS);
  return 1 + (HAND_PERSPECTIVE_PEAK - 1) * amount;
}

/** Pixel-space ellipse contains the palm/distal forearm, never the shoulder or feet. */
export function handWarpRegion(hand: RaisedHand, phase: 'raise' | 'release' = 'raise'): HandWarp {
  const dx = (hand.palm.x - hand.elbow.x) * 192;
  const dy = (hand.palm.y - hand.elbow.y) * 256;
  const length = Math.max(1, Math.hypot(dx, dy));
  return {
    center: { x: hand.palm.x * 192, y: hand.palm.y * 256 },
    axis: { x: dx / length, y: dy / length },
    along: phase === 'release' ? 16 : Math.min(43, length * 1.15 + 7),
    across: phase === 'release' ? 12 : Math.min(20, Math.max(16, length * .42 + 6)),
  };
}

/** Reference inverse sampler used by the shader. One source pixel, never a hand overlay. */
export function handWarpSample(point: { x: number; y: number }, region: HandWarp, scale: number) {
  const dx = point.x - region.center.x, dy = point.y - region.center.y;
  const along = (dx * region.axis.x + dy * region.axis.y) / region.along;
  const across = (-dx * region.axis.y + dy * region.axis.x) / region.across;
  const distance = Math.hypot(along, across);
  if (distance >= 1 || scale <= 1) return { ...point };
  const weight = 1 - smooth((distance - .55) / .45);
  const magnification = 1 + (scale - 1) * weight;
  return { x: region.center.x + dx / magnification, y: region.center.y + dy / magnification };
}
