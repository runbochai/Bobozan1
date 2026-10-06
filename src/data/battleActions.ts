import { battleCharacterAtlas } from './battleCharacters';
import type { BattleDirection } from '../logic/battleLayout';

const RELEASE_HAND: Record<BattleDirection, { x: number; y: number }> = {
  s: { x: .18, y: .60 }, sw: { x: .18, y: .56 }, w: { x: .12, y: .56 }, nw: { x: .16, y: .55 },
  n: { x: .83, y: .58 }, ne: { x: .85, y: .56 }, e: { x: .85, y: .56 }, se: { x: .82, y: .60 },
};

const HAND_OVERRIDES: Record<string, Partial<typeof RELEASE_HAND>> = {
  'characters/bdrag.webp': { nw: { x: .18, y: .67 }, n: { x: .79, y: .68 }, ne: { x: .84, y: .64 } },
  'characters/boy.webp': { n: { x: .75, y: .70 } },
  'characters/girl.webp': { s: { x: .57, y: .575 }, n: { x: .725, y: .66 } },
  'characters/ntr.webp': { n: { x: .735, y: .65 } },
  'characters/pegasus-swordsman.webp': { s: { x: .48, y: .68 } },
  'characters/pegasus-boxer.webp': { se: { x: .18, y: .60 } },
  'characters/enemies/shadow_a.webp': { n: { x: .15, y: .60 } },
  'characters/enemies/knight.webp': { n: { x: .15, y: .60 } },
  'characters/enemies/guard_a.webp': { sw: { x: .85, y: .60 }, se: { x: .15, y: .60 } },
  'characters/enemies/guard_b.webp': { n: { x: .15, y: .65 } },
  'characters/enemies/bluffer.webp': { se: { x: .17, y: .60 } },
  'characters/enemies/lord_bozan.webp': { n: { x: .15, y: .60 }, se: { x: .51, y: .515 } },
  'characters/enemies/tower_soul.webp': { n: { x: .15, y: .60 } },
  'characters/enemies/ironwall.webp': { n: { x: .18, y: .60 } },
  'characters/enemies/wolf.webp': { n: { x: .18, y: .61 } },
  'characters/enemies/head_b.webp': { n: { x: .18, y: .59 } },
};

/** Coordinates within the clipped action cell; independent of the idle atlas mirrors. */
export function battleReleaseHand(avatar: string | undefined, direction: BattleDirection) {
  const atlas = battleCharacterAtlas(avatar);
  return (atlas && HAND_OVERRIDES[atlas]?.[direction]) || RELEASE_HAND[direction];
}

/** Each sheet contains eight direction columns and four complete-body poses. */
export function battleActionAtlas(avatar: string | undefined): string | undefined {
  const idle = battleCharacterAtlas(avatar);
  return idle?.replace('characters/', 'characters/actions/');
}
