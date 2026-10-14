import type { Card, Lang } from '../types';
import { getEffectiveLevel, isOffensiveCard } from '../logic/combat';
import ParchmentSkillArt from './ParchmentSkillArt';
import { Shield, Swords, Crown, Zap } from './PixelIcons';
import './WoodcutCard.css';

type Props = { card: Card; lang: Lang; free?: boolean } | {
  folder: 'ATTACK' | 'DEFEND' | 'ULTIMATE'; count: number; lang: Lang;
};

/** Printed stock is decorative; every number is supplied by the actual skill. */
export default function WoodcutCardFace(props: Props) {
  const { lang } = props;
  const card = 'card' in props ? props.card : undefined;
  const folder = 'folder' in props ? props.folder : undefined;
  const id = card?.id ?? `folder-${folder!.toLowerCase()}`;
  const name = card ? card.name[lang] : ({ ATTACK: { zh: '攻击', en: 'Attack' }, DEFEND: { zh: '防守', en: 'Guard' }, ULTIMATE: { zh: '终极', en: 'Ultimate' } }[folder!][lang]);
  const level = card ? getEffectiveLevel(card) : ('count' in props ? props.count : 0);
  const free = 'free' in props && !!props.free;
  const cost = free ? 0 : card?.cost ?? 0;
  const combo = !!card?.tags?.includes('combo');
  const offensive = !!card && isOffensiveCard(card);
  const rank = level >= 10000 ? `≈${new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(level)}` : String(level);
  const rankUnits = Array.from(rank).reduce((sum, char) => sum + (/[\u2e80-\u9fff]/.test(char) ? 1 : .65), 0);
  const label = card ? `${name} · ${lang === 'zh' ? '费用' : 'Cost'} ${cost} · ${lang === 'zh' ? '技能等级' : 'Skill level'} ${level}${offensive ? ` · T${card.tier}` : ''}${combo ? ` · ${lang === 'zh' ? '联合' : 'Combo'}` : ''}${card.combatLevel !== undefined ? ` · ${lang === 'zh' ? '无尽成长' : 'Endless growth'}` : ''}` : `${name} · ${level} ${lang === 'zh' ? '招' : 'skills'}`;
  const Seal = folder === 'DEFEND' ? Shield : folder === 'ULTIMATE' ? Crown : Swords;
  return <span className="woodcut-face" data-woodcut-id={id} data-folder={!!folder} data-cover={!!folder || card?.id === 'charge'} data-family={card?.type ?? folder} data-language={lang}
    data-skill-level={card ? level : undefined} data-combo={combo || undefined} data-growing={card?.combatLevel !== undefined || undefined} data-free={free || undefined} role="img" aria-label={label}>
    <svg className="woodcut-engraved-frame" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true">
      <path className="woodcut-frame-edge" d="M13 5H186L195 14V286L186 295H14L5 286V14Z" />
      <path className="woodcut-frame-line" d="M18 13H181L187 19V281L181 287H19L13 281V19Z" />
      <path className="woodcut-frame-stitch" d="M23 23H177V277H23Z" />
      <path className="woodcut-frame-corners" d="M16 16h17l-8 4-5 12zM184 16h-17l8 4 5 12zM16 284h17l-8-4-5-12zM184 284h-17l8-4 5-12z" />
      <path className="woodcut-frame-line" d="M45 238h34m42 0h34M48 275h31m42 0h31" />
      <path className="woodcut-frame-corners" d="m100 234 4 4-4 4-4-4zm0 37 4 4-4 4-4-4z" />
    </svg>
    <span className="woodcut-emblem" aria-hidden="true">{card ? <ParchmentSkillArt id={card.id} /> : <Seal size="100%" />}</span>
    {card ? <>
      <span className="woodcut-badge woodcut-cost" aria-hidden="true"><small>{lang === 'zh' ? '费用' : 'COST'}</small><b><Zap size="1em" />{cost}</b></span>
      <span className="woodcut-badge woodcut-rank" aria-hidden="true"><small>{lang === 'zh' ? '技能' : 'SKILL'}</small><b data-wide={rank.length > 3} style={{ fontSize: `${Math.min(12, 18 / rankUnits)}cqw` }}><i>Lv.</i>{rank}</b></span>
      <span className="woodcut-subtitle" aria-hidden="true">{combo ? (lang === 'zh' ? '联合' : 'COMBO') : card.combatLevel !== undefined ? (lang === 'zh' ? '成长' : 'GROWTH') : ''}{offensive ? `${combo || card.combatLevel !== undefined ? ' · ' : ''}T${card.tier}` : ''}</span>
    </> : <span className="woodcut-folder-count" aria-hidden="true">{level} {lang === 'zh' ? '招式' : 'SKILLS'}</span>}
    <span className="woodcut-title" data-long={name.length > (lang === 'zh' ? 4 : 10)} aria-hidden="true">{name}</span>
  </span>;
}
