import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUp, Axe, Biohazard, Bomb, Cloud, Coffee, Crosshair, Eye, Feather, Footprints, Ghost, Hammer, Hand, HardHat, Heart, Magnet, Mountain, Shield, Snowflake, Sparkles, Swords, Wind, Zap } from 'lucide-react';
import type { Card, Lang } from '../types';
import { getEffectiveLevel } from '../logic/cardLevels';
import './RetroCard.css';

/** The original release used line icons and emoji, rather than illustrated card art. */
export function RetroSkillIcon({ id, size = 48 }: { id: string; size?: number }) {
  const props = { size, strokeWidth: 2, 'aria-hidden': true as const };
  let icon;
  switch (id) {
    case 'charge': icon = <Zap {...props} fill="currentColor" />; break;
    case 'defend': icon = <Shield {...props} />; break;
    case 'hong': case 'hong2': icon = <Bomb {...props} />; break;
    case 'ka': icon = '✂️'; break;
    case 'ji': icon = '🐥'; break;
    case 'kajifen': icon = <Sparkles {...props} />; break;
    case 'kajisuper': icon = '🌟'; break;
    case 'ascend': icon = <ArrowUp {...props} />; break;
    case 'descend': icon = <ArrowDown {...props} />; break;
    case 'pegasus': icon = '🦄'; break;
    case 'meteor': icon = '☄️'; break;
    case 'icesword': case 'iceult': icon = <Snowflake {...props} />; break;
    case 'smallfly': icon = <Feather {...props} />; break;
    case 'dragonclaw': case 'fireclaw': case 'dragondef': icon = '🐉'; break;
    case 'hotmilk': case 'boiler': icon = <Coffee {...props} />; break;
    case 'madian': icon = '🐎'; break;
    case 'hangman': icon = <Ghost {...props} />; break;
    case 'bigfly': icon = <Wind {...props} />; break;
    case 'absorb': icon = <Magnet {...props} />; break;
    case 'gun': case 'gungod': icon = <Crosshair {...props} />; break;
    case 'helmetatk': case 'helmetdef': icon = <HardHat {...props} />; break;
    case 'machete': icon = <Axe {...props} />; break;
    case 'triplekill': icon = '☠️'; break;
    case 'handatk': case 'handdef': case 'shatter': icon = <Hand {...props} />; break;
    case 'footatk': case 'footdef': case 'triplekick': icon = <Footprints {...props} />; break;
    case 'aoxi': icon = '🌪️'; break;
    case 'bang': case 'stab': icon = <Hammer {...props} />; break;
    case 'wave': case 'superwave': icon = '🌊'; break;
    case 'hongtian': icon = <Cloud {...props} />; break;
    case 'hongdi': icon = <Mountain {...props} />; break;
    case 'hearteye': icon = <><Heart {...props} /><Eye {...props} /></>; break;
    case 'poison': icon = <Biohazard {...props} />; break;
    case 'skydragon': icon = '🐲'; break;
    case 'doublewing': icon = '🪽'; break;
    case 'vajra': icon = '🛡️'; break;
    case 'allbomb': icon = '💣'; break;
    case 'heartpoison': icon = '🖤'; break;
    default: icon = id.includes('def') ? <Shield {...props} /> : <Swords {...props} />;
  }
  return <span className="retro-skill-icon" data-skill-id={id} style={{ '--retro-icon-size': `${size}px` } as CSSProperties} aria-hidden="true">{icon}</span>;
}

export interface RetroCardProps {
  card: Card;
  lang: Lang;
  free?: boolean;
  freeCount?: number;
  tempCount?: number;
  compact?: boolean;
  description?: boolean;
}

/** A presentation-only face; ownership, costs and play validation stay in the shared engine. */
export default function RetroCard({ card, lang, free = false, freeCount = 0, tempCount = 0, compact = false, description = false }: RetroCardProps) {
  const isFree = free || freeCount > 0;
  return <span className={`retro-card ${compact ? 'retro-card-compact' : ''}`} data-card-id={card.id} data-card-type={card.type} data-combo={!!card.tags?.includes('combo')}>
    <span className="retro-card-cost">{isFree ? <><s>{card.cost}</s> 0</> : card.cost}</span>
    <span className="retro-card-rank">{card.tags?.includes('combo') ? (lang === 'zh' ? '联合' : 'COMBO') : `Lv.${getEffectiveLevel(card)}`}</span>
    <span className="retro-card-art"><RetroSkillIcon id={card.id} size={compact ? 36 : 48} /></span>
    <strong className="retro-card-name">{card.name[lang]}</strong>
    {description && <span className="retro-card-description">{card.description[lang]}</span>}
    {(isFree || tempCount > 0) && <span className="retro-card-borrowed">{isFree ? `${lang === 'zh' ? '免费' : 'FREE'}${freeCount ? ` ×${freeCount}` : ''}` : `${lang === 'zh' ? '临时' : 'TEMP'} ×${tempCount}`}</span>}
  </span>;
}
