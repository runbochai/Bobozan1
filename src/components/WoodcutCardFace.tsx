import type { Card, Lang } from '../types';
import { assetUrl } from '../assets';
import { WOODCUT_CARDS } from '../data/woodcutCards';
import { getEffectiveLevel } from '../logic/cardLevels';
import { Lantern, Shield, Swords, Crown } from './PixelIcons';
import './WoodcutCard.css';

type Props = { card: Card; lang: Lang; free?: boolean } | {
  folder: 'ATTACK' | 'DEFEND' | 'ULTIMATE'; count: number; lang: Lang;
};

/** Skills retain their approved printed frames; Charge shares the category-cover treatment. */
export default function WoodcutCardFace(props: Props) {
  const { lang } = props;
  const card = 'card' in props ? props.card : undefined;
  const folder = 'folder' in props ? props.folder : undefined;
  const cover = !!folder || card?.id === 'charge';
  const id = card?.id ?? `folder-${folder!.toLowerCase()}`;
  const name = card ? card.name[lang] : ({ ATTACK: { zh: '攻击', en: 'Attack' }, DEFEND: { zh: '防守', en: 'Guard' }, ULTIMATE: { zh: '终极', en: 'Ultimate' } }[folder!][lang]);
  const level = card ? getEffectiveLevel(card) : ('count' in props ? props.count : 0);
  const cost = 'free' in props && props.free ? 0 : card?.cost ?? 0;
  const rank = level >= 10000 ? new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(level) : String(level);
  const displayRank = level >= 10000 ? `≈${rank}` : rank;
  const label = card ? `${name} · ${lang === 'zh' ? '费用' : 'Cost'} ${cost} · ${lang === 'zh' ? '等级' : 'Level'} ${level}` : `${name} · ${level} ${lang === 'zh' ? '招' : 'skills'}`;
  const Seal = card?.type === 'CHARGE' ? Lantern : folder === 'DEFEND' || card?.type === 'DEFEND' ? Shield : folder === 'ULTIMATE' || card?.type === 'ULTIMATE' ? Crown : Swords;
  return <span className="woodcut-face" data-woodcut-id={id} data-folder={!!folder} data-cover={cover} data-family={card?.type ?? folder} data-language={lang} role="img" aria-label={label}>
    <img className="woodcut-print" src={assetUrl(WOODCUT_CARDS[id])} alt="" draggable={false} decoding="async" />
    {cover && <><svg className="woodcut-engraved-frame" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true">
      <path className="woodcut-frame-edge" d="M12 3H188L197 12V288L188 297H12L3 288V12Z" />
      <path className="woodcut-frame-line" d="M15 9H185L191 15V285L185 291H15L9 285V15Z M14 70V248M186 70V248 M68 14H87M113 14H132" />
      <path className="woodcut-frame-corners" d="M12 13h19l-9 4-5 10z M188 13h-19l9 4 5 10z M12 287h19l-9-4-5-10z M188 287h-19l9-4 5-10z" />
      <path className="woodcut-frame-line" d="M18 255h164M23 259h154 M23 281h154" />
    </svg>
    <span className="woodcut-seal" aria-hidden="true"><Seal size="100%" /></span></>}
    {card && !cover && <><span className="woodcut-badge woodcut-cost" aria-hidden="true"><small>{lang === 'zh' ? '费用' : 'COST'}</small><b>{cost}</b></span>
    <span className="woodcut-badge woodcut-rank" aria-hidden="true"><small>{lang === 'zh' ? '等级' : 'LEVEL'}</small><b data-three={displayRank.length === 3} data-wide={displayRank.length >= 4} style={displayRank.length >= 4 ? { fontSize: `${Math.min(11, 38 / displayRank.length)}cqw` } : level >= 10000 ? { fontSize: '10.5cqw' } : undefined}>{displayRank}</b></span></>}
    <span className="woodcut-title" data-long={name.length > (lang === 'zh' ? 4 : 8)} aria-hidden="true">{name}</span>
  </span>;
}
