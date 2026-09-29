import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { Player } from '../types';
import { directionToward, type BattleSeat } from '../logic/battleLayout';
import { playerAvatar } from '../logic/bots';
import BattleSprite from './BattleSprite';
import BattleStats from './BattleStats';
import { CheckCircle, Crown, Skull } from './PixelIcons';

interface Props {
  player: Player;
  seat: BattleSeat;
  self: boolean;
  maxHp: number;
  level: number;
  levelName: string;
  leader: boolean;
  turn: number;
  showdown: boolean;
  damage?: number;
  hit: boolean;
  reduceMotion: boolean;
  intent?: ReactNode;
}

function BattleEmoji({ emoji, at }: { emoji: string; at: number }) {
  const [visible, setVisible] = useState(() => Date.now() - at < 2000);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), Math.max(0, at + 2000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [at]);
  return visible ? <span className="battle-emoji">{emoji}</span> : null;
}

export default function BattleFighter({ player, seat, self, maxHp, level, levelName, leader, turn, showdown, damage, hit, reduceMotion, intent }: Props) {
  const seed = player.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const direction = directionToward(seat);
  const motion = reduceMotion ? 'still' : hit ? 'hit' : player.isDead ? 'still' : showdown && player.selectedCardId ? 'move' : 'idle';
  return <div className={`battle-fighter ${self ? 'battle-fighter-self' : 'battle-fighter-enemy'} ${!self && seat.y > 65 ? 'battle-fighter-near' : ''} ${player.isDead ? 'battle-fighter-dead' : ''}`}
    data-player-id={player.id} data-facing={direction} data-hit={hit} style={{ left: `${seat.x}%`, top: `${seat.y}%`, zIndex: 10 + Math.round(seat.y / 10) } as CSSProperties}>
    <div className="battle-player-plinth" aria-hidden="true" />
    <div className={`battle-character-motion battle-character-${motion}`} key={`${turn}-${motion}`} style={{ '--idle-delay': `${-(seed % 20) / 10}s`, '--step-x': `${(50 - seat.x) / 5}px`, '--step-y': `${(48 - seat.y) / 5}px` } as CSSProperties}>
      <BattleSprite avatar={playerAvatar(player)} name={player.name} direction={direction} />
    </div>
    {!reduceMotion && !!damage && <div className="battle-hit-burst" aria-hidden="true" />}
    {!!damage && <span className={`battle-damage ${reduceMotion ? 'battle-damage-still' : ''}`}>−{damage}</span>}
    {player.emoji && player.emojiAt && <BattleEmoji key={player.emojiAt} emoji={player.emoji} at={player.emojiAt} />}
    {player.isDead && <Skull size={26} className="battle-dead-mark" />}
    {!self && <>
      <div className="battle-fighter-name" title={player.name}><span>{player.name}</span>{!player.isDead && !showdown && player.selectedCardId && <CheckCircle size={13} />}</div>
      {level > 0 && <div className="battle-level" title={levelName}>{leader && <Crown size={13} />}LVL {level}</div>}
      <BattleStats player={player} maxHp={maxHp} />
      {intent}
    </>}
  </div>;
}
