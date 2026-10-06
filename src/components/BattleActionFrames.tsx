import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../assets';
import { CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS } from '../data/battleTiming';
import BattleHandPerspective from './BattleHandPerspective';

/** One mounted clock per round. Late images wait until the next round. */
export default function BattleActionFrames({ source, directionIndex, ready, onError, handPerspective = false }: {
  source: string; directionIndex: number; ready: boolean; onError: () => void; handPerspective?: boolean;
}) {
  const [start] = useState(() => ({ at: performance.now(), source, directionIndex, ready, handPerspective }));
  const [frame, setFrame] = useState<number | null>(start.ready ? 0 : null);
  const [stopped, setStopped] = useState(!ready);
  const image = useRef<HTMLImageElement>(null);
  if (!ready && !stopped) setStopped(true);
  useEffect(() => {
    if (!start.ready) return;
    const milestones: [number, number | null][] = [
      [CARD_RAISE_MS, 1], [CARD_RELEASE_MS, 2], [CARD_LAND_MS, 3], [CARD_RECOVER_MS, null],
    ];
    const timers = milestones.map(([at, pose]) => window.setTimeout(
      () => setFrame(pose), Math.max(0, start.at + at - performance.now()),
    ));
    return () => timers.forEach(window.clearTimeout);
  }, [start]);
  // A changed character or seat cannot restart or substitute poses halfway through a deal.
  if (stopped || frame === null || start.source !== source || start.directionIndex !== directionIndex) return null;
  return <span className="battle-action-frame" data-action-frame={frame} aria-hidden="true">
    <img ref={image} src={assetUrl(start.source)} alt="" draggable={false} onError={onError}
      style={{ left: `${-start.directionIndex * 100}%`, top: `${-frame * 100}%` }} />
    <BattleHandPerspective source={start.source} directionIndex={start.directionIndex} frame={frame}
      startedAt={start.at} image={image} handPerspective={start.handPerspective && handPerspective} />
  </span>;
}
