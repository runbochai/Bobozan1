import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card, HandCategory, Lang } from '../types';
import { TEXT } from '../data/translations';
import { getEffectiveLevel, isOffensiveCard } from '../logic/combat';
import PixelCardArt from './PixelCardArt';
import { CheckCircle, Zap } from './PixelIcons';
import './SkillLoadoutPicker.css';

export interface SkillLoadoutGroup {
  category: Exclude<HandCategory, 'CHARGE' | 'SPECIAL'>;
  cards: Card[];
  newIds: string[];
}

interface Props {
  groups: SkillLoadoutGroup[];
  lang: Lang;
  limit: number;
  busy?: boolean;
  error?: string;
  onConfirm: (keptIds: string[]) => void;
}

/** Only overflowing permanent categories are passed here; other skills stay untouched. */
export default function SkillLoadoutPicker({ groups, lang, limit, busy = false, error, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const zh = lang === 'zh';
  const [kept, setKept] = useState<string[]>(() => groups.flatMap(group => [...group.cards]
    .sort((a, b) => Number(group.newIds.includes(b.id)) - Number(group.newIds.includes(a.id)))
    .slice(0, limit).map(card => card.id)));
  const overLimit = groups.some(group => group.cards.filter(card => kept.includes(card.id)).length > limit);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const toggle = (id: string) => setKept(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  return createPortal(<dialog ref={dialogRef} className="skill-loadout-picker" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => event.preventDefault()}>
    <header className="skill-loadout-header">
      <h2 id={titleId}>{zh ? '选要保留的技能' : 'Choose skills to keep'}</h2>
      <p id={descriptionId}>{zh ? `每类最多 ${limit} 张 · 基础牌始终保留` : `Up to ${limit} per category · Basic cards always stay`}</p>
    </header>
    <div className="skill-loadout-groups">
      {groups.map(group => {
        const count = group.cards.filter(card => kept.includes(card.id)).length;
        const ordered = [...group.cards].sort((a, b) => Number(group.newIds.includes(b.id)) - Number(group.newIds.includes(a.id)));
        return <section key={group.category} className="skill-loadout-group" aria-label={TEXT[lang].categories[group.category]}>
          <div className="skill-loadout-group-heading"><h3>{TEXT[lang].categories[group.category]}</h3>
            <span className="skill-loadout-count" data-over-limit={count > limit} aria-live="polite">{count} / {limit}</span>
          </div>
          <div className="skill-loadout-cards">{ordered.map(card => {
            const selected = kept.includes(card.id);
            const isNew = group.newIds.includes(card.id);
            const rank = `Lv.${getEffectiveLevel(card)}${isOffensiveCard(card) ? ` · T${card.tier}` : ''}`;
            return <button type="button" key={card.id} className="skill-loadout-card" data-card-type={group.category} data-new={isNew}
              aria-pressed={selected} disabled={busy} onClick={() => toggle(card.id)} title={`${zh ? '技能等级' : 'Skill level'} ${rank} · ${card.description[lang]}`}>
              <span className="skill-loadout-card-top"><span><Zap size={14} />{card.cost}</span><span className="skill-loadout-rank" aria-label={`${zh ? '技能等级' : 'Skill level'} Lv.${getEffectiveLevel(card)}`}>Lv.{getEffectiveLevel(card)}</span>{isNew && <b>{zh ? '新' : 'NEW'}</b>}
                <span className="skill-loadout-check" aria-hidden="true">{selected ? <CheckCircle size={20} /> : <i />}</span>
              </span>
              <span className="skill-loadout-art" aria-hidden="true"><PixelCardArt id={card.id} /></span>
              <strong>{card.name[lang]}</strong><span className="skill-loadout-description">{card.description[lang]}</span>
            </button>;
          })}</div>
          {count > limit && <p className="skill-loadout-warning" role="status">{zh ? `再少选 ${count - limit} 张` : `Unselect ${count - limit} more`}</p>}
        </section>;
      })}
    </div>
    <footer className="skill-loadout-footer">
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy || overLimit} onClick={() => onConfirm(groups.flatMap(group => group.cards.filter(card => kept.includes(card.id)).map(card => card.id)))}>
        {busy ? (zh ? '保存中…' : 'Saving…') : (zh ? '保留所选' : 'Keep selected')}
      </button>
      <small>{zh ? '未选技能会换下，基础牌不受影响' : 'Unselected skills leave your hand; basic cards stay'}</small>
    </footer>
  </dialog>, document.body);
}
