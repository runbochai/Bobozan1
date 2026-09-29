import type { CSSProperties } from 'react';
import type { Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { SKILL_EFFECTS } from '../data/skillEffects';
import SkillGlyph from './SkillGlyph';
import PixelCardArt from './PixelCardArt';
import { CARD_REVEAL_MS } from '../data/battleTiming';
import './BattleSkillEffects.css';

/** Briefly reveal the selected card, then let its skill take over the battlefield. */
export default function BattleMoveFx({ cardId, lang, delay, reduced }: { cardId: string; lang: Lang; delay: number; reduced: boolean }) {
  const card = SKILL_DB.find(c => c.id === cardId);
  const effect = SKILL_EFFECTS[cardId];
  if (!card || !effect) return null;
  return <>
    <div className="battle-card-reveal" data-card={cardId} style={{ '--skill-color': effect.color, '--skill-light': effect.light, '--reveal-duration': `${CARD_REVEAL_MS}ms` } as CSSProperties}>
      <span className="battle-reveal-cost">ϟ {card.cost}</span><PixelCardArt id={cardId} /><strong>{card.name[lang]}</strong>
    </div>
    <div className={`skill-cast skill-cast-${effect.family} ${reduced ? 'skill-cast-reduced' : ''}`} data-skill={cardId}
    style={{ '--skill-color': effect.color, '--skill-light': effect.light, '--cast-delay': `${delay}ms`, '--skill-scale': effect.size } as CSSProperties}>
    <div className="skill-cast-aura" aria-hidden="true" />
    <div className="skill-cast-symbol"><SkillGlyph effect={effect} /></div>
    <div className="skill-cast-particles" aria-hidden="true">{Array.from({ length: effect.count + 3 }, (_, i) => <i key={i} style={{
      '--particle-x': `${Math.round(Math.cos(i * 2.4) * 100)}px`, '--particle-y': `${Math.round(Math.sin(i * 2.4) * 90)}px`,
      '--particle-delay': `${delay + i * 28}ms`,
    } as CSSProperties} />)}</div>
    <span className="skill-cast-name">{card.name[lang]}</span>
  </div></>;
}
