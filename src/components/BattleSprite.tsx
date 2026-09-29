import { useState } from 'react';
import { assetUrl, avatarUrl } from '../assets';
import { battleCharacterAtlas, MIRRORED_BATTLE_VIEWS } from '../data/battleCharacters';
import { BATTLE_DIRECTIONS, type BattleDirection } from '../logic/battleLayout';
import { User } from './PixelIcons';

export default function BattleSprite({ avatar, name, direction }: { avatar?: string; name: string; direction: BattleDirection }) {
  const atlas = battleCharacterAtlas(avatar);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const index = BATTLE_DIRECTIONS.indexOf(direction);
  const mirrored = atlas && MIRRORED_BATTLE_VIEWS[atlas]?.includes(direction);
  if (atlas && !failedSources.includes(atlas)) return <span className="battle-sprite" role="img" aria-label={name} data-direction={direction} data-atlas={atlas} style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
    <img src={assetUrl(atlas)} alt="" draggable={false} onError={() => setFailedSources(previous => [...previous, atlas])}
      style={{ left: `${-(index % 4) * 100}%`, top: `${-Math.floor(index / 4) * 100}%` }} />
  </span>;
  return <span className="battle-sprite battle-sprite-fallback">
    {avatar && !failedSources.includes(avatar) ? <img src={avatarUrl(avatar)} alt={name} draggable={false} onError={() => setFailedSources(previous => [...previous, avatar])} /> : <User size={64} aria-label={name} />}
  </span>;
}
