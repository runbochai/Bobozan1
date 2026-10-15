import type { Card, Lang } from '../types';
import { getEffectiveLevel } from '../logic/cardLevels';
import { isOffensiveCard } from '../logic/combat';
import { getHandCategory } from '../logic/skillLoadout';
import ParchmentSkillArt from './ParchmentSkillArt';
import useCardMotion from './useCardMotion';
import './SkillCardFace.css';

export interface SkillCardFaceProps {
  card: Card;
  lang: Lang;
  free?: boolean;
  freeCount?: number;
  tempCount?: number;
  compact?: boolean;
  description?: boolean;
  className?: string;
}

/** One illustrated dark face for both editions; every value comes from the live skill. */
export default function SkillCardFace({ card, lang, free = false, freeCount = 0, tempCount = 0,
  compact = false, description = false, className = '' }: SkillCardFaceProps) {
  const motionRef = useCardMotion();
  const isFree = free || freeCount > 0;
  const level = getEffectiveLevel(card);
  const family = getHandCategory(card);
  const combo = !!card.tags?.includes('combo');
  const growing = card.combatLevel !== undefined;
  const offensive = isOffensiveCard(card);
  const rank = level >= 10000 ? `≈${new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    notation: 'compact', maximumFractionDigits: 1,
  }).format(level)}` : String(level);
  const tags = [combo ? (lang === 'zh' ? '联合' : 'COMBO') : '', growing ? (lang === 'zh' ? '成长' : 'GROWTH') : '',
    offensive ? `T${card.tier}` : ''].filter(Boolean);
  const borrowed = [isFree ? `${lang === 'zh' ? '免费' : 'FREE'}${freeCount ? ` ×${freeCount}` : ''}` : '',
    tempCount ? `${lang === 'zh' ? '临时' : 'TEMP'} ×${tempCount}` : ''].filter(Boolean);
  const label = `${card.name[lang]} · ${lang === 'zh' ? '费用' : 'Cost'} ${isFree ? 0 : card.cost} · Lv.${level}${tags.length ? ` · ${tags.join(' · ')}` : ''}${borrowed.length ? ` · ${borrowed.join(' · ')}` : ''}`;
  return <span ref={motionRef} className={`skill-card-face retro-card card-motion-face${compact ? ' skill-card-compact retro-card-compact' : ''} ${className}`}
    data-card-id={card.id} data-card-type={card.type} data-family={family} data-language={lang}
    data-skill-level={level} data-combo={combo || undefined} data-growing={growing || undefined}
    data-free={isFree || undefined} data-cost={isFree ? 0 : card.cost} data-description={description || undefined}
    role="img" aria-label={label}>
    <span className="skill-card-cost retro-card-cost" aria-hidden="true">{isFree ? <><s>{card.cost}</s> 0</> : card.cost}</span>
    <span className="skill-card-rank retro-card-rank" data-wide={rank.length > 5} aria-hidden="true">Lv.{rank}</span>
    <span className="skill-card-art retro-card-art" aria-hidden="true"><ParchmentSkillArt id={card.id} tone="color" /></span>
    {tags.length > 0 && <span className="skill-card-tags" aria-hidden="true">{tags.join(' · ')}</span>}
    <span className="skill-card-name retro-card-name" data-long={card.name[lang].length > (lang === 'zh' ? 5 : 14)} aria-hidden="true">{card.name[lang]}</span>
    {description && <span className="skill-card-description retro-card-description" aria-hidden="true">{card.description[lang]}</span>}
    {borrowed.length > 0 && <span className="skill-card-borrowed retro-card-borrowed" aria-hidden="true">{borrowed.join(' · ')}</span>}
    <span className="card-motion-glare" aria-hidden="true" />
  </span>;
}
