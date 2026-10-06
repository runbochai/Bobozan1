import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { Lang, Player } from '../types';
import { directionToward, getBattleFigure, getBattleStatusOffset, type BattleBounds, type BattleSeat } from '../logic/battleLayout';
import { playerAvatar } from '../logic/bots';
import BattleSprite from './BattleSprite';
import BattleStats from './BattleStats';
import { CheckCircle, Skull } from './PixelIcons';
import BattleLevelBadge from './BattleLevelBadge';

interface Props {
  player: Player;
  seat: BattleSeat;
  bounds: BattleBounds;
  self: boolean;
  maxHp: number;
  level: number;
  viewerLevel?: number;
  endless?: boolean;
  lang: Lang;
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

export default function BattleFighter({ player, seat, bounds, self, maxHp, level, viewerLevel, endless, lang, turn, showdown, damage, hit, reduceMotion, intent }: Props) {
  const seed = player.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const direction = seat.facing ?? directionToward(seat);
  const motion = reduceMotion ? 'still' : hit ? 'hit' : player.isDead ? 'still' : showdown && player.selectedCardId ? 'move' : 'idle';
  const figure = getBattleFigure(seat, self, bounds);
  const foreground = figure.foreground;
  return <div className={`battle-fighter ${self ? 'battle-fighter-self' : 'battle-fighter-enemy'} ${!self && seat.y > 65 ? 'battle-fighter-near' : ''} ${player.isDead ? 'battle-fighter-dead' : ''}`}
    data-player-id={player.id} data-facing={direction} data-edge={seat.edge} data-depth={foreground ? 'front' : 'back'} data-hit={hit}
    data-seat-x={seat.x} data-seat-y={seat.y}
    style={{ '--model-size':`${seat.size}px`, '--seat-anchor': self ? .5 : .55, left: `${figure.x}%`, top: `${figure.y}%` } as CSSProperties}>
    <div className={`battle-character-motion battle-character-${motion}`} key={`${turn}-${motion}`}
      style={{ '--idle-delay': `${-(seed % 20) / 10}s`, '--step-x': `${(50 - seat.x) / 5}px`, '--step-y': `${(48 - seat.y) / 5}px` } as CSSProperties}>
      <BattleSprite avatar={playerAvatar(player)} name={player.name} direction={direction} />
    </div>
    {!reduceMotion && !!damage && <div className="battle-hit-burst" aria-hidden="true" />}
    {!!damage && <span className={`battle-damage ${reduceMotion ? 'battle-damage-still' : ''}`}>−{damage}</span>}
    {player.emoji && player.emojiAt && <BattleEmoji key={player.emojiAt} emoji={player.emoji} at={player.emojiAt} />}
    {player.isDead && <Skull size={26} className="battle-dead-mark" />}
    {!self && <div className="table-seat-status" style={{ left: `calc(50% + ${getBattleStatusOffset(seat, self, bounds)}px)` }}>
      <div className="battle-fighter-name" title={player.name}><span>{player.name}</span>{!player.isDead && !showdown && player.selectedCardId && <CheckCircle size={13} />}</div>
      <BattleLevelBadge level={level} viewerLevel={viewerLevel} endless={endless} name={player.name} lang={lang} />
      <BattleStats player={player} maxHp={maxHp} />
    </div>}
    {!self && intent}
  </div>;
}
