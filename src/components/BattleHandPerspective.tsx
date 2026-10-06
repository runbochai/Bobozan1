import { useEffect, useRef, type RefObject } from 'react';
import { BATTLE_CHARACTERS } from '../data/battleCharacters';
import { battleRaisedHand } from '../data/battleRaisedHands';
import { battleReleaseHand } from '../data/battleActions';
import { CARD_RELEASE_MS } from '../data/battleTiming';
import { BATTLE_DIRECTIONS } from '../logic/battleLayout';
import { HAND_RETRACT_MS, handPerspectiveScale, handWarpRegion } from '../logic/handPerspective';
import { acquireHandPerspective } from './handPerspectiveRenderer';

/** A single inverse-warped texture replaces the original; it never overlays a second hand. */
export default function BattleHandPerspective({ source, directionIndex, frame, startedAt, image, handPerspective }: {
  source: string; directionIndex: number; frame: number; startedAt: number;
  image: RefObject<HTMLImageElement | null>;
  handPerspective: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const failed = useRef(false);
  useEffect(() => {
    const target = canvas.current;
    if (!handPerspective || !target || failed.current || (frame !== 1 && frame !== 2)) return;
    const context = target.getContext('2d');
    if (!context) return;
    const direction = BATTLE_DIRECTIONS[directionIndex];
    const idle = source.replace('characters/actions/', 'characters/');
    const avatar = Object.entries(BATTLE_CHARACTERS).find(([, value]) => value === idle)?.[0];
    const raised = battleRaisedHand(avatar, direction);
    const released = battleReleaseHand(avatar, direction);
    const hand = frame === 1 ? raised : {
      palm: released,
      elbow: { x: released.x + (released.x < .5 ? .08 : -.08), y: released.y - .06 },
    };
    const region = handWarpRegion(hand, frame === 1 ? 'raise' : 'release');
    let handle = 0;
    let ended = false;
    let renderer: ReturnType<typeof acquireHandPerspective> = null;
    const stop = () => {
      ended = true;
      cancelAnimationFrame(handle);
      target.dataset.perspectiveReady = 'false';
      renderer?.release(); renderer = null;
    };
    const fail = () => { failed.current = true; stop(); };
    const draw = () => {
      if (ended) return;
      const elapsed = performance.now() - startedAt;
      const expectedFrame = elapsed < CARD_RELEASE_MS ? 1 : 2;
      if (elapsed >= CARD_RELEASE_MS + HAND_RETRACT_MS
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || target.closest('.reduce-motion, .battle-sprite-reduced')) { stop(); return; }
      if (expectedFrame === frame && image.current?.complete && image.current.naturalWidth > 0) {
        renderer ??= acquireHandPerspective(fail);
        const scale = handPerspectiveScale(elapsed);
        if (!renderer?.draw(image.current, directionIndex, frame, region, scale, context)) { fail(); return; }
        target.dataset.perspectiveReady = 'true';
        target.dataset.perspectiveScale = scale.toFixed(4);
      }
      handle = requestAnimationFrame(draw);
    };
    draw();
    return stop;
  }, [source, directionIndex, frame, startedAt, image, handPerspective]);
  if (!handPerspective) return null;
  return <canvas ref={canvas} className="battle-action-perspective" width={192} height={256}
    data-action-frame={frame} data-perspective-ready="false" aria-hidden="true" />;
}
