import type { CSSProperties } from 'react';
import { SKILL_DB } from '../data/skills';
import { getHandCategory } from '../logic/skillLoadout';
import ParchmentSkillArt from './ParchmentSkillArt';
import SkillCardFace, { type SkillCardFaceProps } from './SkillCardFace';
import './RetroCard.css';

/** Small skill previews use the same inked illustration as the complete face. */
export function RetroSkillIcon({ id, size = 48 }: { id: string; size?: number }) {
  const card = SKILL_DB.find(skill => skill.id === id);
  const family = card ? getHandCategory(card) : 'ATTACK';
  return <span className="retro-skill-icon" data-skill-id={id} data-family={family}
    style={{ '--retro-icon-size': `${size}px` } as CSSProperties} aria-hidden="true">
    <ParchmentSkillArt id={id} tone="color" />
  </span>;
}

export type RetroCardProps = SkillCardFaceProps;

/** Keep the classic call sites on the same shared card renderer as the current edition. */
export default function RetroCard(props: RetroCardProps) {
  return <SkillCardFace {...props} />;
}
