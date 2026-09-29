import type { CSSProperties } from 'react';
import type { Lang, Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import { getShowdownWinner } from '../logic/combat';
import type { BattleSeat } from '../logic/battleLayout';
import PixelCardArt from './PixelCardArt';
import { Zap } from './PixelIcons';

/** Cards travel from each character to the table and stay until settlement. */
export default function BattleTableCards({ players, lang, seatFor, reduced }: {
  players: Player[]; lang: Lang; seatFor: (index: number) => BattleSeat; reduced: boolean;
}) {
  const played = players.flatMap((player, index) => {
    const card = SKILL_DB.find(c => c.id === player.selectedCardId);
    return !player.isDead && card ? [{ player, card, index }] : [];
  });
  const highlighted = getShowdownWinner(players);
  const columns = Math.min(4, played.length);
  return <div className={`table-cards ${reduced ? 'table-cards-still' : ''}`} aria-label={lang === 'zh' ? '本回合出牌' : 'Played cards'}>
    {played.map(({ player, card, index }, i) => {
      const row = Math.floor(i / columns);
      const rowCount = Math.min(columns, played.length - row * columns);
      const x = 50 + (i % columns - (rowCount - 1) / 2) * 10;
      const y = played.length > 4 ? 54 + row * 18 : 58;
      const start = seatFor(index);
      return <div className="table-card-flight" key={player.id} data-player-id={player.id} style={{
        left: `${x}%`, top: `${y}%`, '--card-from-x': `${start.x - x}cqw`,
        '--card-from-y': `${start.y - y}cqh`, '--card-tilt': `${i % 2 ? 3 : -3}deg`,
      } as CSSProperties}>
        <div className="pixel-showdown-card table-played-card" data-card-type={card.type} data-impact={highlighted.includes(player.id)} data-card-id={card.id}>
          <span className="table-card-cost"><Zap size={12} />{player.freeSkills?.includes(card.id) ? 0 : card.cost}</span>
          <PixelCardArt id={card.id} />
          <strong>{card.name[lang]}</strong>
          <small>{TEXT[lang].skillType[card.type]}</small>
        </div>
        <span className="table-card-owner">{player.name}</span>
      </div>;
    })}
  </div>;
}
