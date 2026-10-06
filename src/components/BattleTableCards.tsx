import type { CSSProperties } from 'react';
import type { Lang, Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import { getShowdownWinner } from '../logic/combat';
import type { BattleBounds, BattleSeat } from '../logic/battleLayout';
import { tableCardPositions } from '../logic/tableCardLayout';
import PixelCardArt from './PixelCardArt';
import { Zap } from './PixelIcons';

/** Cards travel from each character to the table and stay until settlement. */
export default function BattleTableCards({ players, lang, seatFor, reduced, bounds }: {
  players: Player[]; lang: Lang; seatFor: (index: number) => BattleSeat; reduced: boolean; bounds: BattleBounds;
}) {
  const played = players.flatMap((player, index) => {
    const card = SKILL_DB.find(c => c.id === player.selectedCardId);
    return !player.isDead && card ? [{ player, card, index }] : [];
  });
  const highlighted = getShowdownWinner(players);
  const positions = tableCardPositions(players.map((_, index) => seatFor(index)), bounds);
  return <div className={`table-cards ${reduced ? 'table-cards-still' : ''}`} aria-label={lang === 'zh' ? '本回合出牌' : 'Played cards'}>
    {played.map(({ player, card, index }) => {
      const position = positions[index];
      if (!position) return null;
      const { x, y, width, cardHeight, ownerHeight, ownerGap, compact } = position;
      const start = seatFor(index);
      const cost = player.freeSkills?.includes(card.id) ? 0 : card.cost;
      const label = `${player.name}: ${card.name[lang]} · ${cost} ${lang === 'zh' ? '能量' : 'energy'}`;
      return <div className="table-card-flight" key={player.id} data-player-id={player.id} data-compact={compact}
        role="img" aria-label={label} title={label} style={{
        left: `${x}%`, top: `${y}%`, width, '--played-width': `${width}px`, '--played-height': `${cardHeight}px`,
        '--owner-height': `${ownerHeight}px`, '--owner-gap': `${ownerGap}px`, '--card-from-x': `${start.x - x}cqw`,
        '--card-from-y': `${start.y - y}cqh`, '--card-tilt': `${index % 2 ? 3 : -3}deg`,
      } as CSSProperties}>
        <div className="pixel-showdown-card table-played-card" data-card-type={card.type} data-impact={highlighted.includes(player.id)} data-card-id={card.id}>
          <span className="table-card-cost"><Zap size={12} />{cost}</span>
          <PixelCardArt id={card.id} />
          <strong>{card.name[lang]}</strong>
          <small>{TEXT[lang].skillType[card.type]}</small>
        </div>
        {ownerHeight > 0 && <span className="table-card-owner">{player.name}</span>}
      </div>;
    })}
  </div>;
}
