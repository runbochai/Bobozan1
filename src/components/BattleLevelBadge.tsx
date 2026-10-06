import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import './BattleLevelBadge.css';

function LevelDetails({ level, difference, self, name, lang, onClose }: {
  level: number; difference?: number; self: boolean; name: string; lang: Lang; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const zh = lang === 'zh';
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className="battle-level-details" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>{name} · Lv.{level}</h2><button type="button" onClick={onClose} aria-label={zh ? '关闭' : 'Close'}>×</button></header>
    <p>{zh ? '角色等级 = 最高已获得的技能等级。' : 'Character level is the highest skill level earned.'}</p>
    {!self && difference !== undefined && <p className="battle-level-comparison">{difference > 0
      ? (zh ? `比你高 ${difference} 级。` : `${difference} levels above you.`)
      : difference < 0 ? (zh ? `比你低 ${-difference} 级。` : `${-difference} levels below you.`)
        : (zh ? '与你同级。' : 'Same level as you.')}</p>}
    <p>{zh ? '每张牌按自己的档位和技能等级比较。升级解锁新招，旧牌不会一起变强。' : 'Each card uses its own tier and skill level. Leveling unlocks moves; older cards stay unchanged.'}</p>
    <small>{zh ? '先比档位，再比技能等级；基础轰轰、六克可打平二档攻击。高等级不等于必胜。' : 'Compare tier before skill level. Basic Double Blast and 6g Strike can tie tier-2 attacks. A higher level does not guarantee victory.'}</small>
  </dialog>, document.body);
}

/** Ownership level is visible even at zero; it never claims to be the chosen move's power. */
export default function BattleLevelBadge({ level, viewerLevel, self = false, name, lang }: {
  level: number; viewerLevel?: number; self?: boolean; name: string; lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const difference = viewerLevel === undefined || self ? undefined : level - viewerLevel;
  const relation = self ? 'self' : difference === undefined || difference === 0 ? 'equal' : difference > 0 ? 'higher' : 'lower';
  const explanation = lang === 'zh'
    ? `最高已获等级 Lv.${level}${difference === undefined ? '' : difference > 0 ? `，比你高 ${difference} 级` : difference < 0 ? `，比你低 ${-difference} 级` : '，与你同级'}`
    : `Highest earned level ${level}${difference === undefined ? '' : difference > 0 ? `, ${difference} above you` : difference < 0 ? `, ${-difference} below you` : ', same as you'}`;
  return <div className="battle-level-wrap">
    <button type="button" className="battle-level-badge" data-level={level} data-relation={relation}
      title={explanation} aria-label={`${name} · ${explanation}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span>Lv.<b>{level}</b></span>
      {difference !== undefined && difference > 0 && <em aria-hidden="true">+{difference}</em>}
    </button>
    {open && <LevelDetails level={level} difference={difference} self={self} name={name} lang={lang} onClose={() => setOpen(false)} />}
  </div>;
}
