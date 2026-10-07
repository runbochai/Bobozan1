import type { Card, Lang } from '../types';
import { assetUrl } from '../assets';
import { WOODCUT_CARDS } from '../data/woodcutCards';
import { getEffectiveLevel } from '../logic/cardLevels';
import './WoodcutCard.css';

type Props = { card: Card; lang: Lang; free?: boolean } | {
  folder: 'ATTACK' | 'DEFEND' | 'ULTIMATE'; count: number; lang: Lang;
};

/** Artwork and frame stay together; printed example numbers never supply game state. */
export default function WoodcutCardFace(props: Props) {
  const { lang } = props;
  const card = 'card' in props ? props.card : undefined;
  const folder = 'folder' in props ? props.folder : undefined;
  const id = card?.id ?? `folder-${folder!.toLowerCase()}`;
  const name = card ? card.name[lang] : ({ ATTACK: { zh: '攻击', en: 'Attack' }, DEFEND: { zh: '防守', en: 'Guard' }, ULTIMATE: { zh: '终极', en: 'Ultimate' } }[folder!][lang]);
  const level = card ? getEffectiveLevel(card) : ('count' in props ? props.count : 0);
  const cost = 'free' in props && props.free ? 0 : card?.cost ?? 0;
  const rank = level >= 10000 ? new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(level) : String(level);
  const label = card ? `${name} · ${lang === 'zh' ? '费用' : 'Cost'} ${cost} · ${lang === 'zh' ? '等级' : 'Level'} ${level}` : `${name} · ${level} ${lang === 'zh' ? '招' : 'skills'}`;
  return <span className="woodcut-face" data-woodcut-id={id} data-folder={!!folder} data-family={card?.type ?? folder} data-language={lang} role="img" aria-label={label}>
    <img className="woodcut-print" src={assetUrl(WOODCUT_CARDS[id])} alt="" draggable={false} decoding="async" />
    {card && <><span className="woodcut-badge woodcut-cost" aria-hidden="true"><small>{lang === 'zh' ? '费用' : 'COST'}</small><b>{cost}</b></span>
    <span className="woodcut-badge woodcut-rank" aria-hidden="true"><small>{lang === 'zh' ? '等级' : 'LEVEL'}</small><b data-wide={rank.length >= 4}>{level >= 10000 ? '≈' : ''}{rank}</b></span></>}
    <span className="woodcut-title" data-long={name.length > (lang === 'zh' ? 4 : 8)} aria-hidden="true">{name}</span>
  </span>;
}
