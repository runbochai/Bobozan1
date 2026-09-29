import { useState } from 'react';
import { assetUrl } from '../assets';
import { battleCharacterAtlas } from '../data/battleCharacters';
import type { BattleDirection } from '../logic/battleLayout';
import BattleSprite from './BattleSprite';

/** Bespoke seated robot plus waist-up views of every selectable and expedition character. */
export default function SeatedCharacter({ avatar, name, direction, played }: { avatar?: string; name: string; direction: BattleDirection; played: boolean }) {
  const [failed, setFailed] = useState(false);
  const robot = battleCharacterAtlas(avatar) === 'characters/robot.webp' && !failed;
  const cell = direction === 'se' ? 0 : direction === 'sw' ? 2 : 1;
  return <div className={`seated-character ${robot ? 'seated-robot' : 'seated-atlas'}`} data-played={played}>
    {robot ? <span className="seated-sprite" role="img" aria-label={name}>
      <img src={assetUrl('scenes/tavern/robot-seated.webp')} alt="" draggable={false} style={{ left: `${cell * -100}%` }} onError={() => setFailed(true)} />
    </span> : <>
      <div className="seated-portrait"><BattleSprite avatar={avatar} name={name} direction={direction} /></div>
      <div className="opponent-hand" aria-hidden="true"><i /><i /><i /></div>
    </>}
  </div>;
}
