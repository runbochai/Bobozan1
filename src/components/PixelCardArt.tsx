import ParchmentSkillArt from './ParchmentSkillArt';
import { SKILL_DB } from '../data/skills';
import { getHandCategory } from '../logic/skillLoadout';

/** Small move icons use the same illustration and family palette as the cards. */
export default function PixelCardArt({ id }: { id: string }) {
  const card = SKILL_DB.find(skill => skill.id === id);
  const family = card ? getHandCategory(card) : 'ATTACK';
  return <span className="pixel-card-art parchment-skill-thumbnail" data-family={family}><ParchmentSkillArt id={id} tone="color" /></span>;
}
