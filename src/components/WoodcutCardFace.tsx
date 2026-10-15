import type { Card, HandCategory, Lang } from '../types';
import { getEffectiveLevel } from '../logic/combat';
import { getHandCategory } from '../logic/skillLoadout';
import SkillCardFace from './SkillCardFace';
import CategoryCardFace from './CategoryCardFace';
import './WoodcutCard.css';

type Props = {
  card: Card; lang: Lang; free?: boolean; freeCount?: number; tempCount?: number;
} | {
  folder: HandCategory; lang: Lang;
};

/** Existing modern slots keep their identity; both editions share the same face. */
export default function WoodcutCardFace(props: Props) {
  const card = 'card' in props ? props.card : undefined;
  const folder = 'folder' in props ? props.folder : undefined;
  const free = 'card' in props && (!!props.free || (props.freeCount ?? 0) > 0);
  return <span className="woodcut-face" data-woodcut-id={card?.id ?? `folder-${folder!.toLowerCase()}`}
    data-folder={!!folder} data-cover={!!folder} data-family={card ? getHandCategory(card) : folder}
    data-language={props.lang} data-skill-level={card ? getEffectiveLevel(card) : undefined}
    data-combo={!!card?.tags?.includes('combo') || undefined}
    data-growing={card?.combatLevel !== undefined || undefined} data-free={free || undefined}>
    {'card' in props
      ? <SkillCardFace card={props.card} lang={props.lang} free={props.free} freeCount={props.freeCount}
        tempCount={props.tempCount} description={false} />
      : <CategoryCardFace category={props.folder} lang={props.lang} />}
  </span>;
}
