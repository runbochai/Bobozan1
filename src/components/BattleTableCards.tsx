import { useEffect, useState, type CSSProperties } from 'react';
import type { Lang, Player } from '../types';
import { isHoloCard } from '../data/cardFinish';
import { getEffectiveLevel, getPlayerCard } from '../logic/cardLevels';
import { CARD_COMPARE_END_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_START_MS, CARD_FLIGHT_MS,
  CARD_LAND_MS, CARD_LANDING_MS, CARD_RELEASE_MS } from '../data/battleTiming';
import { battleReleaseHand } from '../data/battleActions';
import { getBattleFigure, SELF_SEAT, type BattleBounds, type BattleSeat } from '../logic/battleLayout';
import { playerAvatar } from '../logic/bots';
import { tableCardPositions } from '../logic/tableCardLayout';
import { tableCardClash } from '../logic/tableCardMotion';
import WoodcutCardFace from './WoodcutCardFace';
import CardHolo from './CardHolo';

/** Present every revealed play, then compare them together without predicting a winner. */
export default function BattleTableCards({ players, lang, seatFor, reduced, bounds }: {
  players: Player[]; lang: Lang; seatFor: (index: number) => BattleSeat; reduced: boolean; bounds: BattleBounds;
}) {
  // This component is keyed by the round. Once stopped, presentation remains
  // still for this round even if the preference is switched back off.
  const [motionStopped, setMotionStopped] = useState(() => reduced
    || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced && !motionStopped) setMotionStopped(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = (event: MediaQueryListEvent) => { if (event.matches) setMotionStopped(true); };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, []);
  const played = players.flatMap((player, index) => {
    const card = getPlayerCard(player, player.selectedCardId);
    return !player.isDead && card ? [{ player, card, index }] : [];
  });
  const positions = tableCardPositions(players.map((_, index) => seatFor(index)), bounds);
  const clash = tableCardClash(positions, bounds);
  const comparing = played.length > 1;
  return <div className={`table-cards ${reduced || motionStopped ? 'table-cards-still' : ''}`} data-comparing={comparing}
    aria-label={lang === 'zh' ? '本回合出牌' : 'Played cards'} style={{
      '--card-release-delay': `${CARD_RELEASE_MS}ms`, '--card-flight-duration': `${CARD_FLIGHT_MS}ms`,
      '--card-land-delay': `${CARD_LAND_MS}ms`, '--card-land-duration': `${CARD_LANDING_MS}ms`,
      '--card-compare-delay': `${CARD_COMPARE_START_MS}ms`,
      '--card-compare-duration': `${CARD_COMPARE_END_MS - CARD_COMPARE_START_MS}ms`,
      '--card-approach-duration': `${CARD_COMPARE_IMPACT_MS - CARD_COMPARE_START_MS}ms`,
      '--card-impact-delay': `${CARD_COMPARE_IMPACT_MS}ms`,
      '--card-impact-duration': `${CARD_COMPARE_END_MS - CARD_COMPARE_IMPACT_MS}ms`,
    } as CSSProperties}>
    {comparing && <svg className="table-clash-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {played.map(({ player, index }) => positions[index] && <line key={player.id}
        x1={positions[index].x} y1={positions[index].y} x2={clash.center.x} y2={clash.center.y} />)}
    </svg>}
    {comparing && <div className="table-clash-burst" aria-hidden="true"
      style={{ left: `${clash.center.x}%`, top: `${clash.center.y}%` }}>
      <i /><i /><i /><i /><b />
    </div>}
    {played.map(({ player, card, index }) => {
      const position = positions[index];
      if (!position) return null;
      const { x, y, width, cardHeight, ownerHeight, ownerGap, compact } = position;
      const start = seatFor(index);
      const self = Math.abs(start.x - SELF_SEAT.x) < .01 && Math.abs(start.y - SELF_SEAT.y) < .01;
      const figure = getBattleFigure(start, self, bounds);
      const hand = battleReleaseHand(playerAvatar(player), start.facing ?? 's');
      const size = start.size ?? width, spriteHeight = size * 4 / 3;
      const fromX = (figure.x - x) * bounds.width / 100 + (hand.x - .5) * size;
      const fromY = (figure.y - y) * bounds.height / 100 + (hand.y - (self ? .5 : .55)) * spriteHeight
        + (ownerHeight + ownerGap) * .32 / 2;
      const inward = clash.offsets[index] ?? { x: 0, y: 0 };
      const cost = player.freeSkills?.includes(card.id) ? 0 : card.cost;
      const label = `${player.name}: ${card.name[lang]} · Lv.${getEffectiveLevel(card)} · ${cost} ${lang === 'zh' ? '能量' : 'energy'}`;
      return <div className="table-card-flight" key={player.id} data-player-id={player.id} data-compact={compact} data-small={width < 64}
        role="img" aria-label={label} title={label} style={{
        left: `${x}%`, top: `${y}%`, width, '--played-width': `${width}px`, '--played-height': `${cardHeight}px`,
        '--owner-height': `${ownerHeight}px`, '--owner-gap': `${ownerGap}px`, '--card-from-x': `${fromX}px`,
        '--card-from-y': `${fromY}px`, '--card-tilt': `${index % 2 ? 3 : -3}deg`,
        '--card-clash-x': `${inward.x}px`, '--card-clash-y': `${inward.y}px`,
      } as CSSProperties}>
        <div className="table-card-compare">
          <div className="table-card-surface">
            <div className="pixel-showdown-card table-played-card" data-card-type={card.type} data-card-id={card.id}
              data-card-finish={isHoloCard(card) ? 'gold-holo' : undefined}>
              {isHoloCard(card) && <CardHolo />}
              <WoodcutCardFace card={card} lang={lang} free={cost === 0} />
            </div>
          </div>
          {ownerHeight > 0 && <span className="table-card-owner">{player.name}</span>}
        </div>
      </div>;
    })}
  </div>;
}
