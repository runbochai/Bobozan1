import { useState } from 'react';
import { assetUrl, avatarUrl } from '../assets';
import { battleCharacterAtlas, MIRRORED_BATTLE_VIEWS } from '../data/battleCharacters';
import { battleActionAtlas } from '../data/battleActions';
import { BATTLE_DIRECTIONS, type BattleDirection } from '../logic/battleLayout';
import { User } from './PixelIcons';
import BattleActionFrames from './BattleActionFrames';
import './BattleSprite.css';

export default function BattleSprite({ avatar, name, direction, actionKey, reduced = false, handPerspective = false }: {
  avatar?: string; name: string; direction: BattleDirection; actionKey?: string; reduced?: boolean; handPerspective?: boolean;
}) {
  const atlas = battleCharacterAtlas(avatar);
  const actionAtlas = battleActionAtlas(avatar);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [decodedSources, setDecodedSources] = useState<string[]>([]);
  const fail = (source: string) => setFailedSources(previous => previous.includes(source) ? previous : [...previous, source]);
  const index = BATTLE_DIRECTIONS.indexOf(direction);
  const mirrored = atlas && MIRRORED_BATTLE_VIEWS[atlas]?.includes(direction);
  if (atlas && !failedSources.includes(atlas)) return <span className={`battle-sprite${reduced ? ' battle-sprite-reduced' : ''}`} role="img" aria-label={name} data-direction={direction} data-atlas={atlas}>
    <span className="battle-idle-frame" style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
      <img src={assetUrl(atlas)} alt="" draggable={false} onError={() => fail(atlas)}
      style={{ left: `${-(index % 4) * 100}%`, top: `${-Math.floor(index / 4) * 100}%` }} />
    </span>
    {actionAtlas && !failedSources.includes(actionAtlas) && <>
      <img className="battle-action-preload" src={assetUrl(actionAtlas)} alt="" aria-hidden="true" draggable={false}
        onLoad={event => {
          const img = event.currentTarget;
          const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
          void decoded.then(() => setDecodedSources(previous => previous.includes(actionAtlas) ? previous : [...previous, actionAtlas]), () => fail(actionAtlas));
        }} onError={() => fail(actionAtlas)} />
      {actionKey && <BattleActionFrames key={actionKey} source={actionAtlas} directionIndex={index}
        handPerspective={handPerspective}
        ready={decodedSources.includes(actionAtlas) && !reduced && !window.matchMedia('(prefers-reduced-motion: reduce)').matches}
        onError={() => fail(actionAtlas)} />}
    </>}
  </span>;
  return <span className="battle-sprite battle-sprite-fallback">
    {avatar && !failedSources.includes(avatar) ? <img src={avatarUrl(avatar)} alt={name} draggable={false} onError={() => fail(avatar)} /> : <User size={64} aria-label={name} />}
  </span>;
}
