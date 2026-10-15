import { Bomb, Shield, Sparkles, Zap } from 'lucide-react';
import type { HandCategory, Lang } from '../types';
import { TEXT } from '../data/translations';
import useCardMotion from './useCardMotion';
import './CategoryCardFace.css';

const icons = { CHARGE: Zap, ATTACK: Bomb, DEFEND: Shield, ULTIMATE: Sparkles };

/** Category covers retain the original four symbols and only their category name. */
export default function CategoryCardFace({ category, lang, className = '' }: {
  category: HandCategory; lang: Lang; className?: string;
}) {
  const motionRef = useCardMotion();
  const Icon = icons[category];
  return <span ref={motionRef} className={`skill-category-face card-motion-face ${className}`} data-family={category}>
    <span className="skill-category-icon" aria-hidden="true"><Icon size="100%" strokeWidth={2} fill={category === 'CHARGE' ? 'currentColor' : 'none'} /></span>
    <span className="skill-category-name">{TEXT[lang].categories[category]}</span>
    <span className="card-motion-glare" aria-hidden="true" />
  </span>;
}
