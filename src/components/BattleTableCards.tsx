import { useEffect, useState, type CSSProperties } from 'react';
import type { Lang, Player } from '../types';
import { isHoloCard } from '../data/cardFinish';
import { getEffectiveLevel, getPlayerCard } from '../logic/cardLevels';
import { CARD_COMPARE_END_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_START_MS, CARD_FLIGHT_MS,
  CARD_LAND_MS, CARD_LANDING_MS, CARD_RELEASE_MS, SOLO_MOTION_SCALE } from '../data/battleTiming';
import { battleReleaseHand } from '../data/battleActions';
import { getBattleFigure, SELF_SEAT, type BattleBounds, type BattleSeat } from '../logic/battleLayout';
import { playerAvatar } from '../logic/bots';
import { tableCardPositions } from '../logic/tableCardLayout';
import { tableCardClash } from '../logic/tableCardMotion';
import { battleCardSlamPositions } from '../logic/battleCardSlam';
import { getShowdownWinner } from '../logic/combat';
import WoodcutCardFace from './WoodcutCardFace';
import CardHolo from './CardHolo';
import './BattleCardSlam.css';

/** Compare the committed plays, highlighting only the engine's card advantage. */
export default function BattleTableCards({ players, lang, seatFor, reduced, bounds, quick = false }: {
  players: Player[]; lang: Lang; seatFor: (index: number) => BattleSeat; reduced: boolean; bounds: BattleBounds; quick?: boolean;
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
  const winners = new Set(getShowdownWinner(players));
  const slamPositions = battleCardSlamPositions(played.flatMap(({ player, index }) => {
    const position = positions[index];
    return winners.has(player.id) && position ? [{ index, width: position.width, cardHeight: position.cardHeight }] : [];
  }), bounds);
  const scale = quick ? SOLO_MOTION_SCALE : 1;
  return <div className={`table-cards ${reduced || motionStopped ? 'table-cards-still' : ''}`} data-comparing={comparing}
    data-slam-active={slamPositions.length > 0}
    aria-label={lang === 'zh' ? '本回合出牌' : 'Played cards'} style={{
      '--card-release-delay': `${CARD_RELEASE_MS * scale}ms`, '--card-flight-duration': `${CARD_FLIGHT_MS * scale}ms`,
      '--card-land-delay': `${CARD_LAND_MS * scale}ms`, '--card-land-duration': `${CARD_LANDING_MS * scale}ms`,
      '--card-compare-delay': `${CARD_COMPARE_START_MS * scale}ms`,
      '--card-compare-duration': `${(CARD_COMPARE_END_MS - CARD_COMPARE_START_MS) * scale}ms`,
      '--card-approach-duration': `${(CARD_COMPARE_IMPACT_MS - CARD_COMPARE_START_MS) * scale}ms`,
      '--card-impact-delay': `${CARD_COMPARE_IMPACT_MS * scale}ms`,
      '--card-impact-duration': `${(CARD_COMPARE_END_MS - CARD_COMPARE_IMPACT_MS) * scale}ms`,
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
      const winner = winners.has(player.id);
      const advantage = lang === 'zh' ? '本回合出牌占优' : 'Card advantage this round';
      const label = `${player.name}: ${card.name[lang]} · Lv.${getEffectiveLevel(card)} · ${cost} ${lang === 'zh' ? '能量' : 'energy'}${winner ? ` · ${advantage}` : ''}`;
      return <div className="table-card-flight" key={player.id} data-player-id={player.id} data-compact={compact} data-small={width < 64}
        data-slam-winner={winner}
        role="img" aria-label={label} title={label} style={{
        left: `${x}%`, top: `${y}%`, width, '--played-width': `${width}px`, '--played-height': `${cardHeight}px`,
        '--owner-height': `${ownerHeight}px`, '--owner-gap': `${ownerGap}px`, '--card-from-x': `${fromX}px`,
        '--card-from-y': `${fromY}px`, '--card-tilt': `${index % 2 ? 3 : -3}deg`,
        '--card-clash-x': `${inward.x}px`, '--card-clash-y': `${inward.y}px`,
      } as CSSProperties}>
        <div className="table-card-compare">
          <div className="table-card-slam">
            <div className="table-card-surface">
              <div className="pixel-showdown-card table-played-card" data-card-type={card.type} data-card-id={card.id}
                data-card-finish={isHoloCard(card) ? 'gold-holo' : undefined}>
                {isHoloCard(card) && <CardHolo />}
                <WoodcutCardFace card={card} lang={lang} free={cost === 0} />
              </div>
              {winner && <span className="table-slam-outline" aria-hidden="true" />}
            </div>
          </div>
          {ownerHeight > 0 && <span className="table-card-owner"><span className="table-card-owner-name">{player.name}</span>
            {winner && <b className="table-slam-owner-mark" aria-hidden="true">{lang === 'zh' ? '占优' : 'EDGE'}</b>}
          </span>}
        </div>
      </div>;
    })}
    {/* Keep every source slot in place. Only actual advantage cards jump into
        the center; equal attacks and blocked hits stay on the table. */}
    <div className="table-slam-showcases" aria-hidden="true">
      {slamPositions.map(slam => {
        const play = played.find(item => item.index === slam.index);
        const position = positions[slam.index];
        if (!play || !position) return null;
        const { player, card } = play;
        const free = player.freeSkills?.includes(card.id) || card.cost === 0;
        const sourceCenterY = position.y * bounds.height / 100 - (position.ownerHeight + position.ownerGap) / 2;
        const targetCenterY = slam.y - slam.labelHeight / 2;
        return <div className="table-slam-showcase" key={player.id} data-slam-player-id={player.id}
          data-player-id={player.id} data-slam-scale={slam.scale}
          title={`${player.name} · ${card.name[lang]} · ${lang === 'zh' ? '本回合出牌占优' : 'Card advantage this round'}`}
          style={{ left: slam.x, top: slam.y, width: slam.width, height: slam.cardHeight + slam.labelHeight,
            '--slam-showcase-width': `${slam.width}px`, '--slam-card-height': `${slam.cardHeight}px`,
            '--slam-label-height': `${slam.labelHeight}px`, '--slam-scale': slam.scale,
            '--slam-base-width': `${slam.width / slam.scale}px`, '--slam-base-height': `${slam.cardHeight / slam.scale}px`,
            '--played-height': `${slam.cardHeight / slam.scale}px`,
            '--slam-from-x': `${position.x * bounds.width / 100 - slam.x}px`,
            '--slam-from-y': `${sourceCenterY - targetCenterY}px`,
            '--slam-from-scale': position.width / (slam.width / slam.scale),
            '--slam-lift': `${bounds.width < 768 ? 48 : 68}px`,
            '--slam-tilt': `${slamPositions.length > 1 ? 0 : slam.index % 2 ? 6 : -6}deg`,
          } as CSSProperties}>
          <div className="table-slam-journey">
            <div className="table-slam-card-anchor">
              <span className="table-slam-impact-ring"><i /><i /><i /><i /><i /><i /><i /><i /></span>
              <div className="pixel-showdown-card table-played-card table-slam-big-card" data-card-type={card.type}
                data-slam-card-id={card.id} data-card-finish={isHoloCard(card) ? 'gold-holo' : undefined}>
                {isHoloCard(card) && <CardHolo />}
                <WoodcutCardFace card={card} lang={lang} free={free} />
                <span className="table-slam-large-outline" />
              </div>
              <strong className="table-slam-impact-word">SLAM!</strong>
            </div>
            <div className="table-slam-caption">
              <strong>{player.name}</strong><span>{card.name[lang]} · {lang === 'zh' ? '占优' : 'EDGE'}</span>
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
