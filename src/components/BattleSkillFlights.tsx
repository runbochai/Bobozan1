import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Player } from '../types';
import { SKILL_EFFECTS } from '../data/skillEffects';
import { skillFlightTargets } from '../logic/battleEffects';
import SkillGlyph from './SkillGlyph';

export default function BattleSkillFlights({ players, delay }: { players: Player[]; delay: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [centers, setCenters] = useState<Record<string, { x: number; y: number }>>({});
  useLayoutEffect(() => {
    const field = root.current?.parentElement;
    if (!field) return;
    const measure = () => {
      const board = field.getBoundingClientRect();
      const positions: Record<string, { x: number; y: number }> = {};
      field.querySelectorAll<HTMLElement>('.battle-fighter').forEach(fighter => {
        const sprite = fighter.querySelector('.battle-sprite')!.getBoundingClientRect();
        positions[fighter.dataset.playerId!] = { x: sprite.left + sprite.width / 2 - board.left, y: sprite.top + sprite.height * .5 - board.top };
      });
      setCenters(positions);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    return () => observer.disconnect();
  }, [players]);
  return <div ref={root} className="skill-flights" aria-hidden="true">{players.flatMap(caster => {
    const effect = SKILL_EFFECTS[caster.selectedCardId ?? ''];
    const start = centers[caster.id];
    if (!effect || !start) return [];
    return skillFlightTargets(caster, players).map(target => {
      const end = centers[target.id];
      if (!end) return null;
      const dx = end.x - start.x, dy = end.y - start.y;
      return <div key={`${caster.id}-${target.id}`} className="skill-flight" data-skill={caster.selectedCardId} data-caster={caster.id} data-target={target.id}
        style={{ left: start.x, top: start.y, '--travel-x': `${dx}px`, '--travel-y': `${dy}px`, '--flight-angle': `${Math.atan2(dy, dx)}rad`,
          '--skill-color': effect.color, '--skill-light': effect.light, '--flight-delay': `${delay + 280}ms`, '--skill-scale': effect.size } as CSSProperties}>
        <span className="skill-flight-tail" /><span className="skill-flight-core"><SkillGlyph effect={effect} /></span>
      </div>;
    });
  })}</div>;
}
