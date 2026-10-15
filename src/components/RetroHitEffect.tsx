import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BattleSpeed } from '../types';
import { battleTimeMs, normalizeBattleSpeed } from '../logic/battleSpeed';

interface Props {
  amount?: number; eventKey?: number; speed?: BattleSpeed; reduced?: boolean;
}

/** Settled damage only; each real hit owns its own motion preference latch. */
export default function RetroHitEffect(props: Props) {
  if (!props.amount) return null;
  return <HitEvent key={props.eventKey ?? 'legacy'} {...props} />;
}

function HitEvent({ amount, eventKey, speed = 1, reduced = false }: Props) {
  const hitRef = useRef<HTMLSpanElement>(null);
  const hitSpeed = normalizeBattleSpeed(speed);
  const [motionStopped, setMotionStopped] = useState(() => reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduced && !motionStopped) setMotionStopped(true);
  useEffect(() => {
    const avatar = hitRef.current?.parentElement;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!amount || motionStopped || preference.matches || !avatar) return;
    // The independent translate property leaves avatar positioning/transforms intact.
    const shake = avatar.animate([
      { translate: '0px' }, { translate: '-5px', offset: .25 },
      { translate: '5px', offset: .75 }, { translate: '0px' },
    ], { duration: battleTimeMs(500, hitSpeed), easing: 'ease-in-out' });
    const stop = (event: MediaQueryListEvent) => {
      if (event.matches) { shake.cancel(); setMotionStopped(true); }
    };
    preference.addEventListener('change', stop);
    return () => { shake.cancel(); preference.removeEventListener('change', stop); };
  }, [amount, eventKey, hitSpeed, motionStopped]);
  if (!amount) return null;
  return <span key={eventKey} ref={hitRef} className="retro-hit-effect" data-hit-key={eventKey}
    data-battle-speed={hitSpeed} data-reduced-motion={motionStopped} aria-hidden="true" style={{
      '--retro-hit-flash-duration': `${battleTimeMs(2000, hitSpeed)}ms`,
      '--retro-hit-ring-duration': `${battleTimeMs(400, hitSpeed)}ms`,
      '--retro-hit-number-duration': `${battleTimeMs(800, hitSpeed)}ms`,
    } as CSSProperties}>
    <span className="retro-hit-flash" /><span className="retro-hit-ring" />
    <span className="retro-hit-number">−{amount}</span>
  </span>;
}
